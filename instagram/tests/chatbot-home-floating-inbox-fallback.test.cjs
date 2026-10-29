const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mainPath = path.join(
  __dirname,
  "../src/pages/content/contact-scraper-main.js"
);

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

test("na Home o chatbot nunca abre automaticamente o inbox flutuante", async () => {
  const source = fs.readFileSync(mainPath, "utf8");
  const observerCallbacks = [];
  const windowListeners = new Map();
  const postedMessages = [];
  const attributes = new Map();
  let trayOpen = false;
  let chatOpen = false;
  let badgeClicks = 0;
  let unreadRowClicks = 0;

  class FakeNode {}

  class FakeMutationObserver {
    constructor(callback) {
      observerCallbacks.push(callback);
    }
    observe() {}
    disconnect() {}
  }

  const rect = (left, top, width, height) => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  });

  class FakeElement extends FakeNode {
    constructor({
      id = "",
      role = "",
      roledescription = "",
      ariaLabel = "",
      labelledby = "",
      text = "",
      href = "",
      bounds = rect(0, 0, 10, 10),
      parent = null,
      tagName = "DIV",
      placeholder = ""
    } = {}) {
      super();
      this.nodeType = 1;
      this.id = id;
      this.role = role;
      this.roledescription = roledescription;
      this.ariaLabel = ariaLabel;
      this.labelledby = labelledby;
      this.innerText = text;
      this.textContent = text;
      this.href = href;
      this.bounds = bounds;
      this.parentElement = parent;
      this.tagName = tagName;
      this.placeholder = placeholder;
      this.children = [];
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
      if (name === "title") return null;
      return null;
    }

    hasAttribute(name) {
      return this.getAttribute(name) !== null;
    }

    matches(selector) {
      const source = String(selector || "");
      if (/\bsvg\b/i.test(source) && this.tagName !== "SVG") return false;
      if (source.includes('[role="article"]') && this.role !== "article") return false;
      if (source.includes('[aria-roledescription="message"]') && this.roledescription !== "message") return false;
      if (source.includes('[role="article"]') || source.includes('[aria-roledescription="message"]')) return true;
      if (source.includes('[role="button"]') && this.role === "button") return true;
      if (/\bbutton\b/i.test(source) && this.tagName === "BUTTON") return true;
      if (source.includes("[aria-label") && this.ariaLabel) return true;
      if (source.includes("[href]") && this.href) return true;
      if (source.includes('[role="textbox"]') && this.role === "textbox") return true;
      if (source.includes("textarea") && this.tagName === "TEXTAREA") return true;
      if (source.includes("input") && this.tagName === "INPUT") return true;
      if (source.includes("img") && this.tagName === "IMG") return true;
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
      return descendantsOf(this).filter(node => node.matches?.(selector));
    }

    click() {
      this.clickHandler?.();
    }
  }

  const descendantsOf = root => {
    const result = [];
    const queue = [...(root?.children || [])];
    while (queue.length) {
      const node = queue.shift();
      result.push(node);
      queue.push(...(node.children || []));
    }
    return result;
  };

  const append = (parent, ...children) => {
    for (const child of children) {
      child.parentElement = parent;
      parent.children.push(child);
    }
  };

  const notifyAdded = node => {
    queueMicrotask(() => {
      for (const callback of observerCallbacks) {
        callback([{ type: "childList", addedNodes: [node], target: node.parentElement }]);
      }
    });
  };

  const documentElement = new FakeElement({ bounds: rect(0, 0, 1360, 900) });
  documentElement.clientWidth = 1360;
  documentElement.clientHeight = 900;
  documentElement.setAttribute = (name, value) => attributes.set(name, String(value));
  documentElement.appendChild = () => {};

  const body = new FakeElement({ bounds: rect(0, 0, 1360, 900) });
  body.appendChild = child => append(body, child);

  const viewerProfileLink = new FakeElement({
    tagName: "A",
    href: "https://www.instagram.com/dr.douglasleao/",
    ariaLabel: "Perfil",
    text: "Ph.D. Douglas Leão",
    bounds: rect(20, 760, 64, 64)
  });
  append(body, viewerProfileLink);

  const badge = new FakeElement({
    role: "button",
    tagName: "BUTTON",
    ariaLabel: "Mensagens - 1 nova notificação",
    text: "Mensagens\n1",
    bounds: rect(1080, 830, 250, 52)
  });
  const badgeImage = new FakeElement({ tagName: "IMG", bounds: rect(1290, 840, 32, 32) });
  badgeImage.src = badgeImage.currentSrc = "https://cdn.example/viewer.jpg";
  append(badge, badgeImage);
  append(body, badge);

  const unreadRow = new FakeElement({
    role: "button",
    tagName: "BUTTON",
    text: "Douglas Leão\n2 new messages\nUnread",
    bounds: rect(1010, 665, 320, 86)
  });
  const rowImage = new FakeElement({ tagName: "IMG", bounds: rect(1020, 680, 44, 44) });
  rowImage.alt = "Foto do perfil de Douglas Leão";
  rowImage.src = rowImage.currentSrc = "https://cdn.example/douglas.jpg";
  append(unreadRow, rowImage);

  const panel = new FakeElement({
    text: "Douglas Leão\nHistórico\nResposta anterior\nTeste\nTeste\nMensagem...",
    bounds: rect(1000, 360, 330, 530)
  });
  const profileLink = new FakeElement({
    tagName: "A",
    href: "https://www.instagram.com/soudouglasleao/",
    ariaLabel: "Open the profile page of soudouglasleao",
    text: "Douglas Leão",
    bounds: rect(1060, 370, 180, 45)
  });
  const profileImage = new FakeElement({ tagName: "IMG", bounds: rect(1012, 369, 42, 42) });
  profileImage.alt = "Foto do perfil de Douglas Leão";
  profileImage.src = profileImage.currentSrc = "https://cdn.example/douglas.jpg";
  const composer = new FakeElement({
    tagName: "TEXTAREA",
    role: "textbox",
    placeholder: "Mensagem...",
    bounds: rect(1020, 838, 285, 38)
  });

  const article = ({ id, text, left, top, sender }) => {
    const node = new FakeElement({
      id: `article-${id}`,
      role: "article",
      roledescription: "message",
      ariaLabel: `${text}, mensagem de ${sender}`,
      labelledby: id,
      text,
      bounds: rect(left, top, 92, 34)
    });
    const label = new FakeElement({ id, text, bounds: rect(left + 4, top + 4, 84, 26) });
    append(node, label);
    return node;
  };

  const historicalIncoming = article({
    id: "message-old-inbound",
    text: "Histórico",
    sender: "soudouglasleao",
    left: 1020,
    top: 500
  });
  const historicalOutgoing = article({
    id: "message-old-outgoing",
    text: "Resposta anterior",
    sender: "dr.douglasleao",
    left: 1208,
    top: 550
  });
  const newIncomingOne = article({
    id: "message-new-inbound-1",
    text: "Teste",
    sender: "soudouglasleao",
    left: 1020,
    top: 610
  });
  const newIncomingTwo = article({
    id: "message-new-inbound-2",
    text: "Teste",
    sender: "soudouglasleao",
    left: 1020,
    top: 660
  });
  append(
    panel,
    profileLink,
    profileImage,
    historicalIncoming,
    historicalOutgoing,
    newIncomingOne,
    newIncomingTwo,
    composer
  );

  badge.clickHandler = () => {
    badgeClicks += 1;
    trayOpen = true;
    append(body, unreadRow);
    notifyAdded(unreadRow);
  };
  unreadRow.clickHandler = () => {
    unreadRowClicks += 1;
    chatOpen = true;
    unreadRow.innerText = unreadRow.textContent = "Douglas Leão\nTeste";
    badge.ariaLabel = "Mensagens";
    badge.innerText = badge.textContent = "Mensagens";
    append(body, panel);
    notifyAdded(panel);
  };

  const visibleNodes = () => {
    const nodes = [body, viewerProfileLink, badge, badgeImage];
    if (trayOpen) nodes.push(unreadRow, rowImage);
    if (chatOpen) {
      nodes.push(
        panel,
        profileLink,
        profileImage,
        historicalIncoming,
        historicalOutgoing,
        newIncomingOne,
        newIncomingTwo,
        composer,
        ...historicalIncoming.children,
        ...historicalOutgoing.children,
        ...newIncomingOne.children,
        ...newIncomingTwo.children
      );
    }
    return nodes;
  };

  const queryVisible = selector => visibleNodes().filter(node => node.matches?.(selector));
  body.querySelectorAll = selector => queryVisible(selector).filter(node => node !== body);
  body.querySelector = selector => body.querySelectorAll(selector)[0] || null;

  const document = {
    cookie: "ds_user_id=999999999999999; csrftoken=csrf",
    documentElement,
    body,
    getElementById() { return null; },
    createElement() { return { setAttribute() {}, remove() {} }; },
    querySelector(selector) { return queryVisible(selector)[0] || null; },
    querySelectorAll(selector) { return queryVisible(selector); }
  };
  const location = {
    origin: "https://www.instagram.com",
    pathname: "/",
    href: "https://www.instagram.com/"
  };
  const window = {
    innerWidth: 1360,
    innerHeight: 900,
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    removeEventListener() {},
    postMessage(value) {
      postedMessages.push(value);
    }
  };
  window.window = window;

  const unrefTimeout = (callback, milliseconds, ...args) => {
    const handle = setTimeout(callback, milliseconds, ...args);
    handle.unref?.();
    return handle;
  };
  const unrefInterval = (callback, milliseconds, ...args) => {
    const handle = setInterval(callback, milliseconds, ...args);
    handle.unref?.();
    return handle;
  };

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
    clearInterval,
    clearTimeout,
    console,
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
    queueMicrotask,
    setInterval: unrefInterval,
    setTimeout: unrefTimeout,
    window
  }, { filename: mainPath });

  // Instagram mounts the badge after the observer. This mutation must begin
  // the entire recovery without changing routes or requiring a manual click.
  notifyAdded(badge);

  await wait(50);

  const realtimeEvents = postedMessages.filter(message =>
    message?.source === "flowsi-chatbot-realtime-event-v2"
  );
  assert.equal(badgeClicks, 0, "o badge de mensagens não pode ser clicado pela extensão");
  assert.equal(unreadRowClicks, 0, "a conversa não lida não pode abrir automaticamente");
  assert.equal(realtimeEvents.length, 0,
    "uma bandeja fechada não deve ser forçada para fabricar eventos visíveis");
  assert.equal(trayOpen, false);
  assert.equal(chatOpen, false);
  assert.equal(attributes.get("data-flowsi-chatbot-floating-inbox-autoclick"), "disabled");
  assert.equal(location.pathname, "/");
  assert.equal(location.href, "https://www.instagram.com/");

  for (const listener of windowListeners.get("pagehide") || []) listener();
});
