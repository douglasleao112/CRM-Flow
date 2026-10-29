const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backgroundPath = path.join(__dirname, "../src/pages/background/index.js");

function createHarness() {
  const alice = { id: "crm-alice", username: "alice", name: "Alice" };
  const bob = { id: "crm-bob", username: "bob", name: "Bob" };
  const state = {
    contactList: [alice, bob],
    flowsiManualContacts: [],
    kanbanColumns: [
      { id: "all-chats", title: "Todas", profiles: [] },
      { id: "origem", title: "Origem", profiles: [alice, bob] },
      { id: "destino", title: "Destino", profiles: [] },
    ],
    flowsiKanbanAssignmentsV2: {
      alice: { columnId: "origem", profile: alice, updatedAt: 1, source: "crm" },
      bob: { columnId: "origem", profile: bob, updatedAt: 1, source: "crm" },
    },
  };
  const event = () => ({ addListener() {} });
  const chrome = {
    cookies: { getAll: async () => [], get: async () => null },
    tabs: { query: async () => [], onUpdated: event(), onActivated: event() },
    storage: {
      local: {
        get: async keys => {
          const names = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.map(key => [key, state[key]]));
        },
        set: async values => Object.assign(state, values),
      },
      onChanged: event(),
    },
    runtime: { onMessage: event(), onInstalled: event(), onStartup: event() },
    alarms: { create() {}, get: async () => null, onAlarm: event() },
  };
  const context = {
    chrome,
    console: { log() {}, error() {}, warn() {} },
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(
    `${fs.readFileSync(backgroundPath, "utf8")}\n` +
      "globalThis.__bulkLabelApi = { applyCrmMutation };",
    context,
    { filename: backgroundPath },
  );
  return { state, alice, bob, applyCrmMutation: context.__bulkLabelApi.applyCrmMutation };
}

test("envio em massa move o contato sem deixar cópia na etiqueta anterior", async () => {
  const { state, alice, applyCrmMutation } = createHarness();

  const result = await applyCrmMutation({
    mutation: "move",
    columnId: "destino",
    username: "alice",
    profile: alice,
  });

  assert.equal(result.success, true);
  assert.equal(state.flowsiKanbanAssignmentsV2.alice.columnId, "destino");
  assert.deepEqual(Array.from(state.kanbanColumns[1].profiles, item => item.username), ["bob"]);
  assert.deepEqual(Array.from(state.kanbanColumns[2].profiles, item => item.username), ["alice"]);
});

test("envio em massa remove a etiqueta de todas as fontes persistentes", async () => {
  const { state, applyCrmMutation } = createHarness();

  const result = await applyCrmMutation({ mutation: "remove", username: "bob" });

  assert.equal(result.success, true);
  assert.equal(state.flowsiKanbanAssignmentsV2.bob, undefined);
  assert.equal(
    state.kanbanColumns.slice(1).some(column =>
      column.profiles.some(item => item.username === "bob"),
    ),
    false,
  );
  assert.equal(state.kanbanColumns[0].profiles.some(item => item.username === "bob"), true);
});
