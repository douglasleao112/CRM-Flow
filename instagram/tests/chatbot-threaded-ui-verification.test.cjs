const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(__dirname, "../src/pages/content/contact-scraper-main.js");

test("texto solto com @ nao confirma uma resposta encadeada pela interface", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  let replyClicks = 0;
  let publishClicks = 0;
  let clock = 0;
  const globallyRenderedText = [];

  class FastDate extends Date {
    static now() {
      clock += 1_000;
      return clock;
    }
  }
  class MockTextArea {
    constructor() {
      this.value = "";
      this.textContent = "";
      this.selectionStart = 0;
      this.selectionEnd = 0;
      this._valueTracker = { setValue() {} };
    }
    focus() {}
    click() {}
    dispatchEvent() { return true; }
    getAttribute(name) {
      return name === "aria-label" ? "Adicione um comentario..." : null;
    }
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }
  }
  class MockInput extends MockTextArea {}
  class MockEvent {
    constructor(type, options = {}) {
      this.type = type;
      Object.assign(this, options);
    }
  }

  const editor = new MockTextArea();
  const replyButton = {
    innerText: "Responder",
    textContent: "Responder",
    disabled: false,
    getAttribute() { return null; },
    click() {
      replyClicks += 1;
      editor.value = "@soudouglasleao ";
    }
  };
  const parentContainer = {
    parentElement: null,
    querySelectorAll(selector) {
      if (selector.includes("button")) return [replyButton];
      // The simulated post deliberately does not render teste123 below the
      // parent. It only renders it elsewhere as a top-level comment.
      return [];
    }
  };
  const permalink = {
    href: "https://www.instagram.com/reel/DfC-zfIll6Q/c/18379235194239396/",
    parentElement: parentContainer,
    getAttribute(name) { return name === "href" ? this.href : null; }
  };
  const publishButton = {
    innerText: "Postar",
    textContent: "Postar",
    disabled: false,
    getAttribute() { return null; },
    click() {
      publishClicks += 1;
      globallyRenderedText.push({
        children: [],
        textContent: editor.value,
        getAttribute() { return null; }
      });
      editor.value = "";
    }
  };
  const composerRoot = {
    parentElement: null,
    querySelectorAll(selector) {
      return selector.includes("button") ? [publishButton] : [];
    }
  };
  editor.parentElement = composerRoot;
  editor.closest = selector => selector === "form" ? composerRoot : null;
  const document = {
    cookie: "ds_user_id=56690253197; csrftoken=csrf",
    body: null,
    documentElement: { appendChild() {}, setAttribute() {} },
    getElementById() { return null; },
    createElement() { return { setAttribute() {} }; },
    querySelector(selector) {
      return selector.includes('/c/18379235194239396') ? permalink : null;
    },
    querySelectorAll(selector) {
      if (selector.includes('/c/18379235194239396/r/')) return [];
      if (selector.includes('/c/18379235194239396')) return [permalink];
      if (selector.includes("textarea")) return [editor];
      if (selector === "div, span, p") return globallyRenderedText;
      if (selector.includes("button")) return [replyButton, publishButton];
      return [];
    },
    execCommand(command, _showUi, value) {
      assert.equal(command, "insertText");
      editor.value = `${editor.value.slice(0, editor.selectionStart)}${value}${editor.value.slice(editor.selectionEnd)}`;
      editor.selectionStart += String(value).length;
      editor.selectionEnd = editor.selectionStart;
      return true;
    }
  };
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/reel/DfC-zfIll6Q/c/18379235194239396/"
  };
  const window = {
    HTMLTextAreaElement: MockTextArea,
    HTMLInputElement: MockInput,
    Event: MockEvent,
    addEventListener(type, listener) {
      if (type === "message") messageListener = listener;
    },
    removeEventListener() {},
    postMessage(value) {
      if (value?.source === "flowsi-chatbot-comment-reply-response-v5") pendingResponse?.(value);
    }
  };
  window.window = window;

  vm.runInNewContext(source, {
    AbortController,
    CSS: { escape: value => value },
    Date: FastDate,
    Event: MockEvent,
    FormData,
    InputEvent: MockEvent,
    KeyboardEvent: MockEvent,
    Node: class {},
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    document,
    fetch: async url => {
      assert.match(String(url), /child_comments/);
      return {
        ok: true,
        status: 200,
        async json() { return { child_comments: [] }; }
      };
    },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout: callback => setTimeout(callback, 0),
    window
  }, { filename: mainPath });

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 2000);
    pendingResponse = value => { clearTimeout(timeout); resolve(value); };
    messageListener({
      source: window,
      data: {
        source: "flowsi-chatbot-comment-reply-request-v5",
        requestId: "reply-must-be-a-child",
        mediaId: "4018050034574974608_56690253197",
        commentId: "18379235194239396",
        message: "teste123",
        uiOnly: true
      }
    });
  });

  assert.equal(
    replyClicks,
    1,
    `deve clicar no Responder do comentario exato: ${JSON.stringify(response)}`
  );
  assert.equal(publishClicks, 1);
  assert.equal(response.success, false, "texto global/top-level nao prova resposta encadeada");
  assert.equal(response.deliveryAttempted, true);
  assert.match(response.error, /vinculad|encadead|confirm/i);
});
