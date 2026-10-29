const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

function createFloatingInboxHarness({ unreadText, buildPanel }) {
  const originalSource = fs.readFileSync(mainPath, "utf8");
  const closing = originalSource.lastIndexOf("})();");
  assert.notEqual(closing, -1, "o script MAIN precisa manter o IIFE esperado");
  const source = `${originalSource.slice(0, closing)}
    window.__floatingInboxLifecycleTestApi = {
      runFloatingInboxAutomation,
      rememberFloatingDomArticle
    };
  ${originalSource.slice(closing)}`;

  class FakeNode {}

  const makeRect = (left, top, width, height) => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  });

  const descendants = root => {
    const result = [];
    const queue = [...(root?.children || [])];
    while (queue.length) {
      const node = queue.shift();
      result.push(node);
      queue.push(...(node.children || []));
    }
    return result;
  };

  class FakeElement extends FakeNode {
    constructor({
      id = "",
      tagName = "DIV",
      role = "",
      roledescription = "",
      ariaLabel = "",
      labelledby = "",
      href = "",
      placeholder = "",
      text = "",
      bounds = makeRect(0, 0, 10, 10)
    } = {}) {
      super();
      this.nodeType = 1;
      this.id = id;
      this.tagName = tagName;
      this.role = role;
      this.roledescription = roledescription;
      this.ariaLabel = ariaLabel;
      this.labelledby = labelledby;
      this.href = href;
      this.placeholder = placeholder;
      this.innerText = text;
      this.textContent = text;
      this.bounds = bounds;
      this.children = [];
      this.parentElement = null;
      this.isConnected = true;
      this.clickHandler = null;
    }

    getBoundingClientRect() {
      return this.bounds;
    }

    getAttribute(name) {
      if (name === "id") return this.id || null;
      if (name === "role") return this.role || null;
      if (name === "aria-roledescription") return this.roledescription || null;
      if (name === "aria-label") return this.ariaLabel || null;
      if (name === "aria-labelledby") return this.labelledby || null;
      if (name === "href") return this.href || null;
      if (name === "placeholder") return this.placeholder || null;
      if (name === "tabindex") return this.tabIndex === 0 ? "0" : null;
      if (name === "title") return null;
      return null;
    }

    setAttribute(name, value) {
      if (name === "aria-label") this.ariaLabel = String(value);
      else if (name === "id") this.id = String(value);
      else this[name] = String(value);
    }

    hasAttribute(name) {
      return this.getAttribute(name) !== null;
    }

    matches(selector) {
      const value = String(selector || "");
      if (/\bsvg\b/i.test(value) && this.tagName !== "SVG") return false;
      if (value.includes('[role="article"]') || value.includes('[aria-roledescription="message"]')) {
        return this.role === "article" &&
          (!value.includes('[aria-roledescription="message"]') || this.roledescription === "message");
      }
      if (value.includes('[role="separator"]') && this.role === "separator") return true;
      if (value.includes('[role="button"]') && this.role === "button") return true;
      if (/\bbutton\b/i.test(value) && this.tagName === "BUTTON") return true;
      if (value.includes('[tabindex="0"]') && this.tabIndex === 0) return true;
      if (value.includes("[aria-label") && this.ariaLabel) return true;
      if (value.includes("[id]") && this.id) return true;
      if (value.includes("[href]") && this.href) return true;
      if (value.includes('[role="textbox"]') && this.role === "textbox") return true;
      if (value.includes("textarea") && this.tagName === "TEXTAREA") return true;
      if (value.includes("input") && this.tagName === "INPUT") return true;
      if (/\bimg\b/i.test(value) && this.tagName === "IMG") return true;
      if (/\bspan\b/i.test(value) && this.tagName === "SPAN") return true;
      if (/\bdiv\b/i.test(value) && this.tagName === "DIV") return true;
      return false;
    }

    closest(selector) {
      for (let node = this; node; node = node.parentElement) {
        if (node.matches?.(selector)) return node;
      }
      return null;
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
      return descendants(this).filter(node => node.isConnected && node.matches?.(selector));
    }

    click() {
      this.clickHandler?.();
    }
  }

  const append = (parent, ...children) => {
    for (const child of children) {
      child.parentElement = parent;
      child.isConnected = true;
      parent.children.push(child);
    }
  };

  const body = new FakeElement({ bounds: makeRect(0, 0, 1600, 900) });
  const documentElement = new FakeElement({ bounds: makeRect(0, 0, 1600, 900) });
  documentElement.clientWidth = 1600;
  documentElement.clientHeight = 900;
  const diagnostics = new Map();
  documentElement.setAttribute = (name, value) => diagnostics.set(name, String(value));
  documentElement.appendChild = () => {};

  const viewerLink = new FakeElement({
    tagName: "A",
    href: "https://www.instagram.com/dr.douglasleao/",
    ariaLabel: "Perfil",
    text: "Ph.D. Douglas Leão",
    bounds: makeRect(20, 760, 64, 64)
  });
  const unreadRow = new FakeElement({
    tagName: "BUTTON",
    role: "button",
    text: `Douglas Leão\n${unreadText}\nUnread`,
    bounds: makeRect(1240, 680, 330, 82)
  });
  const rowImage = new FakeElement({
    tagName: "IMG",
    ariaLabel: "Foto do perfil de Douglas Leão",
    bounds: makeRect(1252, 694, 44, 44)
  });
  rowImage.src = rowImage.currentSrc = "https://cdn.example/douglas.jpg";
  append(unreadRow, rowImage);
  append(body, viewerLink, unreadRow);

  let activePanel = null;
  unreadRow.clickHandler = () => {
    activePanel = buildPanel({ FakeElement, append, makeRect });
    append(body, activePanel.panel);
  };

  const visibleNodes = () => [body, ...descendants(body)]
    .filter(node => node.isConnected !== false);
  const document = {
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    documentElement,
    body,
    getElementById() { return null; },
    createElement() { return new FakeElement(); },
    querySelector(selector) {
      return visibleNodes().find(node => node.matches?.(selector)) || null;
    },
    querySelectorAll(selector) {
      return visibleNodes().filter(node => node.matches?.(selector));
    }
  };
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/",
    href: "https://www.instagram.com/"
  };
  const postedMessages = [];
  const windowListeners = new Map();
  const window = {
    innerWidth: 1600,
    innerHeight: 900,
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    removeEventListener() {},
    postMessage(message) {
      postedMessages.push(message);
    }
  };
  window.window = window;

  let booting = true;
  const controlledTimeout = (callback, milliseconds, ...args) => {
    if (booting) return { unref() {} };
    // Sleeps used by the explicit test action must keep the worker alive;
    // only the observer's boot-time periodic work is suppressed above.
    return setTimeout(callback, milliseconds, ...args);
  };
  const controlledInterval = () => ({ unref() {} });
  class FakeMutationObserver {
    observe() {}
    disconnect() {}
  }

  vm.runInNewContext(source, {
    AbortController,
    CSS: { escape: value => value },
    Event: class {},
    FormData,
    InputEvent: class {},
    KeyboardEvent: class {},
    MutationObserver: FakeMutationObserver,
    Node: FakeNode,
    URL,
    URLSearchParams,
    clearInterval() {},
    clearTimeout,
    console: { log() {}, warn() {}, error() {} },
    document,
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() { return { inbox: { threads: [] } }; },
      async text() { return JSON.stringify({ inbox: { threads: [] } }); }
    }),
    getComputedStyle: () => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "auto",
      overflowY: "visible"
    }),
    location,
    setInterval: controlledInterval,
    setTimeout: controlledTimeout,
    window
  }, { filename: mainPath });
  booting = false;

  return {
    api: window.__floatingInboxLifecycleTestApi,
    diagnostics,
    location,
    postedMessages,
    unreadRow,
    get activePanel() { return activePanel; },
    rememberFromClosedPanel({ token, text = "Teste" }) {
      const previousPanel = new FakeElement({
        ariaLabel: "Douglas Leão",
        text: `Douglas Leão\n${text}\nMensagem...`,
        bounds: makeRect(1240, 360, 340, 530)
      });
      const previousArticle = new FakeElement({
        id: `article-${token}`,
        role: "article",
        roledescription: "message",
        ariaLabel: `${text}, mensagem de soudouglasleao`,
        labelledby: token,
        text,
        bounds: makeRect(1270, 620, 90, 34)
      });
      append(previousPanel, previousArticle);
      append(body, previousPanel);
      window.__floatingInboxLifecycleTestApi.rememberFloatingDomArticle(previousArticle);
      for (const node of [previousPanel, ...descendants(previousPanel)]) node.isConnected = false;
      body.children = body.children.filter(node => node !== previousPanel);
    }
  };
}

