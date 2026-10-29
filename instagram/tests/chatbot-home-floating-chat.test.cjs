const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

test("a janela flutuante da Home entrega somente a nova mensagem recebida", async () => {
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

  const image = {
    currentSrc: "https://cdn.example/douglas.jpg",
    src: "https://cdn.example/douglas.jpg"
  };
  const targetUser = {
    pk: "299999999999999",
    username: "soudouglasleao",
    full_name: "Douglas Leão",
    profile_pic_url: image.src
  };
  const viewerUser = {
    pk: "999999999999999",
    username: "dr.douglasleao",
    full_name: "Ph.D. Douglas Leão"
  };
  const incomingItem = {
    item_id: "floating-message-A",
    item_type: "text",
    user_id: targetUser.pk,
    text: "123",
    timestamp: "1770000000000000"
  };
  const thread = {
    thread_id: "18130053334545517",
    users: [targetUser, viewerUser],
    items: [incomingItem]
  };
  const composer = { nodeType: 1 };
  const panel = {
    nodeType: 1,
    parentElement: null,
    innerText: "Douglas Leão\n123\nMensagem...",
    textContent: "Douglas Leão\n123\nMensagem...",
    __reactProps$floatingPanel: thread,
    getBoundingClientRect() {
      return {
        left: 1000,
        top: 500,
        right: 1300,
        bottom: 890,
        width: 300,
        height: 390
      };
    },
    querySelector(selector) {
      if (selector === "img") return image;
      if (selector.includes("textbox") || selector.includes("contenteditable") || selector.includes("textarea")) {
        return composer;
      }
      return null;
    },
    querySelectorAll() { return []; }
  };
  const incomingBubble = {
    nodeType: 1,
    parentElement: panel,
    innerText: "123",
    textContent: "123",
    __reactProps$incomingBubble: { thread_id: thread.thread_id, item: incomingItem, users: thread.users },
    getBoundingClientRect() {
      return { left: 1020, top: 560, right: 1080, bottom: 590, width: 60, height: 30 };
    },
    querySelector() { return null; },
    querySelectorAll() { return []; }
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
  mutationCallback([{ type: "childList", addedNodes: [incomingBubble] }]);

  let realtimeEvents = postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(realtimeEvents.length, 1);
  assert.equal(realtimeEvents[0].eventId, "floating-message-A");
  assert.match(
    attributes.get("data-flowsi-chatbot-floating-event") || "",
    /soudouglasleao/
  );

  // React mutates the same Direct item more than once. It must remain exactly once.
  const repeatedBubble = { ...incomingBubble };
  mutationCallback([{ type: "childList", addedNodes: [repeatedBubble] }]);
  realtimeEvents = postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(realtimeEvents.length, 1);

  // The automatic blue reply also appears in the panel and must never retrigger the bot.
  const outgoingItem = {
    item_id: "floating-outgoing-A",
    item_type: "text",
    user_id: viewerUser.pk,
    text: "Resposta automática",
    timestamp: "1770000001000000"
  };
  const outgoingBubble = {
    ...incomingBubble,
    innerText: outgoingItem.text,
    textContent: outgoingItem.text,
    __reactProps$incomingBubble: undefined,
    __reactProps$outgoingBubble: { thread_id: thread.thread_id, item: outgoingItem, users: thread.users }
  };
  mutationCallback([{ type: "childList", addedNodes: [outgoingBubble] }]);
  realtimeEvents = postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(realtimeEvents.length, 1);

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
        requestId: "home-floating-test"
      }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.realtimeThreads, 1);
  assert.equal(response.result.primary.length, 1);
  assert.equal(response.result.primary[0].thread_id, thread.thread_id);
  assert.equal(response.result.primary[0].users[0].username, targetUser.username);
  assert.equal(response.result.primary[0].items[0].item_id, "floating-message-A");
  assert.equal(response.result.primary[0].items[0].text, "123");
  assert.equal(location.pathname, "/");
});
