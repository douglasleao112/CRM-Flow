const enabled = document.querySelector("#enabled");
const flowListPopup = document.querySelector("#flowListPopup");
const flowCount = document.querySelector("#flowCount");
const popupFlows = document.querySelector(".popup-flows");
const flowsTab = document.querySelector("#flowsTab");
const extractTab = document.querySelector("#extractTab");
const emailTab = document.querySelector("#emailTab");
const instagramTab = document.querySelector("#instagramTab");
const flowsPanel = document.querySelector("#flowsPanel");
const extractPanel = document.querySelector("#extractPanel");
const emailPanel = document.querySelector("#emailPanel");
const instagramPanel = document.querySelector("#instagramPanel");
const extractionSearch = document.querySelector("#extractionSearch");
const extractionSourceList = document.querySelector("#extractionSourceList");
const extractSelectAll = document.querySelector("#extractSelectAll");
const extractionTagRow = document.querySelector("#extractionTagRow");
const extractionTag = document.querySelector("#extractionTag");
const includeAdminsRow = document.querySelector("#includeAdminsRow");
const includeAdmins = document.querySelector("#includeAdmins");
const extractionSummary = document.querySelector("#extractionSummary");
const extractionStatus = document.querySelector("#extractionStatus");
const extractionResult = document.querySelector("#extractionResult");
const extractionResultCount = document.querySelector("#extractionResultCount");
const extractionResultDetails = document.querySelector("#extractionResultDetails");
const startExtraction = document.querySelector("#startExtraction");
const cancelExtraction = document.querySelector("#cancelExtraction");
const downloadExtraction = document.querySelector("#downloadExtraction");
const reloadExtractionSources = document.querySelector("#reloadExtractionSources");
const extensionVersion = document.querySelector("#extensionVersion");
if (extensionVersion) {
  extensionVersion.textContent = `Versão ${chrome.runtime.getManifest().version}`;
}

let flows = [];
let automationEnabled = false;
let activePopupTab = "flows";
let extractionSourceType = "groups";
let extractionSources = [];
let selectedSourceIds = new Set();
let extractedContacts = [];
let extractionBusy = false;
let extractionLoaded = false;
let extractionRequestToken = 0;

