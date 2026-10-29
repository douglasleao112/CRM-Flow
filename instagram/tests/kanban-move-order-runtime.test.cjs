const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backgroundPath = path.join(__dirname, "../src/pages/background/index.js");

test("mover para a última posição persiste a ordem exata da coluna", async () => {
  const profiles = ["ana", "bia", "carla"].map(username => ({
    id: `crm-${username}`,
    username,
    name: username,
  }));
  const state = {
    contactList: [...profiles],
    flowsiManualContacts: [],
    kanbanColumns: [
      { id: "all-chats", title: "Todas", profiles: [] },
      { id: "clientes", title: "Clientes", profiles: [...profiles] },
    ],
    flowsiKanbanAssignmentsV2: Object.fromEntries(profiles.map(profile => [
      profile.username,
      { columnId: "clientes", profile, updatedAt: 1, source: "crm" },
    ])),
  };
  const event = () => ({ addListener() {} });
  const chrome = {
    cookies: { getAll: async () => [], get: async () => null },
    tabs: {
      query: async () => [],
      onUpdated: event(),
      onActivated: event(),
    },
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
  const source = fs.readFileSync(backgroundPath, "utf8") + `
    globalThis.__kanbanMoveApi = { applyCrmMutation };
  `;
  vm.runInNewContext(source, context, { filename: backgroundPath });

  await context.__kanbanMoveApi.applyCrmMutation({
    mutation: "move",
    columnId: "clientes",
    index: 2,
    order: ["bia", "carla", "ana"],
    profile: profiles[0],
  });

  assert.deepEqual(
    Array.from(state.kanbanColumns[1].profiles, profile => profile.username),
    ["bia", "carla", "ana"],
  );
  assert.equal(state.flowsiKanbanAssignmentsV2.ana.columnId, "clientes");
});
