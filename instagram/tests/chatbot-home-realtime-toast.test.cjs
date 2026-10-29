const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

test("na tela principal a notificacao nativa vira evento do chatbot", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  class FakeNode {}
  let mutationCallback = null;
  let messageListener = null;
  let pendingResponse = null;
  const postedMessages = [];
  const attributes = new Map();

  class FakeMutationObserver {
    constructor(callback) {
      mutationCallback = callback;
    }
    observe() {}
    disconnect() {}
  }

  const leaf = text => ({ children: [], textContent: text });
  const image = {
    currentSrc: "https://cdn.example/douglas.jpg",
    src: "https://cdn.example/douglas.jpg"
  };
  const reactThread = {
    thread_id: "18130053334545517",
    last_permanent_item: { item_id: "toast-message-A" },
    last_activity_at: "1770000000000000",
    user: {
      pk: "299999999999999",
      username: "soudouglasleao",
      full_name: "Douglas Leão",
      profile_pic_url: image.src
    }
  };
  const toast = {
    nodeType: 1,
    parentElement: null,
    innerText: "Douglas Leão\nTeste",
    textContent: "Douglas Leão\nTeste",
    __reactProps$homeToast: reactThread,
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
  };

  const documentElement = {
    clientWidth: 1360,
    clientHeight: 900,
    appendChild() {},
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
  const document = {
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    documentElement,
    body: {
      nodeType: 1,
      appendChild() {},
      querySelectorAll() { return []; }
    },
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
      if (value?.source === "flowsi-chatbot-inbox-response-v2") {
        pendingResponse?.(value);
      }
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
    fetch: async () => ({
      ok: true,
      async json() { return { inbox: { threads: [] } }; }
    }),
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  assert.equal(typeof mutationCallback, "function");
  assert.equal(typeof messageListener, "function");
  mutationCallback([{ addedNodes: [toast] }]);

  const realtimeEvent = postedMessages.find(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(realtimeEvent?.eventId, "toast-message-A");
  assert.match(
    attributes.get("data-flowsi-chatbot-realtime-event") || "",
    /soudouglasleao/
  );

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 1000);
    pendingResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
    messageListener({
      source: window,
      data: {
        source: "flowsi-chatbot-inbox-request-v2",
        requestId: "home-toast-test"
      }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.realtimeThreads, 1);
  assert.equal(response.result.primary.length, 1);
  assert.equal(response.result.primary[0].thread_id, "18130053334545517");
  assert.equal(response.result.primary[0].users[0].username, "soudouglasleao");
  assert.equal(response.result.primary[0].items[0].item_id, "toast-message-A");
  assert.equal(response.result.primary[0].items[0].text, "Teste");
  assert.equal(location.pathname, "/");
});
