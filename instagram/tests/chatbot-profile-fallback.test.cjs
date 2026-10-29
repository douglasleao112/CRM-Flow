const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const main = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "pages", "content", "contact-scraper-main.js"),
  "utf8"
);
const loader = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "pages", "content", "contact-loader.js"),
  "utf8"
);
const content = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "pages", "content", "index.js"),
  "utf8"
);
const background = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "pages", "background", "index.js"),
  "utf8"
);

function sourceBetween(startMarker, endMarker) {
  const start = main.indexOf(startMarker);
  const end = main.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Marcador inicial ausente: ${startMarker}`);
  assert.notEqual(end, -1, `Marcador final ausente: ${endMarker}`);
  return main.slice(start, end);
}

function helperContext(cookie = "") {
  const context = vm.createContext({
    document: { cookie },
    decodeURIComponent,
    URL,
    location: { origin: "https://www.instagram.com" }
  });
  const helpers = sourceBetween(
    "function namedCookieValue",
    "async function resolveChatbotDestination"
  );
  vm.runInContext(`
    function normalize(value) {
      return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
        .replace(/\\s+/g, " ").trim().toLowerCase();
    }
    function csrfToken() { return "csrf"; }
    ${helpers}
    this.viewerIdFromRurCookie = viewerIdFromRurCookie;
    this.profileIdFromHtml = profileIdFromHtml;
  `, context);
  return context;
}

test("extrai o viewer FB ID do cookie rur URL-encoded sem recorrer a ds_user_id", () => {
  const context = helperContext(
    "csrftoken=x; ds_user_id=999999; " +
    "rur=%22RVA%5C05417841405791234567%5C0541806384352%3A01fe%22"
  );
  assert.equal(context.viewerIdFromRurCookie(), "17841405791234567");
  assert.equal(
    context.viewerIdFromRurCookie("ds_user_id=999999; csrftoken=x"),
    "",
    "ds_user_id não é um viewer FB ID válido para o MQTT"
  );
  assert.equal(
    context.viewerIdFromRurCookie(String.raw`rur="LDC\05412345678901234567\0541806384352:signature"`),
    "12345678901234567"
  );
});

test("o background lê rur HttpOnly e encaminha somente o viewerId numérico", () => {
  const helperStart = background.indexOf("function viewerIdFromRurCookieValue");
  const helperEnd = background.indexOf("const normalizeCrmKey", helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  const context = vm.createContext({ decodeURIComponent });
  vm.runInContext(`
    ${background.slice(helperStart, helperEnd)}
    this.parseRur = viewerIdFromRurCookieValue;
  `, context);
  assert.equal(
    context.parseRur('%22RVA%5C05417841405791234567%5C0541806384352%3Asignature%22'),
    "17841405791234567"
  );

  const senderStart = background.indexOf("async function sendMessageToInstagram");
  const senderEnd = background.indexOf("async function fetchFollowingInBackground", senderStart);
  const sender = background.slice(senderStart, senderEnd);
  assert.match(sender, /viewerIdFromRurCookieValue\(instagramCookies\?\.rur\)/);
  assert.match(sender, /action:\s*["']flowsiChatbotSendMessageMain["'][\s\S]{0,260}viewerId/);
  assert.match(sender, /action:\s*["']flowsiChatbotSendMessage["'][\s\S]{0,260}viewerId/);
  assert.doesNotMatch(sender, /rur:\s*instagramCookies|cookie:\s*instagramCookies/);

  assert.match(
    loader,
    /sendChatbotDirect\(\s*username,\s*message,\s*threadId = ["']["'],\s*viewerId = ["']["'],\s*trustedThreadId = ["']["'],\s*deliveryId = ["']["']\s*\)/
  );
  assert.match(loader, /viewerId:\s*\/\^\\d\+\$\//);
  assert.match(loader, /message\.threadId,\s*message\.viewerId,\s*message\.trustedThreadId,\s*message\.deliveryId/);
  assert.match(main, /safeViewerIdHint/);
  assert.match(main, /cached\?\.viewerId \|\| safeViewerIdHint \|\| viewerIdFromRurCookie\(\)/);

  const fallbackStart = content.indexOf("const sendDirect = async");
  const fallbackEnd = content.indexOf("function installChatbotSourceControls", fallbackStart);
  const fallback = content.slice(fallbackStart, fallbackEnd);
  assert.match(fallback, /viewerIdHint/);
  assert.doesNotMatch(fallback, /readCookie\(["']ds_user_id["']\)/);
});

test("extrai profile_id do HTML autenticado e o associa ao username correto", () => {
  const context = helperContext();
  const html = `
    <script>{"username":"sugestao","profile_id":"111111"}</script>
    <script>window.__data = "{\\"username\\":\\"soudouglasleao\\",\\"profile_id\\":\\"222222222222\\"}";</script>
  `;
  assert.equal(context.profileIdFromHtml(html, "soudouglasleao"), "222222222222");
  assert.equal(
    context.profileIdFromHtml('<script>profilePage_333333333</script>', "qualquer.usuario"),
    "333333333"
  );
});

test("com web_profile_info 400 e topsearch 404, usa HTML+rur e mantém create_group_thread", async () => {
  const helperBlock = sourceBetween(
    "function namedCookieValue",
    "async function resolveChatbotDestination"
  );
  const resolverBlock = sourceBetween(
    "async function resolveChatbotDestination",
    "function sendChatbotViaReferenceMqtt"
  );
  const calls = [];
  const context = vm.createContext({
    document: {
      // Simula rur HttpOnly: a página só vê ds_user_id, que não deve ser usado.
      cookie: "csrftoken=csrf; ds_user_id=999"
    },
    location: { origin: "https://www.instagram.com" },
    URL,
    URLSearchParams,
    decodeURIComponent,
    Date,
    Map,
    fetch: async (url, options = {}) => {
      const target = String(url);
      calls.push({ url: target, options });
      if (target.includes("create_group_thread")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ok", thread_id: "340282366841710300000000000000000001" })
        };
      }
      if (/^https:\/\/www\.instagram\.com\/soudouglasleao\//.test(target)) {
        return {
          ok: true,
          status: 200,
          text: async () => '<script>{"username":"soudouglasleao","profile_id":"123456789012345"}</script>'
        };
      }
      return {
        ok: false,
        status: target.includes("topsearch") ? 404 : 400,
        json: async () => ({})
      };
    }
  });
  vm.runInContext(`
    const chatbotThreadCache = new Map();
    function normalize(value) { return String(value || "").trim().toLowerCase(); }
    function searchUsers() { return []; }
    function csrfToken() { return "csrf"; }
    ${helperBlock}
    ${resolverBlock}
    this.resolve = resolveChatbotDestination;
  `, context);

  const resolved = await context.resolve(
    "soudouglasleao",
    "18130053334545517",
    { "x-csrftoken": "csrf" },
    { "content-type": "application/x-www-form-urlencoded" },
    "17841405791234567"
  );
  assert.deepEqual(JSON.parse(JSON.stringify(resolved)), {
    threadId: "340282366841710300000000000000000001",
    userId: "123456789012345",
    viewerId: "17841405791234567"
  });
  const createCall = calls.find(call => call.url.includes("create_group_thread"));
  assert.ok(createCall, "create_group_thread precisa continuar resolvendo o thread_id real");
  assert.equal(
    String(createCall.options.body),
    "recipient_users=%5B%22123456789012345%22%5D"
  );
  assert.ok(calls.some(call => call.url.includes("web_profile_info")));
  assert.ok(calls.some(call => call.url.includes("topsearch")));
  assert.ok(calls.some(call => call.url === "https://www.instagram.com/soudouglasleao/"));
});
