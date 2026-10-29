let pbRunning = false;
let pbStopRequested = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PB_GMAIL_START") {
    if (pbRunning) {
      sendResponse({ ok: false, error: "Já existe um envio em andamento." });
      return true;
    }

    pbStopRequested = false;
    runBatch(message.payload).catch(err => {
      updateOverlay(`Erro: ${err.message}`, true);
      pbRunning = false;
    });

    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "PB_GMAIL_STOP") {
    pbStopRequested = true;
    updateOverlay("Parando após o envio atual...");
    sendResponse({ ok: true });
    return true;
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitFor(fn, timeoutMs = 12000, intervalMs = 250, errorMessage = "Tempo esgotado esperando o Gmail carregar.") {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const timer = setInterval(() => {
      let result = null;

      try {
        result = fn();
      } catch (e) {}

      if (result) {
        clearInterval(timer);
        resolve(result);
        return;
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error(errorMessage));
      }
    }, intervalMs);
  });
}

function createOverlay(total) {
  let box = document.getElementById("pb-gmail-sender-overlay");

  if (!box) {
    box = document.createElement("div");
    box.id = "pb-gmail-sender-overlay";
    box.innerHTML = `
      <div id="pb-gmail-sender-title">Envio um por um</div>
      <div id="pb-gmail-sender-status"></div>
      <button id="pb-gmail-sender-stop">Parar</button>
    `;
    document.body.appendChild(box);

    const style = document.createElement("style");
    style.textContent = `
      #pb-gmail-sender-overlay {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        width: 330px;
        background: #111827;
        color: white;
        border-radius: 12px;
        padding: 14px;
        box-shadow: 0 12px 35px rgba(0,0,0,.25);
        font-family: Arial, sans-serif;
      }
      #pb-gmail-sender-title {
        font-weight: 700;
        margin-bottom: 8px;
      }
      #pb-gmail-sender-status {
        font-size: 13px;
        line-height: 1.35;
        color: #e5e7eb;
        margin-bottom: 10px;
      }
      #pb-gmail-sender-stop {
        border: 0;
        border-radius: 8px;
        background: #ef4444;
        color: #fff;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }
      #pb-gmail-sender-overlay.pb-error {
        background: #7f1d1d;
      }
    `;
    document.documentElement.appendChild(style);

    document.getElementById("pb-gmail-sender-stop").addEventListener("click", () => {
      pbStopRequested = true;
      updateOverlay("Parando após o envio atual...");
    });
  }

  updateOverlay(`Preparando ${total} email(s)...`);
}

function updateOverlay(text, isError = false) {
  const box = document.getElementById("pb-gmail-sender-overlay");
  const status = document.getElementById("pb-gmail-sender-status");

  if (box) {
    box.classList.toggle("pb-error", Boolean(isError));
  }

  if (status) {
    status.textContent = text;
  }
}

function removeOverlayLater() {
  setTimeout(() => {
    const box = document.getElementById("pb-gmail-sender-overlay");
    if (box) box.remove();
  }, 12000);
}

function clickElement(el) {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  el.click();
}

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function findComposeButton() {
  const candidates = [...document.querySelectorAll('div[role="button"], button, a')];

  return candidates.find(el => {
    if (!isVisible(el)) return false;

    const text = (el.innerText || el.textContent || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const tooltip = (el.getAttribute("data-tooltip") || "").toLowerCase();
    const gh = (el.getAttribute("gh") || "").toLowerCase();

    return gh === "cm" ||
      text === "compose" ||
      text === "escrever" ||
      aria.includes("compose") ||
      aria.includes("escrever") ||
      tooltip.includes("compose") ||
      tooltip.includes("escrever");
  });
}

function getAllComposeContainers() {
  const containers = new Set();

  document.querySelectorAll('input[name="subjectbox"], input[aria-label*="Assunto"], input[placeholder*="Assunto"], div[aria-label*="Corpo"][contenteditable="true"], div[aria-label*="Message Body"][contenteditable="true"], div[role="textbox"][contenteditable="true"]').forEach(el => {
    const dialog = el.closest('div[role="dialog"]');
    const ariaDialog = el.closest('div[aria-label*="Nova mensagem"], div[aria-label*="New Message"]');
    const form = el.closest('form');
    containers.add(dialog || ariaDialog || form || el.parentElement || document.body);
  });

  document.querySelectorAll('div[role="dialog"]').forEach(dialog => {
    if (findSubjectInput(dialog) || findBodyInput(dialog) || findSendButton(dialog)) {
      containers.add(dialog);
    }
  });

  return [...containers].filter(Boolean);
}

function getLatestComposeContainer() {
  const containers = getAllComposeContainers();
  return containers[containers.length - 1] || null;
}

function findToInput(root = document) {
  const selectors = [
    'textarea[name="to"]',
    'input[name="to"]',
    'textarea[aria-label*="Para"]',
    'input[aria-label*="Para"]',
    'textarea[aria-label*="Destinat"]',
    'input[aria-label*="Destinat"]',
    'textarea[aria-label*="Recipients"]',
    'input[aria-label*="Recipients"]',
    'textarea[aria-label*="To"]',
    'input[aria-label*="To"]',
    'textarea.vO',
    'input.vO'
  ];

  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el && isVisible(el)) return el;
  }

  const active = document.activeElement;
  if (
    active &&
    (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable) &&
    isVisible(active)
  ) {
    return active;
  }

  return null;
}

