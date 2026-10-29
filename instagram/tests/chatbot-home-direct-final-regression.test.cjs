const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backgroundPath = path.join(
  __dirname,
  "../src/pages/background/index.js"
);
const loaderPath = path.join(
  __dirname,
  "../src/pages/content/contact-loader.js"
);

const asResponse = payload => ({
  ok: true,
  status: 200,
  async json() { return payload; },
  async text() { return JSON.stringify(payload); }
});

const event = listeners => ({
  addListener(listener) {
    listeners.push(listener);
  }
});

function createBackgroundHarness({ pageInbox, backgroundThreads = [] } = {}) {
  const bot = {
    id: "bot-home-direct",
    type: "comment",
    start: true,
    keywords: ["teste"],
    template: "Resposta",
    triggerDirect: true
  };
  const state = {
    bots: [bot],
    quickMessages: [{ type: "text", title: "Resposta", content: "Olá <primeironome>" }],
    flowsiChatbotDirectBaselineReady: true,
    flowsiChatbotNotificationBaselineReady: true,
    flowsiChatbotSeenDirect: [],
    flowsiChatbotSeenComments: [],
    flowsiChatbotSeenFollowers: [],
    flowsiChatbotCompletedActions: [],
    lastRunTime: 0
  };
  const listeners = {
    runtime: [],
    alarm: [],
    installed: [],
    startup: [],
    storage: [],
    tabUpdated: [],
    tabActivated: []
  };
  const sentMessages = [];
  const fetchUrls = [];
  const createdTabs = [];
  const updatedTabs = [];
  const tabs = [{
    id: 41,
    url: "https://www.instagram.com/",
    status: "complete",
    active: true,
    discarded: false
  }];
  const pageResult = pageInbox || {
    success: true,
    primary: [],
    general: [],
    viewerId: "999999999999999"
  };

  const chrome = {
    cookies: {
      // Deliberately omit `rur`: the authenticated inbox viewerId must remain
      // a usable sender hint even when Chrome cannot expose that cookie.
      getAll: async () => [
        { name: "csrftoken", value: "csrf" },
        { name: "ds_user_id", value: "999999999999999" }
      ],
      get: async () => null
    },
    tabs: {
      query: async () => tabs,
      get: async tabId => tabs.find(tab => tab.id === tabId),
      create: async options => {
        createdTabs.push(options);
        return { id: 99, ...options };
      },
      update: async (tabId, options) => {
        updatedTabs.push({ tabId, options });
        return tabs.find(tab => tab.id === tabId) || null;
      },
      sendMessage: async (_tabId, message) => {
        sentMessages.push(structuredClone(message));
        if (message?.action === "flowsiChatbotReadInbox") return structuredClone(pageResult);
        if (message?.action === "flowsiChatbotReadVisibleInbox") {
          return { success: true, threads: [] };
        }
        if (message?.action === "flowsiChatbotReadNotifications") {
          return { success: true, notifications: [] };
        }
        if (message?.action === "flowsiChatbotSnapshotOutgoingMessage") {
          return { success: false, activeConversation: false };
        }
        if (message?.action === "flowsiChatbotSendMessageMain") {
          return { success: true, status: "sent", transport: "test-main" };
        }
        if (message?.action === "flowsiChatbotSendMessage") {
          return { success: true, status: "sent", transport: "test-fallback" };
        }
        return { success: true };
      },
      onUpdated: event(listeners.tabUpdated),
      onActivated: event(listeners.tabActivated)
    },
    storage: {
      local: {
        async get(keys) {
          const names = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.map(key => [key, state[key]]));
        },
        async set(values) {
          Object.assign(state, structuredClone(values));
        }
      },
      onChanged: event(listeners.storage)
    },
    runtime: {
      onMessage: event(listeners.runtime),
      onInstalled: event(listeners.installed),
      onStartup: event(listeners.startup)
    },
    alarms: {
      get: async () => null,
      create() {},
      onAlarm: event(listeners.alarm)
    }
  };
  const fetch = async url => {
    const currentUrl = String(url);
    fetchUrls.push(currentUrl);
    if (currentUrl.includes("direct_v2/inbox")) {
      const folder = new URL(currentUrl).searchParams.get("folder");
      return asResponse({
        inbox: {
          threads: folder === "1" ? [] : structuredClone(backgroundThreads)
        }
      });
    }
    return asResponse({ status: "ok", old_stories: [], new_stories: [] });
  };
  const context = {
    chrome,
    console: { log() {}, warn() {}, error() {} },
    URL,
    URLSearchParams,
    AbortController,
    structuredClone,
    setTimeout,
    clearTimeout,
    fetch
  };
  context.globalThis = context;
  const source = fs.readFileSync(backgroundPath, "utf8") + `
    globalThis.__homeDirectFinalApi = {
      checkNotifications,
      fetchDirectInboxFromInstagramTab,
      processDirectInbox,
      readDirectItemText,
      sendMessageToInstagram
    };
  `;
  vm.runInNewContext(source, context, { filename: backgroundPath });

  return {
    api: context.__homeDirectFinalApi,
    bot,
    state,
    listeners,
    sentMessages,
    fetchUrls,
    createdTabs,
    updatedTabs,
    tabs
  };
}

