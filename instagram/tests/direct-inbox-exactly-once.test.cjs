const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const background = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "background", "index.js"),
  "utf8",
);
const loader = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "content", "contact-loader.js"),
  "utf8",
);
const main = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "content", "contact-scraper-main.js"),
  "utf8",
);
const bundle = fs.readFileSync(
  path.join(root, "instagram", "assets", "js", "index.e4b3aa7a.js"),
  "utf8",
);

const senderStart = background.indexOf("async function sendMessageToInstagram");
const senderEnd = background.indexOf("const flowsiBulkSendInFlight", senderStart);
assert.ok(senderStart > 0 && senderEnd > senderStart);
const sender = background.slice(senderStart, senderEnd);

function senderHarness(mainResponse, fallbackResponse = { success: true, status: "sent" }) {
  const calls = [];
  const context = {
    Math,
    Date,
    normalizeCrmKey: value => String(value || "").replace(/^@+/, "").trim().toLowerCase(),
    getInstagramTabId: async () => 44,
    getInstagramCookies: async () => ({ ds_user_id: "998877" }),
    viewerIdFromRurCookieValue: () => "",
    chrome: {
      tabs: {
        sendMessage: async (_tabId, message) => {
          calls.push(message);
          if (message.action === "flowsiChatbotSnapshotOutgoingMessage") {
            return { success: true, activeConversation: true, tokens: [] };
          }
          if (message.action === "flowsiChatbotSendMessageMain") return mainResponse;
          if (message.action === "flowsiChatbotSendMessage") return fallbackResponse;
          if (message.action === "flowsiChatbotConfirmOutgoingMessage") {
            return { success: true, status: "sent", messageToken: "one" };
          }
          throw new Error(`ação inesperada: ${message.action}`);
        },
      },
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${sender}\nglobalThis.send = sendMessageToInstagram;`, context);
  return { send: context.send, calls };
}

test("Direct aberto não aciona fallback depois que MQTT já publicou", async () => {
  const { send, calls } = senderHarness({
    success: false,
    status: "unconfirmed",
    deliveryAttempted: true,
    error: "ack atrasado",
  });

  await assert.rejects(() => send("pessoa", "Olá", 44, "123"), /ack atrasado/);
  assert.equal(
    calls.filter(call => call.action === "flowsiChatbotSendMessage").length,
    0,
  );
});

test("tentativa segura reutiliza o mesmo deliveryId no canal principal e no fallback", async () => {
  const { send, calls } = senderHarness({
    success: false,
    status: "failed",
    deliveryAttempted: false,
    error: "conexão não iniciada",
  });

  const result = await send("pessoa", "Olá", 44, "123");
  assert.equal(result.status, "sent");
  const mainCall = calls.find(call => call.action === "flowsiChatbotSendMessageMain");
  const fallbackCall = calls.find(call => call.action === "flowsiChatbotSendMessage");
  assert.match(mainCall.deliveryId, /^flowsi-delivery-/);
  assert.equal(fallbackCall.deliveryId, mainCall.deliveryId);
});

test("a ponte da página aceita cada deliveryId apenas uma vez", () => {
  const gateIndex = bundle.indexOf("window.__flowsiHandledDispatchDmV5 instanceof Set");
  const clientIndex = bundle.indexOf('var n = new lo.Client(', gateIndex);
  assert.ok(gateIndex > 0 && clientIndex > gateIndex);
  assert.match(
    bundle.slice(gateIndex, clientIndex),
    /if \(handledDispatches\.has\(dispatchRequestId\)\) return/,
  );
  assert.match(bundle, /delivery_attempted: messagePublished/);
  assert.match(main, /sendChatbotViaReferenceMqtt\([\s\S]{0,120}deliveryId/);
  assert.match(loader, /const requestId = String\(deliveryId \|\| ""\)\.trim\(\)/);
});
