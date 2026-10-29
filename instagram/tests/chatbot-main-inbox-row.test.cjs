const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

test("MAIN combina linha recente desconhecida sem abrir a conversa", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  class FakeNode {}
  let rowClicks = 0;
  let messageListener = null;
  let resolveResponse;

  const leaf = text => ({
    children: [],
    textContent: text
  });
  const image = {
    alt: "Foto do perfil",
    currentSrc: "https://cdn.example/client.jpg",
    src: "https://cdn.example/client.jpg"
  };
  const row = {
    innerText: "Cliente Novo\nTeste\nAgora",
    textContent: "Cliente Novo\nTeste\nAgora",
    parentElement: null,
    __reactProps$chatbot: {
      thread_id: "18100000000000001",
      user: {
        pk: "200000000000001",
        username: "cliente.novo",
        full_name: "Cliente Novo",
        profile_pic_url: image.src
      }
    },
    querySelectorAll(selector) {
      if (selector === "img") return [image];
      if (selector === "span, div") return [leaf("Cliente Novo"), leaf("Teste"), leaf("Agora")];
      if (selector === "a[href]") return [];
      return [];
    },
    getBoundingClientRect() {
      return { width: 300, height: 72 };
    },
    getAttribute() {
      return "";
    },
    click() {
      rowClicks += 1;
    }
  };
  const listRoot = {
    parentElement: null,
    querySelectorAll(selector) {
      return selector === 'button, [role="button"]' ? [row] : [];
    },
    getBoundingClientRect() {
      return { width: 360, height: 700 };
    }
  };
  row.parentElement = listRoot;

  const document = {
    body: {},
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    documentElement: { appendChild() {} },
    getElementById() {
      return null;
    },
    createElement() {
      return { setAttribute() {} };
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes("Lista de tópicos")) return [listRoot];
      if (selector === "a[href]") return [];
      return [];
    }
  };
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/direct/inbox/"
  };
  const window = {
    addEventListener(type, listener) {
      if (type === "message") messageListener = listener;
    },
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    postMessage(value) {
      if (value?.source === "flowsi-chatbot-inbox-response-v2") resolveResponse?.(value);
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
    Node: FakeNode,
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    document,
    fetch: async () => ({
      ok: true,
      async json() {
        return { inbox: { threads: [] } };
      }
    }),
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  assert.equal(typeof messageListener, "function");
  const response = await new Promise((resolve, reject) => {
    resolveResponse = resolve;
    const timeout = setTimeout(() => reject(new Error("MAIN não respondeu")), 1000);
    messageListener({
      source: window,
      data: {
        source: "flowsi-chatbot-inbox-request-v2",
        requestId: "unknown-contact-test"
      }
    });
    resolveResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
  });

  assert.equal(response.success, true);
  assert.equal(response.result.primary.length, 1);
  assert.equal(response.result.visibleThreads, 1);
  assert.equal(response.result.primary[0].thread_id, "18100000000000001");
  assert.equal(response.result.primary[0].users[0].username, "cliente.novo");
  assert.equal(response.result.primary[0].items[0].text, "Teste");
  assert.equal(rowClicks, 0, "a leitura MAIN não deve navegar para a conversa");
  assert.equal(location.pathname, "/direct/inbox/");
});