test("na Home o background complementa a ponte vazia sem abrir nem navegar para o Direct", async () => {
  const incoming = {
    thread_id: "18130053334545517",
    users: [{
      pk: "299999999999999",
      username: "cliente.teste",
      full_name: "Cliente Teste"
    }],
    items: [{
      item_id: "18101000000015838",
      user_id: "299999999999999",
      text: "teste",
      timestamp: String(Date.now() * 1000)
    }]
  };
  const harness = createBackgroundHarness({ backgroundThreads: [incoming] });
  const originalUrl = harness.tabs[0].url;

  const result = await harness.api.checkNotifications({
    force: true,
    preferredTabId: 41
  });

  assert.equal(result.directThreads, 1);
  assert.equal(result.direct.candidates, 1);
  assert.equal(result.direct.matched, 1);
  assert.equal(result.direct.sent, 1);
  assert.ok(
    harness.fetchUrls.some(url => url.includes("direct_v2/inbox")),
    "uma ponte de página válida porém vazia precisa ser complementada pelo inbox autenticado"
  );
  assert.deepEqual(harness.createdTabs, [], "o polling não pode criar uma aba /direct/");
  assert.deepEqual(harness.updatedTabs, [], "o polling não pode navegar a aba visível");
  assert.equal(harness.tabs[0].url, originalUrl);
});

test("o merge por thread preserva todos os item_ids vindos da página e do background", async () => {
  const common = {
    thread_id: "18130053334545517",
    users: [{
      pk: "299999999999999",
      username: "cliente.teste",
      full_name: "Cliente Teste"
    }]
  };
  const pageItem = {
    item_id: "18101000000015838",
    user_id: "299999999999999",
    text: "teste",
    timestamp: "1770000000000000"
  };
  const backgroundItem = {
    item_id: "18101000000015839",
    user_id: "299999999999999",
    text: "teste",
    timestamp: "1770000001000000"
  };
  const harness = createBackgroundHarness({
    pageInbox: {
      success: true,
      primary: [{ ...common, items: [pageItem] }],
      general: [],
      viewerId: "999999999999999"
    },
    backgroundThreads: [{ ...common, items: [backgroundItem] }]
  });

  const inbox = await harness.api.fetchDirectInboxFromInstagramTab(41, "csrf");
  const merged = [...inbox.primary, ...inbox.general]
    .filter(thread => String(thread.thread_id) === common.thread_id)
    .flatMap(thread => Array.isArray(thread.items) ? thread.items : []);
  const itemIds = new Set(merged.map(item => String(item.item_id)));

  assert.deepEqual(
    [...itemIds].sort(),
    [pageItem.item_id, backgroundItem.item_id].sort(),
    "deduplicar o thread_id não pode descartar uma mensagem diferente"
  );
  assert.deepEqual(harness.createdTabs, []);
  assert.deepEqual(harness.updatedTabs, []);
});

test("Direct, reel_share e story_share mantêm o item_id real e disparam eventos distintos", async () => {
  const ids = [
    "18101000000015838",
    "18101000000015839",
    "18101000000015840",
    "18101000000015841"
  ];
  const harness = createBackgroundHarness();
  const thread = {
    thread_id: "18130053334545517",
    users: [{
      pk: "299999999999999",
      username: "cliente.teste",
      full_name: "Cliente Teste"
    }],
    items: [
      { item_id: ids[0], user_id: "299999999999999", text: "teste", timestamp: "1770000000000000" },
      { item_id: ids[1], user_id: "299999999999999", reel_share: { text: "teste" }, timestamp: "1770000001000000" },
      { item_id: ids[2], user_id: "299999999999999", story_share: { text: "teste" }, timestamp: "1770000002000000" },
      // Texto idêntico, mas é outra mensagem real e não pode ser deduplicada pelo conteúdo.
      { item_id: ids[3], user_id: "299999999999999", text: "teste", timestamp: "1770000003000000" }
    ]
  };

  const first = await harness.api.processDirectInbox(
    41,
    [thread],
    [harness.bot],
    "999999999999999"
  );
  const sends = harness.sentMessages.filter(message =>
    message.action === "flowsiChatbotSendMessageMain"
  );

  assert.equal(first.candidates, 4);
  assert.equal(first.matched, 4);
  assert.equal(first.sent, 4);
  assert.equal(sends.length, 4);
  assert.ok(ids.every(id => harness.state.flowsiChatbotSeenDirect.includes(id)));
  assert.ok(
    sends.every(message => message.threadId === thread.thread_id),
    "o sender precisa receber o threadId confiável detectado no inbox"
  );
  assert.ok(
    sends.every(message => message.viewerId === "999999999999999"),
    "o viewerId autenticado do inbox precisa chegar ao sender mesmo sem cookie rur"
  );

  const before = sends.length;
  const second = await harness.api.processDirectInbox(
    41,
    [thread],
    [harness.bot],
    "999999999999999"
  );
  assert.equal(second.skippedSeen, 4);
  assert.equal(
    harness.sentMessages.filter(message => message.action === "flowsiChatbotSendMessageMain").length,
    before,
    "reler os mesmos item_ids não pode repetir a resposta"
  );
});

