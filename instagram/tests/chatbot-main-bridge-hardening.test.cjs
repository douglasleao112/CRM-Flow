const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

const jsonResponse = payload => ({
  ok: true,
  status: 200,
  async json() { return structuredClone(payload); },
  async text() { return JSON.stringify(payload); }
});

function createHarness(fetchImpl) {
  const source = fs.readFileSync(mainPath, "utf8");
  const instrumented = source.replace(/\}\)\(\);\s*$/, `
    globalThis.__mainBridgeHardening = {
      fetchChatbotInboxFolder,
      fetchChatbotUnifiedInbox,
      readChatbotInbox,
      resolveUserSilently,
      hiddenSearchCache,
      pruneRealtimeChatbotToastSignatures,
      chatbotRealtimeToastSignatures,
      CHATBOT_REALTIME_EVENT_TTL_MS,
      CHATBOT_REALTIME_TOAST_ITEM_SIGNATURE_TTL_MS,
      CHATBOT_REALTIME_TOAST_FALLBACK_SIGNATURE_TTL_MS
    };
  })();`);

  let iframeCreations = 0;
  const createdIframes = [];
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
      appendChild() {},
      querySelectorAll() { return []; }
    },
    getElementById() { return null; },
    createElement(tagName) {
      const element = {
        id: "",
        style: {},
        attributes: new Map(),
        setAttribute(name, value) { this.attributes.set(name, String(value)); },
        getAttribute(name) { return this.attributes.get(name) || null; },
        remove() {}
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
  const window = {
    innerWidth: 1360,
    innerHeight: 900,
    addEventListener() {},
    removeEventListener() {},
    postMessage() {}
  };
  window.window = window;
  const context = {
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
    console: { info() {}, warn() {}, error() {} },
    document,
    fetch: fetchImpl,
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location: {
      origin: "https://www.instagram.com",
      pathname: "/",
      href: "https://www.instagram.com/"
    },
    setTimeout,
    structuredClone,
    window
  };
  context.globalThis = context;
  vm.runInNewContext(instrumented, context, { filename: mainPath });
  return {
    api: context.__mainBridgeHardening,
    iframeCreations: () => iframeCreations,
    createdIframes
  };
}

test("folder e unified ignoram HTTP 200 com payload invalido e tentam i.instagram.com", async () => {
  const urls = [];
  const expectedThread = {
    thread_id: "18130053334545517",
    users: [{ pk: "299999999999999", username: "cliente.teste" }],
    items: []
  };
  const harness = createHarness(async url => {
    const current = String(url);
    urls.push(current);
    if (current.startsWith("https://i.instagram.com")) {
      return jsonResponse({ status: "ok", inbox: { threads: [expectedThread] } });
    }
    if (current.includes("folder=")) {
      return jsonResponse({ status: "fail", inbox: { threads: [] } });
    }
    return jsonResponse({ status: "ok", inbox: { threads: {} } });
  });

  const folder = await harness.api.fetchChatbotInboxFolder(0);
  const unified = await harness.api.fetchChatbotUnifiedInbox();

  assert.equal(folder.length, 1);
  assert.equal(folder[0].thread_id, expectedThread.thread_id);
  assert.equal(unified.length, 1);
  assert.equal(unified[0].thread_id, expectedThread.thread_id);
  assert.equal(
    urls.filter(url => url.startsWith("https://i.instagram.com")).length,
    2,
    "cada leitura precisa consultar o segundo host depois de um HTTP 200 semanticamente invalido"
  );
});

test("na Home readChatbotInbox não abre iframe nem interface visível", async () => {
  const harness = createHarness(async () =>
    jsonResponse({ status: "ok", inbox: { threads: [] } })
  );

  const result = await harness.api.readChatbotInbox();

  assert.equal(result.visibleSource, "none");
  assert.equal(result.visibleThreads, 0);
  assert.equal(result.realtimeThreads, 0);
  assert.equal(result.graphqlPrimaryThreads, 0);
  assert.equal(result.graphqlGeneralThreads, 0);
  assert.equal(harness.iframeCreations(), 0);
});

test("a Home usa atividade GraphQL como watermark e busca somente a conversa alterada", () => {
  const source = fs.readFileSync(mainPath, "utf8");
  assert.match(source, /const chatbotGraphqlActivityByThread = new Map\(\)/);
  assert.match(source, /const chatbotGraphqlBaselineFolders = new Set\(\)/);
  assert.match(source, /activityTimestamp > previousActivity/);
  assert.match(source, /isRecentNewThread/);
  assert.match(source, /fetchChatbotDirectThread\(threadIdentifiers\)/);
  assert.match(source, /thread\.thread_fbid,\s*thread\.thread_key,\s*thread\.id,\s*thread\.thread_id/);
  assert.match(source, /CHATBOT_GRAPHQL_THREAD_DETAIL_DOC_ID = "29432273173041378"/);
  assert.match(source, /"IGDThreadDetailQuery"/);
  assert.match(source, /thread_fbid: threadKey/);
  assert.match(source, /item\._flowsiTimestampMs > Number\(previousActivityTimestamp \|\| 0\)/);
  assert.match(source, /direct_v2\/threads\/\$\{encodeURIComponent\(normalizedThreadId\)\}/);
  assert.match(source, /if \(refreshedThread\) \{\s*threads\.push\(refreshedThread\)/);
  assert.doesNotMatch(source, /CHATBOT_FLOATING_INBOX_AUTO_OPEN = true/);
});

test("dedupe por item_id permanece longo e fallback textual expira em no maximo 2s", () => {
  const harness = createHarness(async () =>
    jsonResponse({ status: "ok", inbox: { threads: [] } })
  );
  const now = 50_000;
  const signatures = harness.api.chatbotRealtimeToastSignatures;
  signatures.set("item-18101000000015838", now - 3_000);
  signatures.set("fallback-expirado", now - 2_001);
  signatures.set("fallback-recente", now - 1_999);

  harness.api.pruneRealtimeChatbotToastSignatures(now);

  assert.equal(
    harness.api.CHATBOT_REALTIME_TOAST_FALLBACK_SIGNATURE_TTL_MS,
    2_000
  );
  assert.equal(
    harness.api.CHATBOT_REALTIME_TOAST_ITEM_SIGNATURE_TTL_MS,
    harness.api.CHATBOT_REALTIME_EVENT_TTL_MS
  );
  assert.equal(signatures.has("item-18101000000015838"), true);
  assert.equal(signatures.has("fallback-expirado"), false);
  assert.equal(signatures.has("fallback-recente"), true);
});

test("resolveUserSilently nao eterniza uma busca nula no cache", async () => {
  let requests = 0;
  const harness = createHarness(async () => {
    requests += 1;
    return {
      ok: true,
      status: 200,
      async json() { return { users: [] }; }
    };
  });

  const first = await harness.api.resolveUserSilently(
    "Cliente sem resultado",
    "https://cdn.example/avatar.jpg",
    () => true
  );
  const second = await harness.api.resolveUserSilently(
    "Cliente sem resultado",
    "https://cdn.example/avatar.jpg",
    () => true
  );

  assert.equal(first, null);
  assert.equal(second, null);
  assert.equal(requests, 4, "cada tentativa nula deve poder consultar os dois hosts novamente");
  assert.equal(harness.api.hiddenSearchCache.size, 0);
});
