const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const background = fs.readFileSync(
  path.join(__dirname, "..", "src", "pages", "background", "index.js"),
  "utf8",
);
const start = background.indexOf("const flowsiBulkSendInFlight");
const end = background.indexOf("async function fetchFollowingInBackground", start);
assert.ok(start > 0 && end > start);
const implementation = background.slice(start, end);

test("duas solicitações simultâneas da mesma campanha enviam somente uma mensagem", async () => {
  const context = {
    Date,
    Map,
    Promise,
    setTimeout,
    clearTimeout,
    sendCalls: 0,
  };
  vm.createContext(context);
  vm.runInContext(
    `
      const normalizeCrmKey = value => String(value || "")
        .replace(/^@+/, "")
        .trim()
        .toLowerCase();
      async function sendMessageToInstagram(username, message, tabId, threadId) {
        sendCalls += 1;
        await new Promise(resolve => setTimeout(resolve, 20));
        return { status: "sent", username, message, tabId, threadId };
      }
      ${implementation}
      globalThis.sendBulk = sendBulkMessageOnce;
    `,
    context,
  );

  const request = {
    campaignId: "campaign-1",
    recipientKey: "@Pessoa.Teste",
    username: "pessoa.teste",
    message: "Olá",
    threadId: "1234567890",
  };
  const [first, second] = await Promise.all([
    context.sendBulk(request, 99),
    context.sendBulk(request, 99),
  ]);
  assert.equal(context.sendCalls, 1);
  assert.equal(first.status, "sent");
  assert.equal(second.status, "sent");

  const repeated = await context.sendBulk(request, 99);
  assert.equal(context.sendCalls, 1);
  assert.equal(repeated.deduplicated, true);

  await context.sendBulk({ ...request, campaignId: "campaign-2" }, 99);
  assert.equal(context.sendCalls, 2);
});
