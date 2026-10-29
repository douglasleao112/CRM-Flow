const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const backgroundPath = path.join(
  __dirname,
  "..",
  "src",
  "pages",
  "background",
  "index.js"
);

const waitForWorker = () => new Promise(resolve => setTimeout(resolve, 25));

function createHarness() {
  const bot = {
    id: "bot-scheduler",
    type: "comment",
    start: true,
    keywords: ["teste"],
    template: "Resposta",
    triggerDirect: true
  };
  const state = {
    bots: [bot],
    quickMessages: [{ type: "text", title: "Resposta", content: "Olá" }],
    flowsiChatbotDirectBaselineReady: true,
    flowsiChatbotNotificationBaselineReady: true,
    flowsiChatbotSeenDirect: [],
    flowsiChatbotSeenComments: [],
    flowsiChatbotSeenFollowers: [],
    flowsiChatbotCompletedActions: []
  };
  const listeners = {
    alarm: [],
    installed: [],
    startup: [],
    storage: [],
    tabUpdated: [],
    tabActivated: []
  };
  let alarm = null;
  let queryCalls = 0;
  const inboxReadTabIds = [];
  let tabs = [
    {
      id: 1,
      url: "https://www.instagram.com/direct/inbox/",
      status: "complete",
      active: true,
      discarded: true
    },
    {
      id: 2,
      url: "https://www.instagram.com/direct/t/loading/",
      status: "loading",
      active: true,
      discarded: false
    },
    {
      id: 3,
      url: "https://www.instagram.com/direct/inbox/",
      status: "complete",
      active: false,
      discarded: false
    },
    {
      id: 4,
      url: "https://www.instagram.com/explore/",
      status: "complete",
      active: true,
      discarded: false
    }
  ];

  const event = target => ({
    addListener(listener) {
      target.push(listener);
    }
  });
  const chrome = {
    cookies: {
      getAll: async () => [],
      get: async () => null
    },
    tabs: {
      query: async () => {
        queryCalls += 1;
        await new Promise(resolve => setTimeout(resolve, 10));
        return tabs;
      },
      get: async tabId => tabs.find(tab => tab.id === tabId),
      sendMessage: async (tabId, payload) => {
        if (payload?.action === "flowsiChatbotReadInbox") {
          inboxReadTabIds.push(tabId);
          return { success: true, primary: [], general: [], viewerId: "100" };
        }
        if (payload?.action === "flowsiChatbotReadVisibleInbox") {
          return { success: true, threads: [] };
        }
        return { success: true, status: "sent" };
      },
      create: async () => ({}),
      update: async () => ({}),
      onUpdated: event(listeners.tabUpdated),
      onActivated: event(listeners.tabActivated)
    },
    storage: {
      local: {
        get: async keys => {
          const names = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.map(key => [key, state[key]]));
        },
        set: async values => Object.assign(state, values)
      },
      onChanged: event(listeners.storage)
    },
    runtime: {
      onMessage: event([]),
      onInstalled: event(listeners.installed),
      onStartup: event(listeners.startup)
    },
    alarms: {
      get: async name => alarm?.name === name ? alarm : null,
      create: (name, options) => {
        alarm = { name, ...options };
      },
      onAlarm: event(listeners.alarm)
    }
  };
  const context = {
    chrome,
    console: { log() {}, error() {} },
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
      text: async () => ""
    })
  };
  context.globalThis = context;
  const source = fs.readFileSync(backgroundPath, "utf8") + `
    globalThis.__schedulerTestApi = {
      checkNotifications,
      ensureChatbotAlarm,
      getInstagramTabId,
      requestChatbotCheck
    };
  `;
  vm.runInNewContext(source, context, { filename: backgroundPath });
  return {
    api: context.__schedulerTestApi,
    bot,
    listeners,
    state,
    get alarm() { return alarm; },
    get queryCalls() { return queryCalls; },
    get inboxReadTabIds() { return [...inboxReadTabIds]; },
    resetQueryCalls() { queryCalls = 0; },
    setTabs(nextTabs) { tabs = nextTabs; }
  };
}

