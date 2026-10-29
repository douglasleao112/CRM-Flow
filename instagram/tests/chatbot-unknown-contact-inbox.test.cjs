const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const loaderPath = path.join(
  __dirname,
  "../src/pages/content/contact-loader.js"
);

test("painel fechado detecta gatilho de contato fora do CRM no inbox", async () => {
  const source = fs.readFileSync(loaderPath, "utf8");
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/direct/inbox/"
  };
  let threadOpen = false;
  let runtimeListener = null;
  let savedState = null;

  const senderLabel = {
    getAttribute(name) {
      return name === "aria-label" ? "mensagem de cliente.novo" : "";
    }
  };
  const article = {
    id: "",
    innerText: "Teste",
    textContent: "Teste",
    parentElement: {
      querySelectorAll(selector) {
        return selector === "[aria-label]" ? [senderLabel] : [];
      }
    },
    getAttribute(name) {
      if (name === "aria-labelledby") return "message-client-new-1";
      return "";
    },
    getBoundingClientRect() {
      return { top: 300 };
    }
  };
  const row = {
    innerText: "Cliente Novo\nTeste\nAgora",
    textContent: "Cliente Novo\nTeste\nAgora",
    querySelector(selector) {
      return selector === "img" ? {} : null;
    },
    getBoundingClientRect() {
      return { width: 280, height: 72 };
    },
    getAttribute() {
      return "";
    },
    click() {
      threadOpen = true;
      location.pathname = "/direct/t/thread-new-contact/";
    }
  };
  const conversationList = {
    querySelectorAll() {
      return [row];
    }
  };
  const main = {
    querySelectorAll() {
      return [];
    }
  };
  const inboxLink = {
    click() {
      threadOpen = false;
      location.pathname = "/direct/inbox/";
    }
  };
  const document = {
    documentElement: { setAttribute() {} },
    querySelector(selector) {
      if (selector.includes("Lista de tópicos")) return conversationList;
      if (selector === 'main[role="main"], main') return main;
      if (selector === 'a[href="/direct/inbox/"]') return inboxLink;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[role="article"][aria-roledescription="message"]') {
        return threadOpen ? [article] : [];
      }
      return [];
    }
  };
  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          runtimeListener = listener;
        }
      }
    },
    storage: {
      local: {
        async get() {
          // Deliberately empty: the sender is absent from every CRM source.
          return {};
        },
        async set(value) {
          if (value.flowsiChatbotDomInboxState) {
            savedState = value.flowsiChatbotDomInboxState;
          }
        }
      }
    }
  };
  const window = {
    setTimeout(callback) {
      return setTimeout(callback, 0);
    },
    clearTimeout,
    addEventListener() {},
    removeEventListener() {},
    postMessage() {}
  };
  window.window = window;

  vm.runInNewContext(source, {
    chrome,
    clearTimeout,
    console,
    document,
    location,
    setTimeout,
    URL,
    window
  }, { filename: loaderPath });

  assert.equal(typeof runtimeListener, "function");
  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("bridge não respondeu")), 1000);
    const keepChannelOpen = runtimeListener(
      { action: "flowsiChatbotReadVisibleInbox" },
      {},
      value => {
        clearTimeout(timeout);
        resolve(value);
      }
    );
    assert.equal(keepChannelOpen, true);
  });

  assert.equal(response.success, true);
  assert.equal(response.threads.length, 1);
  assert.equal(response.threads[0].thread_id, "thread-new-contact");
  assert.equal(response.threads[0].users[0].username, "cliente.novo");
  assert.equal(response.threads[0].items[0].text, "Teste");
  assert.match(response.threads[0].items[0].item_id, /^dom-open-cliente\.novo-/);
  assert.ok(savedState["cliente.novo"]);
  assert.equal(location.pathname, "/direct/inbox/", "a inspeção deve restaurar a rota original");
});
