const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(__dirname, "../src/pages/content/contact-scraper-main.js");

test("a notificacao de comentario preserva IDs longos sem arredondar", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  const notificationJson = `{"old_stories":[{"notif_name":"comment","args":{"comment_id":18101000000015838,"media":[{"id":38200000000000001}],"profile_name":"contato.teste","text":"Teste"}}]}`;
  const document = {
    cookie: "ds_user_id=999; csrftoken=csrf",
    body: null,
    documentElement: { appendChild() {}, setAttribute() {} },
    getElementById() { return null; },
    createElement() { return { setAttribute() {} }; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const location = { origin: "https://www.instagram.com", pathname: "/" };
  const window = {
    addEventListener(type, listener) {
      if (type === "message") messageListener = listener;
    },
    removeEventListener() {},
    postMessage(value) {
      if (value?.source === "flowsi-chatbot-notifications-response-v1") pendingResponse?.(value);
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
    Node: class {},
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    document,
    fetch: async () => ({ ok: true, status: 200, async text() { return notificationJson; } }),
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 1000);
    pendingResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
    messageListener({
      source: window,
      data: { source: "flowsi-chatbot-notifications-request-v1", requestId: "precision-test" }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.notifications.length, 1);
  assert.equal(response.result.notifications[0].args.comment_id, "18101000000015838");
  assert.equal(response.result.notifications[0].args.media[0].id, "38200000000000001");
});
