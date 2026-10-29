const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(__dirname, "../src/pages/content/contact-scraper-main.js");

test("a Home consulta o inbox unificado e preserva IDs de 64 bits", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  const fetchedUrls = [];
  const unifiedJson = `{"inbox":{"threads":[{"thread_id":18199999999999999,"users":[{"pk":299999999999999,"username":"contato.teste","full_name":"Contato Teste"}],"items":[{"item_id":18101000000015838,"user_id":299999999999999,"text":"Teste","timestamp":1770000000000000}]}]}}`;

  const document = {
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    body: null,
    documentElement: { appendChild() {}, setAttribute() {} },
    getElementById() { return null; },
    createElement() { return { setAttribute() {} }; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const location = { origin: "https://www.instagram.com", pathname: "/" };
  const window = {
    addEventListener(type, listener) {
      if (type === "message") messageListener = listener;
    },
    removeEventListener() {},
    postMessage(value) {
      if (value?.source === "flowsi-chatbot-inbox-response-v2") pendingResponse?.(value);
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
    Node: class {},
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    document,
    fetch: async url => {
      const currentUrl = String(url);
      fetchedUrls.push(currentUrl);
      const isUnified = currentUrl.includes("direct_v2/inbox") && !currentUrl.includes("folder=");
      const body = isUnified ? unifiedJson : `{"inbox":{"threads":[]}}`;
      return { ok: true, status: 200, async text() { return body; } };
    },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 1000);
    pendingResponse = value => {
      clearTimeout(timeout);
      resolve(value);
    };
    messageListener({
      source: window,
      data: { source: "flowsi-chatbot-inbox-request-v2", requestId: "unified-test" }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.unifiedThreads, 1);
  assert.equal(response.result.primary.length, 1);
  assert.equal(response.result.primary[0].thread_id, "18199999999999999");
  assert.equal(response.result.primary[0].items[0].item_id, "18101000000015838");
  assert.equal(String(response.result.primary[0].items[0].user_id), "299999999999999");
  assert.ok(fetchedUrls.some(url => url.includes("use_unified_inbox=true") && !url.includes("folder=")));
  assert.equal(location.pathname, "/");
});
