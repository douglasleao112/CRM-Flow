const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(__dirname, "../src/pages/content/contact-scraper-main.js");
const loaderPath = path.join(__dirname, "../src/pages/content/contact-loader.js");
const backgroundPath = path.join(__dirname, "../src/pages/background/index.js");

test("fallback publico cobre Reels e espera a ponte da aba temporaria", () => {
  const main = fs.readFileSync(mainPath, "utf8");
  const loader = fs.readFileSync(loaderPath, "utf8");
  const background = fs.readFileSync(backgroundPath, "utf8");

  assert.match(main, /\(\?:p\|reel\|tv\)/);
  assert.match(main, /options\?\.uiOnly/);
  assert.match(main, /deliveryAttempted/);
  assert.match(main, /flowsi-chatbot-comment-reply-request-v5/);
  assert.match(loader, /flowsi-chatbot-comment-reply-request-v5/);
  assert.match(loader, /120000/);
  assert.match(loader, /flowsiChatbotBridgeReady/);
  assert.match(background, /waitForInstagramChatbotBridge/);
  assert.match(background, /\/c\/\$\{commentId\}\//);
  assert.match(background, /uiOnly:\s*true/);
  assert.match(background, /actorUsername/);
  assert.match(background, /commentText/);
  assert.match(background, /active:\s*false/);
});

test("media PK do Reel real converte para o shortcode esperado", () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let value = 4018050034574974608n;
  let shortcode = "";
  do {
    shortcode = alphabet[Number(value % 64n)] + shortcode;
    value /= 64n;
  } while (value > 0n);
  assert.equal(shortcode, "DfC-zfIll6Q");
});

