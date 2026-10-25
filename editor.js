
let flows = [];
// Organização visual separada: criar, recolher ou ordenar grupos não altera
// a ordem canônica de wfFlows usada no desempate dos gatilhos.
let flowGroups = [];
let selectedId = null;
let draggedBlockId = null;
let draggedFlowId = null;
let draggedFlowGroupId = null;
let draggedNewBlockType = null;
let blockLibraryMode = "add";
let replacingBlockId = null;
let replacingFlowId = null;
let blockLibraryOpener = null;
let analytics = {};
let whatsappLabels = [];
let savedFlowFingerprints = new Map();

const $ = selector => document.querySelector(selector);

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function normalizeTypingSeconds(value) {
  return Math.min(300, Math.max(1, Math.round(Number(value) || 3)));
}

function normalizeRecordingSeconds(value) {
  return Math.min(300, Math.max(1, Math.round(Number(value) || 3)));
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function flowAnalytics(flowId) {
  return analytics[flowId] || {
    starts: 0,
    completions: 0,
    responses: 0,
    startedChats: {},
    responseChats: {},
    blocks: {},
    triggers: {}
  };
}

function blockReachPercentage(flowId, blockId) {
  const metrics = flowAnalytics(flowId);
  if (!metrics.starts) return 0;
  const count = Number(metrics.blocks?.[blockId] || 0);
  return Math.min(100, Math.round((count / metrics.starts) * 100));
}

function renderMetrics() {
  const flow = currentFlow();
  if (!flow) return;

  const metrics = flowAnalytics(flow.id);
  const starts = Number(metrics.starts || 0);
  const completions = Number(metrics.completions || 0);
  const responses = Number(metrics.responses || Object.keys(metrics.responseChats || {}).length);
  const completionRate = starts
    ? Math.min(100, Math.round((completions / starts) * 100))
    : 0;
  const responseRate = starts
    ? Math.min(100, Math.round((responses / starts) * 100))
    : 0;

  $("#metricStarts").textContent = starts.toLocaleString("pt-BR");
  $("#metricCompletions").textContent = completions.toLocaleString("pt-BR");
  $("#metricCompletionRate").textContent = `${completionRate}%`;
  $("#metricResponses").textContent = responses.toLocaleString("pt-BR");
  $("#metricResponseRate").textContent = `${responseRate}%`;
}

function currentFlow() {
  return flows.find(flow => flow.id === selectedId);
}

function flowSaveFingerprint(flow) {
  return JSON.stringify(flow, (key, value) => key === "collapsed" ? undefined : value);
}

function captureSavedFlowFingerprints() {
  savedFlowFingerprints = new Map(
    flows.map(flow => [String(flow.id), flowSaveFingerprint(flow)])
  );
}

function flowHasUnsavedChanges(flow) {
  return savedFlowFingerprints.get(String(flow.id)) !== flowSaveFingerprint(flow);
}

function normalizeFlowGroups(rawGroups, sourceFlows = flows) {
  const validFlowIds = new Set(sourceFlows.map(flow => String(flow.id)));
  const claimedFlowIds = new Set();
  const usedGroupIds = new Set();

  return (Array.isArray(rawGroups) ? rawGroups : []).map((rawGroup, index) => {
    let id = String(rawGroup?.id || uid());
    while (usedGroupIds.has(id)) id = uid();
    usedGroupIds.add(id);

    const name = String(rawGroup?.name || "").trim() || `Grupo ${index + 1}`;
    const flowIds = [];
    const sourceIds = Array.isArray(rawGroup?.flowIds) ? rawGroup.flowIds : [];
    sourceIds.forEach(rawFlowId => {
      const flowId = String(rawFlowId);
      if (!validFlowIds.has(flowId) || claimedFlowIds.has(flowId)) return;
      claimedFlowIds.add(flowId);
      flowIds.push(flowId);
    });

    return {
      id,
      name,
      collapsed: Boolean(rawGroup?.collapsed),
      flowIds
    };
  });
}

function flowGroupForFlow(flowId) {
  return flowGroups.find(group => group.flowIds.includes(String(flowId))) || null;
}

function createFlowGroup(name = "Novo grupo") {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return null;
  const group = { id: uid(), name: normalizedName, collapsed: false, flowIds: [] };
  flowGroups.push(group);
  return group;
}

function renameFlowGroup(groupId, name) {
  const group = flowGroups.find(item => item.id === String(groupId));
  const normalizedName = String(name || "").trim();
  if (!group || !normalizedName) return false;
  group.name = normalizedName;
  return true;
}

function toggleFlowGroup(groupId) {
  const group = flowGroups.find(item => item.id === String(groupId));
  if (!group) return false;
  group.collapsed = !group.collapsed;
  return true;
}

function moveFlowToGroup(flowId, groupId = null, beforeFlowId = null, placeAfter = false) {
  const normalizedFlowId = String(flowId);
  if (!flows.some(flow => String(flow.id) === normalizedFlowId)) return false;
  if (beforeFlowId !== null && String(beforeFlowId) === normalizedFlowId) return false;

  const normalizedGroupId = groupId ? String(groupId) : null;
  const destination = normalizedGroupId
    ? flowGroups.find(group => group.id === normalizedGroupId)
    : null;
  if (normalizedGroupId && !destination) return false;

  flowGroups.forEach(group => {
    group.flowIds = group.flowIds.filter(id => id !== normalizedFlowId);
  });

  if (destination) {
    const targetId = beforeFlowId ? String(beforeFlowId) : null;
    const targetIndex = targetId ? destination.flowIds.indexOf(targetId) : -1;
    if (targetIndex === -1) destination.flowIds.push(normalizedFlowId);
    else destination.flowIds.splice(targetIndex + (placeAfter ? 1 : 0), 0, normalizedFlowId);
    return true;
  }

  if (beforeFlowId) {
    // Preserva o comportamento anterior da lista "Sem grupo": somente um
    // arraste explícito entre seus fluxos muda a ordem canônica de wfFlows.
    const fromIndex = flows.findIndex(flow => String(flow.id) === normalizedFlowId);
    const [movedFlow] = flows.splice(fromIndex, 1);
    const targetIndex = flows.findIndex(flow => String(flow.id) === String(beforeFlowId));
    if (targetIndex === -1) flows.push(movedFlow);
    else flows.splice(targetIndex + (placeAfter ? 1 : 0), 0, movedFlow);
  }
  return true;
}

function reorderFlowGroups(groupId, targetGroupId, placeAfter = false) {
  const fromIndex = flowGroups.findIndex(group => group.id === String(groupId));
  const originalTargetIndex = flowGroups.findIndex(group => group.id === String(targetGroupId));
  if (fromIndex === -1 || originalTargetIndex === -1 || fromIndex === originalTargetIndex) return false;
  const [movedGroup] = flowGroups.splice(fromIndex, 1);
  const targetIndex = flowGroups.findIndex(group => group.id === String(targetGroupId));
  flowGroups.splice(targetIndex + (placeAfter ? 1 : 0), 0, movedGroup);
  return true;
}

function deleteFlowGroup(groupId) {
  const index = flowGroups.findIndex(group => group.id === String(groupId));
  if (index === -1) return false;
  flowGroups.splice(index, 1);
  return true;
}

function duplicateFlow(flowId) {
  const source = flows.find(flow => flow.id === String(flowId));
  if (!source) return null;

  const clone = JSON.parse(JSON.stringify(source));
  clone.id = uid();
  clone.name = `${source.name || "Fluxo sem nome"} (cópia)`;
  clone.blocks = (clone.blocks || []).map(block => ({ ...block, id: uid() }));

  const sourceIndex = flows.findIndex(flow => flow.id === source.id);
  flows.splice(sourceIndex + 1, 0, clone);
  const group = flowGroupForFlow(source.id);
  if (group) {
    const groupedSourceIndex = group.flowIds.indexOf(source.id);
    group.flowIds.splice(groupedSourceIndex + 1, 0, clone.id);
  }
  selectedId = clone.id;
  return clone;
}

function deleteFlow(flowId) {
  const normalizedFlowId = String(flowId);
  const index = flows.findIndex(flow => String(flow.id) === normalizedFlowId);
  if (index === -1) return false;
  flows.splice(index, 1);
  flowGroups.forEach(group => {
    group.flowIds = group.flowIds.filter(id => id !== normalizedFlowId);
  });
  if (selectedId === normalizedFlowId) selectedId = flows[0]?.id || null;
  return true;
}

function newBlock(type) {
  const base = { id: uid(), type, enabled: true, collapsed: false };
  if (type === "text") {
    const text = "Olá! Como vai?";
    return { ...base, text, messages: [text], showTyping: true, typingSeconds: 3, showLinkPreview: false };
  }
  if (type === "image") return { ...base, fileName: "", mimeType: "", dataUrl: "", mediaVariants: [], caption: "", viewOnce: false };
  if (type === "video") return { ...base, fileName: "", mimeType: "", dataUrl: "", mediaVariants: [], caption: "", viewOnce: false };
  if (type === "audio") return { ...base, fileName: "", mimeType: "audio/ogg", dataUrl: "", audioVariants: [], isPtt: true, waveform: true, showRecording: false, recordingSeconds: 3 };
  if (type === "wait") {
    return { ...base, seconds: 3, varyInterval: false, minSeconds: 3, maxSeconds: 10 };
  }
  if (type === "await") {
    return {
      ...base,
      useTimeout: false,
      varyTimeout: false,
      timeoutAmount: 10,
      timeoutMinAmount: 10,
      timeoutMaxAmount: 20,
      timeoutUnit: "seconds",
      timeoutAction: "continue",
      timeoutTargetFlowId: ""
    };
  }
  if (type === "condition") return { ...base, matchType: "contains", value: "sim", yesIndex: 0, noIndex: 0 };
  if (type === "pause") return { ...base, minutes: 720 };
  if (type === "flow") return { ...base, targetFlowId: "" };
  if (type === "label") return { ...base, labelId: "", labelName: "" };
  if (type === "removeLabel") return { ...base, labelId: "", labelName: "" };
  return base;
}

function blockName(type) {
  return ({
    text: "Texto",
    image: "Imagem",
    video: "Vídeo",
    audio: "Áudio",
    wait: "Espera",
    await: "Aguardar resposta",
    condition: "Condição",
    pause: "Pausar automação",
    flow: "Conectar a outro fluxo",
    label: "Aplicar etiqueta",
    removeLabel: "Remover etiqueta"
  })[type] || type;
}

function blockIcon(type) {
  return ({
    text: "block-icons/text.png",
    image: "block-icons/image.png",
    video: "block-icons/video.png",
    audio: "block-icons/audio.png",
    wait: "block-icons/wait.png",
    await: "block-icons/await.png",
    condition: "block-icons/condition.png",
    pause: "block-icons/pause.png",
    flow: "block-icons/connect-flow.png",
    label: "block-icons/label.svg",
    removeLabel: "block-icons/remove-label.svg"
  })[type] || "";
}

function blockLabelDisplayName(block = {}) {
  const selectedId = String(block.labelId || "");
  const syncedLabel = whatsappLabels.find(label => String(label.id || "") === selectedId);
  const selectedName = String(syncedLabel?.name || block.labelName || "").trim();
  return selectedName || (selectedId ? `ID ${selectedId} (não sincronizada)` : "");
}

function blockCollapsedSummary(block = {}) {
  if (!block.collapsed || !["label", "removeLabel"].includes(block.type)) return "";
  return `Etiqueta: ${blockLabelDisplayName(block) || "não selecionada"}`;
}

function blockHeaderSubtitle(block = {}) {
  const status = block.enabled === false ? "Bloco desativado" : "Bloco ativo";
  const summary = blockCollapsedSummary(block);
  return summary ? `${status} · ${summary}` : status;
}

function setLabelBlockRemoval(block, shouldRemove) {
  if (!block || !["label", "removeLabel"].includes(block.type)) return false;
  block.type = shouldRemove ? "removeLabel" : "label";
  return true;
}

function blockHasMeaningfulContent(block = {}) {
  if (block.type === "text") {
    const messages = Array.isArray(block.messages) ? block.messages : [block.text];
    if (messages.some(message => String(message || "").trim())) return true;
  }

  // Mesmo nos valores iniciais, estas etapas já mudam o comportamento do fluxo.
  if (["wait", "await", "condition", "pause"].includes(block.type)) return true;

  const defaults = newBlock(block.type || "text");
  const ignored = new Set(["id", "type", "enabled", "collapsed"]);
  const keys = new Set([...Object.keys(defaults), ...Object.keys(block)]);
  return [...keys].some(key => {
    if (ignored.has(key)) return false;
    return JSON.stringify(block[key]) !== JSON.stringify(defaults[key]);
  });
}

function replaceBlockType(blockId, newType, flowId = replacingFlowId || selectedId) {
  const supportedTypes = ["text", "image", "video", "audio", "wait", "await", "condition", "pause", "flow", "label", "removeLabel"];
  if (!supportedTypes.includes(newType)) return null;

  const flow = flows.find(item => String(item.id) === String(flowId));
  const index = flow?.blocks?.findIndex(block => String(block.id) === String(blockId)) ?? -1;
  if (!flow || index < 0) return null;

  const current = flow.blocks[index];
  if (current.type === newType) return current;

  const replacement = newBlock(newType);
  replacement.enabled = current.enabled !== false;
  replacement.collapsed = false;
  flow.blocks.splice(index, 1, replacement);
  return replacement;
}

function createFlow(targetGroupId = null) {
  syncHeader();
  closeLibrary();
  const selectedGroup = targetGroupId
    ? flowGroups.find(group => group.id === String(targetGroupId)) || null
    : null;
  const flow = {
    id: uid(),
    name: "Novo fluxo",
    enabled: true,
    triggersEnabled: true,
    trigger: { type: "contains", keywords: ["consulta"] },
    triggers: [{ id: uid(), type: "contains", keywords: ["consulta"] }],
    oncePerChat: false,
    blocks: []
  };
  flows.push(flow);
  if (selectedGroup) selectedGroup.flowIds.push(flow.id);
  selectedId = flow.id;
  render();
}

function render() {
  renderFlowList();
  const flow = currentFlow();
  $("#emptyState").classList.toggle("hidden", Boolean(flow));
  $("#flowEditor").classList.toggle("hidden", !flow);
  $("#flowTotal").textContent = `${flows.length} ${flows.length === 1 ? "fluxo" : "fluxos"}`;

  if (!flow) return;

  $("#flowName").value = flow.name || "";
  $("#flowEnabled").checked = Boolean(flow.enabled);
  $("#triggersEnabled").checked = flow.triggersEnabled !== false;
  renderTriggerRows();
  renderTriggerAvailability();
  $("#oncePerChat").checked = Boolean(flow.oncePerChat);

  updateTriggerSummary();
  renderMetrics();
  renderBlocks();
}

function renderFlowList() {
  const list = $("#flowList");
  if (!flows.length && !flowGroups.length) {
    list.innerHTML = '<div class="flow-list-empty">Nenhum fluxo criado.</div>';
    return;
  }

  const renderFlowItem = flow => `
    <div class="workflow-flow-item ${flow.id === selectedId ? "active" : ""}" data-flow-id="${flow.id}">
      <span class="flow-drag-handle" draggable="true" title="Segure e arraste para mudar a posição" aria-label="Mover fluxo" role="button" tabindex="0">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </span>
      <button type="button" class="flow-select" data-select="${flow.id}">
        <span class="flow-status ${flow.enabled ? "on" : "off"}"></span>
        <span class="flow-list-name">${esc(flow.name || "Fluxo sem nome")}</span>
      </button>
      <div class="flow-combined-actions" role="group" aria-label="Ações do fluxo">
        ${flowHasUnsavedChanges(flow) ? `
          <button type="button" class="flow-save" data-save-flow="${flow.id}" title="Salvar alterações" aria-label="Salvar alterações do fluxo">✓</button>
        ` : ""}
        <button type="button" class="flow-copy" data-copy="${flow.id}" title="Copiar fluxo" aria-label="Copiar fluxo">${iconSvg("duplicate")}</button>
        <button type="button" class="flow-delete" data-delete="${flow.id}" title="Excluir fluxo" aria-label="Excluir fluxo">×</button>
      </div>
    </div>
  `;

  if (!flowGroups.length) {
    list.classList.remove("has-groups");
    list.innerHTML = flows.map(renderFlowItem).join("");
    return;
  }

  list.classList.add("has-groups");
  const flowsById = new Map(flows.map(flow => [String(flow.id), flow]));
  const groupedIds = new Set(flowGroups.flatMap(group => group.flowIds));
  const groupsMarkup = flowGroups.map(group => {
    const groupFlows = group.flowIds.map(id => flowsById.get(String(id))).filter(Boolean);
    const groupId = esc(group.id);
    const groupName = esc(group.name);
    return `
      <section class="flow-group ${group.collapsed ? "collapsed" : ""}" data-flow-group-id="${groupId}">
        <div class="flow-group-header" data-group-drop="${groupId}">
          <span class="flow-group-drag-handle" draggable="true" data-group-drag="${groupId}" title="Arraste para mudar a posição do grupo" aria-label="Mover grupo ${groupName}" role="button" tabindex="0">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </span>
          <button type="button" class="flow-group-toggle" data-group-toggle="${groupId}" aria-expanded="${!group.collapsed}" title="${group.collapsed ? "Expandir" : "Recolher"} grupo">
            <span class="flow-group-chevron" aria-hidden="true">›</span>
            <span class="flow-group-name">${groupName}</span>
            <span class="flow-group-count">${groupFlows.length}</span>
          </button>
          <div class="flow-group-actions" role="group" aria-label="Ações do grupo ${groupName}">
            <button type="button" data-group-add-flow="${groupId}" title="Criar fluxo neste grupo" aria-label="Criar fluxo no grupo ${groupName}">+</button>
            <button type="button" data-group-rename="${groupId}" title="Renomear grupo" aria-label="Renomear grupo ${groupName}">✎</button>
            <button type="button" class="danger" data-group-delete="${groupId}" title="Excluir grupo" aria-label="Excluir grupo ${groupName}">×</button>
          </div>
        </div>
        <div class="flow-group-items" data-group-drop="${groupId}" ${group.collapsed ? "hidden" : ""}>
          ${groupFlows.length ? groupFlows.map(renderFlowItem).join("") : '<div class="flow-group-empty">Arraste fluxos para cá</div>'}
        </div>
      </section>`;
  }).join("");

  const ungroupedFlows = flows.filter(flow => !groupedIds.has(String(flow.id)));
  const ungroupedMarkup = `
    <section class="flow-group flow-group-ungrouped" data-flow-group-id="">
      <div class="flow-group-header" data-group-drop="">
        <div class="flow-group-ungrouped-title">
          <span>Sem grupo</span>
          <span class="flow-group-count">${ungroupedFlows.length}</span>
        </div>
      </div>
      <div class="flow-group-items" data-group-drop="">
        ${ungroupedFlows.length ? ungroupedFlows.map(renderFlowItem).join("") : '<div class="flow-group-empty">Arraste fluxos para cá</div>'}
      </div>
    </section>`;

  list.innerHTML = groupsMarkup + ungroupedMarkup;
}

function updateTriggerSummary() {
  const flow = currentFlow();
  if (!flow) return;
  if (flow.triggersEnabled === false) {
    $("#triggerSummary").textContent = "Fluxo disponível somente para envio manual";
    return;
  }
  const triggers = Array.isArray(flow.triggers) && flow.triggers.length
    ? flow.triggers
    : [flow.trigger || { type: "contains", keywords: [] }];
  const labels = {
    contains: keywords => `contém: ${keywords || "sem palavras"}`,
    equals: keywords => `é exatamente: ${keywords || "sem palavras"}`,
    starts: keywords => `começa com: ${keywords || "sem palavras"}`,
    any: () => "é qualquer mensagem"
  };
  const summaries = triggers.map(trigger => {
    const keywords = (trigger.keywords || []).join(", ");
    return (labels[trigger.type] || labels.contains)(keywords);
  });
  $("#triggerSummary").textContent = `Mensagem ${summaries.join(" ou ")}`;
}

function renderTriggerAvailability() {
  const flow = currentFlow();
  if (!flow) return;
  const enabled = flow.triggersEnabled !== false;
  $("#triggerRows").classList.toggle("hidden", !enabled);
  $("#addTrigger").classList.toggle("hidden", !enabled);
  $("#oncePerChat").closest(".workflow-once")?.classList.toggle("hidden", !enabled);
}

function renderTriggerRows() {
  const flow = currentFlow();
  if (!flow) return;
  const triggers = Array.isArray(flow.triggers) && flow.triggers.length
    ? flow.triggers
    : [flow.trigger || { type: "contains", keywords: [] }];
  $("#triggerRows").innerHTML = triggers.map((trigger, index) => `
    <div class="trigger-row" data-trigger-index="${index}">
      <div>
        <label>Quando a mensagem</label>
        <select data-trigger-field="type">
          <option value="contains" ${trigger.type === "contains" ? "selected" : ""}>Contém</option>
          <option value="equals" ${trigger.type === "equals" ? "selected" : ""}>É exatamente</option>
          <option value="starts" ${trigger.type === "starts" ? "selected" : ""}>Começa com</option>
          <option value="any" ${trigger.type === "any" ? "selected" : ""}>For qualquer mensagem</option>
        </select>
      </div>
      <div>
        <label class="trigger-keywords-label">
          Palavras ou frases
          <span class="trigger-count-badge" title="Disparos por este gatilho">
            ${Number(flowAnalytics(flow.id).triggers?.[trigger.id] || 0).toLocaleString("pt-BR")}
          </span>
          <button type="button" class="reset-trigger-count" data-reset-trigger="${index}"
            title="Zerar disparos deste gatilho" aria-label="Zerar disparos deste gatilho">↻</button>
        </label>
        <input data-trigger-field="keywords" value="${esc((trigger.keywords || []).join(", "))}"
          placeholder="consulta, preço, valor" ${trigger.type === "any" ? "disabled" : ""}>
      </div>
      ${triggers.length > 1 ? `
        <button type="button" class="remove-trigger-btn" data-remove-trigger="${index}"
          title="Remover gatilho" aria-label="Remover gatilho ${index + 1}">×</button>
      ` : ""}
    </div>
  `).join("");
}

function fileField(block, accept, helper, showStatus = true) {
  return `
    <div class="node-field">
      <label>Arquivo</label>
      <input type="file" data-media-file accept="${accept}">
      ${showStatus ? `
        <div class="workflow-file-status">
          ${block.fileName ? `Selecionado: <strong>${esc(block.fileName)}</strong>` : helper}
        </div>
      ` : ""}
    </div>
  `;
}

function audioVariantsForBlock(block = {}) {
  const stored = Array.isArray(block.audioVariants)
    ? block.audioVariants
        .slice(0, 5)
        .map(item => ({
          fileName: String(item?.fileName || ""),
          mimeType: String(item?.mimeType || "audio/ogg"),
          dataUrl: String(item?.dataUrl || "")
        }))
        .filter(item => item.dataUrl)
    : [];

  if (stored.length) return stored;
  if (!block.dataUrl) return [];

  return [{
    fileName: String(block.fileName || ""),
    mimeType: String(block.mimeType || "audio/ogg"),
    dataUrl: String(block.dataUrl)
  }];
}

function syncPrimaryAudioFields(block) {
  const variants = audioVariantsForBlock(block);
  block.audioVariants = variants;
  const primary = variants[0] || { fileName: "", mimeType: "audio/ogg", dataUrl: "" };
  block.fileName = primary.fileName;
  block.mimeType = primary.mimeType;
  block.dataUrl = primary.dataUrl;
}

function visualMediaVariantsForBlock(block = {}) {
  const fallbackMimeType = block.type === "image" ? "image/jpeg" : "video/mp4";
  const stored = Array.isArray(block.mediaVariants)
    ? block.mediaVariants
        .slice(0, 5)
        .map(item => ({
          fileName: String(item?.fileName || ""),
          mimeType: String(item?.mimeType || fallbackMimeType),
          dataUrl: String(item?.dataUrl || "")
        }))
        .filter(item => item.dataUrl)
    : [];

  if (stored.length) return stored;
  if (!block.dataUrl) return [];

  return [{
    fileName: String(block.fileName || ""),
    mimeType: String(block.mimeType || fallbackMimeType),
    dataUrl: String(block.dataUrl)
  }];
}

function syncPrimaryVisualMediaFields(block) {
  const variants = visualMediaVariantsForBlock(block);
  block.mediaVariants = variants;
  const primary = variants[0] || { fileName: "", mimeType: "", dataUrl: "" };
  block.fileName = primary.fileName;
  block.mimeType = primary.mimeType;
  block.dataUrl = primary.dataUrl;
}

function visualMediaBlockFields(block) {
  const isImage = block.type === "image";
  const variants = visualMediaVariantsForBlock(block);
  const noun = isImage ? "imagem" : "vídeo";
  const accept = isImage
    ? "image/jpeg,image/png,image/webp,image/gif"
    : "video/mp4,video/webm,video/quicktime";

  const preview = (media, mediaIndex) => isImage
    ? `<img src="${media.dataUrl}" alt="Prévia da ${noun} ${mediaIndex + 1}">`
    : `<video controls muted preload="metadata" src="${media.dataUrl}"></video>`;

  return `
    <div class="node-grid visual-media-node-grid">
      <div class="visual-media-variant-list">
        ${variants.length ? variants.map((media, mediaIndex) => `
          <div class="audio-file-preview-container media-file-preview-container" data-media-variant-container="${mediaIndex}">
            <div class="node-field">
              <label>Arquivo</label>
              <div class="audio-file-picker">
                <label class="audio-file-picker-button">
                  Escolher arquivo
                  <input type="file" data-media-variant-file="${mediaIndex}" accept="${accept}">
                </label>
                <span class="workflow-file-status audio-selected-file-name"
                  title="${esc(media.fileName || `${noun} selecionado`)}">${esc(media.fileName || `${noun} selecionado`)}</span>
              </div>
            </div>

            <div class="audio-preview visual-media-preview">
              <div class="audio-preview-header">
                <div><strong>Prévia da ${noun}${variants.length > 1 ? ` ${mediaIndex + 1}` : ""}</strong></div>
                <div class="audio-variation-card-actions">
                  ${variants.length > 1 ? `
                    <button type="button" class="audio-variation-remove" data-remove-media-variant="${mediaIndex}"
                      title="Remover esta ${noun}" aria-label="Remover ${noun} ${mediaIndex + 1}">×</button>
                  ` : ""}
                </div>
              </div>
              <div class="visual-media-preview-body">${preview(media, mediaIndex)}</div>
            </div>
          </div>
        `).join("") : `
          <div class="audio-file-preview-container media-file-preview-container">
            <div class="node-field">
              <label>Arquivo</label>
              <div class="audio-file-picker">
                <label class="audio-file-picker-button">
                  Escolher arquivo
                  <input type="file" data-media-file accept="${accept}">
                </label>
                <span class="workflow-file-status audio-selected-file-name">Nenhum arquivo escolhido</span>
              </div>
            </div>
            <div class="audio-preview-placeholder">A prévia da ${noun} aparecerá aqui</div>
          </div>
        `}
      </div>

      ${variants.length ? `
        <div class="audio-variation-actions visual-media-variation-actions">
          <label class="audio-variation-add ${variants.length >= 5 ? "disabled" : ""}">
            <span aria-hidden="true">+</span>
            ${variants.length >= 5 ? `Limite de 5 ${isImage ? "imagens" : "vídeos"}` : `Adicionar outr${isImage ? "a imagem" : "o vídeo"}`}
            <input type="file" data-add-media-file accept="${accept}" ${variants.length >= 5 ? "disabled" : ""}>
          </label>
          ${variants.length > 1 ? `
            <span class="audio-variation-chance">
              Cada ${noun} tem ${Math.round(100 / variants.length)}% de chance
            </span>
          ` : ""}
        </div>
      ` : ""}

      <label class="form-check visual-media-view-once">
        <input class="form-check-input" type="checkbox" data-field="viewOnce" ${block.viewOnce ? "checked" : ""}>
        <span class="form-check-label">Visualização única</span>
      </label>
      <div class="node-field full visual-media-caption">
        <label>Legenda</label>
        <textarea data-field="caption">${esc(block.caption || "")}</textarea>
      </div>
    </div>
  `;
}

async function validateWhatsAppMediaFile(file, block) {
  const lowerName = String(file?.name || "").toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder("latin1").decode(bytes);

  if (block.type === "video") {
    const isMp4 =
      lowerName.endsWith(".mp4") ||
      String(file.type || "").toLowerCase() === "video/mp4";
    const hasH264 = signature.includes("avc1") || signature.includes("avc3");
    const hasHevc = signature.includes("hvc1") || signature.includes("hev1");

    if (hasHevc) {
      return {
        ok: false,
        message:
          "Este vídeo usa HEVC/H.265, que o WhatsApp não aceita neste envio. " +
          "Converta-o para MP4 com vídeo H.264 e áudio AAC antes de selecionar o arquivo."
      };
    }

    if (!isMp4 || !hasH264) {
      return {
        ok: false,
        message:
          "Não foi possível confirmar que este vídeo é MP4/H.264. " +
          "Use um arquivo MP4 com vídeo H.264 e áudio AAC."
      };
    }

    return { ok: true, mimeType: "video/mp4" };
  }

  if (block.type === "audio" && block.isPtt !== false) {
    const inspection = window.WFAudioConverter?.inspectFile
      ? await window.WFAudioConverter.inspectFile(file)
      : {
          isOggOpus: signature.startsWith("OggS") && signature.includes("OpusHead")
        };
    if (!inspection.isOggOpus) {
      if (!window.WFAudioConverter?.convertToVoiceNote) {
        return {
          ok: false,
          message: "O conversor automático de áudio não foi carregado. Atualize a página e tente novamente."
        };
      }
      return {
        ok: true,
        needsConversion: true,
        mimeType: "audio/ogg"
      };
    }

    return { ok: true, mimeType: "audio/ogg" };
  }

  return { ok: true };
}

function blockFields(block, index) {
  if (block.type === "text") {
    const messages = Array.isArray(block.messages) && block.messages.length
      ? block.messages.slice(0, 5)
      : [String(block.text || "")];
    const typingSeconds = normalizeTypingSeconds(block.typingSeconds);

    return `
      <div class="text-variations">
        ${messages.map((message, messageIndex) => `
          <div class="node-field text-variation">
            <div class="text-variation-header">
              <label>Mensagem${messages.length > 1 ? ` ${messageIndex + 1}` : ""}</label>
              <div class="text-variable-buttons" aria-label="Variáveis da mensagem">
                <button type="button" data-insert-text-variable="{nome}" data-variable-message-index="${messageIndex}">{nome}</button>
                <button type="button" data-insert-text-variable="{sobrenome}" data-variable-message-index="${messageIndex}">{sobrenome}</button>
                <button type="button" data-insert-text-variable="{telefone}" data-variable-message-index="${messageIndex}">{telefone}</button>
                <button type="button" data-insert-text-variable="{etiqueta}" data-variable-message-index="${messageIndex}">{etiqueta}</button>
              </div>
              ${messages.length > 1 ? `
                <button type="button" class="text-variation-remove" data-remove-message="${messageIndex}"
                  title="Remover esta mensagem" aria-label="Remover mensagem ${messageIndex + 1}">×</button>
              ` : ""}
            </div>
            <textarea data-message-index="${messageIndex}">${esc(message)}</textarea>
          </div>
        `).join("")}
      </div>

      <div class="text-variation-actions">
        <button type="button" class="text-variation-add" data-add-message
          ${messages.length >= 5 ? "disabled" : ""}>
          <span aria-hidden="true">+</span>
          ${messages.length >= 5 ? "Limite de 5 mensagens" : "Adicionar outra mensagem"}
        </button>
        ${messages.length > 1 ? `
          <span class="text-variation-chance">
            Cada mensagem tem ${Math.round(100 / messages.length)}% de chance
          </span>
        ` : ""}
      </div>

      <div class="form-check text-typing-option">
        <input
          id="text-typing-toggle-${index}"
          class="form-check-input"
          type="checkbox"
          data-field="showTyping"
          ${block.showTyping ? "checked" : ""}
        >
        <label class="form-check-label" for="text-typing-toggle-${index}">Mostrar “Escrevendo...” por</label>
        <input
          id="text-typing-seconds-${index}"
          class="text-typing-seconds"
          type="number"
          inputmode="numeric"
          min="1"
          max="300"
          step="1"
          value="${typingSeconds}"
          data-field="typingSeconds"
          aria-label="Tempo exibindo Escrevendo em segundos"
          ${block.showTyping ? "" : "disabled"}
        >
        <label class="text-typing-suffix" for="text-typing-seconds-${index}">segundos antes de enviar</label>
      </div>

      <label class="form-check text-link-preview-option">
        <input
          class="form-check-input"
          type="checkbox"
          data-field="showLinkPreview"
          ${block.showLinkPreview ? "checked" : ""}
        >
        <span class="form-check-label">
          Mostrar prévia dos links
        </span>
      </label>
    `;
  }

  if (block.type === "image") {
    return visualMediaBlockFields(block);
  }

  if (block.type === "video") {
    return visualMediaBlockFields(block);
  }

  if (block.type === "audio") {
    const recordingSeconds = normalizeRecordingSeconds(block.recordingSeconds);
    const audioVariants = audioVariantsForBlock(block);
    const audioAccept = ".ogg,.oga,.opus,.mp3,.wav,.m4a,.aac,.flac,.webm,audio/ogg,audio/opus,audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/aac,audio/flac,audio/webm";

    return `
      <div class="node-grid audio-node-grid">
        <div class="node-checks">
          <div class="form-check audio-recording-option">
            <input
              id="audio-recording-toggle-${index}"
              class="form-check-input"
              type="checkbox"
              data-field="showRecording"
              ${block.showRecording ? "checked" : ""}
            >
            <label class="form-check-label" for="audio-recording-toggle-${index}">Mostrar "Gravando..." por</label>
            <input
              id="audio-recording-seconds-${index}"
              class="audio-recording-seconds"
              type="number"
              inputmode="numeric"
              min="1"
              max="300"
              step="1"
              value="${recordingSeconds}"
              data-field="recordingSeconds"
              aria-label="Tempo exibindo Gravando em segundos"
              ${block.showRecording ? "" : "disabled"}
            >
            <label class="audio-recording-suffix" for="audio-recording-seconds-${index}">segundos antes de enviar</label>
          </div>

          <label class="form-check">
            <input class="form-check-input" type="checkbox" data-field="waveform" ${block.waveform !== false ? "checked" : ""}>
            <span class="form-check-label">Enviar áudio em formato de onda</span>
          </label>

          <label class="form-check">
            <input class="form-check-input" type="checkbox" data-field="isPtt" ${block.isPtt !== false ? "checked" : ""}>
            <span class="form-check-label">Mostrar como Gravado na hora</span>
          </label>
        </div>

        <div class="audio-file-preview-list">
          ${audioVariants.length ? audioVariants.map((audio, audioIndex) => `
            <div class="audio-file-preview-container" data-audio-variant-container="${audioIndex}">
              <div class="node-field">
                <label>Arquivo</label>
                <div class="audio-file-picker">
                  <label class="audio-file-picker-button">
                    Escolher arquivo
                    <input type="file" data-audio-variant-file="${audioIndex}" accept="${audioAccept}">
                  </label>
                  <span class="workflow-file-status audio-selected-file-name"
                    title="${esc(audio.fileName || "Áudio selecionado")}">${esc(audio.fileName || "Áudio selecionado")}</span>
                </div>
              </div>

              <div class="audio-preview" data-audio-variant-preview="${audioIndex}">
                <div class="audio-preview-header">
                  <div>
                    <strong>Prévia do áudio${audioVariants.length > 1 ? ` ${audioIndex + 1}` : ""}</strong>
                  </div>
                  <div class="audio-variation-card-actions">
                    ${audioVariants.length > 1 ? `
                      <button type="button" class="audio-variation-remove" data-remove-audio-variant="${audioIndex}"
                        title="Remover este áudio" aria-label="Remover áudio ${audioIndex + 1}">×</button>
                    ` : ""}
                  </div>
                </div>

                <audio controls preload="metadata" src="${audio.dataUrl}"></audio>
              </div>
            </div>
          `).join("") : `
            <div class="audio-file-preview-container">
              <div class="node-field">
                <label>Arquivo</label>
                <div class="audio-file-picker">
                  <label class="audio-file-picker-button">
                    Escolher arquivo
                    <input type="file" data-media-file accept="${audioAccept}">
                  </label>
                  <span class="workflow-file-status audio-selected-file-name">Nenhum arquivo escolhido</span>
                </div>
              </div>
              <div class="audio-preview-placeholder">
                A prévia do áudio aparecerá aqui
              </div>
            </div>
          `}
        </div>

        ${audioVariants.length ? `
          <div class="audio-variation-actions audio-variation-actions-left">
            <label class="audio-variation-add ${audioVariants.length >= 5 ? "disabled" : ""}">
              <span aria-hidden="true">+</span>
              ${audioVariants.length >= 5 ? "Limite de 5 áudios" : "Adicionar outro áudio"}
              <input type="file" data-add-audio-file accept="${audioAccept}" ${audioVariants.length >= 5 ? "disabled" : ""}>
            </label>
            ${audioVariants.length > 1 ? `
              <span class="audio-variation-chance">
                Cada áudio tem ${Math.round(100 / audioVariants.length)}% de chance
              </span>
            ` : ""}
          </div>
        ` : ""}
      </div>
    `;
  }

  if (block.type === "wait") {
    const varyInterval = Boolean(block.varyInterval);
    const seconds = Math.max(0, Number(block.seconds) || 0);
    const minSeconds = Math.max(0, Number(block.minSeconds) || 0);
    const maxSeconds = Math.max(minSeconds, Number(block.maxSeconds) || minSeconds);

    return `
      <div class="wait-field-header">
        <label>${varyInterval ? "Intervalo de espera em segundos" : "Tempo de espera em segundos"}</label>
        <button type="button" class="wait-interval-toggle ${varyInterval ? "active" : ""}" data-toggle-wait-range>
          ${varyInterval ? "Usar tempo fixo" : "Variar intervalo"}
        </button>
      </div>
      ${varyInterval ? `
        <div class="wait-range-grid">
          <div class="node-field">
            <label>Mínimo</label>
            <input type="number" min="0" max="86400" step="1" data-field="minSeconds" value="${minSeconds}">
          </div>
          <div class="node-field">
            <label>Máximo</label>
            <input type="number" min="0" max="86400" step="1" data-field="maxSeconds" value="${maxSeconds}">
          </div>
        </div>
        <span class="node-field-hint">Um tempo aleatório será escolhido entre o mínimo e o máximo a cada execução.</span>
      ` : `
        <div class="node-field">
          <input type="number" min="0" max="86400" step="1" data-field="seconds" value="${seconds}">
        </div>
      `}
    `;
  }

  if (block.type === "await") {
    const useTimeout = Boolean(block.useTimeout);
    const timeoutUnit = ["seconds", "minutes", "hours"].includes(block.timeoutUnit)
      ? block.timeoutUnit
      : "minutes";
    const timeoutAmount = Math.max(1, Number(block.timeoutAmount ?? block.timeoutMinutes) || (timeoutUnit === "seconds" ? 10 : 1440));
    const varyTimeout = block.varyTimeout !== undefined
      ? Boolean(block.varyTimeout)
      : block.timeoutMinAmount !== undefined || block.timeoutMaxAmount !== undefined;
    const timeoutMinAmount = Math.max(1, Number(block.timeoutMinAmount ?? timeoutAmount) || timeoutAmount);
    const timeoutMaxAmount = Math.max(timeoutMinAmount, Number(block.timeoutMaxAmount ?? timeoutAmount) || timeoutAmount);
    const timeoutFlowOptions = flows
      .filter(flow => flow.id !== selectedId)
      .map(flow => `
        <option value="${esc(flow.id)}" ${block.timeoutTargetFlowId === flow.id ? "selected" : ""}>
          ${esc(flow.name || "Fluxo sem nome")}
        </option>
      `).join("");
    return `
      <div class="node-grid">
        <label class="form-check full">
          <input class="form-check-input" type="checkbox" data-field="useTimeout" ${useTimeout ? "checked" : ""}>
          <span class="form-check-label">Usar limite caso a pessoa não responda</span>
        </label>
        <div class="await-timeout-range full ${useTimeout ? "" : "disabled-field"}">
          <div class="await-timeout-heading">
            <label>Tempo sem resposta</label>
            <button type="button" class="wait-interval-toggle ${varyTimeout ? "active" : ""}"
              data-toggle-response-range ${useTimeout ? "" : "disabled"}>
              ${varyTimeout ? "Usar tempo fixo" : "Variar intervalo"}
            </button>
          </div>
          <div class="await-timeout-columns ${varyTimeout ? "" : "fixed"}">
            ${varyTimeout ? `
              <div class="node-field">
                <label>Mínimo</label>
                <input type="number" min="1" step="1" data-field="timeoutMinAmount" value="${timeoutMinAmount}" ${useTimeout ? "" : "disabled"}>
              </div>
              <div class="node-field">
                <label>Máximo</label>
                <input type="number" min="1" step="1" data-field="timeoutMaxAmount" value="${timeoutMaxAmount}" ${useTimeout ? "" : "disabled"}>
              </div>
            ` : `
              <div class="node-field">
                <label>Tempo</label>
                <input type="number" min="1" step="1" data-field="timeoutAmount" value="${timeoutAmount}" ${useTimeout ? "" : "disabled"}>
              </div>
            `}
            <div class="node-field timeout-unit-field">
              <label>Unidade</label>
              <select data-field="timeoutUnit" ${useTimeout ? "" : "disabled"}>
                <option value="seconds" ${timeoutUnit === "seconds" ? "selected" : ""}>Segundos</option>
                <option value="minutes" ${timeoutUnit === "minutes" ? "selected" : ""}>Minutos</option>
                <option value="hours" ${timeoutUnit === "hours" ? "selected" : ""}>Horas</option>
              </select>
            </div>
          </div>
          ${varyTimeout ? '<span class="node-field-hint">O tempo de resposta será sorteado dentro desta margem.</span>' : ""}
        </div>
        <div class="timeout-action-grid full ${block.timeoutAction === "connect" ? "connected" : ""}">
          <div class="node-field ${useTimeout ? "" : "disabled-field"}">
            <label>Quando o tempo terminar</label>
            <select data-field="timeoutAction" ${useTimeout ? "" : "disabled"}>
              <option value="continue" ${block.timeoutAction === "continue" ? "selected" : ""}>Continuar fluxo</option>
              <option value="expire" ${block.timeoutAction === "expire" ? "selected" : ""}>Expirar fluxo</option>
              <option value="connect" ${block.timeoutAction === "connect" ? "selected" : ""}>Conectar a outro fluxo</option>
            </select>
          </div>
          ${block.timeoutAction === "connect" ? `
            <div class="node-field ${useTimeout ? "" : "disabled-field"}">
              <label>Fluxo que deseja conectar</label>
              <select data-field="timeoutTargetFlowId" ${useTimeout ? "" : "disabled"}>
                <option value="">Selecione um fluxo</option>
                ${timeoutFlowOptions}
              </select>
              ${timeoutFlowOptions ? "" : '<small class="node-field-hint">Crie outro fluxo para fazer a conexão.</small>'}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  if (block.type === "condition") {
    return `
      <div class="node-grid">
        <div class="node-field">
          <label>Comparação</label>
          <select data-field="matchType">
            <option value="contains" ${block.matchType === "contains" ? "selected" : ""}>Contém</option>
            <option value="equals" ${block.matchType === "equals" ? "selected" : ""}>É exatamente</option>
          </select>
        </div>
        <div class="node-field">
          <label>Texto esperado</label>
          <input data-field="value" value="${esc(block.value || "")}">
        </div>
        <div class="node-field">
          <label>Se verdadeiro, ir para bloco</label>
          <input type="number" min="1" data-field="yesIndex" value="${Number(block.yesIndex) || index + 2}">
        </div>
        <div class="node-field">
          <label>Se falso, ir para bloco</label>
          <input type="number" min="1" data-field="noIndex" value="${Number(block.noIndex) || index + 2}">
        </div>
      </div>
    `;
  }

  if (block.type === "pause") {
    return `
      <div class="node-field">
        <label>Pausar automação por quantos minutos?</label>
        <input type="number" min="1" data-field="minutes" value="${Number(block.minutes) || 720}">
      </div>
    `;
  }

  if (block.type === "flow") {
    const options = flows
      .filter(flow => flow.id !== selectedId)
      .map(flow => `<option value="${esc(flow.id)}" ${block.targetFlowId === flow.id ? "selected" : ""}>${esc(flow.name || "Fluxo sem nome")}</option>`)
      .join("");

    return `
      <div class="node-field">
        <label>Continuar no fluxo</label>
        <select data-field="targetFlowId">
          <option value="">Selecione um fluxo</option>
          ${options}
        </select>
        ${options ? "" : '<small class="node-field-hint">Crie outro fluxo para fazer a conexão.</small>'}
      </div>
    `;
  }

  if (["label", "removeLabel"].includes(block.type)) {
    const removesLabel = block.type === "removeLabel";
    const selectedId = String(block.labelId || "");
    const selectedName = String(block.labelName || "");
    const hasSelectedOption = whatsappLabels.some(label => {
      const id = String(label.id || "");
      const name = String(label.name || "Etiqueta");
      return id === selectedId || (!selectedId && name === selectedName);
    });
    const options = whatsappLabels.map(label => {
      const id = String(label.id || "");
      const name = String(label.name || "Etiqueta");
      const selected = id === selectedId || (!selectedId && name === selectedName);
      return `<option value="${esc(id)}" data-label-name="${esc(name)}" ${selected ? "selected" : ""}>${esc(name)}</option>`;
    }).join("");
    const fallbackName = selectedName || (selectedId ? `Etiqueta ${selectedId}` : "");
    const fallbackOption = fallbackName && !hasSelectedOption
      ? `<option value="${esc(selectedId)}" data-label-name="${esc(selectedName)}" selected>${esc(fallbackName)} — não sincronizada</option>`
      : "";
    const actionHint = removesLabel
      ? "Ao alcançar esta etapa, o fluxo removerá a etiqueta somente se o contato a possuir."
      : "A etiqueta será aplicada assim que o contato alcançar esta etapa.";
    return `
      <div class="node-field">
        <label>${removesLabel ? "Etiqueta que será removida" : "Etiqueta do WhatsApp Business"}</label>
        <select data-field="labelId" data-label-picker>
          <option value="">Selecione uma etiqueta</option>
          ${fallbackOption}
          ${options}
        </select>
        <small class="node-field-hint">${actionHint}</small>
        ${options ? "" : '<small class="node-field-hint">Abra o WhatsApp Web para sincronizar as etiquetas do sistema.</small>'}
      </div>
      <label class="form-check label-remove-option">
        <input class="form-check-input" type="checkbox" data-label-remove-toggle ${removesLabel ? "checked" : ""}>
        <span class="form-check-label">Remover etiqueta</span>
      </label>
    `;
  }

  return "";
}


function iconSvg(name) {
  const icons = {
    duplicate: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"></rect><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path></svg>`,
    more: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="12" cy="19" r="1.6"></circle></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>`,
    chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4 4 4-4"></path></svg>`,
    power: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8"></path><path d="M6.3 5.8a8 8 0 1 0 11.4 0"></path></svg>`
  };
  return icons[name] || "";
}

function closeAllNodeMenus() {
  document.querySelectorAll(".node-menu.open").forEach(menu => menu.classList.remove("open"));
}

function renderBlocks() {
  const flow = currentFlow();
  const container = $("#blocks");

  if (!flow.blocks.length) {
    container.innerHTML = `
      <div class="workflow-no-blocks">Nenhum bloco adicionado ainda.</div>
      <div class="workflow-block-drop-zone workflow-block-drop-zone-empty" data-insert-index="0">
        <span>Solte o bloco aqui</span>
      </div>
    `;
    renderFlowList();
    return;
  }

  container.innerHTML = flow.blocks.map((block, index) => `
    <div class="workflow-node-wrap">
      <div class="workflow-block-drop-zone" data-insert-index="${index}">
        <span>Inserir aqui</span>
      </div>
      <article
        class="workflow-node ${block.enabled === false ? "disabled-node" : ""}"
        data-block-id="${block.id}"
      >
        <div class="node-header">
          <div class="node-heading">
            <span class="drag-handle" draggable="true" title="Arrastar bloco" aria-label="Arrastar bloco">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </span>
            <button
              type="button"
              class="node-type-button"
              data-replace-block
              title="Trocar função desta etapa"
              aria-label="Trocar função da etapa ${index + 1}: ${esc(blockName(block.type))}"
            >
              <img src="${blockIcon(block.type)}" alt="">
              <span class="node-type-change-mark" aria-hidden="true">↻</span>
            </button>
            <div class="node-heading-copy">
              <div class="node-title-line">
                <strong>${index + 1}. ${blockName(block.type)}</strong>
                <span class="stage-reach-badge" title="${Number(flowAnalytics(flow.id).blocks?.[block.id] || 0)} execução(ões) nesta etapa">${blockReachPercentage(flow.id, block.id)}%</span>
              </div>
              <span class="node-status-line" title="${esc(blockHeaderSubtitle(block))}">${esc(blockHeaderSubtitle(block))}</span>
            </div>
          </div>

          <div class="node-actions">
            <label class="mini-switch restored-switch" title="Ativar ou desativar bloco">
              <input type="checkbox" data-block-enabled ${block.enabled !== false ? "checked" : ""}>
              <span></span>
            </label>

            <button type="button" class="node-icon-btn duplicate-btn" data-duplicate title="Duplicar bloco">${iconSvg("duplicate")}</button>

            <button type="button" class="node-icon-btn trash-btn" data-remove title="Excluir bloco">${iconSvg("trash")}</button>
          </div>
        </div>

        <div class="node-body ${block.collapsed ? "hidden" : ""}">
          ${blockFields(block, index)}
        </div>
      </article>
      ${index < flow.blocks.length - 1 ? '<div class="workflow-connector"></div>' : ""}
      ${index === flow.blocks.length - 1 ? `
        <div class="workflow-block-drop-zone" data-insert-index="${flow.blocks.length}">
          <span>Inserir no final</span>
        </div>
      ` : ""}
    </div>
  `).join("");
  renderFlowList();
}

function syncHeader() {
  const flow = currentFlow();
  if (!flow) return;

  flow.name = $("#flowName").value.trim() || "Fluxo sem nome";
  flow.enabled = $("#flowEnabled").checked;
  flow.triggersEnabled = $("#triggersEnabled").checked;
  flow.triggers = [...document.querySelectorAll("#triggerRows [data-trigger-index]")].map((row, index) => {
    const type = row.querySelector('[data-trigger-field="type"]').value;
    const text = row.querySelector('[data-trigger-field="keywords"]').value.trim();
    return {
      id: flow.triggers?.[index]?.id || flow.trigger?.id || uid(),
      type,
      keywords: type === "equals"
        ? (text ? [text] : [])
        : text.split(",").map(value => value.trim()).filter(Boolean)
    };
  });
  if (!flow.triggers.length) flow.triggers = [{ type: "contains", keywords: [] }];
  flow.trigger = { ...flow.triggers[0], keywords: [...flow.triggers[0].keywords] };
  flow.oncePerChat = $("#oncePerChat").checked;
}

function openLibrary(mode = "add", blockId = null, opener = null) {
  const flow = currentFlow();
  const requestedReplacement = mode === "replace" && blockId;
  const block = requestedReplacement
    ? flow?.blocks?.find(item => String(item.id) === String(blockId))
    : null;
  if (requestedReplacement && (!flow || !block)) return false;

  blockLibraryMode = requestedReplacement ? "replace" : "add";
  replacingBlockId = blockLibraryMode === "replace" ? String(block.id) : null;
  replacingFlowId = blockLibraryMode === "replace" ? String(flow.id) : null;
  blockLibraryOpener = opener || document.activeElement || null;

  draggedNewBlockType = null;
  $("#blocks").classList.remove("accepting-new-block");
  document.querySelectorAll(".workflow-block-drop-zone.block-drop-active")
    .forEach(zone => zone.classList.remove("block-drop-active"));

  const library = $("#blockLibrary");
  const replacing = blockLibraryMode === "replace";
  library.classList.toggle("replace-mode", replacing);
  library.dataset.mode = blockLibraryMode;
  $("#blockLibraryTitle").textContent = replacing ? "Trocar função da etapa" : "Adicionar bloco";
  $("#blockLibraryDescription").textContent = replacing
    ? "Escolha a nova função. A etapa continuará na mesma posição e a configuração atual será substituída."
    : "Clique para adicionar ao final ou arraste para uma posição";
  $("#blockSearch").value = "";
  document.querySelectorAll(".library-item").forEach(item => {
    const currentType = replacing && item.dataset.add === block.type;
    item.draggable = !replacing;
    item.classList.remove("hidden");
    item.classList.toggle("current-type", currentType);
    if (currentType) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
  library.classList.remove("hidden");
  $("#blockSearch").focus();
  return true;
}

function closeLibrary(restoreFocus = true) {
  const opener = blockLibraryOpener;
  const library = $("#blockLibrary");
  library.classList.add("hidden");
  library.classList.remove("replace-mode");
  library.dataset.mode = "add";
  blockLibraryMode = "add";
  replacingBlockId = null;
  replacingFlowId = null;
  blockLibraryOpener = null;
  $("#blockLibraryTitle").textContent = "Adicionar bloco";
  $("#blockLibraryDescription").textContent = "Clique para adicionar ao final ou arraste para uma posição";
  $("#blockSearch").value = "";
  document.querySelectorAll(".library-item").forEach(item => {
    item.draggable = true;
    item.classList.remove("hidden", "current-type", "library-item-dragging");
    item.removeAttribute("aria-current");
  });
  if (restoreFocus && opener?.isConnected && typeof opener.focus === "function") {
    requestAnimationFrame(() => {
      if (opener.isConnected) opener.focus();
    });
  }
}


function normalizeImportedBlock(block = {}) {
  const normalized = {
    ...block,
    id: block.id || uid(),
    type: block.type || "text",
    collapsed: Boolean(block.collapsed),
    enabled: block.enabled !== false
  };

  if (normalized.type === "text") {
    const sourceMessages = Array.isArray(normalized.messages)
      ? normalized.messages
      : [normalized.text];
    normalized.messages = sourceMessages
      .slice(0, 5)
      .map(message => String(message || ""));
    if (!normalized.messages.length) normalized.messages = [""];
    normalized.text = normalized.messages[0];
    normalized.showTyping = normalized.showTyping !== false;
    normalized.typingSeconds = normalizeTypingSeconds(normalized.typingSeconds);
    normalized.showLinkPreview = normalized.showLinkPreview === true;
  }

  if (normalized.type === "wait") {
    normalized.seconds = Math.max(0, Number(normalized.seconds || 0));
    normalized.varyInterval = Boolean(normalized.varyInterval);
    normalized.minSeconds = Math.max(
      0,
      Number(normalized.minSeconds ?? normalized.seconds) || 0
    );
    normalized.maxSeconds = Math.max(
      normalized.minSeconds,
      Number(normalized.maxSeconds ?? normalized.seconds) || 0
    );
  }

  if (normalized.type === "flow") {
    normalized.targetFlowId = String(normalized.targetFlowId || "");
  }

  if (["label", "removeLabel"].includes(normalized.type)) {
    normalized.labelId = String(normalized.labelId || "");
    normalized.labelName = String(normalized.labelName || "");
  }

  if (normalized.type === "await") {
    normalized.useTimeout = Boolean(normalized.useTimeout);
    normalized.varyTimeout = normalized.varyTimeout !== undefined
      ? Boolean(normalized.varyTimeout)
      : normalized.timeoutMinAmount !== undefined || normalized.timeoutMaxAmount !== undefined;
    const hasNewTimeout = normalized.timeoutAmount !== undefined;
    normalized.timeoutAmount = Math.max(
      1,
      Number(hasNewTimeout ? normalized.timeoutAmount : normalized.timeoutMinutes || 1440)
    );
    normalized.timeoutMinAmount = Math.max(
      1,
      Number(normalized.timeoutMinAmount ?? normalized.timeoutAmount) || normalized.timeoutAmount
    );
    normalized.timeoutMaxAmount = Math.max(
      normalized.timeoutMinAmount,
      Number(normalized.timeoutMaxAmount ?? normalized.timeoutAmount) || normalized.timeoutAmount
    );
    normalized.timeoutUnit = hasNewTimeout && ["seconds", "minutes", "hours"].includes(normalized.timeoutUnit)
      ? normalized.timeoutUnit
      : "minutes";
    delete normalized.timeoutMinutes;
    normalized.timeoutAction = ["continue", "expire", "connect"].includes(normalized.timeoutAction)
      ? normalized.timeoutAction
      : "continue";
    normalized.timeoutTargetFlowId = String(normalized.timeoutTargetFlowId || "");
  }

  if (["image", "video", "audio", "media"].includes(normalized.type)) {
    normalized.dataUrl = String(normalized.dataUrl || "");
    normalized.fileName = String(normalized.fileName || "");
    normalized.mimeType = String(normalized.mimeType || "");

    if (normalized.type === "audio") {
      normalized.audioVariants = audioVariantsForBlock(normalized);
      const primaryAudio = normalized.audioVariants[0];
      if (primaryAudio) {
        normalized.dataUrl = primaryAudio.dataUrl;
        normalized.fileName = primaryAudio.fileName;
        normalized.mimeType = primaryAudio.mimeType;
      }
      normalized.isPtt = normalized.isPtt !== false;
      normalized.waveform = normalized.waveform !== false;
      normalized.showRecording = Boolean(normalized.showRecording);
      normalized.recordingSeconds = normalizeRecordingSeconds(normalized.recordingSeconds);
    } else if (["image", "video"].includes(normalized.type)) {
      normalized.mediaVariants = visualMediaVariantsForBlock(normalized);
      const primaryMedia = normalized.mediaVariants[0];
      if (primaryMedia) {
        normalized.dataUrl = primaryMedia.dataUrl;
        normalized.fileName = primaryMedia.fileName;
        normalized.mimeType = primaryMedia.mimeType;
      }
    }
  }

  return normalized;
}

function normalizeImportedFlow(flow = {}, index = 0) {
  const trigger = flow.trigger || {};
  const sourceTriggers = Array.isArray(flow.triggers) && flow.triggers.length
    ? flow.triggers
    : [trigger];
  const triggers = sourceTriggers.map(item => ({
    id: item?.id || uid(),
    type: ["contains", "equals", "starts", "any"].includes(item?.type)
      ? item.type
      : "contains",
    keywords: Array.isArray(item?.keywords)
      ? item.keywords.map(value => String(value).trim()).filter(Boolean)
      : String(item?.keywords || "").split(",").map(value => value.trim()).filter(Boolean)
  }));

  return {
    ...flow,
    id: flow.id || uid(),
    name: String(flow.name || `Fluxo ${index + 1}`),
    enabled: flow.enabled !== false,
    triggersEnabled: flow.triggersEnabled !== false,
    oncePerChat: Boolean(flow.oncePerChat),
    trigger: { ...triggers[0], keywords: [...triggers[0].keywords] },
    triggers,
    blocks: Array.isArray(flow.blocks)
      ? flow.blocks.map(normalizeImportedBlock)
      : []
  };
}

function normalizeImportedPayload(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.flows)
      ? payload.flows
      : Array.isArray(payload?.wfFlows)
        ? payload.wfFlows
        : null;

  if (!list) {
    throw new Error(
      "O arquivo precisa conter uma lista de fluxos ou um objeto com a propriedade flows."
    );
  }

  return list.map(normalizeImportedFlow);
}

async function persistFlowGroups() {
  flowGroups = normalizeFlowGroups(flowGroups, flows);
  await chrome.storage.local.set({
    wfFlowGroups: flowGroups,
    wfSchemaVersion: 3,
    wfSavedAt: Date.now()
  });
}

async function persistFlowOrganization() {
  flows = flows.map(normalizeImportedFlow);
  flowGroups = normalizeFlowGroups(flowGroups, flows);
  await chrome.storage.local.set({
    wfFlows: flows,
    wfFlowGroups: flowGroups,
    wfSchemaVersion: 3,
    wfSavedAt: Date.now()
  });
  captureSavedFlowFingerprints();
  renderFlowList();
}

async function saveAll() {
  syncHeader();

  const button = $("#saveBtn");
  const original = button.textContent;

  try {
    button.disabled = true;
    button.textContent = "Salvando...";

    flows = flows.map(normalizeImportedFlow);
    flowGroups = normalizeFlowGroups(flowGroups, flows);

    await chrome.storage.local.set({
      wfFlows: flows,
      wfFlowGroups: flowGroups,
      wfSchemaVersion: 3,
      wfSavedAt: Date.now()
    });

    captureSavedFlowFingerprints();

    button.textContent = "Salvo ✓";
    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1400);

    render();
  } catch (error) {
    console.error("[WA Flow] Erro ao salvar:", error);

    button.textContent = "Erro ao salvar";
    button.disabled = false;

    alert(
      "Não foi possível salvar os fluxos.\n\n" +
      (error?.message || String(error)) +
      "\n\nA versão 2.3 possui armazenamento ampliado. " +
      "Remova a versão anterior e instale esta nova versão."
    );
  }
}

async function load() {
  try {
    const data = await chrome.storage.local.get([
      "wfFlows",
      "wfFlowGroups",
      "wfAnalytics",
      "wfSchemaVersion",
      "wfWhatsappLabels"
    ]);

    flows = Array.isArray(data.wfFlows)
      ? data.wfFlows.map(normalizeImportedFlow)
      : [];
    flowGroups = normalizeFlowGroups(data.wfFlowGroups, flows);

    analytics = data.wfAnalytics || {};
    whatsappLabels = Array.isArray(data.wfWhatsappLabels) ? data.wfWhatsappLabels : [];
    selectedId = flows[0]?.id || null;
    captureSavedFlowFingerprints();
    render();
  } catch (error) {
    console.error("[WA Flow] Erro ao carregar:", error);
    flows = [];
    flowGroups = [];
    analytics = {};
    selectedId = null;
    render();
    alert("Erro ao carregar os fluxos salvos: " + (error?.message || error));
  }
}

$("#flowList").addEventListener("click", async event => {
  const groupToggle = event.target.closest("[data-group-toggle]");
  const groupRename = event.target.closest("[data-group-rename]");
  const groupDelete = event.target.closest("[data-group-delete]");
  const groupAddFlow = event.target.closest("[data-group-add-flow]");
  const select = event.target.closest("[data-select]");
  const save = event.target.closest("[data-save-flow]");
  const copy = event.target.closest("[data-copy]");
  const remove = event.target.closest("[data-delete]");

  if (groupToggle) {
    if (toggleFlowGroup(groupToggle.dataset.groupToggle)) {
      renderFlowList();
      try {
        await persistFlowGroups();
      } catch (error) {
        console.error("[WA Flow] Não foi possível salvar o estado do grupo:", error);
      }
    }
    return;
  }

  if (groupRename) {
    const group = flowGroups.find(item => item.id === groupRename.dataset.groupRename);
    if (!group) return;
    const name = prompt("Novo nome do grupo:", group.name);
    if (name === null) return;
    if (!renameFlowGroup(group.id, name)) {
      alert("Digite um nome para o grupo.");
      return;
    }
    renderFlowList();
    try {
      await persistFlowGroups();
    } catch (error) {
      console.error("[WA Flow] Não foi possível salvar o nome do grupo:", error);
      alert("O nome foi alterado na tela, mas não pôde ser salvo. Tente novamente.");
    }
    return;
  }

  if (groupDelete) {
    const group = flowGroups.find(item => item.id === groupDelete.dataset.groupDelete);
    if (!group) return;
    if (!confirm(`Excluir o grupo "${group.name}"?\n\nOs fluxos serão preservados e voltarão para "Sem grupo".`)) return;
    deleteFlowGroup(group.id);
    renderFlowList();
    try {
      await persistFlowGroups();
    } catch (error) {
      console.error("[WA Flow] Não foi possível salvar a exclusão do grupo:", error);
      alert("O grupo foi removido da tela, mas a alteração não pôde ser salva. Tente novamente.");
    }
    return;
  }

  if (groupAddFlow) {
    const group = flowGroups.find(item => item.id === groupAddFlow.dataset.groupAddFlow);
    if (!group) return;
    group.collapsed = false;
    createFlow(group.id);
    try {
      await persistFlowOrganization();
    } catch (error) {
      console.error("[WA Flow] Não foi possível salvar o novo fluxo:", error);
      alert("O fluxo foi criado na tela, mas não pôde ser salvo. Use o botão Salvar para tentar novamente.");
    }
    return;
  }

  if (select) {
    syncHeader();
    closeLibrary();
    selectedId = select.dataset.select;
    render();
    return;
  }

  if (save) {
    await saveAll();
    return;
  }

  if (copy) {
    syncHeader();
    closeLibrary();
    duplicateFlow(copy.dataset.copy);
    render();
    try {
      await persistFlowOrganization();
    } catch (error) {
      console.error("[WA Flow] Não foi possível salvar a cópia do fluxo:", error);
      alert("A cópia foi criada na tela, mas não pôde ser salva. Use o botão Salvar para tentar novamente.");
    }
    return;
  }

  if (remove && confirm("Excluir este fluxo?")) {
    closeLibrary();
    deleteFlow(remove.dataset.delete);
    render();
    try {
      await persistFlowOrganization();
    } catch (error) {
      console.error("[WA Flow] Não foi possível salvar a exclusão do fluxo:", error);
      alert("O fluxo foi removido da tela, mas a alteração não pôde ser salva. Use o botão Salvar para tentar novamente.");
    }
  }
});

function clearFlowDropIndicators() {
  document.querySelectorAll(
    ".workflow-flow-item.flow-drop-before, .workflow-flow-item.flow-drop-after, " +
    ".flow-group.flow-group-drop-target, .flow-group.flow-group-drop-before, .flow-group.flow-group-drop-after"
  ).forEach(item => item.classList.remove(
    "flow-drop-before",
    "flow-drop-after",
    "flow-group-drop-target",
    "flow-group-drop-before",
    "flow-group-drop-after"
  ));
}

$("#flowList").addEventListener("dragstart", event => {
  const groupHandle = event.target.closest("[data-group-drag]");
  if (groupHandle) {
    draggedFlowGroupId = groupHandle.dataset.groupDrag;
    draggedFlowId = null;
    groupHandle.closest("[data-flow-group-id]")?.classList.add("flow-group-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `group:${draggedFlowGroupId}`);
    return;
  }

  const handle = event.target.closest(".flow-drag-handle");
  const item = handle?.closest("[data-flow-id]");
  if (!item) return;

  syncHeader();
  draggedFlowId = item.dataset.flowId;
  draggedFlowGroupId = null;
  item.classList.add("flow-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedFlowId);
});

$("#flowList").addEventListener("dragover", event => {
  if (!draggedFlowId && !draggedFlowGroupId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearFlowDropIndicators();

  if (draggedFlowGroupId) {
    const targetGroup = event.target.closest("[data-flow-group-id]");
    const targetGroupId = targetGroup?.dataset.flowGroupId;
    if (!targetGroupId || targetGroupId === draggedFlowGroupId) return;
    const header = targetGroup.querySelector(":scope > .flow-group-header");
    const placeAfter = event.clientY > header.getBoundingClientRect().top + header.offsetHeight / 2;
    targetGroup.classList.add(placeAfter ? "flow-group-drop-after" : "flow-group-drop-before");
    return;
  }

  const target = event.target.closest("[data-flow-id]");
  if (target?.dataset.flowId === draggedFlowId) return;
  if (target && target.dataset.flowId !== draggedFlowId) {
    const placeAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    target.classList.add(placeAfter ? "flow-drop-after" : "flow-drop-before");
    return;
  }

  const targetGroup = event.target.closest("[data-group-drop]")?.closest("[data-flow-group-id]");
  if (targetGroup) targetGroup.classList.add("flow-group-drop-target");
});

$("#flowList").addEventListener("drop", async event => {
  if (!draggedFlowId && !draggedFlowGroupId) return;
  event.preventDefault();

  if (draggedFlowGroupId) {
    try {
      const targetGroup = event.target.closest("[data-flow-group-id]");
      const targetGroupId = targetGroup?.dataset.flowGroupId;
      if (targetGroupId && targetGroupId !== draggedFlowGroupId) {
        const header = targetGroup.querySelector(":scope > .flow-group-header");
        const placeAfter = event.clientY > header.getBoundingClientRect().top + header.offsetHeight / 2;
        reorderFlowGroups(draggedFlowGroupId, targetGroupId, placeAfter);
        await persistFlowGroups();
      }
    } catch (error) {
      console.error("[WA Flow] Não foi possível salvar a posição do grupo:", error);
      alert("A posição mudou na tela, mas não pôde ser salva. Tente novamente.");
    } finally {
      draggedFlowGroupId = null;
      clearFlowDropIndicators();
      renderFlowList();
    }
    return;
  }

  try {
    const target = event.target.closest("[data-flow-id]");
    if (target?.dataset.flowId === draggedFlowId) return;
    if (target && target.dataset.flowId !== draggedFlowId) {
      const targetGroup = flowGroupForFlow(target.dataset.flowId);
      const placeAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
      moveFlowToGroup(draggedFlowId, targetGroup?.id || null, target.dataset.flowId, placeAfter);
    } else {
      const targetGroupElement = event.target.closest("[data-group-drop]");
      if (targetGroupElement) {
        moveFlowToGroup(draggedFlowId, targetGroupElement.dataset.groupDrop || null);
      }
    }
    await persistFlowOrganization();
  } catch (error) {
    console.error("[WA Flow] Não foi possível salvar a organização dos fluxos:", error);
    alert("O fluxo mudou de posição na tela, mas a organização não pôde ser salva. Tente novamente.");
  } finally {
    draggedFlowId = null;
    clearFlowDropIndicators();
    renderFlowList();
  }
});

$("#flowList").addEventListener("dragend", event => {
  event.target.closest("[data-flow-id]")?.classList.remove("flow-dragging");
  event.target.closest("[data-flow-group-id]")?.classList.remove("flow-group-dragging");
  draggedFlowId = null;
  draggedFlowGroupId = null;
  clearFlowDropIndicators();
});

$("#blocks").addEventListener("input", async event => {
  const article = event.target.closest("[data-block-id]");
  const flow = currentFlow();
  if (!article || !flow) return;

  const block = flow.blocks.find(item => item.id === article.dataset.blockId);
  if (!block) return;

  const field = event.target.dataset.field;
  if (field) {
    if (field === "typingSeconds" || field === "recordingSeconds") {
      block[field] = event.target.value === "" ? "" : Number(event.target.value);
    }
    else if (event.target.type === "number") block[field] = Number(event.target.value);
    else if (event.target.type === "checkbox") block[field] = event.target.checked;
    else block[field] = event.target.value;
  }

  if (event.target.matches("[data-label-picker]")) {
    block.labelName = event.target.selectedOptions[0]?.dataset.labelName || "";
  }

  if (event.target.matches("[data-message-index]")) {
    const messageIndex = Number(event.target.dataset.messageIndex);
    if (!Array.isArray(block.messages)) block.messages = [String(block.text || "")];
    block.messages[messageIndex] = event.target.value;
    block.text = block.messages[0] || "";
  }

  if (field === "showTyping" || field === "useTimeout" || field === "timeoutAction" || field === "timeoutUnit" || field === "showRecording") {
    renderBlocks();
    return;
  }

  if (event.target.matches("[data-media-file], [data-add-audio-file], [data-audio-variant-file], [data-add-media-file], [data-media-variant-file]") && event.target.files[0]) {
    const file = event.target.files[0];
    if (file.size > 15 * 1024 * 1024) {
      alert("Use arquivos de até 15 MB.");
      event.target.value = "";
      return;
    }

    try {
      const validation = await validateWhatsAppMediaFile(file, block);
      if (!validation.ok) {
        alert(validation.message);
        event.target.value = "";
        return;
      }

      let preparedFile = file;
      const fileStatus =
        event.target.closest(".audio-file-preview-container, .media-file-preview-container")?.querySelector(".workflow-file-status") ||
        article.querySelector(".workflow-file-status");
      if (validation.needsConversion) {
        const originalStatus = fileStatus?.innerHTML || "";
        if (fileStatus) fileStatus.textContent = "Convertendo para OGG/Opus... 0%";
        try {
          preparedFile = await window.WFAudioConverter.convertToVoiceNote(file, progress => {
            if (fileStatus) fileStatus.textContent = `Convertendo para OGG/Opus... ${progress}%`;
          });
        } catch (conversionError) {
          console.error("[WA Flow] Falha ao converter áudio:", conversionError);
          if (fileStatus) fileStatus.innerHTML = originalStatus;
          alert(conversionError?.message || "Não foi possível converter este áudio para OGG/Opus.");
          event.target.value = "";
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const lowerName = preparedFile.name.toLowerCase();
        const mimeType =
          validation.mimeType ||
          (lowerName.endsWith(".ogg") || lowerName.endsWith(".oga")
            ? "audio/ogg"
            : lowerName.endsWith(".opus")
              ? "audio/opus"
              : file.type || "application/octet-stream");
        const mediaValue = {
          fileName: preparedFile.name,
          mimeType,
          dataUrl: String(reader.result || "")
        };

        if (block.type === "audio") {
          const variants = audioVariantsForBlock(block);
          if (event.target.matches("[data-add-audio-file]")) {
            if (variants.length >= 5) {
              alert("Este bloco já tem o limite de 5 áudios.");
              return;
            }
            variants.push(mediaValue);
          } else if (event.target.matches("[data-audio-variant-file]")) {
            const variantIndex = Number(event.target.dataset.audioVariantFile);
            if (variantIndex >= 0 && variantIndex < variants.length) {
              variants[variantIndex] = mediaValue;
            }
          } else if (variants.length) {
            variants[0] = mediaValue;
          } else {
            variants.push(mediaValue);
          }
          block.audioVariants = variants.slice(0, 5);
          syncPrimaryAudioFields(block);
        } else if (["image", "video"].includes(block.type)) {
          const variants = visualMediaVariantsForBlock(block);
          if (event.target.matches("[data-add-media-file]")) {
            if (variants.length >= 5) {
              alert(`Este bloco já tem o limite de 5 ${block.type === "image" ? "imagens" : "vídeos"}.`);
              return;
            }
            variants.push(mediaValue);
          } else if (event.target.matches("[data-media-variant-file]")) {
            const variantIndex = Number(event.target.dataset.mediaVariantFile);
            if (variantIndex >= 0 && variantIndex < variants.length) {
              variants[variantIndex] = mediaValue;
            }
          } else if (variants.length) {
            variants[0] = mediaValue;
          } else {
            variants.push(mediaValue);
          }
          block.mediaVariants = variants.slice(0, 5);
          syncPrimaryVisualMediaFields(block);
        } else {
          block.fileName = mediaValue.fileName;
          block.mimeType = mediaValue.mimeType;
          block.dataUrl = mediaValue.dataUrl;
        }
        renderBlocks();
      };
      reader.onerror = () => {
        alert("Não foi possível ler o arquivo selecionado.");
        event.target.value = "";
      };
      reader.readAsDataURL(preparedFile);
    } catch (error) {
      console.error("[WA Flow] Falha ao validar mídia:", error);
      alert("Não foi possível verificar a compatibilidade do arquivo.");
      event.target.value = "";
    }
  }
});

$("#blocks").addEventListener("change", event => {
  const article = event.target.closest("[data-block-id]");
  const flow = currentFlow();
  if (!article || !flow) return;

  const block = flow.blocks.find(item => item.id === article.dataset.blockId);
  if (!block) return;

  if (event.target.matches("[data-label-remove-toggle]")) {
    if (setLabelBlockRemoval(block, event.target.checked)) renderBlocks();
    return;
  }

  if (event.target.matches('[data-field="typingSeconds"]')) {
    block.typingSeconds = normalizeTypingSeconds(event.target.value);
    event.target.value = block.typingSeconds;
    return;
  }

  if (event.target.matches('[data-field="recordingSeconds"]')) {
    block.recordingSeconds = normalizeRecordingSeconds(event.target.value);
    event.target.value = block.recordingSeconds;
    return;
  }

  if (event.target.matches("[data-block-enabled]")) {
    block.enabled = event.target.checked;
    renderBlocks();
  }
});

$("#blocks").addEventListener("click", event => {
  const article = event.target.closest("[data-block-id]");
  const flow = currentFlow();
  if (!article || !flow) return;

  const index = flow.blocks.findIndex(item => item.id === article.dataset.blockId);
  if (index < 0) return;

  const clickedControl = event.target.closest("button, input, select, textarea, label, a, [draggable='true']");
  const clickedHeader = event.target.closest(".node-header");
  if (clickedHeader && !clickedControl) {
    flow.blocks[index].collapsed = !flow.blocks[index].collapsed;
    renderBlocks();
    return;
  }

  if (event.target.closest("[data-replace-block]")) {
    openLibrary("replace", flow.blocks[index].id, event.target.closest("[data-replace-block]"));
    return;
  }

  if (event.target.closest("[data-remove]")) {
    flow.blocks.splice(index, 1);
    renderBlocks();
    return;
  }

  if (event.target.closest("[data-duplicate]")) {
    const clone = JSON.parse(JSON.stringify(flow.blocks[index]));
    clone.id = uid();
    flow.blocks.splice(index + 1, 0, clone);
    renderBlocks();
    return;
  }

  const removeAudioVariant = event.target.closest("[data-remove-audio-variant]");
  if (removeAudioVariant) {
    const block = flow.blocks[index];
    const variants = audioVariantsForBlock(block);
    if (variants.length > 1) {
      variants.splice(Number(removeAudioVariant.dataset.removeAudioVariant), 1);
      block.audioVariants = variants;
      syncPrimaryAudioFields(block);
      renderBlocks();
    }
    return;
  }

  const removeMediaVariant = event.target.closest("[data-remove-media-variant]");
  if (removeMediaVariant) {
    const block = flow.blocks[index];
    const variants = visualMediaVariantsForBlock(block);
    if (variants.length > 1) {
      variants.splice(Number(removeMediaVariant.dataset.removeMediaVariant), 1);
      block.mediaVariants = variants;
      syncPrimaryVisualMediaFields(block);
      renderBlocks();
    }
    return;
  }

  if (event.target.closest("[data-toggle-wait-range]")) {
    const block = flow.blocks[index];
    block.varyInterval = !block.varyInterval;
    if (block.varyInterval) {
      const currentSeconds = Math.max(0, Number(block.seconds) || 0);
      block.minSeconds = currentSeconds;
      block.maxSeconds = Math.max(currentSeconds, Number(block.maxSeconds) || currentSeconds);
    }
    renderBlocks();
    return;
  }

  if (event.target.closest("[data-toggle-response-range]")) {
    const block = flow.blocks[index];
    const currentlyVaried = block.varyTimeout !== undefined
      ? Boolean(block.varyTimeout)
      : block.timeoutMinAmount !== undefined || block.timeoutMaxAmount !== undefined;
    block.varyTimeout = !currentlyVaried;
    if (block.varyTimeout) {
      const currentAmount = Math.max(1, Number(block.timeoutAmount) || 1);
      block.timeoutMinAmount = currentAmount;
      block.timeoutMaxAmount = Math.max(
        currentAmount,
        Number(block.timeoutMaxAmount) || currentAmount
      );
    } else {
      block.timeoutAmount = Math.max(1, Number(block.timeoutMinAmount) || 1);
    }
    renderBlocks();
    return;
  }

  const textVariableButton = event.target.closest("[data-insert-text-variable]");
  if (textVariableButton) {
    const block = flow.blocks[index];
    const messageIndex = Number(textVariableButton.dataset.variableMessageIndex);
    const textarea = article.querySelector(`[data-message-index="${messageIndex}"]`);
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.setRangeText(textVariableButton.dataset.insertTextVariable, start, end, "end");
    if (!Array.isArray(block.messages)) block.messages = [String(block.text || "")];
    block.messages[messageIndex] = textarea.value;
    block.text = block.messages[0] || "";
    textarea.focus();
    return;
  }

  if (event.target.closest("[data-add-message]")) {
    const block = flow.blocks[index];
    if (!Array.isArray(block.messages)) block.messages = [String(block.text || "")];
    if (block.messages.length < 5) block.messages.push("");
    renderBlocks();
    document.querySelector(
      `[data-block-id="${block.id}"] [data-message-index="${block.messages.length - 1}"]`
    )?.focus();
    return;
  }

  const removeMessage = event.target.closest("[data-remove-message]");
  if (removeMessage) {
    const block = flow.blocks[index];
    if (!Array.isArray(block.messages)) block.messages = [String(block.text || "")];
    if (block.messages.length > 1) {
      block.messages.splice(Number(removeMessage.dataset.removeMessage), 1);
      block.text = block.messages[0] || "";
      renderBlocks();
    }
    return;
  }

});


$("#blocks").addEventListener("dragstart", event => {
  const handle = event.target.closest(".drag-handle");
  const article = event.target.closest("[data-block-id]");
  if (!handle || !article) {
    event.preventDefault();
    return;
  }
  draggedBlockId = article.dataset.blockId;
  article.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

$("#blocks").addEventListener("dragend", event => {
  event.target.closest("[data-block-id]")?.classList.remove("dragging");
  draggedBlockId = null;
});

$("#blocks").addEventListener("dragover", event => {
  event.preventDefault();
  if (draggedNewBlockType) {
    document.querySelectorAll(".workflow-block-drop-zone.block-drop-active")
      .forEach(zone => zone.classList.remove("block-drop-active"));

    let insertIndex;
    const directZone = event.target.closest("[data-insert-index]");
    if (directZone) {
      insertIndex = Number(directZone.dataset.insertIndex);
    } else {
      const targetBlock = event.target.closest("[data-block-id]");
      const flow = currentFlow();
      const blockIndex = flow?.blocks.findIndex(block => block.id === targetBlock?.dataset.blockId) ?? -1;
      if (targetBlock && blockIndex >= 0) {
        const after = event.clientY > targetBlock.getBoundingClientRect().top + targetBlock.offsetHeight / 2;
        insertIndex = blockIndex + (after ? 1 : 0);
      }
    }

    if (Number.isInteger(insertIndex)) {
      $("#blocks").querySelector(`[data-insert-index="${insertIndex}"]`)?.classList.add("block-drop-active");
    }
    event.dataTransfer.dropEffect = "copy";
    return;
  }

  const target = event.target.closest("[data-block-id]");
  if (!target || target.dataset.blockId === draggedBlockId) return;
  target.classList.add("drag-over");
});

$("#blocks").addEventListener("dragleave", event => {
  event.target.closest("[data-block-id]")?.classList.remove("drag-over");
});

$("#blocks").addEventListener("drop", event => {
  event.preventDefault();
  const flow = currentFlow();
  if (!flow) return;

  if (draggedNewBlockType) {
    const directZone = event.target.closest("[data-insert-index]");
    const targetBlock = event.target.closest("[data-block-id]");
    let insertIndex = directZone ? Number(directZone.dataset.insertIndex) : -1;

    if (insertIndex < 0 && targetBlock) {
      const targetIndex = flow.blocks.findIndex(block => block.id === targetBlock.dataset.blockId);
      const after = event.clientY > targetBlock.getBoundingClientRect().top + targetBlock.offsetHeight / 2;
      insertIndex = targetIndex + (after ? 1 : 0);
    }

    if (insertIndex >= 0) {
      flow.blocks.splice(insertIndex, 0, newBlock(draggedNewBlockType));
      draggedNewBlockType = null;
      $("#blocks").classList.remove("accepting-new-block");
      closeLibrary();
      renderBlocks();
      $("#blocks").children[insertIndex]?.querySelector(".workflow-node")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const target = event.target.closest("[data-block-id]");
  if (!target || !draggedBlockId) return;

  document.querySelectorAll(".drag-over").forEach(node => node.classList.remove("drag-over"));

  const from = flow.blocks.findIndex(item => item.id === draggedBlockId);
  const to = flow.blocks.findIndex(item => item.id === target.dataset.blockId);
  if (from < 0 || to < 0 || from === to) return;

  const [moved] = flow.blocks.splice(from, 1);
  flow.blocks.splice(to, 0, moved);
  renderBlocks();
});

document.querySelectorAll(".library-item").forEach(button => {
  button.draggable = true;

  button.addEventListener("dragstart", event => {
    if (blockLibraryMode === "replace") {
      event.preventDefault();
      return;
    }
    draggedNewBlockType = button.dataset.add;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", draggedNewBlockType);
    $("#blocks").classList.add("accepting-new-block");
    button.classList.add("library-item-dragging");
  });

  button.addEventListener("dragend", () => {
    draggedNewBlockType = null;
    $("#blocks").classList.remove("accepting-new-block");
    document.querySelectorAll(".workflow-block-drop-zone.block-drop-active")
      .forEach(zone => zone.classList.remove("block-drop-active"));
    button.classList.remove("library-item-dragging");
  });

  button.addEventListener("click", () => {
    if (blockLibraryMode === "replace") {
      const targetFlow = flows.find(flow => String(flow.id) === String(replacingFlowId));
      const targetIndex = targetFlow?.blocks?.findIndex(block => String(block.id) === String(replacingBlockId)) ?? -1;
      if (!targetFlow || targetIndex < 0) {
        closeLibrary();
        alert("Esta etapa não está mais disponível. Abra novamente o menu pelo ícone da etapa.");
        return;
      }

      const current = targetFlow.blocks[targetIndex];
      const nextType = button.dataset.add;
      if (current.type === nextType) {
        closeLibrary();
        return;
      }

      if (blockHasMeaningfulContent(current)) {
        const confirmed = confirm(
          `Trocar "${blockName(current.type)}" por "${blockName(nextType)}"?\n\n` +
          "As configurações atuais desta etapa serão substituídas."
        );
        if (!confirmed) return;
      }

      const previousBlockId = current.id;
      const replacement = replaceBlockType(previousBlockId, nextType, targetFlow.id);
      if (!replacement) {
        closeLibrary();
        alert("Não foi possível trocar a função desta etapa.");
        return;
      }

      const shouldRender = String(selectedId) === String(targetFlow.id);
      closeLibrary();
      if (shouldRender) {
        renderBlocks();
        setTimeout(() => {
          const replacementNode = document.querySelector(`[data-block-id="${replacement.id}"]`);
          replacementNode?.scrollIntoView({ behavior: "smooth", block: "center" });
          replacementNode?.querySelector("[data-replace-block]")?.focus();
        }, 50);
      }
      return;
    }

    const flow = currentFlow();
    if (!flow) return;
    flow.blocks.push(newBlock(button.dataset.add));
    closeLibrary();
    renderBlocks();
    setTimeout(() => $("#blocks").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  });
});

$("#blockSearch").addEventListener("input", event => {
  const term = event.target.value.toLocaleLowerCase("pt-BR");
  document.querySelectorAll(".library-item").forEach(item => {
    item.classList.toggle("hidden", !item.innerText.toLocaleLowerCase("pt-BR").includes(term));
  });
});

["flowName", "flowEnabled", "oncePerChat"].forEach(id => {
  $("#" + id).addEventListener("input", () => {
    syncHeader();
    renderFlowList();
    updateTriggerSummary();
  });
});

$("#triggersEnabled").addEventListener("change", () => {
  syncHeader();
  renderTriggerAvailability();
  updateTriggerSummary();
});

$("#triggerRows").addEventListener("input", event => {
  if (!event.target.matches("[data-trigger-field]")) return;
  syncHeader();
  if (event.target.dataset.triggerField === "type") renderTriggerRows();
  updateTriggerSummary();
});

$("#addTrigger").addEventListener("click", () => {
  const flow = currentFlow();
  if (!flow) return;
  syncHeader();
  flow.triggers.push({ id: uid(), type: "contains", keywords: [] });
  renderTriggerRows();
  $("#triggerRows [data-trigger-index]:last-child input")?.focus();
  updateTriggerSummary();
});

$("#triggerRows").addEventListener("click", async event => {
  const resetButton = event.target.closest("[data-reset-trigger]");
  const button = event.target.closest("[data-remove-trigger]");
  const flow = currentFlow();
  if (!flow) return;

  if (resetButton) {
    event.preventDefault();
    event.stopPropagation();
    syncHeader();
    const trigger = flow.triggers[Number(resetButton.dataset.resetTrigger)];
    if (!trigger?.id) return;

    const stored = await chrome.storage.local.get("wfAnalytics");
    const all = stored.wfAnalytics || {};
    const current = all[flow.id] || { starts: 0, completions: 0, blocks: {}, triggers: {} };
    analytics = {
      ...all,
      [flow.id]: {
        ...current,
        triggers: {
          ...(current.triggers || {}),
          [trigger.id]: 0
        }
      }
    };
    await chrome.storage.local.set({ wfAnalytics: analytics });
    renderTriggerRows();
    return;
  }

  if (!button) return;
  syncHeader();
  if (flow.triggers.length > 1) {
    flow.triggers.splice(Number(button.dataset.removeTrigger), 1);
    flow.trigger = { ...flow.triggers[0], keywords: [...flow.triggers[0].keywords] };
    renderTriggerRows();
    updateTriggerSummary();
  }
});

$("#resetMetrics").addEventListener("click", async () => {
  const flow = currentFlow();
  if (!flow) return;

  const confirmed = confirm(
    `Zerar disparos, conclusões, respostas e métricas das etapas de "${flow.name}"?`
  );
  if (!confirmed) return;

  analytics = {
    ...analytics,
    [flow.id]: {
      starts: 0,
      completions: 0,
      responses: 0,
      startedChats: {},
      responseChats: {},
      blocks: {},
      triggers: {}
    }
  };

  const { wfRuntime = {} } = await chrome.storage.local.get("wfRuntime");
  const completed = Object.fromEntries(
    Object.entries(wfRuntime.completed || {}).filter(
      ([key]) => !key.endsWith(`:${flow.id}`)
    )
  );

  await chrome.storage.local.set({
    wfAnalytics: analytics,
    wfRuntime: {
      ...wfRuntime,
      completed
    }
  });
  renderMetrics();
  renderTriggerRows();
  renderBlocks();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.wfAnalytics) {
    analytics = changes.wfAnalytics.newValue || {};
    renderMetrics();
    renderTriggerRows();
    renderBlocks();
  }

  if (changes.wfWhatsappLabels) {
    whatsappLabels = Array.isArray(changes.wfWhatsappLabels.newValue)
      ? changes.wfWhatsappLabels.newValue
      : [];
    renderBlocks();
  }
});

$("#newFlow").addEventListener("click", async () => {
  createFlow();
  try {
    await persistFlowOrganization();
  } catch (error) {
    console.error("[WA Flow] Não foi possível salvar o novo fluxo:", error);
    alert("O fluxo foi criado na tela, mas não pôde ser salvo. Use o botão Salvar para tentar novamente.");
  }
});
$("#newFlowGroup").addEventListener("click", async () => {
  const name = prompt("Nome do novo grupo:", "Novo grupo");
  if (name === null) return;
  const group = createFlowGroup(name);
  if (!group) {
    alert("Digite um nome para o grupo.");
    return;
  }
  renderFlowList();
  try {
    await persistFlowGroups();
  } catch (error) {
    console.error("[WA Flow] Não foi possível salvar o grupo:", error);
    alert("O grupo foi criado na tela, mas não pôde ser salvo. Tente novamente.");
  }
});
$("#saveBtn").addEventListener("click", saveAll);

let flowSaveIndicatorUpdateScheduled = false;
function scheduleFlowSaveIndicatorUpdate() {
  if (flowSaveIndicatorUpdateScheduled) return;
  flowSaveIndicatorUpdateScheduled = true;
  queueMicrotask(() => {
    flowSaveIndicatorUpdateScheduled = false;
    renderFlowList();
  });
}

["input", "change", "click", "drop"].forEach(eventName => {
  document.addEventListener(eventName, scheduleFlowSaveIndicatorUpdate);
});

$("#openLibrary").addEventListener("click", event => openLibrary("add", null, event.currentTarget));
$("#addEndBlock").addEventListener("click", event => openLibrary("add", null, event.currentTarget));
$("#closeLibrary").addEventListener("click", closeLibrary);

$("#exportBtn").addEventListener("click", () => {
  syncHeader();
  const payload = {
    format: "whatsflow-flows",
    version: 2,
    flows,
    flowGroups: normalizeFlowGroups(flowGroups, flows)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "whatsapp-fluxos.json";
  anchor.click();
  URL.revokeObjectURL(url);
});

$("#importBtn").addEventListener("click", () => $("#importFile").click());

$("#importFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  const previousText = $("#importBtn").textContent;

  try {
    $("#importBtn").disabled = true;
    $("#importBtn").textContent = "Importando...";

    const fileText = await file.text();
    const parsed = JSON.parse(fileText);
    const importedFlows = normalizeImportedPayload(parsed);
    const rawImportedGroups = Array.isArray(parsed?.flowGroups)
      ? parsed.flowGroups
      : Array.isArray(parsed?.groups)
        ? parsed.groups
        : Array.isArray(parsed?.wfFlowGroups)
          ? parsed.wfFlowGroups
          : [];
    const importedGroups = normalizeFlowGroups(
      Array.isArray(parsed) ? [] : rawImportedGroups,
      importedFlows
    );

    if (!importedFlows.length) {
      throw new Error("O arquivo não contém nenhum fluxo.");
    }

    flows = importedFlows;
    flowGroups = importedGroups;
    selectedId = flows[0].id;
    render();

    await chrome.storage.local.set({
      wfFlows: flows,
      wfFlowGroups: flowGroups,
      wfSchemaVersion: 3,
      wfSavedAt: Date.now()
    });

    captureSavedFlowFingerprints();
    renderFlowList();

    $("#importBtn").textContent = "Importado ✓";

    alert(
      `${flows.length} fluxo(s) importado(s) e salvo(s) com sucesso.\n\n` +
      `Arquivo: ${file.name}\n` +
      `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (error) {
    console.error("[WA Flow] Erro ao importar JSON:", error);

    alert(
      "Não foi possível importar este JSON.\n\n" +
      (error?.message || String(error))
    );
  } finally {
    event.target.value = "";

    setTimeout(() => {
      $("#importBtn").textContent = previousText;
      $("#importBtn").disabled = false;
    }, 1400);
  }
});


const FULL_BACKUP_FORMAT = "whatsflow-full-backup";
const FULL_BACKUP_VERSION = 1;
const FULL_BACKUP_MAX_FILE_BYTES = 50 * 1024 * 1024;

function fullBackupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function createFullBackupPayload(data) {
  const manifest = chrome.runtime.getManifest();
  return {
    format: FULL_BACKUP_FORMAT,
    version: FULL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    extension: {
      name: manifest.name,
      version: manifest.version
    },
    storage: {
      area: "local",
      keys: Object.keys(data).length
    },
    data
  };
}

function downloadFullBackup(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeFullBackupValue(value) {
  if (Array.isArray(value)) return value.map(normalizeFullBackupValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeFullBackupValue(value[key]);
        return result;
      }, {});
  }
  return value;
}

function fullBackupValuesEqual(left, right) {
  return JSON.stringify(normalizeFullBackupValue(left))
    === JSON.stringify(normalizeFullBackupValue(right));
}

async function replaceExtensionStorageContents(targetData) {
  const currentData = await chrome.storage.local.get(null);
  const targetKeys = new Set(Object.keys(targetData));
  const keysToRemove = Object.keys(currentData).filter(key => !targetKeys.has(key));

  if (Object.keys(targetData).length) {
    await chrome.storage.local.set(targetData);
  }
  if (keysToRemove.length) {
    await chrome.storage.local.remove(keysToRemove);
  }
}

$("#fullBackupExportBtn").addEventListener("click", async event => {
  const button = event.currentTarget;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "…";

  try {
    const data = await chrome.storage.local.get(null);
    const payload = createFullBackupPayload(data);
    downloadFullBackup(
      payload,
      `whatsflow-backup-completo-${fullBackupTimestamp()}.json`
    );
    button.textContent = "✓";
  } catch (error) {
    console.error("[WhatsFlow] Erro ao baixar backup completo:", error);
    alert("Não foi possível baixar o backup completo.\n\n" + (error?.message || String(error)));
    button.textContent = "!";
  } finally {
    setTimeout(() => {
      button.textContent = previousText;
      button.disabled = false;
    }, 1400);
  }
});

$("#fullBackupImportBtn").addEventListener("click", () => {
  const input = $("#fullBackupImportFile");
  input.value = "";
  input.click();
});

$("#fullBackupImportFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  const button = $("#fullBackupImportBtn");
  const previousText = button.textContent;
  let restoreStarted = false;
  let previousData = null;

  try {
    if (file.size > FULL_BACKUP_MAX_FILE_BYTES) {
      throw new Error("O arquivo excede o limite de 50 MB.");
    }

    const payload = JSON.parse(await file.text());
    if (
      payload?.format !== FULL_BACKUP_FORMAT
      || payload?.version !== FULL_BACKUP_VERSION
      || payload?.storage?.area !== "local"
      || !payload.data
      || typeof payload.data !== "object"
      || Array.isArray(payload.data)
    ) {
      throw new Error("Este não é um arquivo de backup completo válido do WhatsFlow.");
    }

    const importedData = payload.data;
    const importedKeys = Object.keys(importedData);
    const sourceDate = payload.exportedAt
      ? new Date(payload.exportedAt).toLocaleString("pt-BR")
      : "data não informada";
    const sourceVersion = payload.extension?.version || "não informada";
    const confirmed = confirm(
      "Restaurar este backup completo?\n\n"
      + "Isso substituirá TODOS os dados atuais da ferramenta: fluxos, contatos, "
      + "agendamentos, modelos, atalhos, campanhas, Kanban, métricas, etiquetas e configurações.\n\n"
      + "Antes da restauração, um backup automático do estado atual será baixado.\n\n"
      + `Backup: ${sourceDate}\nVersão da extensão: ${sourceVersion}\nItens armazenados: ${importedKeys.length}`
    );
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "…";
    previousData = await chrome.storage.local.get(null);
    downloadFullBackup(
      createFullBackupPayload(previousData),
      `whatsflow-backup-antes-da-restauracao-${fullBackupTimestamp()}.json`
    );

    restoreStarted = true;
    await replaceExtensionStorageContents(importedData);
    const restoredData = await chrome.storage.local.get(null);
    if (!fullBackupValuesEqual(restoredData, importedData)) {
      throw new Error("A conferência final dos dados restaurados não corresponde ao arquivo.");
    }

    button.textContent = "✓";
    alert(
      "Backup completo restaurado com sucesso.\n\n"
      + "O construtor será recarregado agora. Se o WhatsApp Web estiver aberto, "
      + "atualize a página para aplicar todos os dados restaurados."
    );
    window.location.reload();
  } catch (error) {
    console.error("[WhatsFlow] Erro ao restaurar backup completo:", error);
    let rollbackStatus = "Nenhum dado atual foi alterado.";

    if (restoreStarted && previousData) {
      try {
        await replaceExtensionStorageContents(previousData);
        const rolledBackData = await chrome.storage.local.get(null);
        if (!fullBackupValuesEqual(rolledBackData, previousData)) {
          throw new Error("A conferência do estado anterior falhou.");
        }
        rollbackStatus = "O estado anterior foi restaurado automaticamente.";
      } catch (rollbackError) {
        console.error("[WhatsFlow] Erro ao desfazer restauração:", rollbackError);
        rollbackStatus = "A restauração automática do estado anterior também falhou; use o backup de segurança baixado.";
      }
    }

    button.textContent = "!";
    alert(
      "Não foi possível restaurar o backup completo.\n\n"
      + (error?.message || String(error))
      + "\n\n"
      + rollbackStatus
    );
  } finally {
    event.target.value = "";
    setTimeout(() => {
      button.textContent = previousText;
      button.disabled = false;
    }, 1400);
  }
});

load();
