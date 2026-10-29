const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backgroundPath = path.join(__dirname, "../src/pages/background/index.js");

function createHarness({ fetchImpl, initialState = {}, cookieUserId = "222" } = {}) {
  const state = { ...initialState };
  const sent = [];
  const listeners = {};
  const event = name => ({ addListener(listener) { listeners[name] = listener; } });
  const chrome = {
    cookies: {
      getAll: async () => [
        { name: "ds_user_id", value: cookieUserId },
        { name: "csrftoken", value: "csrf" }
      ],
      get: async () => null
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://www.instagram.com/", status: "complete" }],
      get: async id => ({ id, url: "https://www.instagram.com/", status: "complete" }),
      sendMessage: async (_tabId, payload) => {
        if (payload.action === "flowsiChatbotSnapshotOutgoingMessage") {
          return { success: true, activeConversation: false };
        }
        if (payload.action === "flowsiChatbotSendMessageMain") {
          sent.push(payload);
          return { success: true, status: "sent", transport: "instagram-page-http" };
        }
        return { success: true, primary: [], general: [], threads: [] };
      },
      onUpdated: event("tabsUpdated"),
      onActivated: event("tabsActivated")
    },
    storage: {
      local: {
        get: async keys => {
          const names = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.map(key => [key, state[key]]));
        },
        set: async values => Object.assign(state, values)
      },
      onChanged: event("storageChanged")
    },
    runtime: {
      onMessage: event("runtimeMessage"),
      onInstalled: event("runtimeInstalled"),
      onStartup: event("runtimeStartup")
    },
    alarms: {
      get: async () => ({ periodInMinutes: 1 }),
      create() {},
      onAlarm: event("alarm")
    }
  };
  const context = {
    chrome,
    console: { log() {}, warn() {}, error() {} },
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: fetchImpl || (async () => ({
      ok: true,
      status: 200,
      async text() { return JSON.stringify({ status: "ok", inbox: { threads: [] } }); }
    }))
  };
  context.globalThis = context;
  const source = fs.readFileSync(backgroundPath, "utf8") + `
    globalThis.__stateHardeningApi = {
      fetchDirectInboxFolder,
      persistCompletedActionsUnion,
      processDirectInbox,
      processChatbotRealtimeEvent
    };
  `;
  vm.runInNewContext(source, context, { filename: backgroundPath });
  return { api: context.__stateHardeningApi, state, sent, listeners };
}

test("um HTTP 200 inválido não impede tentar o segundo host do inbox", async () => {
  const urls = [];
  const harness = createHarness({
    fetchImpl: async url => {
      urls.push(String(url));
      const firstHost = String(url).startsWith("https://i.instagram.com/");
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify(firstHost
            ? { status: "fail", message: "login_required" }
            : {
                status: "ok",
                viewer_id: "222",
                inbox: {
                  threads: [{ thread_id: "18130053334545517", users: [], items: [] }]
                }
              });
        }
      };
    }
  });

  const result = await harness.api.fetchDirectInboxFolder(0, "csrf");
  assert.equal(urls.length, 2);
  assert.match(urls[0], /^https:\/\/i\.instagram\.com\//);
  assert.match(urls[1], /^https:\/\/www\.instagram\.com\//);
  assert.equal(result.host, "www.instagram.com");
  assert.equal(result.viewerId, "222");
  assert.equal(result.threads[0]._flowsiTrustedThreadId, "18130053334545517");
});

test("um HTTP 200 sem inbox também continua para o host seguinte", async () => {
  const urls = [];
  const harness = createHarness({
    fetchImpl: async url => {
      urls.push(String(url));
      const firstHost = String(url).startsWith("https://i.instagram.com/");
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify(firstHost
            ? { status: "ok", message: "resposta parcial" }
            : { status: "ok", inbox: { threads: [] } });
        }
      };
    }
  });

  const result = await harness.api.fetchDirectInboxFolder(1, "csrf");
  assert.equal(urls.length, 2);
  assert.equal(result.host, "www.instagram.com");
  assert.equal(result.threads.length, 0);
});

test("acks concorrentes são persistidos por união serializada", async () => {
  const harness = createHarness({
    initialState: { flowsiChatbotCompletedActions: ["existing"] }
  });
  await Promise.all([
    harness.api.persistCompletedActionsUnion(["comment:dm"]),
    harness.api.persistCompletedActionsUnion(["direct:dm"])
  ]);
  assert.deepEqual(
    [...harness.state.flowsiChatbotCompletedActions].sort(),
    ["comment:dm", "direct:dm", "existing"]
  );
});

test("troca de conta cria baseline segura e realtime sem viewer usa o cookie", async () => {
  const now = Date.now() * 1000;
  const harness = createHarness({
    cookieUserId: "222",
    initialState: {
      bots: [{
        id: "bot",
        type: "comment",
        start: true,
        keywords: ["teste"],
        template: "Resposta",
        triggerDirect: true
      }],
      quickMessages: [{ type: "text", title: "Resposta", content: "Olá <primeironome>" }],
      flowsiChatbotCompletedActions: [],
      flowsiChatbotSeenDirect: ["seen-on-111"],
      flowsiChatbotDirectBaselineReady: true,
      flowsiChatbotDirectActiveViewerId: "111",
      flowsiChatbotDirectStateByViewer: {
        111: { seen: ["seen-on-111"], baselineReady: true, updatedAt: Date.now() }
      }
    }
  });
  const trustedThreadId = "18130053334545517";
  const thread = item => ({
    thread_id: trustedThreadId,
    _flowsiTrustedThreadId: trustedThreadId,
    users: [{ pk: "333", username: "cliente.teste", full_name: "Cliente Teste" }],
    items: [item]
  });

  await harness.api.processDirectInbox(1, [thread({
    item_id: "history-on-222",
    user_id: "333",
    text: "teste",
    timestamp: now
  })], harness.state.bots, "222");
  assert.equal(harness.sent.length, 0, "a troca de conta não pode disparar o histórico recente");
  assert.equal(
    harness.state.flowsiChatbotDirectStateByViewer["222"].seen.includes("history-on-222"),
    true
  );
  assert.deepEqual(
    [...harness.state.flowsiChatbotDirectStateByViewer["111"].seen],
    ["seen-on-111"]
  );

  await harness.api.processDirectInbox(1, [thread({
    item_id: "new-on-222",
    user_id: "333",
    text: "teste",
    timestamp: now + 1000
  })], harness.state.bots, "222");
  assert.equal(harness.sent.length, 1);
  assert.equal(harness.sent[0].viewerId, "222");
  assert.equal(harness.sent[0].trustedThreadId, trustedThreadId);

  await harness.api.processChatbotRealtimeEvent({
    eventId: "realtime-without-viewer",
    trustedThreadId,
    thread: thread({
      item_id: "realtime-without-viewer",
      user_id: "333",
      text: "teste",
      timestamp: now + 2000
    })
  }, 1);
  assert.equal(harness.sent.length, 2);
  assert.equal(harness.sent[1].viewerId, "222", "o cookie ds_user_id deve preencher o realtime");
  assert.equal(harness.sent[1].trustedThreadId, trustedThreadId);
});
