const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

test("chatbot lê inbox na Home sem abrir interface e preserva o item_id real", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  class FakeNode {}
  class FakeMutationObserver {
    observe() {}
    disconnect() {}
  }
  const hiddenRow = {
    innerText: "Placeholder",
    textContent: "Placeholder",
    getBoundingClientRect() {
      return { width: 320, height: 64 };
    },
    querySelectorAll(selector) {
      return selector === "img" ? [{ alt: "Profile picture", src: "" }] : [];
    }
  };
  const hiddenListRoot = {
    getBoundingClientRect() {
      return { width: 640, height: 720 };
    },
    querySelectorAll(selector) {
      return selector === 'button, [role="button"]' ? [hiddenRow] : [];
    }
  };
  const hiddenDocument = {
    documentElement: { nodeType: 1 },
    body: { nodeType: 1 },
    querySelectorAll(selector) {
      return selector.includes('aria-label="Lista de tópicos"')
        ? [hiddenListRoot]
        : [];
    }
  };

  let messageListener = null;
  let pendingResponse = null;
  let iframeCreations = 0;
  const createdIframes = [];
  const documentElement = {
    clientWidth: 1360,
    clientHeight: 900,
    appendChild() {},
    setAttribute() {}
  };
  const document = {
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    documentElement,
    body: {
      nodeType: 1,
      appendChild(element) { element.isConnected = true; },
      querySelectorAll() { return []; }
    },
    getElementById() { return null; },
    createElement(tagName) {
      const element = {
        style: {},
        attributes: new Map(),
        isConnected: true,
        setAttribute(name, value) { this.attributes.set(name, String(value)); },
        getAttribute(name) { return this.attributes.get(name) || null; },
        remove() { this.isConnected = false; }
      };
      if (tagName === "iframe") {
        iframeCreations += 1;
        element.contentDocument = hiddenDocument;
        createdIframes.push(element);
      }
      return element;
    },
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
    fetch: async url => {
      const isGeneral = new URL(String(url), location.origin).searchParams.get("folder") === "1";
      const payload = {
        status: "ok",
        inbox: {
          threads: isGeneral ? [] : [{
            thread_id: "18199999999999999",
            users: [{
              pk: "299999999999999",
              username: "contato.desconhecido",
              full_name: "Contato Desconhecido"
            }],
            items: [{
              item_id: "18101000000015838",
              user_id: "299999999999999",
              text: "Teste",
              timestamp: "1770000000000000"
            }]
          }]
        }
      };
      return {
        ok: true,
        status: 200,
        async text() { return JSON.stringify(payload); }
      };
    },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN não respondeu")), 1000);
    pendingResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
    messageListener({
      source: window,
      data: { source: "flowsi-chatbot-inbox-request-v2", requestId: "home-api" }
    });
  });

  assert.equal(response.success, true);
  const thread = response.result.primary.find(item =>
    item.thread_id === "18199999999999999"
  );
  assert.ok(thread);
  assert.equal(thread.users[0].username, "contato.desconhecido");
  assert.equal(thread.items[0].item_id, "18101000000015838");
  assert.equal(thread.items[0].text, "Teste");
  assert.equal(response.result.visibleSource, "none");
  assert.equal(response.result.graphqlPrimaryThreads, 0);
  assert.equal(response.result.graphqlGeneralThreads, 0);
  assert.equal(iframeCreations, 0, "a Home não deve abrir iframe ou janela do Direct");
  assert.equal(location.pathname, "/");
  assert.equal(location.href, "https://www.instagram.com/");
});