function createPanelBuilder({ articles, separator = null }) {
  return ({ FakeElement, append, makeRect }) => {
    const panel = new FakeElement({
      ariaLabel: "Douglas Leão",
      text: "Douglas Leão\nMensagem...",
      bounds: makeRect(1240, 360, 340, 530)
    });
    const headerLink = new FakeElement({
      tagName: "A",
      href: "https://www.instagram.com/soudouglasleao/",
      ariaLabel: "Open the profile page of soudouglasleao",
      text: "Douglas Leão",
      bounds: makeRect(1300, 370, 190, 46)
    });
    const image = new FakeElement({
      tagName: "IMG",
      bounds: makeRect(1252, 370, 42, 42)
    });
    image.src = image.currentSrc = "https://cdn.example/douglas.jpg";
    const composer = new FakeElement({
      tagName: "TEXTAREA",
      role: "textbox",
      placeholder: "Mensagem...",
      bounds: makeRect(1260, 838, 300, 38)
    });
    const messageArticles = articles.map(article => new FakeElement({
      id: `article-${article.token}`,
      role: "article",
      roledescription: "message",
      ariaLabel: `${article.text}, mensagem de ${article.sender || "soudouglasleao"}`,
      labelledby: article.token,
      text: article.text,
      bounds: makeRect(article.left ?? 1270, article.top, article.width ?? 100, 34)
    }));
    const separatorElement = separator ? new FakeElement({
      role: "separator",
      ariaLabel: separator.text,
      text: separator.text,
      bounds: makeRect(1255, separator.top, 310, 24)
    }) : null;
    append(
      panel,
      headerLink,
      image,
      ...messageArticles.filter(article => !separator || article.bounds.top < separator.top),
      ...(separatorElement ? [separatorElement] : []),
      ...messageArticles.filter(article => separator && article.bounds.top >= separator.top),
      composer
    );
    const visualLines = [
      ...messageArticles.map(article => ({ top: article.bounds.top, text: article.innerText })),
      ...(separatorElement ? [{ top: separatorElement.bounds.top, text: separatorElement.innerText }] : [])
    ].sort((left, right) => left.top - right.top).map(item => item.text);
    panel.innerText = panel.textContent = ["Douglas Leão", ...visualLines, "Mensagem..."].join("\n");
    return { panel, articles: messageArticles, separator: separatorElement };
  };
}