test("permalink exato clica em Responder antes de preencher e publicar", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  let execCommandCalls = 0;
  let replyButtonClicks = 0;
  let publishClicks = 0;
  let unrelatedPublishClicks = 0;
  const renderedReplies = [];
  const threadedReplyLinks = [];
  const actionOrder = [];

  class MockTextArea {
    constructor() {
      this.value = "@soudouglasleao ";
      this.textContent = "";
      this.selectionStart = this.value.length;
      this.selectionEnd = this.value.length;
      this._valueTracker = { setValue() {} };
    }
    focus() {}
    click() {}
    dispatchEvent() { return true; }
    getAttribute(name) {
      return name === "aria-label" ? "Adicione um comentário..." : null;
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
    parentElement: null,
    getAttribute() { return null; },
    click() {
      replyButtonClicks += 1;
      actionOrder.push("reply-click");
    }
  };
  const commentContainer = {
    parentElement: null,
    innerText: "soudouglasleao Kkk Responder",
    textContent: "soudouglasleao Kkk Responder",
    children: [{}],
    querySelectorAll(selector) {
      if (selector.includes("button")) return [replyButton];
      if (selector === "a, span, div, p") return [
        { children: [], innerText: "soudouglasleao", textContent: "soudouglasleao" },
        { children: [], innerText: "Kkk", textContent: "Kkk" }
      ];
      return [];
    }
  };
  replyButton.parentElement = commentContainer;
  const commentPermalink = {
    href: "https://www.instagram.com/reel/DfC-zfIll6Q/c/18379235194239396/",
    parentElement: commentContainer,
    getAttribute(name) { return name === "href" ? this.href : null; }
  };
  const publishButton = {
    innerText: "Postar",
    textContent: "Postar",
    disabled: false,
    getAttribute() { return null; },
    click() {
      publishClicks += 1;
      actionOrder.push("publish-click");
      const replyContainer = {
        parentElement: null,
        children: [],
        innerText: editor.value,
        textContent: editor.value
      };
      threadedReplyLinks.push({
        href: "https://www.instagram.com/reel/DfC-zfIll6Q/c/18379235194239396/r/new-reply-1/",
        parentElement: replyContainer,
        getAttribute(name) { return name === "href" ? this.href : null; }
      });
      renderedReplies.push({
        children: [],
        textContent: editor.value,
        getAttribute() { return null; }
      });
      editor.value = "";
    }
  };
  const unrelatedPublishButton = {
    innerText: "Postar",
    textContent: "Postar",
    disabled: false,
    getAttribute() { return null; },
    click() { unrelatedPublishClicks += 1; }
  };
  const composerContainer = {
    parentElement: null,
    querySelectorAll(selector) {
      return selector.includes("button") ? [publishButton] : [];
    }
  };
  editor.parentElement = composerContainer;
  const document = {
    cookie: "ds_user_id=56690253197; csrftoken=csrf",
    body: null,
    documentElement: { appendChild() {}, setAttribute() {} },
    getElementById() { return null; },
    createElement() { return { setAttribute() {} }; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector.includes("textarea")) return [editor];
      if (selector.includes('/r/')) return threadedReplyLinks;
      if (selector.includes('/c/18379235194239396/')) return [commentPermalink];
      if (selector === "div, span, p") return renderedReplies;
      if (selector.includes("button")) return [unrelatedPublishButton, replyButton, publishButton];
      return [];
    },
    execCommand(command, _showUi, value) {
      execCommandCalls += 1;
      actionOrder.push("insert-text");
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
    InputEvent: MockEvent,
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
    fetch: async () => { throw new Error("uiOnly nao deve usar a API de escrita"); },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location,
    setTimeout,
    window
  }, { filename: mainPath });

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao confirmou o permalink")), 3000);
    pendingResponse = value => { clearTimeout(timeout); resolve(value); };
    messageListener({
      source: window,
      data: {
        source: "flowsi-chatbot-comment-reply-request-v5",
        requestId: "reply-permalink-react",
        mediaId: "4018050034574974608_56690253197",
        commentId: "18379235194239396",
        message: "teste123",
        uiOnly: true,
        actorUsername: "soudouglasleao",
        commentText: "Kkk"
      }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.transport, "instagram-threaded-comment-ui-verified");
  assert.equal(response.result.parentCommentId, "18379235194239396");
  assert.equal(response.result.replyButtonClicked, true);
  assert.equal(response.result.verification, "threaded-reply-permalink");
  assert.equal(replyButtonClicks, 1);
  assert.equal(execCommandCalls, 1);
  assert.equal(publishClicks, 1);
  assert.equal(unrelatedPublishClicks, 0);
  assert.equal(renderedReplies[0].textContent, "@soudouglasleao teste123");
  assert.deepEqual(actionOrder, ["reply-click", "insert-text", "publish-click"]);
});

test("texto global com arroba nao substitui resposta encadeada confirmada", () => {
  const main = fs.readFileSync(mainPath, "utf8");
  const uiReply = main.slice(
    main.indexOf("async function replyChatbotCommentThroughUi"),
    main.indexOf("async function replyChatbotComment(mediaIdValue")
  );

  assert.match(uiReply, /target\.button\.click\(\)/);
  assert.match(uiReply, /existingThreadedReplyLinks/);
  assert.match(uiReply, /threadedReplyPermalinks\(frameDocument, commentId\)/);
  assert.match(uiReply, /threaded-reply-permalink/);
  assert.match(uiReply, /instagramPublishButtonForEditor\(editor\)/);
  assert.doesNotMatch(uiReply, /replyCountAfter/);
  assert.doesNotMatch(uiReply, /querySelectorAll\("div, span, p"\)/);
  assert.doesNotMatch(uiReply, /child-comments-api/);
});

