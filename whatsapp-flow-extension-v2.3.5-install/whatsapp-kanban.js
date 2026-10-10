(() => {
  if (window.__WF_WHATSAPP_KANBAN__) return;
  window.__WF_WHATSAPP_KANBAN__ = true;

  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const colors = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];
  let boards = [];
  let selectedBoardId = "";
  let search = "";
  let columnSearch = null;
  let inboxSearch = "";
  let inboxFilter = "recent";
  let inboxFiltersExpanded = false;
  const LABELS_VIEW_ID = "__wf_labels_view__";
  let viewMode = "board";
  let whatsappLabelCatalog = [];
  let labelCatalogRefreshing = false;
  const hydratingCardIds = new Set();
  const cardHydrationAttemptedAt = new Map();
  let dragging = null;
  let draggingColumnId = "";
  let draggingLabelColumnKey = "";
  let draggingLabelCard = null;
  let activeCard = null;
  let actionCard = null;
  let actionColumn = null;
  let actionLabel = null;
  let pendingLabelCardRemoval = null;
  let columnActionTarget = null;
  let columnActionAnchorRect = null;
  let bulkColumnTarget = null;
  let syncing = false;
  let nativeChatAncestors = [];
  let nativePopupObserver = null;
  let nativePopupGuardTimer = null;
  let nativeLabelTimer = null;
  let nativeLabelsRefreshing = false;
  let nativeStageSyncing = false;
  let localSaveInFlight = 0;
  let labelMutationRevision = 0;
  let labelMutationsInFlight = 0;
  let labelResyncTimer = null;
  let zapFlowResizeHandler = null;

  const scheduleLabelResync = (delay = 800) => {
    if (labelResyncTimer) clearTimeout(labelResyncTimer);
    labelResyncTimer = setTimeout(() => {
      labelResyncTimer = null;
      if (syncing || labelMutationsInFlight) {
        scheduleLabelResync(800);
        return;
      }
      sync({ silent: true });
    }, delay);
  };
  const beginLabelMutation = () => {
    if (labelMutationsInFlight) return false;
    labelMutationRevision++;
    labelMutationsInFlight++;
    return true;
  };
  const finishLabelMutation = () => {
    labelMutationsInFlight = Math.max(0, labelMutationsInFlight - 1);
    scheduleLabelResync(800);
  };

  const starterBoard = () => ({
    id: uid(), name: "Funil de vendas", columns: [
      { id: uid(), name: "Novos contatos", color: colors[0], cards: [] },
      { id: uid(), name: "Em atendimento", color: colors[1], cards: [] },
      { id: uid(), name: "Proposta enviada", color: colors[2], cards: [] },
      { id: uid(), name: "Fechado", color: colors[3], cards: [] }
    ]
  });
  const board = () => boards.find(item => item.id === selectedBoardId) || boards[0];
  const allCards = current => (current?.columns || []).flatMap(column => column.cards || []);
  const initials = name => String(name || "?").trim().split(/\s+/)[0]?.[0]?.toUpperCase() || "?";
  const normalizeLabelName = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const isVisibleBusinessLabel = label => {
    const name = normalizeLabelName(label?.name);
    return Boolean(name) && !/^(nao lidas?|favoritos?|grupos?)( \d+)?$/.test(name);
  };
  const safeLabelColor = value => {
    const color = String(value || "").trim();
    return /^(?:#[0-9a-f]{3,8}|rgba?\([\d.%\s,/+-]+\)|hsla?\([\d.%\s,/+-]+\))$/i.test(color) ? color : "";
  };
  const cardIdentity = card => {
    const phone = String(card?.phone || "").replace(/\D/g, "");
    return String(phone ? `p:${phone}` : card?.chatId || card?.id || "");
  };
  const labelNameHasMultipleCurrentIds = value => {
    const name = normalizeLabelName(value);
    if (!name) return false;
    const ids = new Set();
    const addId = label => {
      if (normalizeLabelName(label?.name) !== name) return false;
      const id = String(label?.id || "").trim();
      if (id) ids.add(id);
      return ids.size > 1;
    };
    for (const label of whatsappLabelCatalog) if (addId(label)) return true;
    for (const item of boards) {
      for (const column of item.columns || []) {
        for (const card of column.cards || []) {
          for (const label of Array.isArray(card.labels) ? card.labels : []) {
            if (addId(label)) return true;
          }
        }
      }
    }
    return false;
  };
  const cardHasLabel = (card, expectedLabel) => {
    const expectedId = String(expectedLabel?.id || "").trim();
    const expectedName = normalizeLabelName(expectedLabel?.name);
    return (card?.labels || []).some(label => {
      const id = String(label?.id || "").trim();
      if (expectedId && id) return id === expectedId;
      if (labelNameHasMultipleCurrentIds(expectedLabel?.name) && (id || expectedId)) return false;
      return Boolean(expectedName && normalizeLabelName(label?.name) === expectedName);
    });
  };
  const labelsForBoard = current => {
    const labels = [];
    const add = label => {
      if (!isVisibleBusinessLabel(label)) return;
      const id = String(label?.id || "").trim();
      const name = normalizeLabelName(label?.name);
      const existing = labels.find(item => {
        const itemId = String(item.id || "").trim();
        if (id && itemId) return itemId === id;
        if (labelNameHasMultipleCurrentIds(name) && (id || itemId)) return false;
        return normalizeLabelName(item.name) === name;
      });
      if (existing) {
        if (!existing.id && id) existing.id = id;
        if (!existing.color && safeLabelColor(label.color)) existing.color = safeLabelColor(label.color);
        if (!existing.name && label.name) existing.name = label.name;
        return;
      }
      labels.push({ id, name: String(label.name || "Etiqueta"), color: safeLabelColor(label.color) });
    };
    whatsappLabelCatalog.forEach(add);
    allCards(current).forEach(card => (card.labels || []).forEach(add));
    return labels;
  };
  const labelViewLabelKey = label => {
    const id = String(label?.id || "").trim();
    if (id) return `id:${id}`;
    return `name:${normalizeLabelName(label?.name)}`;
  };
  const labelViewLabelAliases = label => {
    const nameKey = `name:${normalizeLabelName(label?.name)}`;
    return nameKey !== labelViewLabelKey(label) ? [nameKey] : [];
  };
  const labelViewCardKey = card => {
    const id = String(card?.id || "").trim();
    return id ? `id:${id}` : `contact:${cardIdentity(card)}`;
  };
  const labelLayoutForBoard = current => {
    const layout = current?.labelLayout;
    return {
      version: 1,
      columnOrder: Array.isArray(layout?.columnOrder) ? layout.columnOrder.map(String) : [],
      cardOrderByLabel: layout?.cardOrderByLabel && typeof layout.cardOrderByLabel === "object" && !Array.isArray(layout.cardOrderByLabel)
        ? layout.cardOrderByLabel
        : {}
    };
  };
  const ensureLabelLayout = current => {
    if (!current.labelLayout || typeof current.labelLayout !== "object" || Array.isArray(current.labelLayout)) {
      current.labelLayout = {};
    }
    current.labelLayout.version = 1;
    current.labelLayout.columnOrder = Array.isArray(current.labelLayout.columnOrder)
      ? [...new Set(current.labelLayout.columnOrder.map(String).filter(Boolean))]
      : [];
    if (!current.labelLayout.cardOrderByLabel || typeof current.labelLayout.cardOrderByLabel !== "object" || Array.isArray(current.labelLayout.cardOrderByLabel)) {
      current.labelLayout.cardOrderByLabel = {};
    }
    Object.keys(current.labelLayout.cardOrderByLabel).forEach(key => {
      const order = current.labelLayout.cardOrderByLabel[key];
      if (Array.isArray(order)) current.labelLayout.cardOrderByLabel[key] = [...new Set(order.map(String).filter(Boolean))];
      else delete current.labelLayout.cardOrderByLabel[key];
    });
    return current.labelLayout;
  };
  const orderItemsBySavedKeys = (items, savedOrder, keyFor, aliasesFor = () => []) => {
    const lookup = new Map();
    items.forEach(item => [keyFor(item), ...aliasesFor(item)].filter(Boolean).forEach(key => lookup.set(String(key), item)));
    const used = new Set();
    const ordered = [];
    (Array.isArray(savedOrder) ? savedOrder : []).forEach(key => {
      const item = lookup.get(String(key));
      if (!item || used.has(item)) return;
      used.add(item);
      ordered.push(item);
    });
    items.forEach(item => {
      if (used.has(item)) return;
      used.add(item);
      ordered.push(item);
    });
    return ordered;
  };
  const matchesColumnSearch = (card, query) => {
    const term = String(query || "").trim();
    if (!term) return false;
    const nameTerm = normalizeLabelName(term);
    const numberTerm = term.replace(/\D/g, "");
    const name = normalizeLabelName(card?.name);
    const number = String(card?.phone || "").replace(/\D/g, "");
    return Boolean((nameTerm && name.includes(nameTerm)) || (numberTerm && number.includes(numberTerm)));
  };
  const prioritizeColumnMatches = (items, query, getCard = item => item) => {
    if (!String(query || "").trim()) return { ordered: items, matchCount: 0 };
    const matched = [];
    const remaining = [];
    items.forEach(item => (matchesColumnSearch(getCard(item), query) ? matched : remaining).push(item));
    return { ordered: [...matched, ...remaining], matchCount: matched.length };
  };
  const columnSearchQuery = (kind, key, current) =>
    columnSearch?.kind === kind && columnSearch.key === String(key) && columnSearch.boardId === current?.id
      ? columnSearch.query.trim() : "";
  const mergeReorderedActiveKeys = (savedOrder, activeOrder, canonicalActiveKey) => {
    const saved = [...new Set((Array.isArray(savedOrder) ? savedOrder : []).map(String).filter(Boolean))];
    const active = [...new Set((Array.isArray(activeOrder) ? activeOrder : []).map(String).filter(Boolean))];
    const activeQueue = [...active];
    const occupiedActiveSlots = new Set();
    const merged = [];
    saved.forEach(savedKey => {
      const canonical = canonicalActiveKey(savedKey);
      if (!canonical) {
        merged.push(savedKey);
        return;
      }
      if (occupiedActiveSlots.has(canonical)) return;
      occupiedActiveSlots.add(canonical);
      const nextActiveKey = activeQueue.shift();
      if (nextActiveKey) merged.push(nextActiveKey);
    });
    merged.push(...activeQueue);
    return [...new Set(merged)];
  };
  const isPendingLabelCandidate = (card, label) => {
    const pending = pendingLabelCardRemoval;
    if (!pending || pending.cardKey !== cardIdentity(card)) return false;
    const candidateId = String(label?.id || "").trim();
    const expectedId = String(pending.label?.id || "").trim();
    if (candidateId) return candidateId === expectedId;
    return !labelNameHasMultipleCurrentIds(pending.label?.name) &&
      normalizeLabelName(label?.name) === normalizeLabelName(pending.label?.name);
  };
  const labelEntriesForBoard = (current, label) => {
    const uniqueCards = new Map();
    current.columns.forEach(column => column.cards.forEach(card => {
      if (!cardHasLabel(card, label)) return;
      if (isPendingLabelCandidate(card, label)) return;
      const identity = cardIdentity(card) || labelViewCardKey(card);
      if (!uniqueCards.has(identity)) uniqueCards.set(identity, { card, columnId: column.id });
    }));
    return [...uniqueCards.values()].sort((first, second) => Number(second.card.updatedAt || 0) - Number(first.card.updatedAt || 0));
  };
  const labelsRepresentSame = (candidate, expected) => {
    const candidateId = String(candidate?.id || "").trim();
    const expectedId = String(expected?.id || "").trim();
    const candidateName = normalizeLabelName(candidate?.name);
    const expectedName = normalizeLabelName(expected?.name);
    if (candidateId && expectedId) return candidateId === expectedId;
    if (labelNameHasMultipleCurrentIds(expected?.name) && (candidateId || expectedId)) return false;
    return Boolean(candidateName && expectedName && candidateName === expectedName);
  };
  const labelActionTargetForBoard = (current, label) => ({
    kind: "label",
    id: `label:${labelViewLabelKey(label)}`,
    name: String(label?.name || "Etiqueta"),
    label: { ...label },
    labelKey: labelViewLabelKey(label),
    cards: labelEntriesForBoard(current, label).map(entry => entry.card)
  });
  const removeLabelReferences = (label, chatIds = null) => {
    const allowedChatIds = Array.isArray(chatIds) ? new Set(chatIds.map(String)) : null;
    boards.forEach(item => (item.columns || []).forEach(column => (column.cards || []).forEach(card => {
      if (allowedChatIds && !allowedChatIds.has(String(card.chatId || ""))) return;
      card.labels = (Array.isArray(card.labels) ? card.labels : []).filter(candidate => !labelsRepresentSame(candidate, label));
    })));
  };
  const labelNameIsAmbiguousForAction = label => {
    return labelNameHasMultipleCurrentIds(label?.name);
  };
  const cardHasRemovableLabel = (card, label) => {
    const labelId = String(label?.id || "").trim();
    const labelName = normalizeLabelName(label?.name);
    return Boolean(labelId && (card?.labels || []).some(candidate => {
      const candidateId = String(candidate?.id || "").trim();
      if (candidateId) return candidateId === labelId;
      return !labelNameIsAmbiguousForAction(label) &&
        normalizeLabelName(candidate?.name) === labelName;
    }));
  };
  const removeConfirmedCardLabelReferences = (label, chatIds) => {
    const confirmed = new Set(chatIds.map(String));
    const labelId = String(label?.id || "").trim();
    const labelName = normalizeLabelName(label?.name);
    const ambiguousName = labelNameIsAmbiguousForAction(label);
    boards.forEach(item => (item.columns || []).forEach(column => (column.cards || []).forEach(card => {
      if (!confirmed.has(String(card.chatId || ""))) return;
      card.labels = (Array.isArray(card.labels) ? card.labels : []).filter(candidate => {
        const candidateId = String(candidate?.id || "").trim();
        if (candidateId) return candidateId !== labelId;
        return ambiguousName || normalizeLabelName(candidate?.name) !== labelName;
      });
    })));
  };
  const addConfirmedCardLabelReference = (label, chatId) => {
    const confirmedChatId = String(chatId || "");
    boards.forEach(item => (item.columns || []).forEach(column => (column.cards || []).forEach(card => {
      if (String(card.chatId || "") !== confirmedChatId) return;
      card.labels = Array.isArray(card.labels) ? card.labels : [];
      if (!card.labels.some(candidate => labelsRepresentSame(candidate, label))) {
        card.labels.push({ id: String(label.id || ""), name: String(label.name || "Etiqueta"), color: safeLabelColor(label.color) });
      }
    })));
  };
  const moveLabelCardBetweenColumns = async (current, { cardKey, sourceKey, targetKey, targetCardKey, placeAfter }) => {
    const labels = labelsForBoard(current);
    const sourceLabel = labels.find(label => labelViewLabelKey(label) === sourceKey);
    const targetLabel = labels.find(label => labelViewLabelKey(label) === targetKey);
    const card = sourceLabel && labelEntriesForBoard(current, sourceLabel)
      .find(entry => labelViewCardKey(entry.card) === cardKey)?.card;
    const chatId = String(card?.chatId || "");
    if (!sourceLabel || !targetLabel || !card || !String(sourceLabel.id || "").trim() ||
      !String(targetLabel.id || "").trim() || !chatId.includes("@") || !cardHasRemovableLabel(card, sourceLabel)) {
      alert("Não foi possível identificar o contato ou as etiquetas no WhatsApp. Clique em Sincronizar e tente novamente.");
      return false;
    }
    if (!beginLabelMutation()) {
      alert("Aguarde a alteração atual da etiqueta terminar.");
      return false;
    }
    let destinationAdded = false;
    let sourceRemoved = false;
    try {
      if (!cardHasLabel(card, targetLabel)) {
        const response = await window.WFBridge.command("APPLY_CHAT_LABEL", {
          chatId, labelId: targetLabel.id, labelName: targetLabel.name
        }, 60000);
        addConfirmedCardLabelReference({
          ...targetLabel,
          id: String(response.result?.labelId || targetLabel.id),
          name: String(response.result?.labelName || targetLabel.name)
        }, chatId);
        destinationAdded = true;
      }
      await window.WFBridge.command("REMOVE_CHAT_LABEL", {
        chatId, labelId: sourceLabel.id, labelName: sourceLabel.name
      }, 60000);
      removeConfirmedCardLabelReferences(sourceLabel, [chatId]);
      sourceRemoved = true;

      const layout = ensureLabelLayout(current);
      const savedOrder = savedCardOrderForLabel(layout, targetLabel);
      const order = orderItemsBySavedKeys(
        labelEntriesForBoard(current, targetLabel), savedOrder,
        entry => labelViewCardKey(entry.card)
      ).map(entry => labelViewCardKey(entry.card)).filter(key => key !== cardKey);
      let insertIndex = targetCardKey && targetCardKey !== cardKey ? order.indexOf(targetCardKey) : -1;
      if (insertIndex < 0) insertIndex = order.length;
      else if (placeAfter) insertIndex++;
      order.splice(insertIndex, 0, cardKey);
      const activeCardKeys = new Set(order);
      layout.cardOrderByLabel[targetKey] = mergeReorderedActiveKeys(
        savedOrder, order, key => activeCardKeys.has(String(key)) ? String(key) : ""
      );
      labelViewLabelAliases(targetLabel).forEach(alias => {
        if (alias !== targetKey) delete layout.cardOrderByLabel[alias];
      });
      await save();
      render();
      return true;
    } catch (error) {
      if (destinationAdded || sourceRemoved) {
        try { await save(); } catch (saveError) {
          console.error("[WA Flow] Não foi possível salvar a troca de etiquetas no Kanban.", saveError);
        }
      }
      render();
      const reason = error?.message || String(error);
      alert(sourceRemoved
        ? `As etiquetas foram trocadas no WhatsApp, mas o Kanban não conseguiu salvar. Clique em Sincronizar. ${reason}`
        : destinationAdded
          ? `A etiqueta de destino foi aplicada, mas não foi possível remover a etiqueta de origem. O contato ficou nas duas colunas. Clique em Sincronizar. ${reason}`
          : `Não foi possível trocar a etiqueta. A etiqueta de origem foi mantida. ${reason}`);
      return false;
    } finally {
      finishLabelMutation();
    }
  };
  const migrateLabelLayoutKey = (oldLabel, newLabel) => {
    const oldKeys = [...new Set([labelViewLabelKey(oldLabel), ...labelViewLabelAliases(oldLabel)])];
    const newKey = labelViewLabelKey(newLabel);
    boards.forEach(item => {
      const layout = ensureLabelLayout(item);
      layout.columnOrder = [...new Set(layout.columnOrder.map(key => oldKeys.includes(key) ? newKey : key))];
      const previousCardOrder = oldKeys.map(key => layout.cardOrderByLabel[key]).find(Array.isArray);
      if (previousCardOrder && !Array.isArray(layout.cardOrderByLabel[newKey])) {
        layout.cardOrderByLabel[newKey] = [...previousCardOrder];
      }
      oldKeys.filter(key => key !== newKey).forEach(key => delete layout.cardOrderByLabel[key]);
    });
  };
  const removeLabelLayout = label => {
    const keys = new Set([labelViewLabelKey(label), ...labelViewLabelAliases(label)]);
    boards.forEach(item => {
      const layout = ensureLabelLayout(item);
      layout.columnOrder = layout.columnOrder.filter(key => !keys.has(key));
      keys.forEach(key => delete layout.cardOrderByLabel[key]);
    });
  };
  const savedCardOrderForLabel = (layout, label) => {
    for (const key of [labelViewLabelKey(label), ...labelViewLabelAliases(label)]) {
      if (Array.isArray(layout.cardOrderByLabel?.[key])) return layout.cardOrderByLabel[key];
    }
    return [];
  };
  const safeMessagePreview = (value, type = "") => {
    const text = String(value || "").trim();
    const kind = String(type || "").toLowerCase();
    const encodedMedia = /^(?:data:[^;]+;base64,|\/9j\/|iVBORw0KGgo|R0lGOD)/i.test(text) ||
      (text.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(text));
    if (/image|photo/.test(kind) && (!text || encodedMedia)) return "Foto";
    if (/video/.test(kind) && (!text || encodedMedia)) return "Vídeo";
    if (/audio|ptt/.test(kind) && (!text || encodedMedia)) return "Áudio";
    if (/sticker/.test(kind) && (!text || encodedMedia)) return "Figurinha";
    if (encodedMedia) return "Mídia";
    return text.slice(0, 500);
  };
  const formatPhone = phone => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "Sem telefone";
    if (digits.startsWith("55") && digits.length === 13) {
      return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.startsWith("55") && digits.length === 12) {
      return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
    if (digits.length === 11) {
      return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `+${digits}`;
  };
  const formatTime = timestamp => timestamp
    ? new Date(timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";
  const save = async () => {
    boards.forEach(item => item.columns?.forEach(column => column.cards?.forEach(card => delete card.notes)));
    localSaveInFlight++;
    try {
      await chrome.storage.local.set({ wfKanbanBoards: boards, wfKanbanSelectedBoard: selectedBoardId });
    } finally {
      localSaveInFlight--;
    }
  };

  function mountKanbanSnapshot(panel = document.querySelector("#wf-kanban-panel")) {
    document.querySelector("#wf-kb-background-snapshot")?.remove();
    if (!panel) return;
    const liveBoard = panel.querySelector("#wf-kb-board");
    const boardScroll = {
      left: liveBoard?.scrollLeft || 0,
      top: liveBoard?.scrollTop || 0
    };
    const columnScrolls = Array.from(panel.querySelectorAll(".wf-kb-card-list")).map(list => ({
      left: list.scrollLeft,
      top: list.scrollTop
    }));
    const snapshot = panel.cloneNode(true);
    snapshot.id = "wf-kb-background-snapshot";
    snapshot.hidden = false;
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.querySelector("#wf-kb-native-backdrop")?.remove();
    snapshot.querySelector("#wf-kb-chat-modal")?.remove();
    snapshot.querySelector("#wf-kb-card-actions")?.remove();
    snapshot.querySelector("#wf-kb-column-actions")?.remove();
    document.body.appendChild(snapshot);
    const snapshotBoard = snapshot.querySelector("#wf-kb-board");
    if (snapshotBoard) {
      snapshotBoard.scrollLeft = boardScroll.left;
      snapshotBoard.scrollTop = boardScroll.top;
    }
    snapshot.querySelectorAll(".wf-kb-card-list").forEach((list, index) => {
      list.scrollLeft = columnScrolls[index]?.left || 0;
      list.scrollTop = columnScrolls[index]?.top || 0;
    });
  }

  function cleanupOrphanedKanbanSnapshot() {
    const snapshot = document.querySelector("#wf-kb-background-snapshot");
    if (!snapshot) return;
    const main = document.querySelector("#main.wf-kb-native-chat-popup");
    const backdrop = document.querySelector("#wf-kb-native-backdrop");
    if (main && backdrop && !backdrop.hidden) return;
    snapshot.remove();
    document.querySelector("#wf-kanban-button")?.classList.remove("popup-dimmed");
    nativeChatAncestors.forEach(ancestor => ancestor.classList.remove("wf-kb-native-layer"));
    nativeChatAncestors = [];
  }

  function activeCardColumn() {
    return board()?.columns.find(column => column.cards?.some(card => card.id === activeCard?.id));
  }

  async function moveActiveCardToColumn(columnId, cardId = activeCard?.id) {
    const current = board();
    const movingCard = allCards(current).find(card => card.id === cardId);
    const from = current?.columns.find(column => column.cards?.some(card => card.id === cardId));
    const to = current?.columns.find(column => column.id === columnId);
    if (!from || !to || from === to || !movingCard) return;
    const index = from.cards.findIndex(card => card.id === cardId);
    if (index < 0) return;
    const [moved] = from.cards.splice(index, 1);
    to.cards.push(moved);
    activeCard = moved;
    // Update the Kanban and the stage badge immediately. Persistence happens
    // afterwards so a storage round-trip never delays the visible movement.
    render();
    const main = document.querySelector("#main");
    if (main?.classList.contains("wf-kb-native-chat-popup")) mountKanbanSnapshot();
    mountNativeStageSelector(main);
    try {
      await save();
    } catch (error) {
      console.error("Não foi possível salvar a mudança de etapa do Kanban.", error);
    }
  }

  async function syncActiveNativeStageSelector() {
    cleanupOrphanedKanbanSnapshot();
    if (nativeStageSyncing) return;
    const main = document.querySelector("#main");
    if (!main) {
      document.querySelector("#wf-kb-native-stage-menu")?.remove();
      return;
    }
    nativeStageSyncing = true;
    try {
      const response = await window.WFBridge.command("GET_ACTIVE_CHAT", {}, 3000);
      const chatId = String(response.result?.chatId || "");
      const normalizeContactName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
      const chatName = normalizeContactName(response.result?.name);
      const chatPhone = String(response.result?.phone || "").replace(/\D/g, "").slice(-8);
      const cards = allCards(board());
      let card = cards.find(item => String(item.chatId || "") === chatId) ||
        cards.find(item => chatPhone && String(item.phone || "").replace(/\D/g, "").slice(-8) === chatPhone) ||
        cards.find(item => chatName && normalizeContactName(item.name) === chatName);
      if (!card && chatName) {
        const ignoredWords = new Set(["lead", "cliente", "contato"]);
        const expectedWords = chatName.replace(/[()]/g, " ").split(/\s+/).filter(word => word.length > 1 && !ignoredWords.has(word));
        const candidates = expectedWords.length ? cards.filter(item => {
          const cardWords = new Set(normalizeContactName(item.name).replace(/[()]/g, " ").split(/\s+/).filter(Boolean));
          return expectedWords.every(word => cardWords.has(word));
        }) : [];
        if (candidates.length === 1) card = candidates[0];
      }
      if (!card && chatId && chatName && !/^\([^)]*\)$/.test(chatName)) {
        const inbox = board()?.columns?.[0];
        if (inbox) {
          card = {
            id: uid(),
            chatId,
            avatar: "",
            labels: [],
            name: String(response.result?.name || chatId.split("@")[0]).trim(),
            phone: String(response.result?.phone || "").replace(/\D/g, ""),
            lastMessage: "",
            lastMessageFromMe: false,
            messages: [],
            unreadCount: 0,
            tag: "WhatsApp",
            updatedAt: Date.now()
          };
          inbox.cards.unshift(card);
          render();
          save().catch(() => {});
        }
      }
      if (!card) {
        main.querySelector("#wf-kb-native-stage-badge")?.remove();
        document.querySelector("#wf-kb-native-stage-menu")?.remove();
        return;
      }
      activeCard = card;
      mountNativeStageSelector(main);
      const lastHydrationAttempt = Number(cardHydrationAttemptedAt.get(card.id) || 0);
      if ((!card.avatar || !card.lastMessage || !Array.isArray(card.messages) || !card.messages.length) && Date.now() - lastHydrationAttempt > 60000) hydrateKanbanCard(card);
    } catch {
      main.querySelector("#wf-kb-native-stage-badge")?.remove();
      document.querySelector("#wf-kb-native-stage-menu")?.remove();
    } finally {
      nativeStageSyncing = false;
    }
  }

  async function hydrateKanbanCard(card) {
    if (!card?.id || !card.chatId || hydratingCardIds.has(card.id)) return;
    hydratingCardIds.add(card.id);
    cardHydrationAttemptedAt.set(card.id, Date.now());
    try {
      const response = await window.WFBridge.command("GET_KANBAN_CHAT_DETAILS", { chatId: card.chatId }, 10000);
      const details = response.result || {};
      if (details.chatId) card.chatId = details.chatId;
      if (details.avatar) card.avatar = details.avatar;
      if (Array.isArray(details.labels)) card.labels = details.labels;
      if (details.name) card.name = details.name;
      if (details.phone) card.phone = details.phone;
      if (Array.isArray(details.messages)) card.messages = details.messages;
      card.lastMessage = details.lastMessage || card.lastMessage || "";
      card.lastMessageFromMe = Boolean(details.lastMessageFromMe);
      card.unreadCount = Number(details.unreadCount || 0);
      card.updatedAt = Number(details.updatedAt || card.updatedAt || Date.now());
      render();
      await save();
    } catch {} finally {
      hydratingCardIds.delete(card.id);
    }
  }

  function mountNativeStageSelector(main) {
    if (!main || !activeCard) return;
    const current = board();
    const selected = activeCardColumn();
    if (!current || !selected) return;
    const chatHeader = main.querySelector(":scope > header") || main.querySelector("header");
    if (!chatHeader) return;
    const headerButtons = [...chatHeader.querySelectorAll('button,[role="button"]')];
    const labelButton = headerButtons.find(button => {
      if (button.id === "wf-kb-native-stage-badge") return false;
      const description = [
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
        button.textContent
      ].filter(Boolean).join(" ");
      const hasListIcon = Boolean(button.querySelector(
        '[data-icon="label"],[data-icon="label-filled"],[data-icon="list"],[data-icon="list-outline"],[data-icon*="label"]'
      ));
      return hasListIcon || /adicionar à lista|adicionar a lista|add to list|\d+\s+selecionad[ao]s?|\d+\s+selected/i.test(description);
    });
    const callButton = headerButtons.find(button => {
      const description = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`;
      return /liga[cç][aã]o de v[ií]deo|video call|liga[cç][aã]o de voz|voice call/i.test(description) ||
        Boolean(button.querySelector('[data-icon="video-call"],[data-icon="call"],[data-icon="phone"]'));
    });
    const anchorButton = labelButton || callButton;
    if (!anchorButton) return;
    let badge = main.querySelector("#wf-kb-native-stage-badge");
    if (!badge) {
      badge = document.createElement("button");
      badge.id = "wf-kb-native-stage-badge";
      badge.type = "button";
      badge.setAttribute("aria-haspopup", "menu");
      let anchorWrapper = anchorButton.parentElement;
      while (anchorWrapper && anchorWrapper !== chatHeader && anchorWrapper.tagName !== "SPAN") anchorWrapper = anchorWrapper.parentElement;
      if (anchorWrapper?.tagName === "SPAN") anchorWrapper.before(badge);
      else anchorButton.before(badge);
      badge.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        const menu = document.querySelector("#wf-kb-native-stage-menu");
        if (!menu) return;
        const opening = menu.hidden;
        document.querySelectorAll("#wf-kb-native-stage-menu").forEach(item => { item.hidden = true; });
        if (!opening) return;
        const rect = badge.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 6}px`;
        menu.hidden = false;
        menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - menu.offsetWidth - 8))}px`;
      };
    }
    const badgeState = `${selected.id}|${selected.name}|${selected.color || colors[0]}`;
    if (badge.dataset.stageState !== badgeState) {
      badge.dataset.stageState = badgeState;
      badge.innerHTML = `<i style="--stage-color:${escapeHtml(selected.color || colors[0])}"></i><span>${escapeHtml(selected.name)}</span><b aria-hidden="true"></b>`;
    }
    badge.title = `Mover contato da etapa ${selected.name}`;
    badge.dataset.cardId = activeCard.id;
    let menu = document.querySelector("#wf-kb-native-stage-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "wf-kb-native-stage-menu";
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      document.body.appendChild(menu);
      menu.onclick = async event => {
        const targetCardId = menu.dataset.cardId;
        const remove = event.target.closest("[data-remove-stage]");
        if (remove) {
          menu.hidden = true;
          const inbox = board()?.columns[0];
          if (inbox) await moveActiveCardToColumn(inbox.id, targetCardId);
          return;
        }
        const option = event.target.closest("[data-stage-id]");
        if (!option) return;
        menu.hidden = true;
        await moveActiveCardToColumn(option.dataset.stageId, targetCardId);
      };
    }
    menu.dataset.cardId = activeCard.id;
    const menuState = current.columns.slice(1).map(column => `${column.id}|${column.name}|${column.color}|${column.id === selected.id}`).join(";");
    // Do not replace the buttons on every periodic sync. Replacing a button
    // between pointerdown and click made the first user click disappear.
    if (menu.dataset.stageState !== menuState) {
      menu.dataset.stageState = menuState;
      menu.innerHTML = current.columns.slice(1).map(column => `<div class="wf-kb-native-stage-option ${column.id === selected.id ? "active" : ""}"><button type="button" role="menuitem" data-stage-id="${escapeHtml(column.id)}"><i style="--stage-color:${escapeHtml(column.color || colors[0])}"></i><span>${escapeHtml(column.name)}</span></button>${column.id === selected.id ? `<button type="button" data-remove-stage title="Remover desta etapa" aria-label="Remover desta etapa">×</button>` : ""}</div>`).join("");
    }
  }

  function failureTargets(messages) {
    const grouped = new Map();
    (Array.isArray(messages) ? messages : [])
      .filter(item => item?.status === "failed")
      .forEach(item => {
        const targets = Array.isArray(item.bulkTargets) && item.bulkTargets.length
          ? item.bulkTargets
          : [{ chatId: item.chatId, chatName: item.chatName }];
        targets.forEach(target => {
          const chatId = String(target?.chatId || item.chatId || "").trim();
          if (!chatId) return;
          const previous = grouped.get(chatId);
          const updatedAt = Number(item.updatedAt || item.scheduledAt || item.createdAt || 0);
          const entry = previous || {
            chatId,
            name: String(target?.chatName || item.chatName || "Contato"),
            count: 0,
            updatedAt: 0,
            error: "",
            preview: ""
          };
          entry.count += 1;
          if (updatedAt >= entry.updatedAt) {
            entry.updatedAt = updatedAt;
            entry.error = String(item.error || "Mensagem não enviada");
            entry.preview = String(item.type === "flow" ? item.flowName || "Fluxo" : item.text || item.texts?.[0] || "");
          }
          grouped.set(chatId, entry);
        });
      });
    return [...grouped.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function formatFailureTime(timestamp) {
    if (!timestamp) return "";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
      }).format(new Date(timestamp));
    } catch {
      return "";
    }
  }

  async function refreshFailures() {
    const button = document.querySelector("#wf-failures-button");
    const panel = document.querySelector("#wf-failures-panel");
    const list = document.querySelector("#wf-failures-list");
    if (!button || !panel || !list) return;
    try {
      const stored = await chrome.storage.local.get("wfScheduledMessages");
      const failedMessages = (Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [])
        .filter(item => item?.status === "failed");
      const failures = failureTargets(stored.wfScheduledMessages);
      const badge = button.querySelector(".wf-failures-badge");
      badge.textContent = failures.length > 99 ? "99+" : String(failures.length);
      badge.hidden = failures.length === 0;
      panel.querySelectorAll("[data-failure-bulk]").forEach(action => {
        action.disabled = failedMessages.length === 0;
      });
      const count = panel.querySelector("#wf-failures-count");
      if (count) count.textContent = `${failedMessages.length} mensagem${failedMessages.length === 1 ? "" : "s"} com falha`;
      list.innerHTML = failures.length ? failures.map(item => `
        <button type="button" class="wf-failure-row" data-failure-chat="${escapeHtml(item.chatId)}">
          <span class="wf-failure-avatar">${escapeHtml(initials(item.name))}</span>
          <span class="wf-failure-copy">
            <span class="wf-failure-head"><strong>${escapeHtml(item.name)}</strong><time>${escapeHtml(formatFailureTime(item.updatedAt))}</time></span>
            <span class="wf-failure-preview">${escapeHtml(item.preview || "Mensagem não enviada")}</span>
            <small>${escapeHtml(item.error)}${item.count > 1 ? ` · ${item.count} falhas` : ""}</small>
          </span>
        </button>
      `).join("") : `<div class="wf-failures-empty"><b>✓</b><strong>Nenhuma falha encontrada</strong><span>As conversas com mensagens não enviadas aparecerão aqui.</span></div>`;
      failures.forEach(item => {
        const row = list.querySelector(`[data-failure-chat="${CSS.escape(item.chatId)}"]`);
        if (row) row._wfFailure = item;
      });
    } catch (error) {
      list.innerHTML = `<div class="wf-failures-empty"><strong>Não foi possível carregar as falhas</strong><span>${escapeHtml(error?.message || String(error))}</span></div>`;
    }
  }

  function mountFailures(kanbanButton) {
    if (document.querySelector("#wf-failures-button")) return;
    const style = document.createElement("style");
    style.id = "wf-failures-style";
    style.textContent = `
      #wf-failures-button{position:fixed!important;z-index:2147483646!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:64px;height:64px;padding:6px 3px;border:0;border-radius:0;background:transparent;color:#54656f;font:500 11px/1.1 Arial,sans-serif;cursor:pointer}
      #wf-failures-button:hover,#wf-failures-button.active{background:#e9edef;color:#d93025}
      #wf-failures-button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #wf-failures-button .wf-failures-badge{position:absolute;top:5px;right:7px;min-width:18px;height:18px;padding:0 4px;border-radius:10px;background:#d93025;color:#fff;font:bold 10px/18px Arial,sans-serif;text-align:center}
      #wf-failures-panel{position:fixed!important;z-index:2147483647!important;top:0!important;bottom:0!important;left:64px!important;width:min(420px,calc(100vw - 64px));background:#fff;color:#111b21;box-shadow:4px 0 18px rgba(11,20,26,.16);display:flex!important;flex-direction:column;isolation:isolate;transform:translateZ(0)}
      #wf-failures-panel[hidden]{display:none!important}
      #wf-failures-panel>header{display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:12px 16px;border-bottom:1px solid #e9edef;background:#f0f2f5}
      #wf-failures-panel>header div{display:flex;flex-direction:column;gap:2px}#wf-failures-panel>header strong{font-size:18px}#wf-failures-panel>header span{font-size:12px;color:#667781}
      #wf-failures-close{border:0;background:transparent;color:#54656f;font-size:28px;line-height:1;cursor:pointer}
      .wf-failures-actions{padding:12px 14px;border-bottom:1px solid #e9edef;background:#fff}.wf-failures-actions-main{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wf-failures-actions button{min-height:38px;padding:8px 10px;border:1px solid #d5dce0;border-radius:8px;background:#fff;color:#3b4a54;font-weight:600;cursor:pointer}.wf-failures-actions button:hover{background:#f5f6f6}.wf-failures-actions button.primary{grid-column:1/-1;border-color:#00a884;background:#00a884;color:#fff}.wf-failures-actions button.danger{border-color:#f1b5b1;color:#b3261e}.wf-failures-actions button:disabled{opacity:.45;cursor:not-allowed}.wf-failures-actions-meta{display:flex;justify-content:space-between;gap:8px;margin-top:8px;color:#667781;font-size:11px}.wf-failures-feedback{min-height:16px;margin-top:6px;color:#667781;font-size:12px}.wf-failures-feedback.error{color:#b3261e}.wf-failures-reschedule{margin-top:10px;padding:12px;border:1px solid #d5dce0;border-radius:9px;background:#f7f9fa}.wf-failures-reschedule[hidden]{display:none}.wf-failures-reschedule strong{display:block;margin-bottom:8px}.wf-failures-datetime{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wf-failures-datetime label{display:flex;flex-direction:column;gap:4px;color:#667781;font-size:12px}.wf-failures-datetime input{min-width:0;padding:8px;border:1px solid #cbd2d6;border-radius:6px;background:#fff;color:#111b21}.wf-failures-reschedule footer{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
      #wf-failures-list{overflow:auto;flex:1}.wf-failure-row{width:100%;display:flex;gap:12px;align-items:center;padding:12px 14px;border:0;border-bottom:1px solid #f0f2f5;background:#fff;color:inherit;text-align:left;cursor:pointer}
      .wf-failure-row:hover{background:#f5f6f6}.wf-failure-avatar{display:grid;place-items:center;flex:0 0 42px;height:42px;border-radius:50%;background:#fde8e7;color:#b3261e;font-weight:700}
      .wf-failure-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.wf-failure-head{display:flex;justify-content:space-between;gap:8px}.wf-failure-head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wf-failure-head time{flex:none;color:#667781;font-size:11px}
      .wf-failure-preview{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#3b4a54;font-size:13px}.wf-failure-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#d93025;font-size:11px}
      .wf-failures-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:64px 28px;text-align:center;color:#667781}.wf-failures-empty b{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:#e5f6ee;color:#00a884;font-size:24px}.wf-failures-empty strong{color:#3b4a54}
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "wf-failures-button";
    button.type = "button";
    button.title = "Falhas";
    button.setAttribute("aria-label", "Filtrar conversas com falhas");
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z"></path><path d="M12 9v4"></path><path d="M12 16.5h.01"></path></svg><span>Falhas</span><span class="wf-failures-badge" hidden>0</span>`;
    kanbanButton.before(button);

    const panel = document.createElement("aside");
    panel.id = "wf-failures-panel";
    panel.hidden = true;
    panel.innerHTML = `<header><div><strong>Falhas</strong><span>Conversas com mensagens não enviadas</span></div><button id="wf-failures-close" type="button" aria-label="Fechar">×</button></header>
      <section class="wf-failures-actions">
        <div class="wf-failures-actions-main">
          <button type="button" class="primary" id="wf-failures-send-all" data-failure-bulk>Disparar todas agora</button>
          <button type="button" id="wf-failures-reschedule-open" data-failure-bulk>Reprogramar todas</button>
          <button type="button" class="danger" id="wf-failures-delete-all" data-failure-bulk>Excluir mensagens</button>
        </div>
        <div class="wf-failures-actions-meta"><span id="wf-failures-count">0 mensagens com falha</span><span>Próximas recorrências serão mantidas</span></div>
        <div id="wf-failures-feedback" class="wf-failures-feedback" aria-live="polite"></div>
        <form id="wf-failures-reschedule-form" class="wf-failures-reschedule" hidden>
          <strong>Nova data e hora</strong>
          <div class="wf-failures-datetime"><label>Data<input id="wf-failures-date" type="date" required></label><label>Hora<input id="wf-failures-time" type="time" required></label></div>
          <footer><button type="button" id="wf-failures-reschedule-cancel">Cancelar</button><button type="submit" class="primary">Confirmar</button></footer>
        </form>
      </section><div id="wf-failures-list"></div>`;
    document.body.appendChild(panel);

    const position = () => {
      const rect = kanbanButton.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      button.style.left = `${rect.left}px`;
      button.style.top = `${Math.max(0, rect.top - rect.height)}px`;
      button.style.width = `${rect.width}px`;
      button.style.height = `${rect.height}px`;
      panel.style.left = `${Math.max(0, rect.right)}px`;
    };
    requestAnimationFrame(position);
    setTimeout(position, 500);
    window.addEventListener("resize", position);

    const close = () => { panel.setAttribute("hidden", ""); button.classList.remove("active"); };
    button.onclick = async () => {
      const willOpen = panel.hidden;
      if (!willOpen) return close();
      position();
      const kanbanPanel = document.querySelector("#wf-kanban-panel");
      if (kanbanPanel) kanbanPanel.hidden = true;
      kanbanButton.classList.remove("active");
      document.body.appendChild(panel);
      panel.removeAttribute("hidden");
      button.classList.add("active");
      await refreshFailures();
    };
    panel.querySelector("#wf-failures-close").onclick = close;
    const feedback = panel.querySelector("#wf-failures-feedback");
    const rescheduleForm = panel.querySelector("#wf-failures-reschedule-form");
    const setFeedback = (message, error = false) => {
      feedback.textContent = message || "";
      feedback.classList.toggle("error", error);
    };
    const updateFailedMessages = async updater => {
      const stored = await chrome.storage.local.get("wfScheduledMessages");
      const messages = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];
      const failed = messages.filter(item => item?.status === "failed");
      if (!failed.length) return 0;
      await chrome.storage.local.set({ wfScheduledMessages: updater(messages, failed) });
      await refreshFailures();
      return failed.length;
    };
    panel.querySelector("#wf-failures-send-all").onclick = async event => {
      const action = event.currentTarget;
      action.disabled = true;
      setFeedback("Preparando as mensagens para envio...");
      try {
        const now = Date.now();
        const count = await updateFailedMessages(messages => messages.map(item => {
          if (item?.status !== "failed") return item;
          const recurring = Boolean(item.repeat && item.repeat !== "none");
          return {
            ...item,
            status: "pending",
            scheduledAt: now,
            ...(recurring ? { recurrenceAnchorAt: Number(item.recurrenceAnchorAt || item.scheduledAt) } : {}),
            updatedAt: now,
            error: ""
          };
        }));
        setFeedback(count ? `${count} mensagem${count === 1 ? "" : "s"} colocada${count === 1 ? "" : "s"} na fila de envio.` : "Nenhuma mensagem com falha.");
      } catch (error) {
        setFeedback(error?.message || "Não foi possível disparar as mensagens.", true);
      } finally {
        await refreshFailures();
      }
    };
    panel.querySelector("#wf-failures-delete-all").onclick = async event => {
      if (!confirm("Excluir todas as mensagens com falha? As próximas recorrências programadas serão mantidas.")) return;
      const action = event.currentTarget;
      action.disabled = true;
      setFeedback("Excluindo mensagens com falha...");
      try {
        const count = await updateFailedMessages(messages => messages.filter(item => item?.status !== "failed"));
        setFeedback(count ? `${count} mensagem${count === 1 ? "" : "s"} excluída${count === 1 ? "" : "s"}.` : "Nenhuma mensagem com falha.");
      } catch (error) {
        setFeedback(error?.message || "Não foi possível excluir as mensagens.", true);
      } finally {
        await refreshFailures();
      }
    };
    panel.querySelector("#wf-failures-reschedule-open").onclick = () => {
      const suggested = new Date(Date.now() + 5 * 60 * 1000);
      const local = new Date(suggested.getTime() - suggested.getTimezoneOffset() * 60000).toISOString();
      panel.querySelector("#wf-failures-date").value = local.slice(0, 10);
      panel.querySelector("#wf-failures-time").value = local.slice(11, 16);
      rescheduleForm.hidden = false;
      setFeedback("");
      panel.querySelector("#wf-failures-date").focus();
    };
    panel.querySelector("#wf-failures-reschedule-cancel").onclick = () => {
      rescheduleForm.hidden = true;
      setFeedback("");
    };
    rescheduleForm.onsubmit = async event => {
      event.preventDefault();
      const date = panel.querySelector("#wf-failures-date").value;
      const time = panel.querySelector("#wf-failures-time").value;
      const scheduledAt = new Date(`${date}T${time}:00`).getTime();
      if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
        setFeedback("Escolha uma data e hora futuras.", true);
        return;
      }
      const submit = rescheduleForm.querySelector('[type="submit"]');
      submit.disabled = true;
      setFeedback("Reprogramando mensagens...");
      try {
        const now = Date.now();
        const count = await updateFailedMessages(messages => messages.map(item => item?.status === "failed"
          ? {
              ...item,
              status: "pending",
              scheduledAt,
              ...(item.repeat && item.repeat !== "none" ? { recurrenceAnchorAt: scheduledAt } : {}),
              updatedAt: now,
              error: ""
            }
          : item));
        rescheduleForm.hidden = true;
        setFeedback(count ? `${count} mensagem${count === 1 ? "" : "s"} reprogramada${count === 1 ? "" : "s"}.` : "Nenhuma mensagem com falha.");
      } catch (error) {
        setFeedback(error?.message || "Não foi possível reprogramar as mensagens.", true);
      } finally {
        submit.disabled = false;
        await refreshFailures();
      }
    };
    panel.querySelector("#wf-failures-list").onclick = async event => {
      const row = event.target.closest("[data-failure-chat]");
      if (!row?._wfFailure) return;
      const failure = row._wfFailure;
      row.disabled = true;
      try {
        await window.WFBridge.command("OPEN_KANBAN_CHAT", {
          chatId: failure.chatId,
          name: failure.name || "",
          phone: ""
        }, 5000);
        close();
      } catch (error) {
        alert(error?.message || "Não foi possível abrir esta conversa.");
      } finally {
        row.disabled = false;
      }
    };
    refreshFailures();
  }

  function mountZapFlow(kanbanButton) {
    if (document.querySelector("#wf-zap-flow-button")) return;
    const button = document.createElement("button");
    button.id = "wf-zap-flow-button";
    button.type = "button";
    button.title = "Zap Flow";
    button.setAttribute("aria-label", "Abrir Zap Flow");
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 2.5-9 11h6l-1 8 10-12h-6l0-7Z"></path></svg><span>Zap Flow</span>`;
    const failuresButton = document.querySelector("#wf-failures-button");
    (failuresButton || kanbanButton).before(button);

    const position = () => {
      const rect = kanbanButton.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      button.style.left = `${rect.left}px`;
      button.style.top = `${Math.max(0, rect.top - (rect.height * 2))}px`;
      button.style.width = `${rect.width}px`;
      button.style.height = `${rect.height}px`;
    };
    requestAnimationFrame(position);
    setTimeout(position, 500);
    if (zapFlowResizeHandler) window.removeEventListener("resize", zapFlowResizeHandler);
    zapFlowResizeHandler = position;
    window.addEventListener("resize", zapFlowResizeHandler);

    button.onclick = async () => {
      button.disabled = true;
      try {
        await chrome.runtime.sendMessage({ type: "WF_OPEN_POPUP" });
      } catch (error) {
        console.error("[WA Flow] Não foi possível abrir o Zap Flow.", error);
        alert("Não foi possível abrir o Zap Flow. Recarregue a extensão e tente novamente.");
      } finally {
        button.disabled = false;
      }
    };
  }

  function mount() {
    if (!document.body) return;
    const existingKanbanButton = document.querySelector("#wf-kanban-button");
    if (existingKanbanButton) {
      mountZapFlow(existingKanbanButton);
      return;
    }
    // Wait for WhatsApp's conversation/sidebar shell so the Kanban shortcut
    // appears together with the native navigation instead of during boot.
    if (!document.querySelector("#side")) return;
    const button = document.createElement("button");
    button.id = "wf-kanban-button";
    button.type = "button";
    button.title = "Kanban";
    button.setAttribute("aria-label", "Abrir Kanban");
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M8 8v8M12 8v5M16 8v7"></path></svg><span>Kanban</span>`;
    document.body.appendChild(button);
    mountFailures(button);
    mountZapFlow(button);

    const panel = document.createElement("section");
    panel.id = "wf-kanban-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <header class="wf-kb-topbar">
        <div class="wf-kb-title"><div><strong>Kanban</strong><span>Organize suas conversas por etapa</span></div></div>
        <div class="wf-kb-tools">
          <label class="wf-kb-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg><input id="wf-kb-search" type="search" placeholder="Buscar contato"></label>
          <select id="wf-kb-board-select" aria-label="Selecionar quadro"></select>
          <button id="wf-kb-new-board" type="button">+ Quadro</button>
          <button id="wf-kb-sync" class="primary" type="button">↻ Sincronizar</button>
        </div>
      </header>
      <div class="wf-kb-subbar"><div><strong id="wf-kb-board-name"></strong><span id="wf-kb-total"></span></div><div id="wf-kb-board-actions"><button id="wf-kb-rename" type="button">Renomear</button><button id="wf-kb-delete" class="danger" type="button">Excluir</button><button id="wf-kb-add-column" type="button">+ Etapa</button></div></div>
      <main id="wf-kb-board"></main>
      <div id="wf-kb-chat-modal" hidden><div class="wf-kb-chat-dialog"><header><div class="wf-kb-contact"><span id="wf-kb-chat-avatar"></span><div><strong id="wf-kb-chat-name"></strong><small id="wf-kb-chat-phone"></small></div></div><button id="wf-kb-chat-close" type="button">×</button></header><div id="wf-kb-chat-messages"></div><footer class="wf-kb-chat-composer"><textarea id="wf-kb-chat-input" rows="1" placeholder="Digite uma mensagem"></textarea><button id="wf-kb-chat-send" type="button" title="Enviar mensagem" aria-label="Enviar mensagem"><svg viewBox="0 0 24 24"><path d="m3 20 18-8L3 4v6l12 2-12 2v6Z"></path></svg></button></footer></div></div>
      <div id="wf-kb-card-actions" hidden><div class="wf-kb-card-actions-dialog"><strong id="wf-kb-action-name"></strong><div class="wf-kb-card-action-buttons"><button id="wf-kb-action-edit" type="button">Editar</button><button id="wf-kb-action-delete" class="danger" type="button">Excluir</button><button id="wf-kb-action-remove-label" class="danger" type="button" hidden>Remover etiqueta</button></div></div></div>
      <div id="wf-kb-column-actions" hidden><div class="wf-kb-column-actions-dialog"><strong id="wf-kb-column-action-name"></strong><button id="wf-kb-column-action-search" type="button">⌕ <span>Buscar contato</span></button><button id="wf-kb-column-action-bulk" type="button">➤ <span>Disparo em Massa</span></button><button id="wf-kb-column-action-edit" type="button">✎ <span>Editar etapa</span></button><button id="wf-kb-column-action-clear" type="button">🧹 <span>Limpar etapa</span></button><button id="wf-kb-column-action-delete" class="danger" type="button">♲ <span>Excluir etapa</span></button></div></div>
      <div id="wf-kb-column-search-popover" hidden><label for="wf-kb-column-search-input">Buscar nesta coluna</label><div class="wf-kb-column-search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg><input id="wf-kb-column-search-input" type="search" autocomplete="off" placeholder="Nome ou número"><button id="wf-kb-column-search-close" type="button" title="Fechar busca" aria-label="Fechar busca">×</button></div><small id="wf-kb-column-search-status" aria-live="polite">Digite um nome ou número</small></div>
      <div id="wf-kb-bulk-modal" hidden><form id="wf-kb-bulk-form" class="wf-kb-bulk-dialog"><header><div><strong>Disparo em Massa</strong><span id="wf-kb-bulk-column-name"></span></div><button id="wf-kb-bulk-close" type="button" aria-label="Fechar">×</button></header><div class="wf-kb-bulk-kind"><button type="button" class="active" data-bulk-kind="message">Mensagem</button><button type="button" data-bulk-kind="flow">Fluxo</button></div><label id="wf-kb-bulk-message-wrap">Mensagem<textarea id="wf-kb-bulk-message" rows="5" placeholder="Digite a mensagem que será enviada"></textarea></label><label id="wf-kb-bulk-flow-wrap" hidden>Fluxo<select id="wf-kb-bulk-flow"><option value="">Selecione um fluxo</option></select></label><label>Quando<select id="wf-kb-bulk-when"><option value="now">Enviar agora</option><option value="schedule">Programar</option></select></label><div id="wf-kb-bulk-schedule" hidden><div class="wf-kb-bulk-datetime"><label>Data<input id="wf-kb-bulk-date" type="date"></label><label>Hora<input id="wf-kb-bulk-time" type="time"></label></div><label>Repetir<select id="wf-kb-bulk-repeat"><option value="none">Não repetir</option><option value="hourly">A cada hora</option><option value="daily">Todos os dias</option><option value="weekly">Toda semana</option><option value="biweekly">Quinzenal</option><option value="monthly">Todo mês</option><option value="yearly">Todo ano</option><option value="custom">Personalizado...</option></select></label><div id="wf-kb-bulk-custom" class="wf-kb-bulk-datetime" hidden><label>Repetir a cada<input id="wf-kb-bulk-every" type="number" min="1" value="1"></label><label>Unidade<select id="wf-kb-bulk-unit"><option value="minutes">Minuto(s)</option><option value="hours">Hora(s)</option><option value="days">Dia(s)</option><option value="weeks">Semana(s)</option><option value="months">Mês(es)</option></select></label></div><label class="wf-kb-bulk-check"><input id="wf-kb-bulk-cancel" type="checkbox"> Cancelar se o contato responder antes</label></div><div id="wf-kb-bulk-feedback"></div><footer><button type="button" id="wf-kb-bulk-cancel-button">Cancelar</button><button type="submit" class="primary">Enviar</button></footer></form></div>
      <div id="wf-kb-native-backdrop" hidden><button id="wf-kb-native-close" type="button" title="Fechar conversa" aria-label="Fechar conversa">×</button></div>`;
    document.body.appendChild(panel);
    bind();
  }

  function cardTemplate(card, columnId, { readOnly = false, labelDragKey = "", labelSourceKey = "", searchMatch = false, disableDrag = false } = {}) {
    const cardId = escapeHtml(card.id);
    const sourceColumnId = escapeHtml(columnId);
    const canDrag = (!readOnly || Boolean(labelDragKey)) && !disableDrag;
    const labelDragAttributes = labelDragKey
      ? ` data-label-card="${escapeHtml(labelDragKey)}" data-label-source="${escapeHtml(labelSourceKey)}"`
      : "";
    const actionsButton = readOnly
      ? `<button data-edit-label-card="${cardId}" data-card-column="${sourceColumnId}" data-card-label="${escapeHtml(labelSourceKey)}" type="button" title="Ações da etiqueta deste contato" aria-label="Ações da etiqueta de ${escapeHtml(card.name || "Contato")}">•••</button>`
      : `<button data-edit-card="${cardId}" data-card-column="${sourceColumnId}" type="button" title="Ações do contato" aria-label="Ações de ${escapeHtml(card.name || "Contato")}">•••</button>`;
    return `<article class="wf-kb-card${readOnly ? " wf-kb-label-card" : ""}${searchMatch ? " wf-kb-search-match" : ""}" ${canDrag ? 'draggable="true"' : ""} data-card="${cardId}" data-from="${sourceColumnId}"${labelDragAttributes}><div class="wf-kb-card-head"><span data-open-card="${cardId}" data-open-column="${sourceColumnId}" title="Abrir conversa">${escapeHtml(initials(card.name))}</span>${actionsButton}</div><button class="wf-kb-card-name" data-open-card="${cardId}" data-open-column="${sourceColumnId}" type="button" title="Abrir conversa">${escapeHtml(card.name || "Contato")}</button><small data-open-card="${cardId}" data-open-column="${sourceColumnId}" title="Abrir conversa">${escapeHtml(formatPhone(card.phone))}</small>${card.lastMessage ? `<p data-open-card="${cardId}" data-open-column="${sourceColumnId}" title="Abrir conversa">${escapeHtml(safeMessagePreview(card.lastMessage, card.messages?.[card.messages.length - 1]?.type))}</p>` : ""}${card.unreadCount ? `<footer><b>${card.unreadCount} nova${card.unreadCount === 1 ? "" : "s"}</b></footer>` : ""}</article>`;
  }

  function decorateRenderedCards(current, root = document.querySelector("#wf-kb-board")) {
    const cardsById = new Map();
    current.columns.forEach(column => column.cards.forEach(card => cardsById.set(String(card.id), card)));
    root?.querySelectorAll(".wf-kb-card[data-card]").forEach(cardNode => {
      const card = cardsById.get(String(cardNode.dataset.card));
      if (!card) return;
      cardNode.classList.toggle("has-unread", Number(card.unreadCount) !== 0);
      if (card.avatar) {
        const avatarNode = cardNode.querySelector(".wf-kb-card-head>span");
        const image = document.createElement("img");
        image.alt = "";
        image.draggable = false;
        image.referrerPolicy = "no-referrer";
        image.src = card.avatar;
        image.onerror = () => { avatarNode.textContent = initials(card.name); };
        avatarNode.textContent = "";
        avatarNode.appendChild(image);
      }
      if (Array.isArray(card.labels) && card.labels.length) {
        const labelsNode = document.createElement("div");
        labelsNode.className = "wf-kb-business-labels";
        labelsNode.dataset.openCard = card.id;
        labelsNode.dataset.openColumn = cardNode.dataset.from;
        labelsNode.title = "Abrir conversa";
        card.labels.slice(0, 3).forEach(label => {
          const badge = document.createElement("span");
          badge.textContent = label.name || "Etiqueta";
          const badgeColor = safeLabelColor(label.color);
          if (badgeColor) badge.style.setProperty("--label-color", badgeColor);
          labelsNode.appendChild(badge);
        });
        cardNode.querySelector(".wf-kb-card-head>span")?.after(labelsNode);
      }
      const preview = cardNode.querySelector(":scope>p");
      if (preview) preview.classList.add(card.lastMessageFromMe ? "from-me" : "from-client");
    });
  }

  function renderLabelsView(current, boardElement, boardScroll, columnScrolls) {
    const layout = labelLayoutForBoard(current);
    const labels = orderItemsBySavedKeys(labelsForBoard(current), layout.columnOrder, labelViewLabelKey, labelViewLabelAliases);
    const labeledContacts = new Set(allCards(current)
      .filter(card => (card.labels || []).some(label =>
        isVisibleBusinessLabel(label) && !isPendingLabelCandidate(card, label)
      ))
      .map(card => cardIdentity(card))
      .filter(Boolean));
    document.querySelector("#wf-kb-board-name").textContent = "Etiquetas";
    document.querySelector("#wf-kb-total").textContent = `${labeledContacts.size} contato${labeledContacts.size === 1 ? "" : "s"} com etiqueta`;
    boardElement.innerHTML = labels.map((label, index) => {
      const labelKey = labelViewLabelKey(label);
      const allEntries = orderItemsBySavedKeys(
        labelEntriesForBoard(current, label),
        savedCardOrderForLabel(layout, label),
        entry => labelViewCardKey(entry.card)
      );
      const entries = allEntries.filter(item => {
        const haystack = `${item.card.name} ${item.card.phone} ${item.card.lastMessage}`.toLocaleLowerCase("pt-BR");
        return !search || haystack.includes(search);
      });
      const query = columnSearchQuery("label", labelKey, current);
      const { ordered: displayedEntries } = prioritizeColumnMatches(entries, query, item => item.card);
      const labelColor = safeLabelColor(label.color) || colors[index % colors.length];
      return `<section class="wf-kb-column wf-kb-label-column" data-label-column="${escapeHtml(labelKey)}" style="--column:${escapeHtml(labelColor)}"><header draggable="true" data-label-column-drag="${escapeHtml(labelKey)}" title="Arraste para mover esta etiqueta"><div><i></i><strong>${escapeHtml(label.name || "Etiqueta")}</strong><b>${entries.length}</b></div><aside><button data-edit-label-column="${escapeHtml(labelKey)}" title="Opções da etiqueta">•••</button></aside></header><div class="wf-kb-card-list" data-label-list="${escapeHtml(labelKey)}">${displayedEntries.map(({ card, columnId }) => cardTemplate(card, columnId, { readOnly: true, labelDragKey: labelViewCardKey(card), labelSourceKey: labelKey, searchMatch: Boolean(query) && matchesColumnSearch(card, query), disableDrag: Boolean(query) })).join("")}${entries.length ? "" : '<div class="wf-kb-label-empty">Nenhum contato nesta etiqueta</div>'}</div></section>`;
    }).join("") || '<div class="wf-kb-labels-empty"><strong>Nenhuma etiqueta encontrada</strong><span>Clique em Sincronizar para carregar as etiquetas do WhatsApp.</span></div>';
    decorateRenderedCards(current, boardElement);
    boardElement.scrollLeft = boardScroll.left;
    boardElement.scrollTop = boardScroll.top;
    boardElement.querySelectorAll(".wf-kb-card-list[data-label-list]").forEach(list => {
      const previousTop = columnScrolls.get(list.dataset.labelList);
      if (Number.isFinite(previousTop)) list.scrollTop = previousTop;
      if (columnSearchQuery("label", list.dataset.labelList, current)) list.scrollTop = 0;
    });
    updateColumnSearchStatus();
  }

  function render() {
    cleanupOrphanedKanbanSnapshot();
    const current = board();
    if (!current) return;
    const boardElement = document.querySelector("#wf-kb-board");
    const boardScroll = { left: boardElement?.scrollLeft || 0, top: boardElement?.scrollTop || 0 };
    const columnScrolls = new Map(Array.from(boardElement?.querySelectorAll(".wf-kb-card-list") || [])
      .map(list => [list.dataset.drop || list.dataset.labelList, list.scrollTop])
      .filter(([key]) => key));
    selectedBoardId = current.id;
    const isLabelsView = viewMode === "labels";
    const select = document.querySelector("#wf-kb-board-select");
    select.innerHTML = boards.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("") +
      `<option value="${LABELS_VIEW_ID}">Etiquetas</option>`;
    select.value = isLabelsView ? LABELS_VIEW_ID : current.id;
    document.querySelector("#wf-kb-board-actions").hidden = isLabelsView;
    document.querySelector("#wf-kb-new-board").hidden = isLabelsView;
    boardElement.classList.toggle("wf-kb-label-view", isLabelsView);
    if (isLabelsView) {
      renderLabelsView(current, boardElement, boardScroll, columnScrolls);
      return;
    }
    document.querySelector("#wf-kb-board-name").textContent = current.name;
    const total = allCards(current).length;
    document.querySelector("#wf-kb-total").textContent = `${total} contato${total === 1 ? "" : "s"}`;
    const inboxLabels = new Map();
    [...whatsappLabelCatalog, ...allCards(current).flatMap(card => card.labels || [])].forEach(label => {
      const normalizedName = normalizeLabelName(label.name);
      const isNativeFilter = normalizedName.includes("nao lidas") ||
        normalizedName.includes("favorito") ||
        /(^| )grupos?( |$)/.test(normalizedName);
      if (isNativeFilter) return;
      const key = String(label.id || label.name || "").trim();
      if (key && !inboxLabels.has(key)) inboxLabels.set(key, label);
    });
    const labelEntries = [...inboxLabels].filter(([, label]) => {
      const name = normalizeLabelName(label.name);
      return !name.includes("nao lidas") && !name.includes("favorito") && !/(^| )grupos?( |$)/.test(name);
    });
    const labelToken = ([key, label]) => normalizeLabelName(label.name) || String(key);
    const activeLabelToken = inboxFilter.startsWith("label:") ? inboxFilter.slice(6) : "";
    const pinnedLabel = labelEntries.find(entry => labelToken(entry) === activeLabelToken) || labelEntries[0];
    const overflowLabels = labelEntries.filter(entry => entry !== pinnedLabel);
    const labelChip = entry => {
      const [, label] = entry;
      const token = labelToken(entry);
      return `<button type="button" data-inbox-filter="label:${escapeHtml(token)}" class="${inboxFilter === `label:${token}` ? "active" : ""}" title="${escapeHtml(label.name || "Etiqueta")}"><i style="--filter-color:${escapeHtml(label.color || "#00a884")}"></i>${escapeHtml(label.name || "Etiqueta")}</button>`;
    };
    const inboxFiltersHtml = `<div class="wf-kb-inbox-filter-wrap"><div class="wf-kb-inbox-filters" aria-label="Filtrar novos contatos"><button type="button" data-inbox-filter="recent" class="${inboxFilter === "recent" ? "active" : ""}">Recentes</button><button type="button" data-inbox-filter="unread" class="${inboxFilter === "unread" ? "active" : ""}">Não lidas</button>${pinnedLabel ? labelChip(pinnedLabel) : ""}${overflowLabels.length ? `<button type="button" class="wf-kb-filter-more ${inboxFiltersExpanded ? "active" : ""}" data-toggle-inbox-labels aria-label="Mais etiquetas" aria-expanded="${inboxFiltersExpanded}"><b></b></button>` : ""}</div>${overflowLabels.length && inboxFiltersExpanded ? `<div class="wf-kb-inbox-filter-dropdown">${overflowLabels.map(labelChip).join("")}</div>` : ""}</div>`;
    boardElement.innerHTML = current.columns.map((column, index) => {
      const visible = (column.cards || []).filter(card => {
        const haystack = `${card.name} ${card.phone} ${card.lastMessage}`.toLocaleLowerCase("pt-BR");
        if (search && !haystack.includes(search)) return false;
        if (index !== 0) return true;
        if (inboxSearch && !`${card.name} ${card.phone}`.toLocaleLowerCase("pt-BR").includes(inboxSearch)) return false;
        if (inboxFilter === "unread") return Number(card.unreadCount) !== 0;
        if (inboxFilter.startsWith("label:")) {
          const expected = inboxFilter.slice(6);
          return (card.labels || []).some(label => normalizeLabelName(label.name) === expected || String(label.id || "").trim() === expected);
        }
        return true;
      });
      if (index === 0) visible.sort((first, second) => Number(second.updatedAt || 0) - Number(first.updatedAt || 0));
      const query = columnSearchQuery("board", column.id, current);
      const { ordered: displayedCards } = prioritizeColumnMatches(visible, query);
      return `<section class="wf-kb-column" data-column="${column.id}" style="--column:${column.color || colors[index % colors.length]}"><header draggable="true" data-column-drag="${column.id}" title="Arraste para mover esta etapa"><div><i></i><strong>${escapeHtml(column.name)}</strong><b>${visible.length}</b></div><aside><button data-add-card="${column.id}" title="Adicionar contato">+</button><button data-edit-column="${column.id}" title="Editar etapa">•••</button></aside></header>${index === 0 ? `<label class="wf-kb-column-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg><input id="wf-kb-inbox-search" type="search" value="${escapeHtml(inboxSearch)}" placeholder="Buscar nome ou número"></label>${inboxFiltersHtml}` : ""}<div class="wf-kb-card-list" data-drop="${column.id}">${displayedCards.map(card => cardTemplate(card, column.id, { searchMatch: Boolean(query) && matchesColumnSearch(card, query), disableDrag: Boolean(query) })).join("")}${visible.length ? "" : `<button class="wf-kb-empty" data-add-card="${column.id}" type="button">+ Adicionar contato</button>`}</div></section>`;
    }).join("") + `<button id="wf-kb-inline-column" type="button">+ Adicionar etapa</button>`;
    decorateRenderedCards(current, boardElement);
    boardElement.scrollLeft = boardScroll.left;
    boardElement.scrollTop = boardScroll.top;
    boardElement.querySelectorAll(".wf-kb-card-list[data-drop]").forEach(list => {
      const previousTop = columnScrolls.get(list.dataset.drop);
      if (Number.isFinite(previousTop)) list.scrollTop = previousTop;
      if (columnSearchQuery("board", list.dataset.drop, current)) list.scrollTop = 0;
    });
    updateColumnSearchStatus();
  }

  async function sync({ silent = false } = {}) {
    if (labelMutationsInFlight) {
      scheduleLabelResync(800);
      return;
    }
    if (syncing) return;
    syncing = true;
    const startedLabelMutationRevision = labelMutationRevision;
    const targetBoardId = selectedBoardId;
    const button = document.querySelector("#wf-kb-sync");
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Sincronizando...";
    try {
      const response = await window.WFBridge.command("LIST_KANBAN_CHATS", {}, 90000);
      if (startedLabelMutationRevision !== labelMutationRevision || labelMutationsInFlight) {
        scheduleLabelResync(800);
        return;
      }
      const chats = response.result?.chats || [];
      const current = boards.find(item => item.id === targetBoardId);
      if (!current) return;
      const inbox = current.columns[0];
      current.hiddenContacts = Array.isArray(current.hiddenContacts) ? current.hiddenContacts : [];
      const hidden = new Set(current.hiddenContacts);
      const known = new Map();
      current.columns.forEach(column => column.cards.forEach(card => {
        if (card.chatId) known.set(card.chatId, card);
        if (card.phone) known.set(`p:${String(card.phone).replace(/\D/g, "")}`, card);
      }));
      const newCards = [];
      chats.forEach(chat => {
        if (hidden.has(chat.chatId) || hidden.has(`p:${chat.phone}`)) return;
        const card = known.get(chat.chatId) || known.get(`p:${chat.phone}`);
        if (card) {
          Object.assign(card, { chatId: chat.chatId, avatar: chat.avatar || card.avatar || "", labels: chat.labels || [], name: chat.name || card.name, phone: chat.phone || card.phone, lastMessage: chat.lastMessage || card.lastMessage, lastMessageFromMe: Boolean(chat.lastMessageFromMe), messages: chat.messages || card.messages, unreadCount: chat.unreadCount || 0, updatedAt: chat.timestamp || card.updatedAt });
        } else {
          newCards.push({ id: uid(), chatId: chat.chatId, avatar: chat.avatar || "", labels: chat.labels || [], name: chat.name || chat.phone, phone: chat.phone, lastMessage: chat.lastMessage || "", lastMessageFromMe: Boolean(chat.lastMessageFromMe), messages: chat.messages || [], unreadCount: chat.unreadCount || 0, tag: "WhatsApp", updatedAt: chat.timestamp || Date.now() });
        }
      });
      if (newCards.length) {
        newCards.sort((first, second) => Number(second.updatedAt || 0) - Number(first.updatedAt || 0));
        inbox.cards.unshift(...newCards);
      }
      await save();
      render();
    } catch (error) {
      if (!silent) alert(error?.message || "Não foi possível sincronizar com o WhatsApp.");
    } finally {
      syncing = false;
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function askCard(existing = {}) {
    const name = prompt("Nome do contato", existing.name || "");
    if (!name?.trim()) return null;
    const phone = prompt("Telefone", existing.phone || "");
    if (phone === null) return null;
    const card = { ...existing, id: existing.id || uid(), name: name.trim(), phone: phone.trim(), lastMessage: existing.lastMessage || "", tag: existing.tag || "Manual", messages: existing.messages || [] };
    delete card.notes;
    return card;
  }

  async function addCard(columnId) {
    const column = board()?.columns.find(item => item.id === columnId);
    const card = askCard();
    if (!column || !card) return;
    column.cards.push(card); await save(); render();
  }
  function locateCard(columnId, cardId) { return board()?.columns.find(item => item.id === columnId)?.cards.find(card => card.id === cardId); }

  function showChat(card) {
    if (!card) return;
    activeCard = card;
    document.querySelector("#wf-kb-chat-avatar").textContent = initials(card.name);
    document.querySelector("#wf-kb-chat-name").textContent = card.name;
    document.querySelector("#wf-kb-chat-phone").textContent = formatPhone(card.phone);
    const messages = Array.isArray(card.messages) ? card.messages : [];
    document.querySelector("#wf-kb-chat-messages").innerHTML = messages.length ? messages.map(message => `<div class="${message.fromMe ? "out" : "in"}"><span>${escapeHtml(message.body || `[${message.type || "mensagem"}]`)}</span><time>${escapeHtml(formatTime(message.timestamp))}</time></div>`).join("") : `<p class="empty">Sincronize o WhatsApp para carregar as mensagens recentes.</p>`;
    document.querySelector("#wf-kb-chat-modal").hidden = false;
    const area = document.querySelector("#wf-kb-chat-messages"); area.scrollTop = area.scrollHeight;
    const input = document.querySelector("#wf-kb-chat-input"); input.value = ""; input.focus();
  }

  async function waitForExpectedWhatsappChat(card, timeout = 3000) {
    const normalize = value => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("pt-BR");
    const expectedName = normalize(card?.name);
    const expectedPhone = String(card?.phone || "").replace(/\D/g, "").slice(-8);
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      const header = document.querySelector("#main header");
      const headerText = normalize([
        header?.querySelector("span[title]")?.getAttribute("title"),
        ...Array.from(header?.querySelectorAll('[dir="auto"]') || []).map(node => node.textContent),
        header?.textContent
      ].filter(Boolean).join(" "));
      const headerDigits = String(header?.textContent || "").replace(/\D/g, "");
      if ((expectedName && headerText.includes(expectedName)) || (expectedPhone && headerDigits.includes(expectedPhone))) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  function scrollNativeChatToBottom(main) {
    if (!main) return;
    const scroll = () => {
      const candidates = Array.from(main.querySelectorAll("div"))
        .filter(node => node.clientHeight > 120 && node.scrollHeight > node.clientHeight + 40)
        .sort((left, right) => (right.scrollHeight - right.clientHeight) - (left.scrollHeight - left.clientHeight));
      const messageScroller = candidates[0];
      if (messageScroller) messageScroller.scrollTop = messageScroller.scrollHeight;
      const latestButton = Array.from(main.querySelectorAll('button,[role="button"]')).find(button => {
        const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`;
        return /mensagem mais recente|ir para baixo|latest message|scroll to bottom/i.test(label);
      });
      latestButton?.click();
    };
    scroll();
    [80, 220, 500, 900].forEach(delay => setTimeout(scroll, delay));
  }

  async function openRealWhatsappChat(card) {
    if (!card?.chatId && !card?.phone) return;
    activeCard = card;
    const panel = document.querySelector("#wf-kanban-panel");
    const button = document.querySelector("#wf-kanban-button");
    try {
      let chatId = card.chatId;
      // Resolve only manually created cards. Synced @c.us identifiers already
      // point to an existing chat and querying them again may stall WhatsApp.
      if (!chatId && card.phone) {
        const phone = String(card.phone).replace(/\D/g, "");
        if (phone) {
          const resolved = await window.WFBridge.command("RESOLVE_CHAT", { chatId: `${phone}@c.us` }, 10000);
          chatId = resolved.result?.lid || resolved.result?.chatId || resolved.result?.phoneChatId || chatId;
          if (chatId && chatId !== card.chatId) {
            card.chatId = chatId;
            await save();
          }
        }
      }
      if (!chatId) throw new Error("Não foi possível identificar esta conversa no WhatsApp.");
      const openedChat = await window.WFBridge.command("OPEN_KANBAN_CHAT", {
        chatId,
        name: card.name || "",
        phone: card.phone || ""
      }, 5000);
      const confirmedChatId = String(openedChat.result?.chatId || chatId);
      if (confirmedChatId && confirmedChatId !== card.chatId) {
        card.chatId = confirmedChatId;
        chatId = confirmedChatId;
        await save();
      }
      if (!await waitForExpectedWhatsappChat(card)) {
        throw new Error(`O WhatsApp não confirmou a abertura da conversa de ${card.name || "este contato"}.`);
      }
      card.unreadCount = 0;
      // Remove the unread styling immediately, before building the dimmed
      // Kanban snapshot, and persist/mark the real WhatsApp chat in parallel.
      render();
      Promise.allSettled([
        save(),
        window.WFBridge.command("MARK_KANBAN_CHAT_READ", { chatId }, 5000)
      ]).catch(() => {});
      let main = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        main = document.querySelector("#main");
        if (main) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!main) throw new Error("A janela real da conversa ainda não está disponível.");
      // Keep #main in WhatsApp's original React tree so all native controls
      // continue receiving delegated events. Only remove ancestor stacking
      // contexts temporarily, allowing the real chat to sit above Kanban.
      nativeChatAncestors = [];
      for (let ancestor = main.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        ancestor.classList.add("wf-kb-native-layer");
        nativeChatAncestors.push(ancestor);
      }
      main.classList.add("wf-kb-native-chat-popup");
      button?.classList.add("popup-dimmed");
      mountKanbanSnapshot(panel);
      hideNativeSearchButtons(main);
      mountNativeStageSelector(main);
      const keepNativePopupVisible = () => {
        const backdrop = document.querySelector("#wf-kb-native-backdrop");
        if (!backdrop || backdrop.hidden || !activeCard) return;
        const liveMain = document.querySelector("#main");
        if (!liveMain) return;
        if (liveMain !== main) {
          nativeChatAncestors.forEach(ancestor => ancestor.classList.remove("wf-kb-native-layer"));
          nativeChatAncestors = [];
          main = liveMain;
        }
        main.classList.add("wf-kb-native-chat-popup");
        for (let ancestor = main.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
          ancestor.classList.add("wf-kb-native-layer");
          if (!nativeChatAncestors.includes(ancestor)) nativeChatAncestors.push(ancestor);
        }
        button?.classList.add("popup-dimmed");
        hideNativeSearchButtons(main);
        if (!main.querySelector("#wf-kb-native-stage-badge")) mountNativeStageSelector(main);
        const close = document.querySelector("#wf-kb-native-close");
        if (close) {
          const rect = main.getBoundingClientRect();
          close.style.top = `${Math.max(2, rect.top - 12)}px`;
          close.style.left = `${Math.max(8, rect.right - 22)}px`;
        }
      };
      nativePopupObserver?.disconnect();
      nativePopupObserver = new MutationObserver(mutations => {
        keepNativePopupVisible();
        const elevatePopover = candidate => {
          if (!(candidate instanceof HTMLElement)) return false;
          if (candidate.closest?.("#wf-kanban-panel") || main.contains(candidate) || candidate.contains?.(main)) return false;
          // WhatsApp mounts tooltips and menus inside large portal roots. Raising
          // one of those roots brings the complete native UI above the Kanban.
          // Only raise the actual, bounded popover that was inserted.
          if (candidate.id === "app" || candidate.id === "side" || candidate.matches("[data-app-wrapper], .app-wrapper-web")) return false;
          const rect = candidate.getBoundingClientRect();
          const coversMostViewport = rect.width >= innerWidth * 0.75 || rect.height >= innerHeight * 0.85;
          if (coversMostViewport) return false;
          candidate.classList.add("wf-kb-native-popover");
          return true;
        };
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.closest?.("#wf-kb-native-stage-menu,#wf-kb-native-stage-badge")) return;
          hideNativeSearchButtons(node);
          setTimeout(() => mountNativeStageSelector(main), 0);
          const found = node.querySelectorAll?.('[role="dialog"],[role="menu"],[role="listbox"],[role="application"],[data-animate-modal-popup],[data-popper-placement]');
          const candidates = [node, ...(found ? Array.from(found) : [])];
          candidates.forEach(elevatePopover);
          let container = node.parentElement;
          while (container && container !== document.body && !main.contains(container)) {
            const style = getComputedStyle(container);
            if (style.position === "fixed" || style.position === "absolute") {
              if (elevatePopover(container)) break;
            }
            container = container.parentElement;
          }
        }));
      });
      nativePopupObserver.observe(document.body, { childList: true, subtree: true });
      clearInterval(nativePopupGuardTimer);
      nativePopupGuardTimer = setInterval(keepNativePopupVisible, 250);
      clearInterval(nativeLabelTimer);
      nativeLabelTimer = setInterval(refreshActiveCardLabels, 1000);
      setTimeout(refreshActiveCardLabels, 250);
      const backdrop = document.querySelector("#wf-kb-native-backdrop");
      const close = document.querySelector("#wf-kb-native-close");
      backdrop.hidden = false;
      document.body.appendChild(close);
      const rect = main.getBoundingClientRect();
      close.style.top = `${Math.max(2, rect.top - 12)}px`;
      close.style.left = `${Math.max(8, rect.right - 22)}px`;
      scrollNativeChatToBottom(main);
    } catch (error) {
      cleanupOrphanedKanbanSnapshot();
      alert(error?.message || "Não foi possível abrir a conversa real do WhatsApp.");
    }
  }

  function closeRealWhatsappChat() {
    const main = document.querySelector("#main");
    main?.classList.remove("wf-kb-native-chat-popup");
    document.querySelector("#wf-kanban-button")?.classList.remove("popup-dimmed");
    document.querySelector("#wf-kb-background-snapshot")?.remove();
    nativeChatAncestors.forEach(ancestor => ancestor.classList.remove("wf-kb-native-layer"));
    nativeChatAncestors = [];
    nativePopupObserver?.disconnect();
    nativePopupObserver = null;
    clearInterval(nativePopupGuardTimer);
    nativePopupGuardTimer = null;
    clearInterval(nativeLabelTimer);
    nativeLabelTimer = null;
    document.querySelectorAll(".wf-kb-native-popover").forEach(node => node.classList.remove("wf-kb-native-popover"));
    document.querySelectorAll(".wf-kb-hide-native-search").forEach(node => node.classList.remove("wf-kb-hide-native-search"));
    document.querySelectorAll(".wf-kb-hide-native-menu,.wf-kb-hide-native-menu-wrapper,.wf-kb-native-call-start").forEach(node => {
      node.classList.remove("wf-kb-hide-native-menu", "wf-kb-hide-native-menu-wrapper", "wf-kb-native-call-start");
    });
    document.querySelector("#wf-kb-native-stage-menu")?.remove();
    const backdrop = document.querySelector("#wf-kb-native-backdrop");
    const close = document.querySelector("#wf-kb-native-close");
    if (backdrop) {
      backdrop.hidden = true;
      if (close) backdrop.appendChild(close);
    }
    activeCard = null;
  }

  const fileToDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });

  function hideNativeSearchButtons(root = document) {
    const own = root.matches?.('button,[role="button"]') ? [root] : [];
    [...own, ...Array.from(root.querySelectorAll?.('button,[role="button"]') || [])].forEach(button => {
      const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`;
      const hasSearchIcon = Boolean(button.querySelector('[data-icon="search"],[data-icon="search-alt"],[data-icon="search-refreshed"]'));
      if (hasSearchIcon || /pesquisar|buscar|search/i.test(label)) button.classList.add("wf-kb-hide-native-search");
      const header = button.closest("header");
      if (!header?.closest("#main.wf-kb-native-chat-popup")) return;
      let controlWrapper = button.parentElement;
      while (controlWrapper && controlWrapper !== header && controlWrapper.tagName !== "SPAN") controlWrapper = controlWrapper.parentElement;
      if (/mais opções|more options/i.test(label)) {
        button.classList.add("wf-kb-hide-native-menu");
        if (controlWrapper?.tagName === "SPAN") controlWrapper.classList.add("wf-kb-hide-native-menu-wrapper");
      }
      if (/ligação de vídeo|video call/i.test(label) && controlWrapper?.tagName === "SPAN") {
        controlWrapper.classList.add("wf-kb-native-call-start");
      }
    });
  }

  async function refreshActiveCardLabels() {
    if (nativeLabelsRefreshing || !activeCard?.chatId || !document.querySelector("#main.wf-kb-native-chat-popup")) return;
    nativeLabelsRefreshing = true;
    try {
      const card = allCards(board()).find(item => item.id === activeCard.id) || activeCard;
      const response = await window.WFBridge.command("GET_KANBAN_CHAT_LABELS", { chatId: card.chatId }, 15000);
      const labels = Array.isArray(response.result?.labels) ? response.result.labels : [];
      if (JSON.stringify(labels) === JSON.stringify(card.labels || [])) return;
      card.labels = labels;
      activeCard = card;
      await save();
      render();
      mountKanbanSnapshot();
    } catch {} finally {
      nativeLabelsRefreshing = false;
    }
  }

  async function chooseAndSendNativeFiles() {
    if (!activeCard?.chatId) return alert("Não foi possível identificar a conversa ativa.");
    const chatId = activeCard.chatId;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      input.remove();
      for (const file of files) {
        try {
          const mimeType = String(file.type || "application/octet-stream");
          const type = mimeType.startsWith("image/") ? "image"
            : mimeType.startsWith("video/") ? "video"
            : mimeType.startsWith("audio/") ? "audio"
            : "document";
          const dataUrl = await fileToDataUrl(file);
          await window.WFBridge.command("SEND_FILE", {
            chatId,
            block: { type, dataUrl, mimeType, fileName: file.name, isPtt: false }
          }, 60000);
        } catch (error) {
          alert(error?.message || `Não foi possível enviar ${file.name}.`);
          break;
        }
      }
    };
    input.click();
    setTimeout(() => { if (input.isConnected && !input.files?.length) input.remove(); }, 120000);
  }

  function positionActions(menu, trigger, width = 280) {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    let left = rect.right + margin;
    if (left + width > window.innerWidth - margin) left = rect.left - width - margin;
    left = Math.max(margin, left);
    let top = rect.top;
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.min(top, window.innerHeight - 260)}px`;
  }

  function showCardActions(column, card, trigger) {
    if (!column || !card) return;
    actionColumn = column;
    actionCard = card;
    actionLabel = null;
    document.querySelector("#wf-kb-action-name").textContent = card.name || "Contato";
    document.querySelector("#wf-kb-action-edit").hidden = false;
    document.querySelector("#wf-kb-action-delete").hidden = false;
    document.querySelector("#wf-kb-action-remove-label").hidden = true;
    const menu = document.querySelector("#wf-kb-card-actions");
    document.querySelector("#wf-kb-column-actions").hidden = true;
    menu.hidden = false;
    positionActions(menu, trigger, 280);
  }

  function showLabelCardActions(card, label, trigger) {
    if (!card || !label) return;
    actionColumn = null;
    actionCard = card;
    actionLabel = { ...label };
    document.querySelector("#wf-kb-action-name").textContent = card.name || "Contato";
    document.querySelector("#wf-kb-action-edit").hidden = true;
    document.querySelector("#wf-kb-action-delete").hidden = true;
    document.querySelector("#wf-kb-action-remove-label").hidden = false;
    const menu = document.querySelector("#wf-kb-card-actions");
    document.querySelector("#wf-kb-column-actions").hidden = true;
    menu.hidden = false;
    positionActions(menu, trigger, 280);
  }

  function showColumnActions(column, trigger) {
    if (!column) return;
    columnActionTarget = column;
    const triggerRect = trigger?.getBoundingClientRect();
    columnActionAnchorRect = triggerRect ? {
      left: triggerRect.left,
      right: triggerRect.right,
      top: triggerRect.top,
      bottom: triggerRect.bottom,
      width: triggerRect.width,
      height: triggerRect.height
    } : null;
    document.querySelector("#wf-kb-card-actions").hidden = true;
    document.querySelector("#wf-kb-column-action-name").textContent = column.name;
    const isLabel = column.kind === "label";
    document.querySelector("#wf-kb-column-action-edit span").textContent = isLabel ? "Editar etiqueta" : "Editar etapa";
    document.querySelector("#wf-kb-column-action-clear span").textContent = isLabel ? "Limpar etiqueta" : "Limpar etapa";
    document.querySelector("#wf-kb-column-action-delete span").textContent = isLabel ? "Excluir etiqueta" : "Excluir etapa";
    const menu = document.querySelector("#wf-kb-column-actions");
    menu.hidden = false;
    positionActions(menu, trigger, 210);
  }

  async function showBulkModal(column) {
    if (!column) return;
    bulkColumnTarget = column;
    closeColumnActions();
    const modal = document.querySelector("#wf-kb-bulk-modal");
    const stored = await chrome.storage.local.get("wfFlows");
    const flows = Array.isArray(stored.wfFlows) ? stored.wfFlows : [];
    document.querySelector("#wf-kb-bulk-column-name").textContent = `${column.name} · ${column.cards.length} contato${column.cards.length === 1 ? "" : "s"}`;
    document.querySelector("#wf-kb-bulk-flow").innerHTML = `<option value="">Selecione um fluxo</option>${flows.map(flow => `<option value="${escapeHtml(flow.id)}">${escapeHtml(flow.name || "Fluxo")}</option>`).join("")}`;
    document.querySelector("#wf-kb-bulk-message").value = "";
    document.querySelector("#wf-kb-bulk-when").value = "now";
    document.querySelector("#wf-kb-bulk-schedule").hidden = true;
    document.querySelector("#wf-kb-bulk-repeat").value = "none";
    document.querySelector("#wf-kb-bulk-custom").hidden = true;
    document.querySelector("#wf-kb-bulk-feedback").textContent = "";
    const date = new Date(Date.now() + 5 * 60000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
    document.querySelector("#wf-kb-bulk-date").value = local.slice(0, 10);
    document.querySelector("#wf-kb-bulk-time").value = local.slice(11, 16);
    setBulkKind("message");
    modal.hidden = false;
  }

  function openBulkSchedule(column) {
    if (!column) return;
    const targets = column.cards.filter(card => card.chatId).map(card => ({ chatId: card.chatId, chatName: card.name || card.phone || "Contato" }));
    const anchorRect = columnActionAnchorRect;
    closeColumnActions();
    if (!targets.length) return alert(`${column.kind === "label" ? "Esta etiqueta" : "Esta etapa"} não possui contatos disponíveis para o disparo.`);
    window.dispatchEvent(new CustomEvent("WF_OPEN_BULK_SCHEDULE", { detail: { columnId: column.id, columnName: column.name, targets, anchorRect } }));
  }

  function setBulkKind(kind) {
    document.querySelectorAll("[data-bulk-kind]").forEach(button => button.classList.toggle("active", button.dataset.bulkKind === kind));
    document.querySelector("#wf-kb-bulk-message-wrap").hidden = kind !== "message";
    document.querySelector("#wf-kb-bulk-flow-wrap").hidden = kind !== "flow";
    document.querySelector("#wf-kb-bulk-form").dataset.kind = kind;
  }

  function closeBulkModal() {
    document.querySelector("#wf-kb-bulk-modal").hidden = true;
    bulkColumnTarget = null;
  }

  function closeColumnActions() {
    document.querySelector("#wf-kb-column-actions").hidden = true;
    columnActionTarget = null;
    columnActionAnchorRect = null;
  }

  function updateColumnSearchStatus() {
    const status = document.querySelector("#wf-kb-column-search-status");
    if (!status || !columnSearch) return;
    if (!columnSearch.query.trim()) {
      status.textContent = "Digite um nome ou número";
      return;
    }
    const list = [...document.querySelectorAll("#wf-kb-board .wf-kb-card-list")].find(node =>
      (columnSearch.kind === "label" ? node.dataset.labelList : node.dataset.drop) === columnSearch.key
    );
    const count = list?.querySelectorAll(".wf-kb-search-match").length || 0;
    status.textContent = count ? `${count} contato${count === 1 ? "" : "s"} encontrado${count === 1 ? "" : "s"} no topo` : "Nenhum contato encontrado";
  }

  function closeColumnSearch(rerender = true) {
    const hadQuery = Boolean(columnSearch?.query);
    columnSearch = null;
    const popover = document.querySelector("#wf-kb-column-search-popover");
    if (popover) popover.hidden = true;
    if (rerender && hadQuery && !document.querySelector("#wf-kanban-panel")?.hidden) render();
  }

  function showColumnSearch(column, anchorRect) {
    const current = board();
    if (!column || !current) return;
    const kind = column.kind === "label" ? "label" : "board";
    const key = String(kind === "label" ? column.labelKey : column.id);
    const previousQuery = columnSearch?.kind === kind && columnSearch.key === key && columnSearch.boardId === current.id
      ? columnSearch.query : "";
    columnSearch = { kind, key, boardId: current.id, query: previousQuery };
    const popover = document.querySelector("#wf-kb-column-search-popover");
    const input = document.querySelector("#wf-kb-column-search-input");
    popover.hidden = false;
    const width = popover.offsetWidth || 245;
    const height = popover.offsetHeight || 105;
    const left = Math.max(8, Math.min((anchorRect?.right || window.innerWidth / 2) - width, window.innerWidth - width - 8));
    const below = (anchorRect?.bottom || 80) + 6;
    const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, (anchorRect?.top || 80) - height - 6);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    input.value = previousQuery;
    render();
    input.focus();
    input.select();
  }

  function closeCardActions() {
    document.querySelector("#wf-kb-card-actions").hidden = true;
    actionColumn = null;
    actionCard = null;
    actionLabel = null;
  }

  async function sendPopupMessage() {
    const input = document.querySelector("#wf-kb-chat-input");
    const button = document.querySelector("#wf-kb-chat-send");
    const text = input.value.trim();
    if (!text || !activeCard?.chatId || button.disabled) return;
    button.disabled = true;
    try {
      await window.WFBridge.command("SEND_TEXT", { chatId: activeCard.chatId, text, linkPreview: true }, 60000);
      const message = { id: uid(), body: text, fromMe: true, timestamp: Date.now(), type: "chat" };
      activeCard.messages = [...(activeCard.messages || []), message].slice(-50);
      activeCard.lastMessage = text;
      activeCard.updatedAt = message.timestamp;
      activeCard.unreadCount = 0;
      input.value = "";
      await save();
      showChat(activeCard);
      render();
    } catch (error) {
      alert(error?.message || "Não foi possível enviar a mensagem.");
    } finally {
      button.disabled = false;
      input.focus();
    }
  }

  async function removeActionCardLabel() {
    const card = actionCard;
    const label = actionLabel;
    if (!card || !label) return;
    const chatId = String(card.chatId || "");
    const cardKey = cardIdentity(card);
    if (!String(label.id || "").trim() || !chatId.includes("@")) {
      closeCardActions();
      alert("Não foi possível identificar a etiqueta ou o contato no WhatsApp. Clique em Sincronizar e tente novamente.");
      return;
    }
    if (!cardHasRemovableLabel(card, label)) {
      closeCardActions();
      alert("A etiqueta deste contato está desatualizada ou ambígua. Clique em Sincronizar antes de remover.");
      return;
    }
    const chatIds = [...new Set(boards.flatMap(item => (item.columns || []).flatMap(column =>
      (column.cards || []).filter(candidate =>
        cardIdentity(candidate) === cardKey && cardHasRemovableLabel(candidate, label)
      ).map(candidate => String(candidate.chatId || ""))
    )).filter(candidateChatId => candidateChatId.includes("@")))];
    if (!beginLabelMutation()) return alert("Aguarde a alteração atual da etiqueta terminar.");
    try {
      pendingLabelCardRemoval = { cardKey, label };
      closeCardActions();
      render();
      const response = await window.WFBridge.command("REMOVE_KANBAN_LABEL_FROM_CHATS", {
        chatIds,
        labelId: label.id
      }, 120000);
      const removedChatIds = Array.isArray(response.result?.removedChatIds)
        ? response.result.removedChatIds.map(String)
        : [];
      const confirmedChatIds = chatIds.filter(candidateChatId => removedChatIds.includes(candidateChatId));
      if (!confirmedChatIds.length) {
        throw new Error("O WhatsApp não confirmou a remoção da etiqueta deste contato. Sincronize e tente novamente.");
      }
      removeConfirmedCardLabelReferences(label, confirmedChatIds);
      pendingLabelCardRemoval = null;
      render();
      try {
        await save();
      } catch (error) {
        console.error("[WA Flow] A etiqueta foi removida, mas o Kanban não salvou o novo estado.", error);
        alert("A etiqueta foi removida no WhatsApp, mas não foi possível salvar o Kanban. Clique em Sincronizar.");
      }
      if (confirmedChatIds.length < chatIds.length) {
        alert("O WhatsApp removeu a etiqueta apenas de parte das conversas deste contato. Sincronize e tente novamente nas que permaneceram.");
      }
    } catch (error) {
      pendingLabelCardRemoval = null;
      try { render(); } catch (renderError) {
        console.error("[WA Flow] Não foi possível restaurar o card no Kanban.", renderError);
      }
      alert(error?.message || "Não foi possível remover a etiqueta deste contato no WhatsApp.");
    } finally {
      finishLabelMutation();
    }
  }

  function bind() {
    const panel = document.querySelector("#wf-kanban-panel");
    document.querySelector("#wf-kanban-button").onclick = () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      document.querySelector("#wf-kanban-button").classList.toggle("active", willOpen);
      if (!willOpen) {
        closeColumnSearch(false);
        closeRealWhatsappChat();
        document.querySelector("#wf-kb-chat-modal").hidden = true;
        document.querySelector("#wf-kb-card-actions").hidden = true;
        document.querySelector("#wf-kb-column-actions").hidden = true;
        return;
      }
      render();
      refreshWhatsappLabelCatalog();
      sync({ silent: true });
    };
    document.querySelector("#wf-kb-native-close").onclick = closeRealWhatsappChat;
    document.querySelector("#wf-kb-native-backdrop").onclick = event => { if (event.target.id === "wf-kb-native-backdrop") closeRealWhatsappChat(); };
    document.querySelector("#wf-kb-search").oninput = event => { search = event.target.value.trim().toLocaleLowerCase("pt-BR"); render(); };
    document.querySelector("#wf-kb-board-select").onchange = event => {
      const boardNode = document.querySelector("#wf-kb-board");
      closeCardActions();
      closeColumnActions();
      closeColumnSearch(false);
      dragging = null;
      draggingColumnId = "";
      draggingLabelColumnKey = "";
      draggingLabelCard = null;
      if (boardNode) {
        boardNode.scrollLeft = 0;
        boardNode.scrollTop = 0;
      }
      if (event.target.value === LABELS_VIEW_ID) {
        viewMode = "labels";
        render();
        refreshWhatsappLabelCatalog();
        sync({ silent: true });
        return;
      }
      viewMode = "board";
      selectedBoardId = event.target.value;
      save();
      render();
    };
    document.querySelector("#wf-kb-sync").onclick = () => sync();
    document.querySelector("#wf-kb-new-board").onclick = async () => { const name = prompt("Nome do novo quadro", "Novo funil"); if (!name?.trim()) return; const item = starterBoard(); item.name = name.trim(); boards.push(item); selectedBoardId = item.id; viewMode = "board"; await save(); render(); };
    document.querySelector("#wf-kb-rename").onclick = async () => { const current = board(); const name = prompt("Nome do quadro", current.name); if (!name?.trim()) return; current.name = name.trim(); await save(); render(); };
    document.querySelector("#wf-kb-delete").onclick = async () => { const current = board(); if (boards.length === 1) return alert("O Kanban precisa ter ao menos um quadro."); if (!confirm(`Excluir o quadro ${current.name}?`)) return; boards = boards.filter(item => item.id !== current.id); selectedBoardId = boards[0].id; await save(); render(); };
    const addColumn = async () => { const name = prompt("Nome da nova etapa", "Nova etapa"); if (!name?.trim()) return; const current = board(); current.columns.push({ id: uid(), name: name.trim(), color: colors[current.columns.length % colors.length], cards: [] }); await save(); render(); };
    document.querySelector("#wf-kb-add-column").onclick = addColumn;
    document.querySelector("#wf-kb-board").onclick = async event => {
      const filterMore = event.target.closest("[data-toggle-inbox-labels]");
      if (filterMore) { inboxFiltersExpanded = !inboxFiltersExpanded; render(); return; }
      const inboxFilterButton = event.target.closest("[data-inbox-filter]");
      if (inboxFilterButton) { inboxFilter = inboxFilterButton.dataset.inboxFilter; inboxFiltersExpanded = false; render(); return; }
      const add = event.target.closest("[data-add-card]"); if (add) return addCard(add.dataset.addCard);
      if (event.target.closest("#wf-kb-inline-column")) return addColumn();
      const open = event.target.closest("[data-open-card]"); if (open) return openRealWhatsappChat(locateCard(open.dataset.openColumn, open.dataset.openCard));
      const edit = event.target.closest("[data-edit-card]"); if (edit) { const column = board().columns.find(item => item.id === edit.dataset.cardColumn); const card = column?.cards.find(item => item.id === edit.dataset.editCard); showCardActions(column, card, edit); return; }
      const editLabelCard = event.target.closest("[data-edit-label-card]");
      if (editLabelCard && viewMode === "labels") {
        const current = board();
        const column = current?.columns.find(item => item.id === editLabelCard.dataset.cardColumn);
        const card = column?.cards.find(item => item.id === editLabelCard.dataset.editLabelCard);
        const labelKey = editLabelCard.dataset.cardLabel;
        const label = labelsForBoard(current).find(item =>
          [labelViewLabelKey(item), ...labelViewLabelAliases(item)].includes(labelKey)
        );
        if (card && label && cardHasLabel(card, label)) showLabelCardActions(card, label, editLabelCard);
        return;
      }
      const editLabelColumn = event.target.closest("[data-edit-label-column]");
      if (editLabelColumn) {
        const current = board();
        const labelKey = editLabelColumn.dataset.editLabelColumn;
        const label = labelsForBoard(current).find(item =>
          [labelViewLabelKey(item), ...labelViewLabelAliases(item)].includes(labelKey)
        );
        if (label) showColumnActions(labelActionTargetForBoard(current, label), editLabelColumn);
        return;
      }
      const editColumn = event.target.closest("[data-edit-column]"); if (editColumn) { const column = board().columns.find(item => item.id === editColumn.dataset.editColumn); showColumnActions(column, editColumn); return; }
    };
    document.querySelector("#wf-kb-board").oninput = event => {
      if (event.target.id !== "wf-kb-inbox-search") return;
      const position = event.target.selectionStart;
      inboxSearch = event.target.value.trimStart().toLocaleLowerCase("pt-BR");
      render();
      const next = document.querySelector("#wf-kb-inbox-search");
      next?.focus();
      next?.setSelectionRange(position, position);
    };
    const boardNode = document.querySelector("#wf-kb-board");
    const clearCardDropIndicators = () => {
      document.querySelectorAll(".wf-kb-card.drop-before,.wf-kb-card.drop-after").forEach(card => card.classList.remove("drop-before", "drop-after"));
      document.querySelectorAll(".wf-kb-card-list.drop-at-end").forEach(list => list.classList.remove("drop-at-end"));
    };
    boardNode.ondragstart = event => {
      if (viewMode === "labels") {
        const card = event.target.closest("[data-label-card]");
        if (card) {
          if (columnSearchQuery("label", card.dataset.labelSource, board())) { event.preventDefault(); return; }
          draggingLabelCard = { cardKey: card.dataset.labelCard, labelKey: card.dataset.labelSource };
          card.classList.add("dragging");
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", draggingLabelCard.cardKey);
          }
          return;
        }
        const header = event.target.closest("[data-label-column-drag]");
        if (!header || event.target.closest("button")) { event.preventDefault(); return; }
        draggingLabelColumnKey = header.dataset.labelColumnDrag;
        header.closest(".wf-kb-column")?.classList.add("column-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", draggingLabelColumnKey);
        }
        return;
      }
      const card = event.target.closest("[data-card]");
      if (card) {
        if (columnSearchQuery("board", card.closest("[data-drop]")?.dataset.drop, board())) { event.preventDefault(); return; }
        dragging = { cardId: card.dataset.card, from: card.dataset.from }; card.classList.add("dragging"); return;
      }
      const header = event.target.closest("[data-column-drag]");
      if (!header || event.target.closest("button")) { event.preventDefault(); return; }
      draggingColumnId = header.dataset.columnDrag;
      header.closest(".wf-kb-column")?.classList.add("column-dragging");
      event.dataTransfer.effectAllowed = "move";
    };
    boardNode.ondragover = event => {
      if (viewMode === "labels") {
        if (draggingLabelColumnKey) {
          const target = event.target.closest(".wf-kb-label-column");
          if (!target || target.dataset.labelColumn === draggingLabelColumnKey) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          document.querySelectorAll(".wf-kb-column.column-over").forEach(item => item.classList.remove("column-over"));
          target.classList.add("column-over");
          return;
        }
        if (!draggingLabelCard) return;
        const list = event.target.closest("[data-label-list]");
        if (!list) {
          if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
          document.querySelectorAll(".wf-kb-card-list.over").forEach(item => item.classList.remove("over"));
          clearCardDropIndicators();
          return;
        }
        if (columnSearchQuery("label", list.dataset.labelList, board())) {
          if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        list.classList.add("over");
        clearCardDropIndicators();
        const targetCard = event.target.closest("[data-label-card]");
        if (targetCard && targetCard.dataset.labelCard !== draggingLabelCard.cardKey) {
          const rect = targetCard.getBoundingClientRect();
          targetCard.classList.add(event.clientY < rect.top + rect.height / 2 ? "drop-before" : "drop-after");
        } else if (!targetCard) {
          list.classList.add("drop-at-end");
        }
        return;
      }
      if (draggingColumnId) { const target = event.target.closest(".wf-kb-column"); if (!target || target.dataset.column === draggingColumnId) return; event.preventDefault(); document.querySelectorAll(".wf-kb-column.column-over").forEach(item => item.classList.remove("column-over")); target.classList.add("column-over"); return; }
      const list = event.target.closest("[data-drop]");
      if (!list || !dragging) return;
      if (columnSearchQuery("board", list.dataset.drop, board())) {
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
        return;
      }
      event.preventDefault();
      list.classList.add("over");
      clearCardDropIndicators();
      const targetCard = event.target.closest("[data-card]");
      if (targetCard && targetCard.dataset.card !== dragging.cardId) {
        const rect = targetCard.getBoundingClientRect();
        targetCard.classList.add(event.clientY < rect.top + rect.height / 2 ? "drop-before" : "drop-after");
      } else if (!targetCard) {
        list.classList.add("drop-at-end");
      }
    };
    boardNode.ondragleave = event => { const list = event.target.closest("[data-drop],[data-label-list]"); if (list && !list.contains(event.relatedTarget)) { list.classList.remove("over"); clearCardDropIndicators(); } };
    boardNode.ondrop = async event => {
      if (viewMode === "labels") {
        if (draggingLabelColumnKey) {
          const target = event.target.closest(".wf-kb-label-column");
          if (!target || target.dataset.labelColumn === draggingLabelColumnKey) return;
          event.preventDefault();
          const current = board();
          const layout = ensureLabelLayout(current);
          const orderedLabels = orderItemsBySavedKeys(labelsForBoard(current), layout.columnOrder, labelViewLabelKey, labelViewLabelAliases);
          const order = orderedLabels.map(labelViewLabelKey);
          const sourceIndex = order.indexOf(draggingLabelColumnKey);
          const targetKey = target.dataset.labelColumn;
          if (sourceIndex >= 0 && order.includes(targetKey)) {
            const rect = target.getBoundingClientRect();
            const placeAfter = event.clientX > rect.left + rect.width / 2;
            const [movedKey] = order.splice(sourceIndex, 1);
            let insertIndex = order.indexOf(targetKey);
            if (placeAfter) insertIndex++;
            order.splice(insertIndex, 0, movedKey);
            const canonicalLabels = new Map();
            orderedLabels.forEach(label => {
              const primary = labelViewLabelKey(label);
              [primary, ...labelViewLabelAliases(label)].forEach(key => canonicalLabels.set(key, primary));
            });
            layout.columnOrder = mergeReorderedActiveKeys(
              layout.columnOrder,
              order,
              key => canonicalLabels.get(String(key)) || ""
            );
          }
          draggingLabelColumnKey = "";
          await save();
          render();
          return;
        }
        if (!draggingLabelCard) return;
        const list = event.target.closest("[data-label-list]");
        if (!list) return;
        if (columnSearchQuery("label", list.dataset.labelList, board())) { draggingLabelCard = null; clearCardDropIndicators(); return; }
        event.preventDefault();
        if (list.dataset.labelList !== draggingLabelCard.labelKey) {
          const moving = draggingLabelCard;
          const targetCardNode = event.target.closest("[data-label-card]");
          const placeAfter = targetCardNode
            ? event.clientY > targetCardNode.getBoundingClientRect().top + targetCardNode.getBoundingClientRect().height / 2
            : true;
          draggingLabelCard = null;
          clearCardDropIndicators();
          await moveLabelCardBetweenColumns(board(), {
            cardKey: moving.cardKey,
            sourceKey: moving.labelKey,
            targetKey: list.dataset.labelList,
            targetCardKey: targetCardNode?.dataset.labelCard || "",
            placeAfter
          });
          return;
        }
        const current = board();
        const layout = ensureLabelLayout(current);
        const label = labelsForBoard(current).find(item =>
          [labelViewLabelKey(item), ...labelViewLabelAliases(item)].includes(draggingLabelCard.labelKey)
        );
        if (!label) { draggingLabelCard = null; render(); return; }
        const order = orderItemsBySavedKeys(
          labelEntriesForBoard(current, label),
          savedCardOrderForLabel(layout, label),
          entry => labelViewCardKey(entry.card)
        ).map(entry => labelViewCardKey(entry.card));
        const sourceIndex = order.indexOf(draggingLabelCard.cardKey);
        const directTargetCardNode = event.target.closest("[data-label-card]");
        const targetCardNode = directTargetCardNode || (search
          ? [...list.querySelectorAll("[data-label-card]")].filter(node => node.dataset.labelCard !== draggingLabelCard.cardKey).at(-1)
          : null);
        const targetCardKey = targetCardNode?.dataset.labelCard;
        if (targetCardKey === draggingLabelCard.cardKey) {
          draggingLabelCard = null;
          render();
          return;
        }
        if (sourceIndex >= 0) {
          const placeAfter = targetCardNode
            ? event.clientY > targetCardNode.getBoundingClientRect().top + targetCardNode.getBoundingClientRect().height / 2
            : true;
          const shouldPlaceAfter = !directTargetCardNode && targetCardNode ? true : placeAfter;
          const [movedKey] = order.splice(sourceIndex, 1);
          let insertIndex = targetCardKey ? order.indexOf(targetCardKey) : order.length;
          if (insertIndex < 0) insertIndex = order.length;
          if (targetCardKey && shouldPlaceAfter) insertIndex++;
          order.splice(insertIndex, 0, movedKey);
          const activeCardKeys = new Set(order);
          layout.cardOrderByLabel[draggingLabelCard.labelKey] = mergeReorderedActiveKeys(
            savedCardOrderForLabel(layout, label),
            order,
            key => activeCardKeys.has(String(key)) ? String(key) : ""
          );
          labelViewLabelAliases(label).forEach(alias => {
            if (alias !== draggingLabelCard.labelKey) delete layout.cardOrderByLabel[alias];
          });
        }
        draggingLabelCard = null;
        await save();
        render();
        return;
      }
      if (draggingColumnId) {
        const target = event.target.closest(".wf-kb-column");
        if (!target || target.dataset.column === draggingColumnId) return;
        event.preventDefault();
        const current = board();
        const fromIndex = current.columns.findIndex(item => item.id === draggingColumnId);
        const targetIndex = current.columns.findIndex(item => item.id === target.dataset.column);
        if (fromIndex >= 0 && targetIndex >= 0) {
          const rect = target.getBoundingClientRect();
          const placeAfter = event.clientX > rect.left + rect.width / 2;
          let insertIndex = targetIndex + (placeAfter ? 1 : 0);
          const [moved] = current.columns.splice(fromIndex, 1);
          if (fromIndex < insertIndex) insertIndex--;
          current.columns.splice(insertIndex, 0, moved);
        }
        draggingColumnId = "";
        await save(); render(); return;
      }
      const list = event.target.closest("[data-drop]");
      if (!list || !dragging) return;
      if (columnSearchQuery("board", list.dataset.drop, board())) { dragging = null; clearCardDropIndicators(); return; }
      event.preventDefault();
      const current = board();
      const from = current.columns.find(item => item.id === dragging.from);
      const to = current.columns.find(item => item.id === list.dataset.drop);
      const sourceIndex = from?.cards.findIndex(card => card.id === dragging.cardId) ?? -1;
      if (sourceIndex >= 0 && to) {
        const targetCardNode = event.target.closest("[data-card]");
        const targetCardId = targetCardNode?.dataset.card;
        if (targetCardId === dragging.cardId) {
          dragging = null;
          render();
          return;
        }
        const placeAfter = targetCardNode
          ? event.clientY > targetCardNode.getBoundingClientRect().top + targetCardNode.getBoundingClientRect().height / 2
          : true;
        const [moved] = from.cards.splice(sourceIndex, 1);
        let insertIndex = targetCardId ? to.cards.findIndex(card => card.id === targetCardId) : to.cards.length;
        if (insertIndex < 0) insertIndex = to.cards.length;
        if (targetCardId && placeAfter) insertIndex++;
        to.cards.splice(insertIndex, 0, moved);
      }
      dragging = null;
      await save(); render();
    };
    boardNode.ondragend = () => { dragging = null; draggingColumnId = ""; draggingLabelColumnKey = ""; draggingLabelCard = null; clearCardDropIndicators(); document.querySelectorAll(".wf-kb-card.dragging,.wf-kb-card-list.over,.wf-kb-column.column-dragging,.wf-kb-column.column-over").forEach(item => item.classList.remove("dragging", "over", "column-dragging", "column-over")); };
    document.querySelector("#wf-kb-chat-close").onclick = () => document.querySelector("#wf-kb-chat-modal").hidden = true;
    document.querySelector("#wf-kb-chat-modal").onclick = event => { if (event.target.id === "wf-kb-chat-modal") event.currentTarget.hidden = true; };
    document.querySelector("#wf-kb-chat-send").onclick = sendPopupMessage;
    document.querySelector("#wf-kb-chat-input").onkeydown = event => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendPopupMessage(); }
    };
    document.querySelector("#wf-kb-card-actions").onclick = event => { if (event.target.id === "wf-kb-card-actions") closeCardActions(); };
    document.querySelector("#wf-kb-action-edit").onclick = async () => {
      if (!actionCard || !actionColumn || actionLabel) return;
      const column = actionColumn;
      const card = actionCard;
      closeCardActions();
      const updated = askCard(card);
      if (!updated) return;
      const index = column.cards.findIndex(item => item.id === card.id);
      if (index >= 0) column.cards[index] = updated;
      await save(); render();
    };
    document.querySelector("#wf-kb-action-delete").onclick = async () => {
      if (!actionCard || !actionColumn || actionLabel) return;
      const current = board();
      const column = actionColumn;
      const card = actionCard;
      if (!confirm(`Excluir ${card.name || "este contato"} do Kanban?`)) return;
      current.hiddenContacts = Array.isArray(current.hiddenContacts) ? current.hiddenContacts : [];
      const key = card.chatId || (card.phone ? `p:${String(card.phone).replace(/\D/g, "")}` : "");
      if (key && !current.hiddenContacts.includes(key)) current.hiddenContacts.push(key);
      column.cards = column.cards.filter(item => item.id !== card.id);
      closeCardActions();
      await save(); render();
    };
    document.querySelector("#wf-kb-action-remove-label").onclick = removeActionCardLabel;
    document.querySelector("#wf-kb-column-action-search").onclick = () => {
      const column = columnActionTarget;
      const anchorRect = columnActionAnchorRect;
      closeColumnActions();
      showColumnSearch(column, anchorRect);
    };
    document.querySelector("#wf-kb-column-search-input").oninput = event => {
      if (!columnSearch) return;
      columnSearch.query = event.target.value;
      render();
    };
    document.querySelector("#wf-kb-column-search-input").onkeydown = event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeColumnSearch();
    };
    document.querySelector("#wf-kb-column-search-close").onclick = () => closeColumnSearch();
    document.querySelector("#wf-kb-column-action-bulk").onclick = () => openBulkSchedule(columnActionTarget);
    document.querySelectorAll("[data-bulk-kind]").forEach(button => { button.onclick = () => setBulkKind(button.dataset.bulkKind); });
    document.querySelector("#wf-kb-bulk-close").onclick = closeBulkModal;
    document.querySelector("#wf-kb-bulk-cancel-button").onclick = closeBulkModal;
    document.querySelector("#wf-kb-bulk-modal").onclick = event => { if (event.target.id === "wf-kb-bulk-modal") closeBulkModal(); };
    document.querySelector("#wf-kb-bulk-when").onchange = event => {
      document.querySelector("#wf-kb-bulk-schedule").hidden = event.target.value !== "schedule";
    };
    document.querySelector("#wf-kb-bulk-repeat").onchange = event => {
      document.querySelector("#wf-kb-bulk-custom").hidden = event.target.value !== "custom";
    };
    document.querySelector("#wf-kb-bulk-form").onsubmit = async event => {
      event.preventDefault();
      const column = bulkColumnTarget;
      if (!column) return;
      const form = event.currentTarget;
      const submit = form.querySelector('button[type="submit"]');
      const feedback = document.querySelector("#wf-kb-bulk-feedback");
      const cards = column.cards.filter(card => card.chatId);
      const kind = form.dataset.kind || "message";
      const text = document.querySelector("#wf-kb-bulk-message").value.trim();
      const flowSelect = document.querySelector("#wf-kb-bulk-flow");
      const flowId = flowSelect.value;
      const flowName = flowSelect.selectedOptions[0]?.textContent || "Fluxo";
      const scheduled = document.querySelector("#wf-kb-bulk-when").value === "schedule";
      if (!cards.length) return void (feedback.textContent = "Esta etapa não possui contatos disponíveis para o disparo.");
      if (kind === "message" && !text) return void (feedback.textContent = "Digite a mensagem que será enviada.");
      if (kind === "flow" && !flowId) return void (feedback.textContent = "Selecione um fluxo.");
      let scheduledAt = Date.now();
      if (scheduled) {
        scheduledAt = new Date(`${document.querySelector("#wf-kb-bulk-date").value}T${document.querySelector("#wf-kb-bulk-time").value}:00`).getTime();
        if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) return void (feedback.textContent = "Selecione uma data e hora futuras.");
      }
      if (!confirm(`${scheduled ? "Programar" : "Executar"} este disparo para ${cards.length} contato${cards.length === 1 ? "" : "s"}?`)) return;
      submit.disabled = true;
      feedback.textContent = scheduled ? "Criando agendamentos..." : "Executando disparo...";
      try {
        if (scheduled) {
          const stored = await chrome.storage.local.get("wfScheduledMessages");
          const messages = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];
          const repeat = document.querySelector("#wf-kb-bulk-repeat").value;
          const repeatEvery = repeat === "custom" ? Math.max(1, Math.floor(Number(document.querySelector("#wf-kb-bulk-every").value) || 1)) : 1;
          const repeatUnit = repeat === "custom" ? document.querySelector("#wf-kb-bulk-unit").value : "";
          const cancelIfReply = document.querySelector("#wf-kb-bulk-cancel").checked;
          cards.forEach(card => messages.push({ id: uid(), chatId: card.chatId, chatName: card.name || card.phone || "Contato", type: kind, flowId: kind === "flow" ? flowId : "", flowName: kind === "flow" ? flowName : "", text: kind === "message" ? text : "", texts: kind === "message" ? [text] : [], media: null, scheduledAt, repeat, repeatEvery, repeatUnit, endAfter: 0, endUnit: "", endsAt: 0, cancelIfReply, status: "pending", createdAt: Date.now(), updatedAt: Date.now() }));
          await chrome.storage.local.set({ wfScheduledMessages: messages });
        } else if (kind === "message") {
          for (let index = 0; index < cards.length; index++) {
            feedback.textContent = `Enviando ${index + 1} de ${cards.length}...`;
            await window.WFBridge.command("SEND_TEXT", { chatId: cards[index].chatId, text, linkPreview: true }, 60000);
          }
        } else {
          cards.forEach(card => window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", { detail: { action: "start-flow", chatId: card.chatId, flowId } })));
        }
        closeBulkModal();
      } catch (error) {
        feedback.textContent = error?.message || "Não foi possível concluir o disparo.";
      } finally {
        submit.disabled = false;
      }
    };
    document.querySelector("#wf-kb-column-action-edit").onclick = async () => {
      const column = columnActionTarget;
      if (!column) return;
      if (column.kind === "label") {
        const label = column.label || {};
        if (!String(label.id || "").trim()) {
          closeColumnActions();
          return alert("Essa etiqueta ainda não foi identificada no WhatsApp. Clique em Sincronizar e tente novamente.");
        }
        const name = prompt("Nome da etiqueta", column.name);
        if (!name?.trim()) return;
        const nextName = name.trim();
        if (nextName === String(column.name || "").trim()) {
          closeColumnActions();
          return;
        }
        const duplicate = whatsappLabelCatalog.some(candidate =>
          !labelsRepresentSame(candidate, label) && normalizeLabelName(candidate.name) === normalizeLabelName(nextName)
        );
        if (duplicate) return alert("Já existe uma etiqueta com esse nome no WhatsApp.");
        if (!beginLabelMutation()) return alert("Aguarde a alteração atual da etiqueta terminar.");
        try {
          const response = await window.WFBridge.command("EDIT_KANBAN_LABEL", {
            labelId: label.id,
            newName: nextName
          }, 60000);
          const updatedLabel = {
            ...label,
            id: String(response.result?.labelId || label.id),
            name: String(response.result?.labelName || nextName)
          };
          let catalogUpdated = false;
          whatsappLabelCatalog = whatsappLabelCatalog.map(candidate => {
            if (!labelsRepresentSame(candidate, label)) return candidate;
            catalogUpdated = true;
            return { ...candidate, ...updatedLabel };
          });
          if (!catalogUpdated) whatsappLabelCatalog.push(updatedLabel);
          boards.forEach(item => (item.columns || []).forEach(itemColumn => (itemColumn.cards || []).forEach(card => {
            card.labels = (Array.isArray(card.labels) ? card.labels : []).map(candidate =>
              labelsRepresentSame(candidate, label) ? { ...candidate, id: updatedLabel.id, name: updatedLabel.name } : candidate
            );
          })));
          migrateLabelLayoutKey(label, updatedLabel);
          closeColumnActions();
          await Promise.all([
            save(),
            chrome.storage.local.set({ wfWhatsappLabels: whatsappLabelCatalog })
          ]);
          render();
          setTimeout(refreshWhatsappLabelCatalog, 500);
        } catch (error) {
          alert(error?.message || "Não foi possível renomear a etiqueta no WhatsApp.");
        } finally {
          finishLabelMutation();
        }
        return;
      }
      const name = prompt("Nome da etapa", column.name);
      if (!name?.trim()) return;
      column.name = name.trim();
      closeColumnActions(); await save(); render();
    };
    document.querySelector("#wf-kb-column-action-clear").onclick = async () => {
      const current = board();
      const column = columnActionTarget;
      if (!current || !column) return;
      if (column.kind === "label") {
        const label = column.label || {};
        if (!String(label.id || "").trim()) {
          closeColumnActions();
          return alert("Essa etiqueta ainda não foi identificada no WhatsApp. Clique em Sincronizar e tente novamente.");
        }
        const chatIds = [...new Set((column.cards || []).map(card => String(card.chatId || "")).filter(Boolean))];
        const count = chatIds.length;
        if (!count) {
          closeColumnActions();
          return alert(`A etiqueta ${column.name} já está vazia.`);
        }
        if (!confirm(
          `Limpar a etiqueta ${column.name}? Ela será removida dos ${count} contato${count === 1 ? "" : "s"} carregados nesta coluna. Os contatos continuarão no Kanban e nas outras etiquetas.`
        )) return;
        if (!beginLabelMutation()) return alert("Aguarde a alteração atual da etiqueta terminar.");
        try {
          const response = await window.WFBridge.command("REMOVE_KANBAN_LABEL_FROM_CHATS", {
            chatIds,
            labelId: label.id
          }, 120000);
          const removedChatIds = Array.isArray(response.result?.removedChatIds)
            ? response.result.removedChatIds.map(String)
            : chatIds;
          const failedChatIds = Array.isArray(response.result?.failedChatIds)
            ? response.result.failedChatIds.map(String)
            : [];
          removeLabelReferences(label, removedChatIds);
          closeColumnActions();
          await save();
          render();
          setTimeout(refreshWhatsappLabelCatalog, 500);
          if (failedChatIds.length) {
            alert(`A etiqueta foi removida de ${removedChatIds.length} contato${removedChatIds.length === 1 ? "" : "s"}, mas falhou em ${failedChatIds.length}. Sincronize e tente novamente.`);
          }
        } catch (error) {
          alert(error?.message || "Não foi possível limpar a etiqueta no WhatsApp.");
        } finally {
          finishLabelMutation();
        }
        return;
      }
      const count = column.cards?.length || 0;
      if (!count) {
        closeColumnActions();
        return alert(`A etapa ${column.name} já está vazia.`);
      }
      if (!confirm(
        `Limpar a etapa ${column.name}? ${count} contato${count === 1 ? " será removido" : "s serão removidos"} do Kanban.`
      )) return;

      const hiddenContacts = new Set(
        Array.isArray(current.hiddenContacts) ? current.hiddenContacts : []
      );
      column.cards.forEach(card => {
        const key = card.chatId || (
          card.phone ? `p:${String(card.phone).replace(/\D/g, "")}` : ""
        );
        if (key) hiddenContacts.add(key);
      });
      current.hiddenContacts = [...hiddenContacts];
      column.cards = [];
      closeColumnActions();
      await save();
      render();
    };
    document.querySelector("#wf-kb-column-action-delete").onclick = async () => {
      const current = board();
      const column = columnActionTarget;
      if (!column) return;
      if (column.kind === "label") {
        const label = column.label || {};
        if (!String(label.id || "").trim()) {
          closeColumnActions();
          return alert("Essa etiqueta ainda não foi identificada no WhatsApp. Clique em Sincronizar e tente novamente.");
        }
        const count = column.cards?.length || 0;
        if (!confirm(
          `Excluir a etiqueta ${column.name} do WhatsApp? Ela será removida de todos os contatos que a possuem (${count} carregado${count === 1 ? "" : "s"} nesta coluna). Os contatos não serão apagados, mas esta ação não pode ser desfeita.`
        )) return;
        if (!beginLabelMutation()) return alert("Aguarde a alteração atual da etiqueta terminar.");
        try {
          await window.WFBridge.command("DELETE_KANBAN_LABEL", { labelId: label.id }, 60000);
          removeLabelReferences(label);
          whatsappLabelCatalog = whatsappLabelCatalog.filter(candidate => !labelsRepresentSame(candidate, label));
          removeLabelLayout(label);
          closeColumnActions();
          await Promise.all([
            save(),
            chrome.storage.local.set({ wfWhatsappLabels: whatsappLabelCatalog })
          ]);
          render();
          setTimeout(refreshWhatsappLabelCatalog, 500);
        } catch (error) {
          alert(error?.message || "Não foi possível excluir a etiqueta no WhatsApp.");
        } finally {
          finishLabelMutation();
        }
        return;
      }
      if (current.columns.length === 1) return alert("Mantenha ao menos uma etapa.");
      if (column.cards.length && !confirm("Esta etapa contém contatos. Excluir mesmo assim?")) return;
      if (!column.cards.length && !confirm(`Excluir a etapa ${column.name}?`)) return;
      current.columns = current.columns.filter(item => item.id !== column.id);
      closeColumnActions(); await save(); render();
    };
    document.addEventListener("click", event => {
      if (!document.querySelector("#main.wf-kb-native-chat-popup")) return;
      const trigger = event.target.closest('button,[role="button"]');
      if (!trigger || !trigger.closest("#main")) return;
      const label = `${trigger.getAttribute("aria-label") || ""} ${trigger.getAttribute("title") || ""}`;
      const hasMenuIcon = Boolean(trigger.querySelector('[data-icon="menu"],[data-icon="menu-alt"],[data-icon="vertical-menu"],[data-icon="more-vertical"]'));
      const popupHeader = trigger.closest("header");
      const isPopupHeaderControl = Boolean(popupHeader?.closest("#main.wf-kb-native-chat-popup"));
      if (isPopupHeaderControl && (hasMenuIcon || /mais opç|more options|menu/i.test(label))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setTimeout(() => {
          const target = document.querySelector('#main header span[title],#main header [dir="auto"]');
          const clickable = target?.closest('button,[role="button"]') || target?.parentElement || target;
          clickable?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        }, 40);
        return;
      }
      const hasPlusIcon = Boolean(trigger.querySelector('[data-icon="plus"],[data-icon="plus-rounded"],[data-icon="plus-alt"]'));
      if (!hasPlusIcon && !/anex|attach|adicionar arquivo/i.test(label)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      chooseAndSendNativeFiles();
    }, true);
    document.addEventListener("pointerdown", event => {
      const stageMenu = document.querySelector("#wf-kb-native-stage-menu");
      if (stageMenu && !stageMenu.hidden && !stageMenu.contains(event.target) && !event.target.closest("#wf-kb-native-stage-badge")) stageMenu.hidden = true;
      const cardMenu = document.querySelector("#wf-kb-card-actions");
      const columnMenu = document.querySelector("#wf-kb-column-actions");
      if (!cardMenu.hidden && !cardMenu.contains(event.target) && !event.target.closest("[data-edit-card],[data-edit-label-card]")) closeCardActions();
      if (!columnMenu.hidden && !columnMenu.contains(event.target) && !event.target.closest("[data-edit-column],[data-edit-label-column]")) closeColumnActions();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.wfKanbanBoards && !localSaveInFlight) { boards = changes.wfKanbanBoards.newValue || boards; if (!document.querySelector("#wf-kanban-panel")?.hidden) render(); }
    if (changes.wfScheduledMessages) refreshFailures();
  });

  async function refreshWhatsappLabelCatalog() {
    if (labelCatalogRefreshing || labelMutationsInFlight) return;
    labelCatalogRefreshing = true;
    const startedLabelMutationRevision = labelMutationRevision;
    try {
      const response = await window.WFBridge.command("LIST_KANBAN_LABELS", {}, 5000);
      if (startedLabelMutationRevision !== labelMutationRevision || labelMutationsInFlight) return;
      const labels = Array.isArray(response.result?.labels) ? response.result.labels : [];
      const before = JSON.stringify(whatsappLabelCatalog);
      whatsappLabelCatalog = labels;
      if (JSON.stringify(labels) !== before) {
        await chrome.storage.local.set({ wfWhatsappLabels: labels });
        if (!document.querySelector("#wf-kanban-panel")?.hidden) render();
      }
    } catch {} finally {
      labelCatalogRefreshing = false;
    }
  }
  (async () => {
    const stored = await chrome.storage.local.get(["wfKanbanBoards", "wfKanbanSelectedBoard", "wfWhatsappLabels"]);
    boards = Array.isArray(stored.wfKanbanBoards) && stored.wfKanbanBoards.length ? stored.wfKanbanBoards : [starterBoard()];
    whatsappLabelCatalog = Array.isArray(stored.wfWhatsappLabels) ? stored.wfWhatsappLabels : [];
    boards.forEach(item => (item.columns || []).forEach(column => (column.cards || []).forEach(card => {
      if (Array.isArray(card.messages)) card.messages.forEach(message => {
        message.body = safeMessagePreview(message.body, message.type);
      });
      card.lastMessage = safeMessagePreview(card.lastMessage, card.messages?.[card.messages.length - 1]?.type);
    })));
    selectedBoardId = boards.some(item => item.id === stored.wfKanbanSelectedBoard) ? stored.wfKanbanSelectedBoard : boards[0].id;
    await save();
    if (document.body) mount(); else window.addEventListener("DOMContentLoaded", mount, { once: true });
    new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(syncActiveNativeStageSelector, 1000);
    setInterval(refreshWhatsappLabelCatalog, 5000);
    document.addEventListener("pointerup", () => setTimeout(syncActiveNativeStageSelector, 80), true);
    setTimeout(syncActiveNativeStageSelector, 500);
    setTimeout(refreshWhatsappLabelCatalog, 700);
  })();
})();
