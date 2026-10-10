(() => {
  const $ = selector => document.querySelector(selector);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const colors = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];
  let boards = [];
  let selectedBoardId = "";
  let searchTerm = "";
  let draggedCard = null;
  let activeConversationCard = null;
  let syncingWhatsapp = false;

  const starterBoard = () => ({
    id: uid(),
    name: "Funil de vendas",
    columns: [
      { id: uid(), name: "Novos contatos", color: colors[0], cards: [] },
      { id: uid(), name: "Em atendimento", color: colors[1], cards: [] },
      { id: uid(), name: "Proposta enviada", color: colors[2], cards: [] },
      { id: uid(), name: "Fechado", color: colors[3], cards: [] }
    ]
  });

  function currentBoard() {
    return boards.find(board => board.id === selectedBoardId) || boards[0] || null;
  }

  async function save() {
    await chrome.storage.local.set({ wfKanbanBoards: boards, wfKanbanSelectedBoard: selectedBoardId });
  }

  function allCards(board) {
    return (board?.columns || []).flatMap(column => column.cards || []);
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function formatPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("55")) {
      return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return phone || "Sem telefone";
  }

  function renderBoardSelect() {
    const select = $("#kanbanBoardSelect");
    select.innerHTML = boards.map(board =>
      `<option value="${board.id}" ${board.id === selectedBoardId ? "selected" : ""}>${escapeHtml(board.name)}</option>`
    ).join("");
  }

  function cardMatches(card) {
    if (!searchTerm) return true;
    const haystack = `${card.name || ""} ${card.phone || ""} ${card.notes || ""} ${card.tag || ""}`
      .toLocaleLowerCase("pt-BR");
    return haystack.includes(searchTerm);
  }

  function render() {
    const board = currentBoard();
    renderBoardSelect();
    if (!board) return;
    selectedBoardId = board.id;
    $("#kanbanBoardName").textContent = board.name;
    const total = allCards(board).length;
    $("#kanbanBoardTotal").textContent = `${total} contato${total === 1 ? "" : "s"}`;

    $("#kanbanBoard").innerHTML = board.columns.map((column, columnIndex) => {
      const cards = (column.cards || []).filter(cardMatches);
      return `
        <section class="kanban-column" data-column-id="${column.id}">
          <div class="kanban-column-head" style="--column-color:${column.color || colors[columnIndex % colors.length]}">
            <div class="kanban-column-title">
              <span class="kanban-column-dot"></span>
              <strong>${escapeHtml(column.name)}</strong>
              <b>${cards.length}</b>
            </div>
            <div class="kanban-column-actions">
              <button type="button" data-add-card="${column.id}" title="Adicionar contato">+</button>
              <button type="button" data-column-menu="${column.id}" title="Editar etapa">•••</button>
            </div>
          </div>
          <div class="kanban-card-list" data-drop-column="${column.id}">
            ${cards.map(card => `
              <article class="kanban-card" draggable="true" data-card-id="${card.id}" data-card-column="${column.id}">
                <div class="kanban-card-top">
                  <span class="kanban-avatar">${escapeHtml(initials(card.name))}</span>
                  <button type="button" data-card-menu="${card.id}" data-card-column-menu="${column.id}" title="Editar contato">•••</button>
                </div>
                <strong>${escapeHtml(card.name || "Contato sem nome")}</strong>
                <span class="kanban-phone">${escapeHtml(formatPhone(card.phone))}</span>
                ${card.notes ? `<p>${escapeHtml(card.notes)}</p>` : ""}
                <div class="kanban-card-footer">
                  ${card.tag ? `<span class="kanban-tag">${escapeHtml(card.tag)}</span>` : "<span></span>"}
                  <div><time>${escapeHtml(card.updatedLabel || "Agora")}</time>${card.chatId ? `<button type="button" class="kanban-open-chat" data-open-chat="${card.id}" data-open-chat-column="${column.id}">Abrir</button>` : ""}</div>
                </div>
              </article>
            `).join("")}
            ${cards.length ? "" : `<button class="kanban-empty-column" type="button" data-add-card="${column.id}">+ Adicionar contato</button>`}
          </div>
        </section>`;
    }).join("") + `<button id="kanbanInlineAddColumn" class="kanban-new-column" type="button">+ Adicionar etapa</button>`;
  }

  function askCard(existing = {}) {
    const name = prompt("Nome do contato", existing.name || "");
    if (name === null || !name.trim()) return null;
    const phone = prompt("Telefone", existing.phone || "");
    if (phone === null) return null;
    const notes = prompt("Observação", existing.notes || "");
    if (notes === null) return null;
    const tag = prompt("Etiqueta", existing.tag || "");
    if (tag === null) return null;
    return { ...existing, id: existing.id || uid(), name: name.trim(), phone: phone.trim(), notes: notes.trim(), tag: tag.trim(), updatedLabel: "Agora" };
  }

  async function addCard(columnId) {
    const board = currentBoard();
    const column = board?.columns.find(item => item.id === columnId) || board?.columns[0];
    if (!column) return;
    const card = askCard();
    if (!card) return;
    column.cards.push(card);
    await save();
    render();
  }

  async function editCard(columnId, cardId) {
    const board = currentBoard();
    const column = board?.columns.find(item => item.id === columnId);
    const index = column?.cards.findIndex(card => card.id === cardId) ?? -1;
    if (index < 0) return;
    const action = prompt('Digite "editar" para alterar ou "excluir" para remover este contato.', "editar");
    if (!action) return;
    if (action.toLocaleLowerCase("pt-BR") === "excluir") {
      if (!confirm(`Excluir ${column.cards[index].name} do Kanban?`)) return;
      column.cards.splice(index, 1);
    } else {
      const updated = askCard(column.cards[index]);
      if (!updated) return;
      column.cards[index] = updated;
    }
    await save();
    render();
  }

  async function addColumn() {
    const board = currentBoard();
    if (!board) return;
    const name = prompt("Nome da nova etapa", "Nova etapa");
    if (!name?.trim()) return;
    board.columns.push({ id: uid(), name: name.trim(), color: colors[board.columns.length % colors.length], cards: [] });
    await save();
    render();
    $("#kanbanBoard").scrollLeft = $("#kanbanBoard").scrollWidth;
  }

  async function editColumn(columnId) {
    const board = currentBoard();
    const column = board?.columns.find(item => item.id === columnId);
    if (!column) return;
    const action = prompt('Digite o novo nome da etapa ou "excluir" para removê-la.', column.name);
    if (!action?.trim()) return;
    if (action.toLocaleLowerCase("pt-BR") === "excluir") {
      if (board.columns.length === 1) return alert("O quadro precisa ter pelo menos uma etapa.");
      if (column.cards.length && !confirm(`A etapa possui ${column.cards.length} contato(s). Excluir mesmo assim?`)) return;
      board.columns = board.columns.filter(item => item.id !== columnId);
    } else {
      column.name = action.trim();
    }
    await save();
    render();
  }

  async function moveCard(cardId, fromColumnId, toColumnId) {
    if (!cardId || !toColumnId || fromColumnId === toColumnId) return;
    const board = currentBoard();
    const from = board?.columns.find(column => column.id === fromColumnId);
    const to = board?.columns.find(column => column.id === toColumnId);
    const index = from?.cards.findIndex(card => card.id === cardId) ?? -1;
    if (index < 0 || !to) return;
    const [card] = from.cards.splice(index, 1);
    card.updatedLabel = "Agora";
    to.cards.push(card);
    await save();
    render();
  }

  function findCard(columnId, cardId) {
    const column = currentBoard()?.columns.find(item => item.id === columnId);
    return column?.cards.find(card => card.id === cardId) || null;
  }

  function formatMessageTime(timestamp) {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function openConversation(card) {
    activeConversationCard = card;
    $("#kanbanConversationAvatar").textContent = initials(card.name);
    $("#kanbanConversationName").textContent = card.name || "Contato";
    $("#kanbanConversationPhone").textContent = formatPhone(card.phone);
    const messages = Array.isArray(card.messages) ? card.messages : [];
    $("#kanbanConversationMessages").innerHTML = messages.length
      ? messages.map(message => `<div class="kanban-message ${message.fromMe ? "outgoing" : "incoming"}"><span>${escapeHtml(message.body || `[${message.type || "mensagem"}]`)}</span><time>${escapeHtml(formatMessageTime(message.timestamp))}</time></div>`).join("")
      : `<div class="kanban-conversation-empty">O histórico ainda não foi carregado. Clique em ↻ WhatsApp para sincronizar.</div>`;
    $("#kanbanConversationModal").classList.remove("hidden");
    requestAnimationFrame(() => { $("#kanbanConversationMessages").scrollTop = $("#kanbanConversationMessages").scrollHeight; });
  }

  function closeConversation() {
    $("#kanbanConversationModal").classList.add("hidden");
    activeConversationCard = null;
  }

  async function getWhatsappTab() {
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
    return tabs[0] || null;
  }

  async function syncWhatsappChats({ silent = false } = {}) {
    if (syncingWhatsapp) return;
    syncingWhatsapp = true;
    const button = $("#kanbanSyncWhatsapp");
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = "Sincronizando...";
    try {
      const tab = await getWhatsappTab();
      if (!tab) throw new Error("Abra o WhatsApp Web para carregar as conversas.");
      const response = await chrome.tabs.sendMessage(tab.id, { type: "WF_KANBAN_CHATS" });
      if (!response?.ok) throw new Error(response?.error || "Não foi possível consultar as conversas.");
      const board = currentBoard();
      const inbox = board?.columns[0];
      if (!inbox) return;
      const locations = new Map();
      board.columns.forEach(column => column.cards.forEach(card => {
        if (card.chatId) locations.set(card.chatId, card);
        const phone = String(card.phone || "").replace(/\D/g, "");
        if (phone) locations.set(`phone:${phone}`, card);
      }));
      let added = 0;
      (response.chats || []).forEach(chat => {
        const existing = locations.get(chat.chatId) || locations.get(`phone:${chat.phone}`);
        if (existing) {
          existing.chatId = chat.chatId;
          existing.name = chat.name || existing.name;
          existing.phone = chat.phone || existing.phone;
          existing.lastMessage = chat.lastMessage || existing.lastMessage;
          existing.messages = chat.messages || existing.messages;
          existing.unreadCount = chat.unreadCount || 0;
          existing.updatedLabel = chat.timestamp ? formatMessageTime(chat.timestamp) : existing.updatedLabel;
          return;
        }
        inbox.cards.push({
          id: uid(), chatId: chat.chatId, name: chat.name || chat.phone, phone: chat.phone,
          notes: chat.lastMessage || "", lastMessage: chat.lastMessage || "", messages: chat.messages || [],
          unreadCount: chat.unreadCount || 0, tag: "WhatsApp",
          updatedLabel: chat.timestamp ? formatMessageTime(chat.timestamp) : "Sincronizado agora"
        });
        added++;
      });
      await save();
      render();
      if (!silent) alert(`${response.chats?.length || 0} conversa(s) consultada(s). ${added} novo(s) contato(s) adicionado(s).`);
    } catch (error) {
      if (!silent) alert(error?.message || String(error));
    } finally {
      syncingWhatsapp = false;
      button.disabled = false;
      button.textContent = previous;
    }
  }

  $("#kanbanBoardSelect").addEventListener("change", event => {
    selectedBoardId = event.target.value;
    save();
    render();
  });
  $("#kanbanSearch").addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLocaleLowerCase("pt-BR");
    render();
  });
  $("#kanbanNewBoard").addEventListener("click", async () => {
    const name = prompt("Nome do novo quadro", "Novo funil");
    if (!name?.trim()) return;
    const board = starterBoard();
    board.name = name.trim();
    boards.push(board);
    selectedBoardId = board.id;
    await save();
    render();
  });
  $("#kanbanRenameBoard").addEventListener("click", async () => {
    const board = currentBoard();
    const name = prompt("Nome do quadro", board?.name || "");
    if (!board || !name?.trim()) return;
    board.name = name.trim();
    await save();
    render();
  });
  $("#kanbanDeleteBoard").addEventListener("click", async () => {
    const board = currentBoard();
    if (!board || boards.length === 1) return alert("Crie outro quadro antes de excluir este.");
    if (!confirm(`Excluir o quadro "${board.name}" e todos os cartões?`)) return;
    boards = boards.filter(item => item.id !== board.id);
    selectedBoardId = boards[0].id;
    await save();
    render();
  });
  $("#kanbanAddCard").addEventListener("click", () => addCard(currentBoard()?.columns[0]?.id));
  $("#kanbanSyncWhatsapp").addEventListener("click", () => syncWhatsappChats());
  $("#kanbanImportContacts").addEventListener("click", async () => {
    const board = currentBoard();
    const destination = board?.columns[0];
    if (!destination) return;
    const stored = await chrome.storage.local.get("wfContactLists");
    const lists = Array.isArray(stored.wfContactLists) ? stored.wfContactLists : [];
    if (!lists.length) return alert("Nenhuma lista de contatos foi criada. Use primeiro a área Contatos.");
    const choices = lists.map((list, index) => `${index + 1}. ${list.name} (${list.contacts?.length || 0})`).join("\n");
    const selected = prompt(`Qual lista deseja importar?\n\n${choices}`, "1");
    if (selected === null) return;
    const list = lists[Number(selected) - 1];
    if (!list) return alert("Lista inválida.");
    const knownPhones = new Set(allCards(board).map(card => String(card.phone || "").replace(/\D/g, "")));
    const imported = (list.contacts || []).filter(contact => {
      const phone = String(contact.phone || "").replace(/\D/g, "");
      if (!phone || knownPhones.has(phone)) return false;
      knownPhones.add(phone);
      return true;
    }).map(contact => ({
      id: uid(),
      name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contato",
      phone: contact.phone || "",
      notes: "",
      tag: contact.tag || "",
      updatedLabel: "Importado agora"
    }));
    destination.cards.push(...imported);
    await save();
    render();
    alert(`${imported.length} contato(s) importado(s) para ${destination.name}.`);
  });
  $("#kanbanAddColumn").addEventListener("click", addColumn);

  $("#kanbanBoard").addEventListener("click", event => {
    const openChat = event.target.closest("[data-open-chat]");
    if (openChat) return openConversation(findCard(openChat.dataset.openChatColumn, openChat.dataset.openChat));
    const add = event.target.closest("[data-add-card]");
    if (add) return addCard(add.dataset.addCard);
    const cardMenu = event.target.closest("[data-card-menu]");
    if (cardMenu) return editCard(cardMenu.dataset.cardColumnMenu, cardMenu.dataset.cardMenu);
    const columnMenu = event.target.closest("[data-column-menu]");
    if (columnMenu) return editColumn(columnMenu.dataset.columnMenu);
    if (event.target.closest("#kanbanInlineAddColumn")) addColumn();
  });

  $("#kanbanBoard").addEventListener("dragstart", event => {
    const card = event.target.closest(".kanban-card");
    if (!card) return;
    draggedCard = { cardId: card.dataset.cardId, columnId: card.dataset.cardColumn };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  $("#kanbanBoard").addEventListener("dragover", event => {
    const list = event.target.closest("[data-drop-column]");
    if (!list || !draggedCard) return;
    event.preventDefault();
    list.classList.add("drag-over");
  });
  $("#kanbanBoard").addEventListener("dragleave", event => {
    event.target.closest("[data-drop-column]")?.classList.remove("drag-over");
  });
  $("#kanbanBoard").addEventListener("drop", event => {
    const list = event.target.closest("[data-drop-column]");
    if (!list || !draggedCard) return;
    event.preventDefault();
    document.querySelectorAll(".kanban-card-list.drag-over").forEach(item => item.classList.remove("drag-over"));
    moveCard(draggedCard.cardId, draggedCard.columnId, list.dataset.dropColumn);
    draggedCard = null;
  });
  $("#kanbanBoard").addEventListener("dragend", () => {
    document.querySelectorAll(".kanban-card.dragging,.kanban-card-list.drag-over").forEach(item => item.classList.remove("dragging", "drag-over"));
    draggedCard = null;
  });

  window.addEventListener("wf:kanban-open", render);
  window.addEventListener("wf:kanban-open", () => syncWhatsappChats({ silent: true }));
  $("#kanbanCloseConversation").addEventListener("click", closeConversation);
  $("#kanbanConversationModal").addEventListener("click", event => {
    if (event.target === $("#kanbanConversationModal")) closeConversation();
  });
  $("#kanbanOpenWhatsapp").addEventListener("click", async () => {
    if (!activeConversationCard?.phone) return;
    const tab = await getWhatsappTab();
    const url = `https://web.whatsapp.com/send?phone=${String(activeConversationCard.phone).replace(/\D/g, "")}`;
    if (tab) {
      await chrome.tabs.update(tab.id, { url, active: true });
      await chrome.windows?.update?.(tab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url });
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.wfKanbanBoards) return;
    boards = changes.wfKanbanBoards.newValue || boards;
    render();
  });

  (async () => {
    const stored = await chrome.storage.local.get(["wfKanbanBoards", "wfKanbanSelectedBoard"]);
    boards = Array.isArray(stored.wfKanbanBoards) && stored.wfKanbanBoards.length
      ? stored.wfKanbanBoards
      : [starterBoard()];
    selectedBoardId = boards.some(board => board.id === stored.wfKanbanSelectedBoard)
      ? stored.wfKanbanSelectedBoard
      : boards[0].id;
    await save();
    render();
  })();
})();
