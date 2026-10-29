const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(__dirname, "../src/pages/content/contact-scraper-main.js");

test("a notificacao compacta resolve o perfil mesmo sem arroba no React", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  class FakeNode {}
  let mutationCallback = null;
  let messageListener = null;
  let pendingResponse = null;
  let searchRequests = 0;
  const postedMessages = [];
  const attributes = new Map();

  class FakeMutationObserver {
    constructor(callback) { mutationCallback = callback; }
    observe() {}
    disconnect() {}
  }

  const leaf = text => ({ children: [], textContent: text });
  const image = {
    currentSrc: "https://cdn.example/douglas.jpg",
    src: "https://cdn.example/douglas.jpg"
  };
  const makeToast = () => ({
    nodeType: 1,
    parentElement: null,
    isConnected: true,
    innerText: "Douglas Leão\nTeste",
    textContent: "Douglas Leão\nTeste",
    getBoundingClientRect() {
      return { left: 1000, top: 720, width: 290, height: 72 };
    },
    querySelector(selector) {
      return selector === "img" ? image : null;
    },
    querySelectorAll(selector) {
      if (selector === "span, div") return [leaf("Douglas Leão"), leaf("Teste")];
      return [];
    }
  });

  const documentElement = {
    clientWidth: 1360,
    clientHeight: 900,
    appendChild() {},
    setAttribute(name, value) { attributes.set(name, String(value)); }
  };
  const document = {
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    documentElement,
    body: { nodeType: 1, appendChild() {}, querySelectorAll() { return []; } },
    getElementById() { return null; },
    createElement() { return { setAttribute() {} }; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/",
    href: "https://www.instagram.com/"
  };
  const window = {
    innerWidth: 1360,
    innerHeight: 900,
    addEventListener(type, listener) {
      if (type === "message") messageListener = listener;
    },
    removeEventListener() {},
    postMessage(value) {
      postedMessages.push(value);
      if (value?.source === "flowsi-chatbot-inbox-response-v2") pendingResponse?.(value);
    }
  };
  window.window = window;

  vm.runInNewContext(source, {
    AbortController,
    CSS: { escape: value => value },
    Event: class {},
    FormData,
    InputEvent: class {},
    KeyboardEvent: class {},
    MutationObserver: FakeMutationObserver,
    Node: FakeNode,
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    document,
    fetch: async url => {
      if (String(url).includes("topsearch")) {
        searchRequests += 1;
        return {
          ok: true,
          async json() {
            return {
              users: [{
                user: {
                  pk: "299999999999999",
                  username: "soudouglasleao",
                  full_name: "Douglas Leão",
                  profile_pic_url: image.src
                }
              }]
            };
          }
        };
      }
      return { ok: true, async json() { return { inbox: { threads: [] } }; } };
    },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  assert.equal(typeof mutationCallback, "function");
  mutationCallback([{ addedNodes: [makeToast()] }]);
  await new Promise(resolve => setTimeout(resolve, 0));

  const realtimeEvents = () => postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(searchRequests, 1);
  assert.equal(realtimeEvents().length, 1);
  assert.match(realtimeEvents()[0].eventId, /^toast-/);
  assert.equal(realtimeEvents()[0].thread.thread_id, "toast-soudouglasleao");
  assert.equal(realtimeEvents()[0].trustedThreadId, "");
  assert.notEqual(
    realtimeEvents()[0].thread.thread_id,
    "299999999999999",
    "o PK do perfil nunca pode ser promovido a thread_id do Direct"
  );
  assert.match(attributes.get("data-flowsi-chatbot-realtime-event") || "", /soudouglasleao/);

  // React can recreate the visual toast. The short signature prevents a
  // second automatic reply for the same notification.
  mutationCallback([{ addedNodes: [makeToast()] }]);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(realtimeEvents().length, 1);

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 1000);
    pendingResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
    messageListener({
      source: window,
      data: { source: "flowsi-chatbot-inbox-request-v2", requestId: "toast-fallback-test" }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.realtimeThreads, 1);
  assert.equal(response.result.primary[0].users[0].username, "soudouglasleao");
  assert.equal(response.result.primary[0].items[0].text, "Teste");
  assert.equal(location.pathname, "/");
});