function findSubjectInput(root = document) {
  const selectors = [
    'input[name="subjectbox"]',
    'input[aria-label*="Assunto"]',
    'input[placeholder*="Assunto"]',
    'input[aria-label*="Subject"]',
    'input[placeholder*="Subject"]'
  ];

  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el && isVisible(el)) return el;
  }

  return null;
}

function findBodyInput(root = document) {
  const selectors = [
    'div[aria-label="Corpo da mensagem"][contenteditable="true"]',
    'div[aria-label*="Corpo"][contenteditable="true"]',
    'div[aria-label="Message Body"][contenteditable="true"]',
    'div[aria-label*="Message Body"][contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
    'div.Am.Al.editable[contenteditable="true"]',
    'div[contenteditable="true"][g_editable="true"]'
  ];

  for (const selector of selectors) {
    const els = [...root.querySelectorAll(selector)].filter(isVisible);
    if (els.length) return els[els.length - 1];
  }

  return null;
}

function findSendButton(root = document) {
  const candidates = [...root.querySelectorAll('div[role="button"], button')];

  return candidates.find(el => {
    if (!isVisible(el)) return false;

    const text = (el.innerText || el.textContent || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const tooltip = (el.getAttribute("data-tooltip") || "").toLowerCase();

    return text === "enviar" ||
      text === "send" ||
      aria.includes("enviar") ||
      aria.includes("send") ||
      tooltip.includes("enviar") ||
      tooltip.includes("send");
  });
}

function setNativeValue(element, value) {
  if (!element) return;

  if (element.isContentEditable) {
    fillPlainText(element, value);
    return;
  }

  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function dispatchKey(element, key) {
  const isEnter = key === "Enter";
  const eventOptions = {
    key,
    code: isEnter ? "Enter" : "Tab",
    keyCode: isEnter ? 13 : 9,
    which: isEnter ? 13 : 9,
    bubbles: true,
    cancelable: true
  };

  element.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
  element.dispatchEvent(new KeyboardEvent("keypress", eventOptions));
  element.dispatchEvent(new KeyboardEvent("keyup", eventOptions));
}

function fillPlainText(element, value) {
  element.focus();
  element.innerHTML = "";

  const lines = value.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) element.appendChild(document.createElement("br"));
    element.appendChild(document.createTextNode(line));
  });

  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertText",
    data: value
  }));
}

function sanitizeHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("script, iframe, object, embed, form, input, textarea, button, link, meta").forEach(el => el.remove());

  template.content.querySelectorAll("*").forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "").trim().toLowerCase();

      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }

      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return template.innerHTML;
}

function fillHtml(element, html) {
  element.focus();
  element.innerHTML = sanitizeHtml(html);

  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertHTML",
    data: html
  }));
}

function applyVariables(template, recipient) {
  const nome = recipient.nome || "";
  const email = recipient.email || "";
  const empresa = recipient.empresa || recipient.academia || "";

  return String(template)
    .replaceAll("{{nome}}", nome)
    .replaceAll("{{name}}", nome)
    .replaceAll("{{email}}", email)
    .replaceAll("{{empresa}}", empresa)
    .replaceAll("{{company}}", empresa)
    .replaceAll("{{academia}}", empresa)
    .replaceAll("{{gym}}", empresa);
}

async function openCompose() {
  let existing = getLatestComposeContainer();

  if (existing && findSubjectInput(existing) && findBodyInput(existing)) {
    return existing;
  }

  const composeButton = await waitFor(
    findComposeButton,
    15000,
    250,
    "Não encontrei o botão Escrever do Gmail. Atualize o Gmail e tente novamente."
  );

  clickElement(composeButton);

  const container = await waitFor(
    getLatestComposeContainer,
    15000,
    250,
    "Não consegui encontrar a janela Nova mensagem do Gmail."
  );

  await waitFor(
    () => findSubjectInput(container) || findSubjectInput(document),
    12000,
    250,
    "Não encontrei o campo Assunto."
  );

  await waitFor(
    () => findBodyInput(container) || findBodyInput(document),
    12000,
    250,
    "Não encontrei o campo da mensagem."
  );

  await sleep(700);
  return container;
}

