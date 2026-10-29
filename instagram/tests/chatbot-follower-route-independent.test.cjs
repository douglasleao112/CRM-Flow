const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(__dirname, "../src/pages/content/contact-scraper-main.js");

test("novo seguidor e lido na pagina principal sem abrir o painel de notificacoes", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  const attributes = new Map();
  const document = {
    cookie: "ds_user_id=999; csrftoken=csrf",
    body: null,
    documentElement: {
      appendChild() {},
      setAttribute(name, value) { attributes.set(name, value); }
    },
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
    fetch: async url => {
      assert.match(String(url), /\/api\/v1\/news\/inbox/);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: {
              activities: [{
                notification_type: "activity",
                id: "follow-home-1",
                text: "começou a seguir você.",
                actor: {
                  id: "123",
                  username: "novo.seguidor.home",
                  full_name: "Novo Seguidor Home"
                }
              }]
            }
          };
        }
      };
    },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  assert.equal(typeof messageListener, "function");
  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 1000);
    pendingResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
    messageListener({
      source: window,
      data: {
        source: "flowsi-chatbot-notifications-request-v1",
        requestId: "notifications-home"
      }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.transport, "instagram-page-notifications");
  assert.equal(response.result.notifications.length, 1);
  assert.equal(response.result.notifications[0].actor.username, "novo.seguidor.home");
  assert.equal(location.pathname, "/", "a leitura nao pode trocar a tela atual do Instagram");
  const diagnostics = JSON.parse(attributes.get("data-flowsi-chatbot-notifications"));
  assert.equal(diagnostics.total, 1);
  assert.deepEqual([...diagnostics.types], ["activity"]);
});