function renderMasterButton() {
  enabled.disabled = false;
  enabled.removeAttribute("aria-busy");
  enabled.classList.remove("loading");
  enabled.setAttribute("aria-pressed", String(automationEnabled));
  enabled.setAttribute("aria-expanded", String(automationEnabled));
  enabled.setAttribute(
    "aria-label",
    automationEnabled ? "Desativar todos os fluxos" : "Ativar todos os fluxos"
  );
  enabled.title = automationEnabled
    ? "Desativar todos os fluxos"
    : "Ativar todos os fluxos";
  enabled.classList.toggle("active", automationEnabled);
  popupFlows.classList.toggle("master-disabled", !automationEnabled);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getExtractionTag() {
  return String(extractionTag.value || "")
    .replace(/[|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function getVisibleExtractionSources() {
  const query = normalizeSearchText(extractionSearch.value);
  if (!query) return extractionSources;

  return extractionSources.filter(source =>
    normalizeSearchText(source?.name).includes(query)
  );
}

function renderFlows() {
  flowCount.textContent = String(flows.length);

  if (!flows.length) {
    flowListPopup.innerHTML = `
      <div class="popup-empty">
        Nenhum fluxo criado.
      </div>
    `;
    return;
  }

  flowListPopup.innerHTML = flows.map(flow => `
    <div class="popup-flow-item" data-flow-id="${escapeHtml(flow.id)}">
      <div class="popup-flow-info">
        <div class="popup-flow-name">${escapeHtml(flow.name || "Fluxo sem nome")}</div>
        <div class="popup-flow-trigger">
          ${escapeHtml(
            flow.triggersEnabled === false
              ? "Somente envio manual"
              : (Array.isArray(flow.triggers) && flow.triggers.length
                  ? flow.triggers
                  : [flow.trigger || {}]
                ).map(trigger =>
                  trigger.type === "any"
                    ? "Qualquer mensagem"
                    : (trigger.keywords || []).join(", ") || "Sem gatilho"
                ).join(" ou ")
          )}
        </div>
      </div>

      <label class="popup-toggle" title="${flow.enabled ? "Desativar fluxo" : "Ativar fluxo"}">
        <input
          type="checkbox"
          data-flow-toggle="${escapeHtml(flow.id)}"
          ${flow.enabled ? "checked" : ""}
        >
        <span class="popup-toggle-track">
          <span class="popup-toggle-thumb"></span>
        </span>
      </label>
    </div>
  `).join("");
}

function setPopupTab(tab) {
  activePopupTab = ["extract", "email", "instagram"].includes(tab) ? tab : "flows";
  const showingExtraction = activePopupTab === "extract";
  const showingEmail = activePopupTab === "email";
  const showingInstagram = activePopupTab === "instagram";
  const showingFlows = activePopupTab === "flows";

  flowsPanel.hidden = !showingFlows;
  extractPanel.hidden = !showingExtraction;
  emailPanel.hidden = !showingEmail;
  instagramPanel.hidden = !showingInstagram;
  flowsTab.classList.toggle("active", showingFlows);
  extractTab.classList.toggle("active", showingExtraction);
  emailTab.classList.toggle("active", showingEmail);
  instagramTab.classList.toggle("active", showingInstagram);
  flowsTab.setAttribute("aria-selected", String(showingFlows));
  extractTab.setAttribute("aria-selected", String(showingExtraction));
  emailTab.setAttribute("aria-selected", String(showingEmail));
  instagramTab.setAttribute("aria-selected", String(showingInstagram));

  if (showingExtraction && !extractionLoaded && !extractionBusy) {
    loadExtractionSources();
  }
}

async function findWhatsAppTab() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (String(activeTab?.url || "").startsWith("https://web.whatsapp.com/")) {
    return activeTab;
  }

  let tabs = await chrome.tabs.query({
    currentWindow: true,
    url: "https://web.whatsapp.com/*"
  });
  if (!tabs.length) {
    tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  }
  tabs.sort((left, right) =>
    Number(right.lastAccessed || 0) - Number(left.lastAccessed || 0)
  );
  return tabs[0] || null;
}

async function sendToWhatsApp(message) {
  const tab = await findWhatsAppTab();
  if (!tab?.id) {
    throw new Error("Abra o WhatsApp Web para usar a extração.");
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    throw new Error(
      "Atualize a aba do WhatsApp Web para carregar o extrator do CRM Flow."
    );
  }
}

function setExtractionBusy(busy, mode = "") {
  extractionBusy = busy;
  extractPanel.classList.toggle("is-busy", busy);
  extractPanel.querySelectorAll(
    "[data-extract-source], #extractionSearch, #extractSelectAll, #extractionTag, #includeAdmins, " +
    "#reloadExtractionSources, [data-extraction-source]"
  ).forEach(control => {
    control.disabled = busy;
  });
  const missingGroupTag =
    extractionSourceType === "groups" && !getExtractionTag();
  startExtraction.disabled =
    busy || selectedSourceIds.size === 0 || missingGroupTag;
  cancelExtraction.hidden = !(busy && mode === "extract");
  cancelExtraction.disabled = false;
}

function resetExtractionResult() {
  extractedContacts = [];
  extractionResult.hidden = true;
  downloadExtraction.disabled = true;
}

function renderExtractionSummary() {
  const selected = extractionSources.filter(source =>
    selectedSourceIds.has(String(source.id))
  );
  const visible = getVisibleExtractionSources();
  const visibleSelected = visible.filter(source =>
    selectedSourceIds.has(String(source.id))
  );
  const estimated = selected.reduce(
    (total, source) => total + Number(source.participantsNum || 0),
    0
  );

  extractionSummary.textContent = selected.length
    ? `${selected.length} selecionado(s) • ${estimated} contato(s) estimado(s)`
    : "Nenhuma fonte selecionada.";
  const missingGroupTag =
    extractionSourceType === "groups" && !getExtractionTag();
  startExtraction.disabled =
    extractionBusy || selected.length === 0 || missingGroupTag;
  extractSelectAll.disabled = extractionBusy || visible.length === 0;
  extractSelectAll.checked =
    visible.length > 0 && visibleSelected.length === visible.length;
  extractSelectAll.indeterminate =
    visibleSelected.length > 0 && visibleSelected.length < visible.length;
}

function renderExtractionSources() {
  const extractingGroups = extractionSourceType === "groups";
  includeAdminsRow.hidden = !extractingGroups;
  extractionTagRow.hidden = !extractingGroups;
  extractionSearch.placeholder = extractionSourceType === "groups"
    ? "Buscar grupos"
    : "Buscar etiquetas";

  if (!extractionSources.length) {
    extractionSourceList.innerHTML = `
      <div class="popup-empty">
        ${extractionSourceType === "groups"
          ? "Nenhum grupo encontrado."
          : "Nenhuma etiqueta encontrada nesta conta."}
      </div>
    `;
    renderExtractionSummary();
    return;
  }

  const visibleSources = getVisibleExtractionSources();
  if (!visibleSources.length) {
    extractionSourceList.innerHTML = `
      <div class="popup-empty">
        Nenhum resultado para “${escapeHtml(extractionSearch.value.trim())}”.
      </div>
    `;
    renderExtractionSummary();
    return;
  }

  extractionSourceList.innerHTML = visibleSources.map(source => `
    <label class="extract-source-item">
      <input
        type="checkbox"
        data-extraction-source="${escapeHtml(source.id)}"
        ${selectedSourceIds.has(String(source.id)) ? "checked" : ""}
        ${extractionBusy ? "disabled" : ""}
      >
      <span class="extract-source-copy">
        <strong>${escapeHtml(source.name || "Sem nome")}</strong>
        <small>
          ${source.unavailable
            ? "Quantidade indisponível"
            : `${Number(source.participantsNum || 0)} contato(s)`}
        </small>
      </span>
    </label>
  `).join("");
  renderExtractionSummary();
}

async function loadExtractionSources() {
  const token = ++extractionRequestToken;
  extractionLoaded = false;
  extractionSources = [];
  selectedSourceIds = new Set();
  resetExtractionResult();
  extractionTagRow.hidden = extractionSourceType !== "groups";
  includeAdminsRow.hidden = extractionSourceType !== "groups";
  extractionStatus.textContent = extractionSourceType === "groups"
    ? "Carregando grupos do WhatsApp…"
    : "Carregando etiquetas do WhatsApp…";
  extractionSourceList.innerHTML =
    '<div class="popup-empty extract-loading">Carregando…</div>';
  setExtractionBusy(true, "list");

  try {
    const response = await sendToWhatsApp({
      type: "WF_EXTRACTION_SOURCES",
      sourceType: extractionSourceType
    });
    if (token !== extractionRequestToken) return;
    if (!response?.ok) {
      throw new Error(response?.error || "Não foi possível carregar as fontes.");
    }

    extractionSources = Array.isArray(response.sources) ? response.sources : [];
    extractionLoaded = true;
    extractionStatus.textContent = extractionSources.length
      ? "Selecione o que deseja extrair."
      : "";
    renderExtractionSources();
  } catch (error) {
    if (token !== extractionRequestToken) return;
    extractionStatus.textContent = error?.message || String(error);
    extractionSourceList.innerHTML = `
      <div class="popup-empty">
        Não foi possível carregar.
      </div>
    `;
  } finally {
    if (token === extractionRequestToken) {
      setExtractionBusy(false);
      renderExtractionSummary();
    }
  }
}

async function runExtraction() {
  if (!selectedSourceIds.size || extractionBusy) return;
  const customTag = getExtractionTag();
  if (extractionSourceType === "groups" && !customTag) {
    extractionStatus.textContent = "Informe a etiqueta dos contatos antes de extrair.";
    extractionTag.focus();
    renderExtractionSummary();
    return;
  }
  resetExtractionResult();
  extractionStatus.textContent = "Extraindo e organizando os contatos…";
  setExtractionBusy(true, "extract");

  try {
    const selectedSources = extractionSources.filter(source =>
      selectedSourceIds.has(String(source.id))
    );
    const response = await sendToWhatsApp({
      type: "WF_EXTRACTION_START",
      payload: {
        sourceType: extractionSourceType,
        sourceIds: [...selectedSourceIds],
        sources: selectedSources.map(source => ({
          id: String(source.id),
          name: String(source.name || "")
        })),
        includeAdmins: includeAdmins.checked,
        customTag
      }
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Não foi possível concluir a extração.");
    }

    extractedContacts = Array.isArray(response.contacts)
      ? response.contacts
      : [];
    const stats = response.stats || {};
    const details = [];
    if (Number(stats.duplicates)) {
      details.push(`${stats.duplicates} duplicado(s) removido(s)`);
    }
    if (Number(stats.unresolved)) {
      details.push(`${stats.unresolved} sem telefone resolvido`);
    }
    if (Number(stats.failures)) {
      details.push(`${stats.failures} fonte(s) com falha`);
    }

    extractionResultCount.textContent =
      `${extractedContacts.length} contato(s) extraído(s)`;
    extractionResultDetails.textContent =
      details.join(" • ") || "Arquivo pronto no padrão do CRM Flow.";
    extractionResult.hidden = false;
    downloadExtraction.disabled = extractedContacts.length === 0;
    extractionStatus.textContent = response.cancelled
      ? "Extração interrompida. O resultado parcial está disponível."
      : extractedContacts.length
      ? "Extração concluída."
      : "Nenhum telefone válido foi encontrado nas fontes selecionadas.";
  } catch (error) {
    extractionStatus.textContent = error?.message || String(error);
  } finally {
    setExtractionBusy(false);
    renderExtractionSources();
  }
}

async function stopExtraction() {
  cancelExtraction.disabled = true;
  extractionStatus.textContent = "Interrompendo a extração…";
  try {
    await sendToWhatsApp({ type: "WF_EXTRACTION_CANCEL" });
  } catch {}
}

function downloadExtractedContacts() {
  if (!extractedContacts.length) return;
  const csv = WFExtractorUtils.buildContactsCsv(extractedContacts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = WFExtractorUtils.safeFilename(
    `contatos-${extractionSourceType}-${stamp}`
  ) + ".csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function load() {
  const { wfSettings = {}, wfFlows = [] } =
    await chrome.storage.local.get(["wfSettings", "wfFlows"]);

  automationEnabled = Boolean(wfSettings.enabled);
  renderMasterButton();
  flows = Array.isArray(wfFlows) ? wfFlows : [];
  renderFlows();
}

enabled.addEventListener("click", async () => {
  const { wfSettings = {} } = await chrome.storage.local.get("wfSettings");
  automationEnabled = !Boolean(wfSettings.enabled);

  await chrome.storage.local.set({
    wfSettings: {
      ...wfSettings,
      enabled: automationEnabled
    }
  });
  renderMasterButton();
});

flowsTab.addEventListener("click", () => setPopupTab("flows"));
extractTab.addEventListener("click", () => setPopupTab("extract"));
emailTab.addEventListener("click", () => setPopupTab("email"));
instagramTab.addEventListener("click", () => setPopupTab("instagram"));

document.querySelectorAll("[data-extract-source]").forEach(button => {
  button.addEventListener("click", () => {
    if (extractionBusy) return;
    extractionSourceType =
      button.dataset.extractSource === "labels" ? "labels" : "groups";
    document.querySelectorAll("[data-extract-source]").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    extractionSearch.value = "";
    extractionLoaded = false;
    loadExtractionSources();
  });
});

extractionSearch.addEventListener("input", () => {
  renderExtractionSources();
});

extractionTag.addEventListener("input", () => {
  resetExtractionResult();
  renderExtractionSummary();
});

extractionSourceList.addEventListener("change", event => {
  const input = event.target.closest("[data-extraction-source]");
  if (!input) return;
  const id = String(input.dataset.extractionSource || "");
  if (input.checked) selectedSourceIds.add(id);
  else selectedSourceIds.delete(id);
  resetExtractionResult();
  renderExtractionSummary();
});

extractSelectAll.addEventListener("change", () => {
  const visibleIds = getVisibleExtractionSources()
    .map(source => String(source.id));
  if (extractSelectAll.checked) {
    visibleIds.forEach(id => selectedSourceIds.add(id));
  } else {
    visibleIds.forEach(id => selectedSourceIds.delete(id));
  }
  resetExtractionResult();
  renderExtractionSources();
});

reloadExtractionSources.addEventListener("click", loadExtractionSources);
startExtraction.addEventListener("click", runExtraction);
cancelExtraction.addEventListener("click", stopExtraction);
downloadExtraction.addEventListener("click", downloadExtractedContacts);

flowListPopup.addEventListener("change", async event => {
  const toggle = event.target.closest("[data-flow-toggle]");
  if (!toggle) return;

  const flowId = toggle.dataset.flowToggle;

  flows = flows.map(flow =>
    flow.id === flowId
      ? { ...flow, enabled: toggle.checked }
      : flow
  );

  await chrome.storage.local.set({ wfFlows: flows });
  renderFlows();
});

document.querySelector("#openEditor").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.querySelector("#openInstagram").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  const instagram = tabs.sort((left, right) =>
    Number(right.lastAccessed || 0) - Number(left.lastAccessed || 0)
  )[0];
  if (instagram?.id) {
    await chrome.tabs.update(instagram.id, { active: true });
  } else {
    await chrome.tabs.create({ url: "https://www.instagram.com/direct/inbox/", active: true });
  }
  window.close();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.wfSettings) {
    automationEnabled = Boolean(changes.wfSettings.newValue?.enabled);
    renderMasterButton();
  }

  if (changes.wfFlows) {
    flows = Array.isArray(changes.wfFlows.newValue)
      ? changes.wfFlows.newValue
      : [];
    renderFlows();
  }
});

setPopupTab("flows");
load();
