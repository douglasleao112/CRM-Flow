const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backgroundPath = path.join(
  __dirname,
  "../src/pages/background/index.js"
);

test("a Home complementa o bridge com inbox autenticado e processa o evento uma vez", async () => {
  const state = {
    bots: [{
      id: "bot-home",
      type: "comment",
      start: true,
      keywords: ["teste"],
      template: "Resposta",
      triggerDirect: true,
      addLabel: true,
      labelColumnId: "leads"
    }],
    quickMessages: [{ type: "text", title: "Resposta", content: "Olá <primeironome>" }],
    flowsiChatbotDirectBaselineReady: true,
    flowsiChatbotSeenDirect: [],
    flowsiChatbotCompletedActions: [],
    contactList: [],
    flowsiManualContacts: [],
    kanbanColumns: [
      { id: "all-chats", title: "Todas", profiles: [] },
      { id: "leads", title: "Leads", profiles: [] }
    ],
    flowsiKanbanAssignmentsV2: {}
  };
  const fetchUrls = [];
  const sent = [];
  const storageWrites = [];
  let runtimeListener = null;
  const event = listenerSetter => ({ addListener: listenerSetter });
  const chrome = {
    cookies: {
      getAll: async () => [{ name: "ds_user_id", value: "100" }],
      get: async () => null
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://www.instagram.com/", status: "complete" }],
      sendMessage: async (_tabId, payload) => {
        if (payload.action === "flowsiChatbotReadInbox") {
          return {
            success: true,
            viewerId: "100",
            primary: [{
              thread_id: "thread-merge",
              users: [{ pk: "200", username: "cliente.home" }],
              items: [{ item_id: "page-item", user_id: "200", text: "anterior" }]
            }],
            general: []
          };
        }
        if (payload.action === "flowsiChatbotReadVisibleInbox") {
          return { success: true, threads: [] };
        }
        if (payload.action === "flowsiChatbotSnapshotOutgoingMessage") {
          return { success: true, activeConversation: false };
        }
        if (payload.action === "flowsiChatbotSendMessageMain") {
          sent.push(payload);
          return { success: true, status: "sent", transport: "instagram-page-http" };
        }
        return { success: true, status: "sent" };
      }
    },
    storage: {
      local: {
        get: async keys => {
          const names = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.map(key => [key, state[key]]));
        },
        set: async values => {
          storageWrites.push(Object.keys(values));
          Object.assign(state, values);
        }
      }
    },
    runtime: {
      onMessage: event(listener => { runtimeListener = listener; }),
      onInstalled: event(() => {})
    },
    alarms: { create() {}, onAlarm: event(() => {}) }
  };
  const context = {
    chrome,
    console: { log() {}, error() {}, warn() {} },
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async url => {
      const currentUrl = String(url);
      fetchUrls.push(currentUrl);
      const isUnified = !currentUrl.includes("folder=");
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            viewer_id: "100",
            inbox: {
              threads: isUnified ? [{
                thread_id: "thread-merge",
                users: [{ pk: "200", username: "cliente.home", full_name: "Cliente Home" }],
                items: [{ item_id: "background-item", user_id: "200", text: "teste" }]
              }] : []
            }
          });
        }
      };
    }
  };
  context.globalThis = context;
  const source = fs.readFileSync(backgroundPath, "utf8") + `
    globalThis.__homeDirectApi = { fetchDirectInboxFromInstagramTab };
  `;
  vm.runInNewContext(source, context, { filename: backgroundPath });

  const inbox = await context.__homeDirectApi.fetchDirectInboxFromInstagramTab(1, "csrf");
  assert.equal(inbox.primary.length, 1, "fontes iguais devem virar uma única conversa");
  assert.deepEqual(
    [...inbox.primary[0].items].map(item => item.item_id).sort(),
    ["background-item", "page-item"],
    "a resposta vazia/incompleta da página não pode apagar itens do background"
  );
  assert.ok(fetchUrls.some(url => url.includes("direct_v2/inbox") && !url.includes("folder=")));
  assert.ok(fetchUrls.every(url => url.startsWith("https://i.instagram.com/")));

  const realtimeMessage = {
    action: "flowsiChatbotRealtimeEvent",
    viewerId: "100",
    eventId: "live-item",
    trustedThreadId: "18130053334545517",
    event: {
      eventId: "live-item",
      threadId: "18130053334545517",
      userId: "200",
      username: "cliente.home",
      fullName: "Cliente Home",
      text: "teste",
      timestamp: Date.now()
    }
  };
  const dispatch = message => new Promise((resolve, reject) => {
    const handled = runtimeListener(message, { tab: { id: 1 } }, response => {
      if (response?.success) resolve(response.result);
      else reject(new Error(response?.error || "evento não processado"));
    });
    assert.equal(handled, true);
  });
  await dispatch(realtimeMessage);
  await dispatch(realtimeMessage);

  assert.equal(sent.length, 1, "o mesmo eventId não pode disparar duas respostas");
  assert.equal(sent[0].threadId, "18130053334545517");
  assert.equal(sent[0].trustedThreadId, "18130053334545517");
  assert.equal(sent[0].viewerId, "100");
  assert.ok(
    state.flowsiChatbotCompletedActions.includes("live-item:bot-home:direct-dm"),
    "o ack precisa ser persistido para sobreviver ao encerramento do worker"
  );
  assert.ok(
    state.flowsiChatbotCompletedActions.includes("live-item:bot-home:label:leads"),
    "a etiqueta precisa ter confirmação própria para não repetir a atribuição"
  );
  assert.equal(
    state.flowsiKanbanAssignmentsV2["cliente.home"]?.columnId,
    "leads",
    "o contato respondido deve ser adicionado à coluna escolhida"
  );
  assert.equal(
    state.kanbanColumns.find(column => column.id === "leads")?.profiles.length,
    1,
    "o mesmo evento não pode duplicar o card na coluna"
  );
  const completedWrite = storageWrites.findIndex(keys =>
    keys.length === 1 && keys[0] === "flowsiChatbotCompletedActions"
  );
  const diagnosticWrite = storageWrites.findIndex(keys => keys.includes("flowsiChatbotDiagnostics"));
  assert.ok(completedWrite >= 0 && diagnosticWrite > completedWrite);
});