async function sendOne(recipient, subjectTemplate, bodyTemplate, isHtmlMode) {
  const subject = applyVariables(subjectTemplate, recipient);
  const body = applyVariables(bodyTemplate, recipient);

  const container = await openCompose();

  let toInput = findToInput(container) || findToInput(document);

  if (!toInput) {
    const active = document.activeElement;
    if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable)) {
      toInput = active;
    }
  }

  if (!toInput) {
    throw new Error("Não encontrei o campo Para. Feche rascunhos abertos, atualize o Gmail e teste novamente.");
  }

  toInput.focus();
  await sleep(200);
  setNativeValue(toInput, recipient.email);
  await sleep(350);
  dispatchKey(toInput, "Enter");
  await sleep(600);

  const subjectInput = findSubjectInput(container) || findSubjectInput(document);
  if (!subjectInput) throw new Error("Não encontrei o campo Assunto.");

  subjectInput.focus();
  setNativeValue(subjectInput, subject);
  await sleep(350);

  const bodyInput = findBodyInput(container) || findBodyInput(document);
  if (!bodyInput) throw new Error("Não encontrei o campo da mensagem.");

  if (isHtmlMode) {
    fillHtml(bodyInput, body);
  } else {
    fillPlainText(bodyInput, body);
  }

  await sleep(700);

  const sendButton = await waitFor(
    () => findSendButton(container) || findSendButton(document),
    10000,
    250,
    "Não encontrei o botão Enviar."
  );

  clickElement(sendButton);
  await sleep(3500);
}

function getWeightedTemplates(templates) {
  const result = [];
  for (const template of templates) {
    const quantity = Math.max(1, Math.floor(Number(template.quantity || 1)));
    for (let i = 0; i < quantity; i++) result.push(template);
  }
  return result;
}

function getRandomDelaySeconds(minDelaySeconds, maxDelaySeconds) {
  const min = Math.max(1, Number(minDelaySeconds || 60));
  const max = Math.max(min, Number(maxDelaySeconds || min));
  return Math.round(min + Math.random() * (max - min));
}

async function runBatch(payload) {
  pbRunning = true;
  const { recipients, templates, isHtmlMode } = payload;
  const minDelaySeconds = Number(payload.minDelaySeconds || 60);
  const maxDelaySeconds = Number(payload.maxDelaySeconds || 180);
  const blockSize = Math.max(1, Math.floor(Number(payload.blockSize || 30)));
  const blockPauseMinutes = Math.max(0, Number(payload.blockPauseMinutes || 60));
  const activeTemplates = getWeightedTemplates(Array.isArray(templates) ? templates : []);

  if (!activeTemplates.length) {
    updateOverlay("Erro: nenhum modelo de email foi enviado para a extensão.", true);
    pbRunning = false;
    return;
  }

  createOverlay(recipients.length);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    if (pbStopRequested) {
      updateOverlay(`Parado. Enviados: ${sent}. Falhas: ${failed}.`);
      pbRunning = false;
      removeOverlayLater();
      return;
    }

    const recipient = recipients[i];
    const template = activeTemplates[Math.floor(Math.random() * activeTemplates.length)];
    const currentBlock = Math.floor(i / blockSize) + 1;
    const totalBlocks = Math.ceil(recipients.length / blockSize);

    updateOverlay(`Bloco ${currentBlock}/${totalBlocks} | Enviando ${i + 1}/${recipients.length}: ${recipient.email} | Email ${template.number}`);

    try {
      const templateIsHtml = typeof template.isHtml === "boolean" ? template.isHtml : isHtmlMode;
      await sendOne(recipient, template.subject, template.body, templateIsHtml);
      sent++;
      updateOverlay(`Bloco ${currentBlock}/${totalBlocks} | Enviado ${i + 1}/${recipients.length}: ${recipient.email} | Email ${template.number}`);
    } catch (err) {
      failed++;
      updateOverlay(`Falha em ${recipient.email}: ${err.message}`, true);
      await sleep(3500);
    }

    const isLastRecipient = i >= recipients.length - 1;
    const endedBlock = (i + 1) % blockSize === 0;

    if (!isLastRecipient && endedBlock && blockPauseMinutes > 0) {
      updateOverlay(`Bloco ${currentBlock}/${totalBlocks} finalizado. Pausando ${blockPauseMinutes} minuto(s) antes do próximo bloco...`);
      await sleep(blockPauseMinutes * 60 * 1000);
      continue;
    }

    if (!isLastRecipient) {
      const randomDelay = getRandomDelaySeconds(minDelaySeconds, maxDelaySeconds);
      updateOverlay(`Aguardando ${randomDelay}s para o próximo envio. Faixa configurada: ${minDelaySeconds}s a ${maxDelaySeconds}s.`);
      await sleep(randomDelay * 1000);
    }
  }

  updateOverlay(`Finalizado. Enviados: ${sent}. Falhas: ${failed}.`);
  pbRunning = false;
  removeOverlayLater();
}