test("a automação desativada não reabre conversa com aria-labelledby reutilizado", async () => {
  const reusedToken = "_r_reused_";
  const harness = createFloatingInboxHarness({
    unreadText: "1 new message",
    buildPanel: createPanelBuilder({
      articles: [{ token: reusedToken, text: "Teste", top: 650 }]
    })
  });

  // O primeiro painel foi fechado. O Instagram recicla IDs React quando monta
  // outro painel; a linha não lida é a autoridade de que esta é uma nova DM.
  harness.rememberFromClosedPanel({ token: reusedToken, text: "Teste" });
  await harness.api.runFloatingInboxAutomation();

  const events = harness.postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(events.length, 0);
  assert.equal(harness.activePanel, null);
  assert.equal(harness.location.href, "https://www.instagram.com/");
});

test("a automação desativada não abre o painel nem diante de New messages", async () => {
  const harness = createFloatingInboxHarness({
    unreadText: "2 new messages",
    buildPanel: createPanelBuilder({
      separator: { text: "New messages", top: 600 },
      articles: [
        { token: "history-1", text: "Histórico 1", top: 475 },
        { token: "history-2", text: "Histórico 2", top: 535 },
        { token: "new-1", text: "Novo", top: 650 }
      ]
    })
  });

  await harness.api.runFloatingInboxAutomation();

  const events = harness.postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(events.length, 0,
    "o leitor invisível não pode depender de abrir o painel flutuante");
  assert.equal(harness.activePanel, null);
  assert.equal(harness.location.pathname, "/");
});
