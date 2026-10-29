const byId = (id) => document.getElementById(id);

const emailVariationsEl = byId("emailVariations");
const addEmailVariationEl = byId("addEmailVariation");
const emailVariationChanceEl = byId("emailVariationChance");
const minDelayEl = byId("minDelay");
const maxDelayEl = byId("maxDelay");
const blockSizeEl = byId("blockSize");
const blockSizeValueEl = byId("blockSizeValue");
const blockPauseEl = byId("blockPause");
const blockEstimateEl = byId("blockEstimate");
const statusEl = byId("status");
const startBtn = byId("start");
const stopBtn = byId("stop");
const fileInputEl = byId("fileInput");
const downloadModelEl = byId("downloadModel");
const listPreviewEl = byId("listPreview");
const listPreviewHeaderEl = byId("listPreviewHeader");
const listPreviewContainerEl = byId("listPreviewContainer");
const activeEmailListsEl = byId("activeEmailLists");
const emailPageTabs = [...document.querySelectorAll("[data-email-page]")];
const emailPages = [...document.querySelectorAll(".email-page")];
const newEmailFileButtonEl = byId("newEmailFileButton");
const savedEmailListsButtonEl = byId("toggleSavedEmailLists");
const contactSourceOptionsEl = document.querySelector(".contact-source-options");
const emailListSaveOpenEl = byId("openEmailListSave");

let importedRecipients = [];
let activeRecipientLists = [];
let emailVariations = [];