test("o chatbot roda sem painel/modal aberto e mantém somente uma verificação concorrente", async () => {
  const harness = createHarness();
  // The VM intentionally has no document, window or modal mock. A background
  // check must depend only on the Instagram tab/content bridge.
  assert.equal(await harness.api.getInstagramTabId(), 3);
  harness.resetQueryCalls();

  const first = harness.api.checkNotifications({ force: true });
  const second = harness.api.checkNotifications({ force: true });
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(harness.queryCalls, 1, "duas chamadas simultâneas não podem duplicar o polling");
  assert.deepEqual(firstResult, secondResult);
  assert.deepEqual(harness.state.bots, [harness.bot], "o scheduler não pode limpar os bots");
});

test("uma aba Instagram em navegação continua disponível para o chatbot", async () => {
  const harness = createHarness();
  harness.setTabs([{
    id: 9,
    url: "https://www.instagram.com/",
    status: "loading",
    active: true,
    discarded: false
  }]);

  assert.equal(
    await harness.api.getInstagramTabId(),
    9,
    "o status loading de uma navegação SPA não pode desligar o chatbot"
  );
});

test("o evento em tempo real consulta a própria aba Home mesmo com outra aba Direct aberta", async () => {
  const harness = createHarness();
  assert.equal(await harness.api.getInstagramTabId(4), 4);
  harness.resetQueryCalls();

  await harness.api.checkNotifications({ force: true, preferredTabId: 4 });

  assert.equal(harness.queryCalls, 1);
  assert.ok(harness.inboxReadTabIds.length >= 1);
  assert.ok(
    harness.inboxReadTabIds.every(tabId => tabId === 4),
    "a leitura do evento flutuante não pode migrar para a aba /direct/"
  );
});

test("um evento da Home que chega durante o polling agenda uma leitura imediata da aba correta", async () => {
  const harness = createHarness();
  harness.resetQueryCalls();

  const polling = harness.api.checkNotifications({ force: true });
  const realtime = harness.api.checkNotifications({ force: true, preferredTabId: 4 });
  await Promise.all([polling, realtime]);

  assert.equal(harness.queryCalls, 2, "o evento não pode ser perdido dentro do polling concorrente");
  assert.ok(harness.inboxReadTabIds.includes(3));
  assert.ok(harness.inboxReadTabIds.includes(4));
});

test("o worker garante o alarme e acorda ao instalar, iniciar, mudar bots e ativar o Instagram", async () => {
  const harness = createHarness();
  await harness.api.ensureChatbotAlarm();
  assert.equal(harness.alarm?.name, "checkNotif");
  assert.equal(harness.alarm?.periodInMinutes, 1);
  assert.equal(harness.listeners.alarm.length, 1);
  assert.equal(harness.listeners.installed.length, 1);
  assert.equal(harness.listeners.startup.length, 1);
  assert.equal(harness.listeners.storage.length, 1);
  assert.equal(harness.listeners.tabUpdated.length, 1);
  assert.equal(harness.listeners.tabActivated.length, 1);

  harness.resetQueryCalls();
  harness.state.lastRunTime = Date.now();
  harness.listeners.storage[0]({ bots: { oldValue: [], newValue: [harness.bot] } }, "local");
  await waitForWorker();
  assert.equal(
    harness.queryCalls,
    1,
    "alterar os bots deve forçar uma verificação mesmo dentro do intervalo normal"
  );

  harness.resetQueryCalls();
  harness.state.lastRunTime = 0;
  harness.listeners.alarm[0]({ name: "checkNotif" });
  await waitForWorker();
  assert.equal(harness.queryCalls, 1, "o alarme precisa acordar o chatbot em segundo plano");
});