test("o background processa o evento realtime da Home sem depender de uma releitura do inbox", async () => {
  const harness = createBackgroundHarness();
  const message = {
    action: "flowsiChatbotRealtimeEvent",
    eventId: "18101000000015838",
    viewerId: "999999999999999",
    thread: {
      thread_id: "18130053334545517",
      users: [{
        pk: "299999999999999",
        username: "cliente.teste",
        full_name: "Cliente Teste"
      }],
      items: [{
        item_id: "18101000000015838",
        user_id: "299999999999999",
        story_share: { text: "teste" },
        timestamp: String(Date.now() * 1000)
      }]
    }
  };

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("background não respondeu")), 1000);
    const keepChannelOpen = harness.listeners.runtime[0](
      message,
      { tab: { id: 41, url: "https://www.instagram.com/" } },
      value => {
        clearTimeout(timeout);
        resolve(value);
      }
    );
    assert.equal(keepChannelOpen, true);
  });

  assert.equal(response.success, true);
  assert.equal(response.result.status, "processed");
  assert.equal(response.result.direct.candidates, 1);
  assert.equal(response.result.direct.matched, 1);
  assert.equal(response.result.direct.sent, 1);
  const send = harness.sentMessages.find(current =>
    current.action === "flowsiChatbotSendMessageMain"
  );
  assert.equal(send?.threadId, message.thread.thread_id);
  assert.equal(send?.viewerId, message.viewerId);
  assert.deepEqual(harness.createdTabs, []);
  assert.deepEqual(harness.updatedTabs, []);
  assert.equal(harness.tabs[0].url, "https://www.instagram.com/");
});

test("o loader serializa o evento realtime completo ao acordar o background", () => {
  const messageListeners = [];
  const runtimeMessages = [];
  const runtimeListeners = [];
  const document = {
    documentElement: { setAttribute() {} },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const window = {
    addEventListener(type, listener) {
      if (type === "message") messageListeners.push(listener);
    },
    removeEventListener() {},
    postMessage() {},
    setTimeout,
    clearTimeout
  };
  window.window = window;
  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        runtimeMessages.push(structuredClone(message));
        callback?.({
          success: true,
          result: { status: "processed", threads: 1 }
        });
      },
      onMessage: event(runtimeListeners)
    },
    storage: {
      local: {
        async get() { return {}; },
        async set() {}
      }
    }
  };
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/",
    href: "https://www.instagram.com/"
  };
  const context = {
    chrome,
    console: { log() {}, warn() {}, error() {} },
    document,
    location,
    window,
    URL,
    structuredClone,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(fs.readFileSync(loaderPath, "utf8"), context, {
    filename: loaderPath
  });

  const realtimeEvent = {
    source: "flowsi-chatbot-realtime-event-v2",
    eventId: "18101000000015838",
    viewerId: "999999999999999",
    thread: {
      thread_id: "18130053334545517",
      users: [{ pk: "299999999999999", username: "cliente.teste" }],
      items: [{
        item_id: "18101000000015838",
        user_id: "299999999999999",
        story_share: { text: "teste" }
      }]
    }
  };
  for (const listener of messageListeners) {
    listener({ source: window, data: realtimeEvent });
  }

  assert.ok(runtimeMessages.length >= 1);
  const realtimeRuntimeMessage = runtimeMessages.find(message =>
    message.action === "flowsiChatbotRealtimeEvent"
  );
  assert.equal(
    runtimeMessages[0].action,
    "flowsiChatbotRealtimeEvent",
    "o evento estruturado precisa usar o canal dedicado antes do fallback de polling"
  );
  assert.ok(realtimeRuntimeMessage, "o canal dedicado realtime precisa ser enviado");
  assert.equal(
    runtimeMessages.length,
    1,
    "um evento dedicado confirmado não deve repetir a leitura completa do inbox"
  );
  const serialized = JSON.stringify(realtimeRuntimeMessage);
  for (const expected of [
    realtimeEvent.eventId,
    realtimeEvent.viewerId,
    realtimeEvent.thread.thread_id,
    realtimeEvent.thread.users[0].username,
    realtimeEvent.thread.items[0].story_share.text
  ]) {
    assert.ok(
      serialized.includes(expected),
      `o payload encaminhado perdeu o dado realtime: ${expected}`
    );
  }
  assert.equal(location.pathname, "/");
});