test("resposta filha antiga carregada depois do clique nao confirma o envio atual", () => {
  const main = fs.readFileSync(mainPath, "utf8");
  const uiReply = main.slice(
    main.indexOf("async function replyChatbotCommentThroughUi"),
    main.indexOf("async function replyChatbotComment(mediaIdValue")
  );

  const baselineIndex = uiReply.indexOf("const childReplyBaseline = await instagramChildReplySnapshot");
  const publishIndex = uiReply.indexOf("publishButton.click()");
  assert.ok(baselineIndex >= 0 && baselineIndex < publishIndex);
  assert.match(uiReply, /!childReplyBaseline\.ids\.has\(replyId\)/);
  assert.match(uiReply, /!childReplyBaseline\.ids\.has\(reply\.id\)/);
  assert.match(uiReply, /verification:\s*newReplyLink[\s\S]*new-child-comment-id/);
});

test("resposta publica usa a API encadeada e confirma o comentario pai", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  const fetchCalls = [];
  const document = {
    cookie: "ds_user_id=999; csrftoken=csrf",
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
      if (value?.source === "flowsi-chatbot-comment-reply-response-v5") pendingResponse?.(value);
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
    fetch: async (url, options) => {
      fetchCalls.push({ url: String(url), options });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            status: "ok",
            comment: {
              pk: "public-reply-1",
              parent_comment_id: "18101000000015838",
              text: "Obrigado pelo comentário!"
            }
          };
        }
      };
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
      data: {
        source: "flowsi-chatbot-comment-reply-request-v5",
        requestId: "reply-1",
        mediaId: "38200000000000001",
        commentId: "18101000000015838",
        message: "Obrigado pelo comentário!"
      }
    });
  });

  assert.equal(response.success, true);
  assert.equal(response.result.status, "sent");
  assert.equal(response.result.transport, "instagram-page-threaded-comment-api");
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /\/api\/v1\/media\/38200000000000001_999\/comment\/$/);
  const body = new URLSearchParams(fetchCalls[0].options.body);
  assert.equal(body.get("comment_text"), "Obrigado pelo comentário!");
  assert.equal(body.get("replied_to_comment_id"), "18101000000015838");
  assert.equal(body.get("parent_comment_id"), "18101000000015838");
  assert.equal(body.get("containermodule"), "self_comments_v2");
  assert.equal(body.get("_uid"), "999");
  assert.ok(body.get("device_id"));
  assert.equal(response.result.parentCommentId, "18101000000015838");
  assert.equal(fetchCalls[0].options.credentials, "include");
});

test("resposta sem vinculo com o pai nao e marcada como enviada nem repetida", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  let messageListener = null;
  let pendingResponse = null;
  const fetchCalls = [];
  const document = {
    cookie: "ds_user_id=999; csrftoken=csrf; ig_did=device-guid",
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
      if (value?.source === "flowsi-chatbot-comment-reply-response-v5") pendingResponse?.(value);
    }
  };
  window.window = window;

  vm.runInNewContext(source, {
    AbortController,
    CSS: { escape: value => value },
    Event: class {}, FormData, InputEvent: class {}, KeyboardEvent: class {}, Node: class {},
    URL, URLSearchParams, clearTimeout, console, document,
    fetch: async (url, options) => {
      fetchCalls.push({ url: String(url), options });
      if (String(url).includes("child_comments")) {
        return { ok: true, status: 200, async json() { return { child_comments: [] }; } };
      }
      return {
        ok: true,
        status: 200,
        async json() { return { status: "ok", comment: { pk: "top-level-1" } }; }
      };
    },
    getComputedStyle: () => ({ display: "block", overflowY: "visible" }),
    location, setTimeout, window
  }, { filename: mainPath });

  const response = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MAIN nao respondeu")), 1000);
    pendingResponse = value => { clearTimeout(timeout); resolve(value); };
    messageListener({
      source: window,
      data: {
        source: "flowsi-chatbot-comment-reply-request-v5",
        requestId: "reply-unconfirmed",
        mediaId: "38200000000000001_999",
        commentId: "18101000000015838",
        message: "teste123"
      }
    });
  });

  assert.equal(response.success, false);
  assert.match(response.error, /não confirmou que ele ficou como resposta encadeada/i);
  assert.equal(fetchCalls.filter(call => /\/comment\/$/.test(call.url)).length, 1);
});