function showEmailPage(pageId) {
  const selectedPage = emailPages.find((page) => page.id === pageId) || emailPages[0];
  emailPages.forEach((page) => {
    page.hidden = page !== selectedPage;
  });
  emailPageTabs.forEach((tab) => {
    const active = tab.dataset.emailPage === selectedPage.id;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

emailPageTabs.forEach((tab) => {
  tab.addEventListener("click", () => showEmailPage(tab.dataset.emailPage));
});

newEmailFileButtonEl.addEventListener("click", () => {
  newEmailFileButtonEl.classList.add("active");
  savedEmailListsButtonEl.classList.remove("active");
  fileInputEl.click();
});

function makeId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function createActiveList(value = {}) {
  return {
    id: String(value.id || makeId()),
    name: String(value.name || "Lista carregada").trim() || "Lista carregada",
    recipients: Array.isArray(value.recipients)
      ? value.recipients.map((recipient) => ({ ...recipient })).filter((recipient) => recipient.email)
      : []
  };
}

function rebuildImportedRecipients() {
  const unique = new Map();
  activeRecipientLists.forEach((list) => {
    list.recipients.forEach((recipient) => {
      const key = String(recipient.email || "").trim().toLowerCase();
      if (key && !unique.has(key)) unique.set(key, { ...recipient, email: key });
    });
  });
  importedRecipients = [...unique.values()];
}

function createVariation(value = {}) {
  return {
    id: value.id || makeId(),
    subject: String(value.subject || ""),
    body: String(value.body || ""),
    htmlFileName: String(value.htmlFileName || ""),
    isHtml: Boolean(value.isHtml),
    collapsed: Boolean(value.collapsed)
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmailVariations(focusIndex = -1) {
  emailVariationsEl.innerHTML = emailVariations.map((variation, index) => `
    <section class="email-variation${variation.collapsed ? " collapsed" : ""}" data-email-variation="${index}">
      <div class="email-variation-header">
        <strong>Variação de email${emailVariations.length > 1 ? ` ${index + 1}` : ""}</strong>
        <span class="email-variation-header-actions">
          <button
            type="button"
            class="email-variation-toggle"
            data-toggle-email-variation="${index}"
            title="${variation.collapsed ? "Expandir" : "Recolher"} esta variação"
            aria-label="${variation.collapsed ? "Expandir" : "Recolher"} variação de email ${index + 1}"
            aria-expanded="${!variation.collapsed}"
          ><span aria-hidden="true"></span></button>
          ${emailVariations.length > 1 ? `<button
            type="button"
            class="email-variation-remove"
            data-remove-email-variation="${index}"
            title="Excluir esta variação"
            aria-label="Excluir variação de email ${index + 1}"
          >×</button>` : ""}
        </span>
      </div>
      <div class="email-variation-content"${variation.collapsed ? " hidden" : ""}>
        <label>
          Assunto
          <input
            type="text"
            data-email-variation-field="subject"
            data-email-variation-index="${index}"
            value="${escapeHtml(variation.subject)}"
            placeholder="Ex: {{nome}}, faltam 3 dias"
          >
        </label>
        <div class="email-message-field">
          <div class="email-message-label">
            <strong>Mensagem</strong>
            <span class="email-message-tools">
              <button
                type="button"
                class="email-html-picker${variation.isHtml ? " active" : ""}"
                data-select-email-html="${index}"
                title="Selecionar um arquivo HTML"
              >Subir HTML</button>
            </span>
          </div>
          <textarea
            rows="4"
            data-email-variation-field="body"
            data-email-variation-index="${index}"
            placeholder="Digite a mensagem ou cole o código HTML aqui. Variáveis: {{empresa}}, {{nome}}, {{email}}"
          >${escapeHtml(variation.body)}</textarea>
          <input
            type="file"
            data-email-variation-html="${index}"
            accept=".html,.htm,text/html"
            hidden
          >
        </div>
      </div>
    </section>
  `).join("");

  const atLimit = emailVariations.length >= 5;
  addEmailVariationEl.disabled = atLimit;
  addEmailVariationEl.innerHTML = atLimit
    ? '<span aria-hidden="true">+</span> Limite de 5 variações'
    : '<span aria-hidden="true">+</span> Adicionar outra variação';
  emailVariationChanceEl.textContent = emailVariations.length > 1
    ? `Cada variação tem ${Math.round(100 / emailVariations.length)}% de chance`
    : "";

  if (focusIndex >= 0) {
    requestAnimationFrame(() => {
      emailVariationsEl
        .querySelector(`[data-email-variation-index="${focusIndex}"][data-email-variation-field="subject"]`)
        ?.focus();
    });
  }
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#dc2626" : "#0f766e";
}

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function extractEmails(text) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index++;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((char === "," || char === ";" || char === "\t") && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findColumn(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader(alias));
    if (index !== -1) return index;
  }
  return -1;
}

function looksLikeHeader(parts) {
  const joined = parts.map(normalizeHeader).join("|");
  return joined.includes("email") || joined.includes("empresa") || joined.includes("academia") || joined.includes("nome");
}

function parseRecipients(text) {
  const rawLines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!rawLines.length) return [];

  const recipients = [];
  const firstParts = splitCsvLine(rawLines[0]);

  if (looksLikeHeader(firstParts)) {
    const emailColumn = findColumn(firstParts, ["email", "e-mail", "mail", "contato"]);
    const companyColumn = findColumn(firstParts, [
      "empresa", "nome da empresa", "companhia", "negocio",
      "academia", "nome da academia", "studio", "box"
    ]);
    const nameColumn = findColumn(firstParts, ["nome", "responsavel", "contato nome", "proprietario", "dono"]);

    for (let index = 1; index < rawLines.length; index++) {
      const parts = splitCsvLine(rawLines[index]);
      const email = emailColumn >= 0
        ? String(parts[emailColumn] || "").trim().toLowerCase()
        : String(extractEmails(rawLines[index])[0] || "").toLowerCase();
      if (!email || !extractEmails(email).length) continue;
      recipients.push({
        email,
        empresa: companyColumn >= 0 ? String(parts[companyColumn] || "").trim() : "",
        nome: nameColumn >= 0 ? String(parts[nameColumn] || "").trim() : ""
      });
    }
  } else {
    for (const line of rawLines) {
      const emails = extractEmails(line);
      if (emails.length > 1) {
        emails.forEach((email) => recipients.push({ email: email.toLowerCase(), empresa: "", nome: "" }));
        continue;
      }
      if (emails.length !== 1) continue;

      const email = emails[0].toLowerCase();
      const parts = splitCsvLine(line);
      const emailIndex = parts.findIndex((part) => extractEmails(part).length);
      const nameEmailMatch = line.match(/^\s*"?([^"<]+?)"?\s*<\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\s*>\s*$/i);
      let empresa = "";
      let nome = "";

      if (nameEmailMatch) {
        nome = nameEmailMatch[1].trim();
      } else {
        const nonEmailParts = parts.filter((part, index) => index !== emailIndex && !extractEmails(part).length);
        if (nonEmailParts.length === 1) empresa = nonEmailParts[0].trim();
        if (nonEmailParts.length >= 2) {
          empresa = nonEmailParts[0].trim();
          nome = nonEmailParts[1].trim();
        }
      }
      recipients.push({ email, empresa, nome });
    }
  }

  const unique = new Map();
  recipients.forEach((recipient) => {
    if (!unique.has(recipient.email)) unique.set(recipient.email, recipient);
  });
  return [...unique.values()];
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(String(value || "").replace(",", ".").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeNumber(value, fallback) {
  const parsed = Number(String(value || "").replace(",", ".").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getTemplates() {
  return emailVariations
    .filter((variation) => variation.subject.trim() && variation.body.trim())
    .map((variation, index) => ({
      number: index + 1,
      subject: variation.subject.trim(),
      body: variation.body.trim(),
      quantity: 1,
      isHtml: variation.isHtml || looksLikeHtml(variation.body)
    }));
}

function refreshListUI() {
  const hasRecipients = Boolean(importedRecipients.length);
  emailListSaveOpenEl.hidden = !hasRecipients;
  contactSourceOptionsEl.classList.toggle("has-save-action", hasRecipients);

  activeEmailListsEl.innerHTML = activeRecipientLists.map((list) => `
    <div class="active-email-list" data-active-email-list="${escapeHtml(list.id)}">
      <span class="active-email-list-name" title="${escapeHtml(list.name)}">${escapeHtml(list.name)}</span>
      <span class="active-email-list-count">${list.recipients.length.toLocaleString("pt-BR")} ${list.recipients.length === 1 ? "email" : "emails"}</span>
      <button
        type="button"
        class="active-email-list-remove"
        data-remove-active-email-list="${escapeHtml(list.id)}"
        aria-label="Remover ${escapeHtml(list.name)}"
        title="Remover esta lista"
      >×</button>
    </div>
  `).join("");
  activeEmailListsEl.classList.toggle("hidden", !activeRecipientLists.length);

  if (!importedRecipients.length) {
    listPreviewContainerEl.classList.add("hidden");
    listPreviewEl.classList.add("hidden");
    listPreviewEl.classList.remove("open");
    listPreviewHeaderEl.innerHTML = "";
    refreshEstimate();
    return;
  }

  const countLabel = `${importedRecipients.length.toLocaleString("pt-BR")} ${importedRecipients.length === 1 ? "email" : "emails"}`;
  listPreviewHeaderEl.innerHTML = `
    <div class="list-preview-header">
      <span class="list-preview-title">
        <span class="email-count-badge">${countLabel}</span>
      </span>
    </div>
  `;
  listPreviewEl.classList.add("open");
  listPreviewContainerEl.classList.remove("hidden");
  listPreviewEl.classList.remove("hidden");
  refreshEstimate();
}

function formatDuration(seconds) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function refreshEstimate() {
  const total = importedRecipients.length;
  const blockSize = Math.max(1, Math.floor(parsePositiveNumber(blockSizeEl.value, 30)));
  let minDelay = parsePositiveNumber(minDelayEl.value, 60);
  let maxDelay = parsePositiveNumber(maxDelayEl.value, 180);
  const blockPauseMinutes = parseNonNegativeNumber(blockPauseEl.value, 60);
  if (minDelay > maxDelay) [minDelay, maxDelay] = [maxDelay, minDelay];

  blockSizeEl.value = String(blockSize);
  blockSizeValueEl.textContent = String(blockSize);
  if (!total) {
    blockEstimateEl.textContent = "Suba uma lista para calcular os blocos.";
    return;
  }

  const blocks = Math.ceil(total / blockSize);
  const pauses = Math.max(0, blocks - 1);
  const averageDelay = (minDelay + maxDelay) / 2;
  const sendingSeconds = Math.max(0, total - 1) * averageDelay;
  const pauseSeconds = pauses * blockPauseMinutes * 60;
  const lastBlockSize = total - (blocks - 1) * blockSize;
  const activeVariations = getTemplates().length;
  const variationLabel = `${activeVariations} ${activeVariations === 1 ? "variação" : "variações"}`;

  blockEstimateEl.textContent = `${total} contatos • ${blocks} blocos • último: ${lastBlockSize} • ${variationLabel} • estimado: ${formatDuration(sendingSeconds + pauseSeconds)}`;
}

async function saveFields() {
  const legacy = [0, 1, 2].map((index) => emailVariations[index] || createVariation());
  await chrome.storage.local.set({
    emailVariations,
    subject1: legacy[0].subject,
    subject2: legacy[1].subject,
    subject3: legacy[2].subject,
    body1: legacy[0].body,
    body2: legacy[1].body,
    body3: legacy[2].body,
    qty1: "1",
    qty2: "1",
    qty3: "1",
    htmlFileNames: legacy.map((variation) => variation.htmlFileName),
    minDelay: minDelayEl.value,
    maxDelay: maxDelayEl.value,
    blockSize: blockSizeEl.value,
    blockPause: blockPauseEl.value,
    isHtmlMode: emailVariations.some((variation) => variation.isHtml || looksLikeHtml(variation.body)),
    emailActiveLists: activeRecipientLists,
    importedRecipients
  });
}

function migrateLegacyVariations(data) {
  const fileNames = Array.isArray(data.htmlFileNames) ? data.htmlFileNames : [];
  const legacy = [0, 1, 2].map((index) => createVariation({
    subject: data[`subject${index + 1}`] || "",
    body: data[`body${index + 1}`] || "",
    htmlFileName: fileNames[index] || "",
    isHtml: Boolean(data.isHtmlMode)
  }));
  const populated = legacy.filter((variation) => variation.subject || variation.body || variation.htmlFileName);
  return populated.length ? populated : [createVariation()];
}

async function loadFields() {
  const data = await chrome.storage.local.get([
    "emailVariations",
    "subject1", "subject2", "subject3",
    "body1", "body2", "body3",
    "htmlFileNames",
    "minDelay", "maxDelay", "blockSize", "blockPause",
    "isHtmlMode", "emailActiveLists", "importedRecipients"
  ]);

  const storedVariations = Array.isArray(data.emailVariations)
    ? data.emailVariations.slice(0, 5).map(createVariation)
    : [];
  emailVariations = storedVariations.length ? storedVariations : migrateLegacyVariations(data);
  const storedActiveLists = Array.isArray(data.emailActiveLists)
    ? data.emailActiveLists.map(createActiveList).filter((list) => list.recipients.length)
    : [];
  const legacyRecipients = Array.isArray(data.importedRecipients) ? data.importedRecipients : [];
  activeRecipientLists = storedActiveLists.length
    ? storedActiveLists
    : (legacyRecipients.length ? [createActiveList({ name: "Lista carregada", recipients: legacyRecipients })] : []);
  rebuildImportedRecipients();
  minDelayEl.value = data.minDelay || "60";
  maxDelayEl.value = data.maxDelay || "180";
  blockSizeEl.value = data.blockSize || "30";
  blockPauseEl.value = data.blockPause || "60";
  renderEmailVariations();
  refreshListUI();
  refreshEstimate();
  await saveFields();
}

async function getActiveGmailTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.url?.startsWith("https://mail.google.com/")) return activeTab;

  let tabs = await chrome.tabs.query({ currentWindow: true, url: "https://mail.google.com/*" });
  if (!tabs.length) tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
  tabs.sort((left, right) => Number(right.lastAccessed || 0) - Number(left.lastAccessed || 0));
  if (!tabs[0]) throw new Error("Abra o Gmail em uma aba antes de iniciar o envio.");
  return tabs[0];
}

addEmailVariationEl.addEventListener("click", async () => {
  if (emailVariations.length >= 5) return;
  emailVariations.push(createVariation());
  renderEmailVariations(emailVariations.length - 1);
  refreshEstimate();
  await saveFields();
});

emailVariationsEl.addEventListener("click", async (event) => {
  const toggleButton = event.target.closest("[data-toggle-email-variation]");
  if (toggleButton) {
    const index = Number(toggleButton.dataset.toggleEmailVariation);
    if (!emailVariations[index]) return;
    emailVariations[index].collapsed = !emailVariations[index].collapsed;
    renderEmailVariations();
    await saveFields();
    return;
  }

  const htmlPicker = event.target.closest("[data-select-email-html]");
  if (htmlPicker) {
    emailVariationsEl
      .querySelector(`[data-email-variation-html="${htmlPicker.dataset.selectEmailHtml}"]`)
      ?.click();
    return;
  }

  const removeButton = event.target.closest("[data-remove-email-variation]");
  if (!removeButton || emailVariations.length <= 1) return;
  emailVariations.splice(Number(removeButton.dataset.removeEmailVariation), 1);
  renderEmailVariations();
  refreshEstimate();
  await saveFields();
});

emailVariationsEl.addEventListener("input", async (event) => {
  const field = event.target.dataset.emailVariationField;
  const index = Number(event.target.dataset.emailVariationIndex);
  if (!field || !emailVariations[index]) return;
  emailVariations[index][field] = event.target.value;
  if (field === "body") {
    emailVariations[index].isHtml = looksLikeHtml(event.target.value);
    if (!emailVariations[index].isHtml) emailVariations[index].htmlFileName = "";
  }
  refreshEstimate();
  await saveFields();
});

emailVariationsEl.addEventListener("change", async (event) => {
  if (!event.target.matches("[data-email-variation-html]")) return;
  const index = Number(event.target.dataset.emailVariationHtml);
  const file = event.target.files && event.target.files[0];
  if (!file || !emailVariations[index]) return;

  try {
    emailVariations[index].body = await file.text();
    emailVariations[index].htmlFileName = file.name;
    emailVariations[index].isHtml = true;
    renderEmailVariations();
    refreshEstimate();
    await saveFields();
    setStatus(`HTML carregado na variação ${index + 1}: ${file.name}`);
  } catch (error) {
    setStatus(`Erro ao ler HTML: ${error.message}`, true);
  }
});

fileInputEl.addEventListener("change", async () => {
  const files = [...(fileInputEl.files || [])];
  if (!files.length) return;
  try {
    const addedLists = [];
    const invalidFiles = [];
    for (const file of files) {
      const recipients = parseRecipients(await file.text());
      if (!recipients.length) {
        invalidFiles.push(file.name);
        continue;
      }
      addedLists.push(createActiveList({ name: file.name, recipients }));
    }
    if (!addedLists.length) {
      setStatus("Não encontrei emails válidos nos arquivos selecionados.", true);
      return;
    }
    activeRecipientLists.push(...addedLists);
    rebuildImportedRecipients();
    await saveFields();
    refreshListUI();
    setStatus(invalidFiles.length ? `${invalidFiles.length} arquivo(s) sem emails válidos ignorado(s).` : "", Boolean(invalidFiles.length));
  } catch (error) {
    setStatus(`Erro ao ler arquivo: ${error.message}`, true);
  } finally {
    fileInputEl.value = "";
  }
});

activeEmailListsEl.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-active-email-list]");
  if (!removeButton) return;
  const id = removeButton.dataset.removeActiveEmailList;
  activeRecipientLists = activeRecipientLists.filter((list) => list.id !== id);
  rebuildImportedRecipients();
  await saveFields();
  refreshListUI();
  setStatus("");
});

downloadModelEl.addEventListener("click", () => {
  const model = "email,empresa,nome\ncontato@empresaalpha.com,Empresa Alpha,João\natendimento@studioforte.com,Studio Forte,Maria\n";
  const blob = new Blob([model], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "modelo_lista_empresas.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

startBtn.addEventListener("click", async () => {
  try {
    await saveFields();
    const hasIncompleteVariation = emailVariations.some((variation) =>
      !variation.subject.trim() || !variation.body.trim()
    );
    if (hasIncompleteVariation) {
      throw new Error("Preencha o assunto e a mensagem de todas as variações, ou exclua a variação vazia.");
    }

    const templates = getTemplates();
    let minDelaySeconds = parsePositiveNumber(minDelayEl.value, 60);
    let maxDelaySeconds = parsePositiveNumber(maxDelayEl.value, 180);
    if (minDelaySeconds > maxDelaySeconds) {
      [minDelaySeconds, maxDelaySeconds] = [maxDelaySeconds, minDelaySeconds];
    }
    const blockSize = Math.max(1, Math.floor(parsePositiveNumber(blockSizeEl.value, 30)));
    const blockPauseMinutes = parseNonNegativeNumber(blockPauseEl.value, 60);

    if (!templates.length) throw new Error("Preencha pelo menos uma variação completa.");
    if (!importedRecipients.length) throw new Error("Suba ou selecione uma lista antes de iniciar.");
    const tab = await getActiveGmailTab();
    chrome.tabs.sendMessage(tab.id, {
      type: "PB_GMAIL_START",
      payload: {
        recipients: importedRecipients,
        templates,
        minDelaySeconds,
        maxDelaySeconds,
        blockSize,
        blockPauseMinutes,
        isHtmlMode: false
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus("Atualize a página do Gmail e tente de novo.", true);
        return;
      }
      if (!response?.ok) {
        setStatus(response?.error || "Não foi possível iniciar.", true);
        return;
      }
      const blocks = Math.ceil(importedRecipients.length / blockSize);
      setStatus(`Envio iniciado: ${importedRecipients.length} contato(s), ${blocks} bloco(s) e ${templates.length} variação(ões).`);
    });
  } catch (error) {
    setStatus(error.message, true);
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    const tab = await getActiveGmailTab();
    chrome.tabs.sendMessage(tab.id, { type: "PB_GMAIL_STOP" }, () => {
      setStatus("Pedido de parada enviado.");
    });
  } catch (error) {
    setStatus(error.message, true);
  }
});

[minDelayEl, maxDelayEl, blockSizeEl, blockPauseEl].forEach((element) => {
  element.addEventListener("input", async () => {
    refreshEstimate();
    await saveFields();
  });
});

window.addEventListener("mkt-email-list-selected", async (event) => {
  const recipients = Array.isArray(event.detail?.recipients) ? event.detail.recipients : [];
  if (!recipients.length) return;
  activeRecipientLists.push(createActiveList({
    name: event.detail?.name || "Lista salva",
    recipients
  }));
  rebuildImportedRecipients();
  await saveFields();
  refreshListUI();
  refreshEstimate();
  setStatus("");
});

loadFields().catch((error) => setStatus(`Erro ao carregar o Email: ${error.message}`, true));
