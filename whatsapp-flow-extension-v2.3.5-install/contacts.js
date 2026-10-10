(() => {
  const $ = selector => document.querySelector(selector);
  let contactLists = [];
  let selectedContactListId = "";
  let originalListName = "";
  let selectedTagFilter = "";
  let varyBulkDelay = false;
  let activeBulkMessageTextarea = null;
  let campaigns = [];
  let selectedCampaignId = "";
  let addingManualContact = false;
  let lastRenderedLiveCampaignId = "";
  let selectedContactId = "";
  let manualContactSavePending = false;
  let bulkRequestPending = false;
  let pinnedCampaignId = "";
  let openCampaignContacts = null;
  let contactsModalReturnFocus = null;
  let editingCampaignMessageId = "";
  let campaignMessageReturnFocus = null;
  let editingCampaignVaryDelay = false;
  let activeCampaignMessageTextarea = null;
  let campaignHistoryDeletePending = false;
  let contactListsSaveQueue = Promise.resolve();
  let whatsappBulkContacts = [];
  let whatsappBulkContactsLoaded = false;
  let whatsappBulkContactsLoading = false;
  let selectedBulkTagValues = [];
  let selectedBulkExcludedTagValues = [];
  let bulkIncludeMode = "any";
  let bulkTagRules = [];
  let bulkTagRuleSequence = 0;
  const bulkControlStates = new Map();

  const WHATSAPP_ALL_CONTACTS = "__whatsapp_all__";
  const WHATSAPP_LABEL_CONTACTS = "__whatsapp_labels__";

  const uid = () => crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function normalizePhone(value) {
    const raw = String(value || "").trim();
    let digits = raw.replace(/\D/g, "");
    const hasExplicitCountryCode = raw.includes("+");
    if (!hasExplicitCountryCode && digits.length >= 10 && digits.length <= 11) {
      digits = `55${digits}`;
    }
    return digits;
  }

  function normalizeWhatsappPhone(value) {
    // O identificador vindo do próprio WhatsApp já contém o DDI, embora não
    // venha prefixado por "+". Aplicar normalizePhone aqui acrescentava 55 a
    // números internacionais de 10/11 dígitos (ex.: 1438... virava 551438...).
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeHeader(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function rowsToContacts(rows) {
    if (!rows.length) return [];
    const importedText = value => String(value || "")
      .trim()
      .replace(/^'(?=[=+\-@])/, "");
    const headers = rows[0].map(normalizeHeader);
    const indexes = {
      firstName: headers.indexOf("nome"),
      lastName: headers.indexOf("sobrenome"),
      phone: headers.indexOf("telefone"),
      tag: headers.indexOf("etiqueta")
    };
    if (indexes.firstName < 0 || indexes.phone < 0) {
      throw new Error("A planilha precisa ter ao menos as colunas Nome e Telefone.");
    }

    return rows.slice(1).map(row => ({
      id: uid(),
      firstName: importedText(row[indexes.firstName]),
      lastName: indexes.lastName >= 0 ? importedText(row[indexes.lastName]) : "",
      phone: normalizePhone(row[indexes.phone]),
      tag: indexes.tag >= 0 ? importedText(row[indexes.tag]) : ""
    })).filter(contact => contact.firstName && contact.phone.length >= 10);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (char === '"') {
        if (quoted && text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = !quoted;
        }
      } else if ((char === "," || char === ";" || char === "\t") && !quoted) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[index + 1] === "\n") index++;
        row.push(field);
        if (row.some(value => String(value).trim())) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    row.push(field);
    if (row.some(value => String(value).trim())) rows.push(row);
    return rows;
  }

  async function unzipEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder();
    const entries = {};

    for (let offset = 0; offset <= bytes.length - 46;) {
      if (view.getUint32(offset, true) !== 0x02014b50) {
        offset++;
        continue;
      }
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);

      if (method === 0) {
        entries[name] = compressed;
      } else if (method === 8) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        entries[name] = new Uint8Array(await new Response(stream).arrayBuffer());
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  async function parseXlsx(arrayBuffer) {
    const entries = await unzipEntries(arrayBuffer);
    const decoder = new TextDecoder();
    const parser = new DOMParser();
    const shared = [];

    if (entries["xl/sharedStrings.xml"]) {
      const sharedDoc = parser.parseFromString(
        decoder.decode(entries["xl/sharedStrings.xml"]),
        "application/xml"
      );
      sharedDoc.querySelectorAll("si").forEach(item => {
        shared.push([...item.querySelectorAll("t")].map(node => node.textContent || "").join(""));
      });
    }

    const sheetEntry = entries["xl/worksheets/sheet1.xml"];
    if (!sheetEntry) throw new Error("A primeira aba da planilha não foi encontrada.");
    const sheetDoc = parser.parseFromString(decoder.decode(sheetEntry), "application/xml");
    const rows = [];

    sheetDoc.querySelectorAll("row").forEach(rowNode => {
      const row = [];
      rowNode.querySelectorAll("c").forEach(cell => {
        const reference = cell.getAttribute("r") || "A1";
        const letters = reference.match(/[A-Z]+/)?.[0] || "A";
        let column = 0;
        for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
        column--;
        const type = cell.getAttribute("t");
        const raw = cell.querySelector("v")?.textContent || "";
        const value = type === "s"
          ? shared[Number(raw)] || ""
          : type === "inlineStr"
            ? [...cell.querySelectorAll("t")].map(node => node.textContent || "").join("")
            : raw;
        row[column] = value;
      });
      rows.push(row);
    });
    return rows;
  }

  async function readContactFile(file) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error("O arquivo precisa estar no formato CSV.");
    }
    return rowsToContacts(parseCsv(await file.text()));
  }

  function selectedList() {
    return contactLists.find(list => list.id === selectedContactListId);
  }

  function renderContactLists() {
    $("#contactListCount").textContent = String(contactLists.length);
    $("#contactLists").innerHTML = contactLists.length
      ? contactLists.map(list => `
          <div class="contact-list-item ${list.id === selectedContactListId ? "active" : ""}">
            <button type="button" class="contact-list-select"
              data-contact-list="${escapeHtml(String(list.id))}">
              <span class="contact-list-copy">
                <strong>${escapeHtml(list.name)}</strong>
                <span>${list.contacts.length} contato(s)</span>
              </span>
            </button>
            <div class="contact-list-combined-actions" role="group"
              aria-label="Ações da lista ${escapeHtml(list.name)}">
              <button type="button" class="contact-list-delete"
                data-delete-contact-list="${escapeHtml(String(list.id))}"
                title="Excluir lista" aria-label="Excluir lista">×</button>
              <button type="button" class="contact-list-download"
                data-download-contact-list="${escapeHtml(String(list.id))}"
                title="Baixar lista" aria-label="Baixar lista">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 2.5v7M4.75 6.75 8 10l3.25-3.25M3 13h10"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join("")
      : '<div class="module-empty">Nenhuma lista importada.</div>';

    const list = selectedList();
    $("#selectedContactListName").textContent = list?.name || "Selecione uma lista";
    $("#addManualContact").classList.toggle("hidden", !list);
    $("#contactTagFilter").classList.toggle("hidden", !list);
    const tags = list
      ? [...new Set(list.contacts.map(contact => contact.tag).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "pt-BR"))
      : [];
    if (selectedTagFilter && !tags.includes(selectedTagFilter)) selectedTagFilter = "";
    $("#contactTagFilter").innerHTML = '<option value="">Todas as etiquetas</option>' +
      tags.map(tag => `
        <option value="${escapeHtml(tag)}" ${tag === selectedTagFilter ? "selected" : ""}>
          ${escapeHtml(tag)}
        </option>
      `).join("");
    const visibleContacts = list
      ? list.contacts.filter(contact => !selectedTagFilter || contact.tag === selectedTagFilter)
      : [];
    const manualRow = list && addingManualContact ? `
      <tr class="manual-contact-row" data-manual-contact-row>
        <td><input data-manual-contact="firstName" placeholder="Nome"></td>
        <td><input data-manual-contact="lastName" placeholder="Sobrenome"></td>
        <td><input data-manual-contact="phone" placeholder="5511999999999"></td>
        <td><input data-manual-contact="tag" placeholder="Etiqueta"></td>
        <td class="contact-delete-cell manual-contact-delete-cell">
          <button type="button" data-cancel-manual-contact
            title="Cancelar novo contato" aria-label="Cancelar novo contato">×</button>
        </td>
      </tr>
    ` : "";
    $("#contactsTableBody").innerHTML = list && (visibleContacts.length || addingManualContact)
      ? manualRow + visibleContacts.map(contact => `
          <tr data-contact-row="${contact.id}" class="${selectedContactId === contact.id ? "selected" : ""}">
            <td class="editable-contact-cell" data-contact-id="${contact.id}" data-contact-field="firstName"
              title="Clique para editar">${escapeHtml(contact.firstName)}</td>
            <td class="editable-contact-cell" data-contact-id="${contact.id}" data-contact-field="lastName"
              title="Clique para editar">${escapeHtml(contact.lastName)}</td>
            <td class="editable-contact-cell" data-contact-id="${contact.id}" data-contact-field="phone"
              title="Clique para editar">${escapeHtml(contact.phone)}</td>
            <td class="editable-contact-cell" data-contact-id="${contact.id}" data-contact-field="tag"
              title="Clique para editar">${escapeHtml(contact.tag)}</td>
            <td class="contact-delete-cell">
              <button type="button" data-delete-contact="${contact.id}"
                title="Excluir contato" aria-label="Excluir contato">×</button>
            </td>
          </tr>
        `).join("")
      : `<tr><td colspan="5" class="module-empty">${
          list ? "Nenhum contato com esta etiqueta." : "Selecione uma lista para visualizar."
        }</td></tr>`;
    renderBulkOptions();
  }

  function saveContactLists() {
    const snapshot = JSON.parse(JSON.stringify(contactLists));
    const write = () => chrome.storage.local.set({ wfContactLists: snapshot });
    contactListsSaveQueue = contactListsSaveQueue.then(write, write);
    return contactListsSaveQueue;
  }

  async function deleteContactListById(listId) {
    const list = contactLists.find(item => String(item.id) === String(listId));
    if (!list || !confirm(`Excluir a lista "${list.name}"?`)) return;

    const deletingSelectedList = list.id === selectedContactListId;
    contactLists = contactLists.filter(item => item.id !== list.id);
    if (deletingSelectedList) {
      selectedContactListId = contactLists[0]?.id || "";
      selectedTagFilter = "";
      addingManualContact = false;
      selectedContactId = "";
    }
    await saveContactLists();
    renderContactLists();
  }

  function downloadContactListById(listId) {
    const list = contactLists.find(item => String(item.id) === String(listId));
    if (!list) return;
    const csvCell = value => {
      const text = String(value ?? "");
      return /[",;\t\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = [
      ["Nome", "Sobrenome", "Telefone", "Etiqueta"],
      ...list.contacts.map(contact => [
        contact.firstName,
        contact.lastName,
        contact.phone ? `+${String(contact.phone).replace(/\D/g, "")}` : "",
        contact.tag
      ])
    ];
    const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(list.name || "lista-de-contatos")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "lista-de-contatos"}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function loadContactLists() {
    const { wfContactLists = [] } = await chrome.storage.local.get("wfContactLists");
    contactLists = Array.isArray(wfContactLists) ? wfContactLists : [];
    selectedContactListId = contactLists[0]?.id || "";
    renderContactLists();
  }

  async function renderBulkOptions() {
    const currentList = $("#bulkContactList").value;
    const whatsappCount = whatsappBulkContactsLoaded ? ` (${whatsappBulkContacts.length})` : "";
    const whatsappLabeledCount = whatsappBulkContactsLoaded
      ? ` (${whatsappBulkContacts.filter(contact => (contact.labels || []).length).length})`
      : "";
    $("#bulkContactList").innerHTML = `
      <option value="">Selecione uma origem</option>
      <option value="${WHATSAPP_ALL_CONTACTS}" ${currentList === WHATSAPP_ALL_CONTACTS ? "selected" : ""}>
        WhatsApp — todos os contatos${whatsappCount}
      </option>
      <option value="${WHATSAPP_LABEL_CONTACTS}" ${currentList === WHATSAPP_LABEL_CONTACTS ? "selected" : ""}>
        WhatsApp — por etiqueta${whatsappLabeledCount}
      </option>
    ` +
      contactLists.map(list => `
        <option value="${list.id}" ${list.id === currentList ? "selected" : ""}>
          Lista salva — ${escapeHtml(list.name)} (${list.contacts.length})
        </option>
      `).join("");
    renderBulkTagOptions();

    const { wfFlows = [] } = await chrome.storage.local.get("wfFlows");
    const currentFlow = $("#bulkFlow").value;
    $("#bulkFlow").innerHTML = '<option value="">Selecione um fluxo</option>' +
      wfFlows.map(flow => `
        <option value="${flow.id}" ${flow.id === currentFlow ? "selected" : ""}>
          ${escapeHtml(flow.name || "Fluxo sem nome")}${flow.enabled ? "" : " (inativo)"}
        </option>
      `).join("");
    updateBulkRecipientCount();
  }

  function selectedBulkTags() {
    return [...selectedBulkTagValues];
  }

  function bulkTagOptionsForSource(source = $("#bulkContactList").value) {
    if ([WHATSAPP_ALL_CONTACTS, WHATSAPP_LABEL_CONTACTS].includes(source)) {
      const byKey = new Map();
      whatsappBulkContacts.forEach(contact => (contact.labelRefs || []).forEach(label => {
        if (!byKey.has(label.key)) byKey.set(label.key, { value: label.key, name: label.name, id: label.id });
      }));
      const labels = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      const repeatedNames = new Map();
      labels.forEach(label => {
        const name = normalizeHeader(label.name);
        repeatedNames.set(name, (repeatedNames.get(name) || 0) + 1);
      });
      return labels.map(label => ({
        ...label,
        displayName: repeatedNames.get(normalizeHeader(label.name)) > 1 && label.id
          ? `${label.name} · ID ${label.id}` : label.name
      }));
    }
    const list = contactLists.find(item => item.id === source);
    return list
      ? [...new Set(list.contacts.map(contact => contact.tag).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "pt-BR"))
          .map(tag => ({ value: tag, name: tag, displayName: tag }))
      : [];
  }

  function bulkTagNames(values, options = bulkTagOptionsForSource()) {
    const names = new Map(options.map(option => [option.value, option.displayName]));
    return values.map(value => names.get(value) || value);
  }

  function newBulkTagRule(action = "include", tag = "") {
    return { id: `rule-${++bulkTagRuleSequence}`, action, tag };
  }

  function syncBulkRuleSelections() {
    selectedBulkTagValues = [...new Set(bulkTagRules
      .filter(rule => rule.action === "include" && rule.tag).map(rule => rule.tag))];
    selectedBulkExcludedTagValues = [...new Set(bulkTagRules
      .filter(rule => rule.action === "exclude" && rule.tag).map(rule => rule.tag))];
  }

  function incompleteBulkRuleIndex(source = $("#bulkContactList").value) {
    if (bulkTagRules.length === 1 && bulkTagRules[0].action === "include" &&
      !bulkTagRules[0].tag && source !== WHATSAPP_LABEL_CONTACTS) return -1;
    return bulkTagRules.findIndex(rule => !rule.tag);
  }

  function renderBulkTagOptions({ preserveSelection = true } = {}) {
    const source = $("#bulkContactList").value;
    const list = contactLists.find(item => item.id === source);
    const isWhatsappSource = [WHATSAPP_ALL_CONTACTS, WHATSAPP_LABEL_CONTACTS].includes(source);
    const tags = bulkTagOptionsForSource(source);
    if (!preserveSelection) {
      bulkTagRules = [];
      bulkIncludeMode = "any";
    }
    if (!bulkTagRules.length) bulkTagRules.push(newBulkTagRule());
    const available = new Set(tags.map(tag => tag.value));
    const used = new Set();
    bulkTagRules.forEach(rule => {
      if (!isWhatsappSource) rule.action = "include";
      if (!available.has(rule.tag) || used.has(`${rule.action}:${rule.tag}`)) rule.tag = "";
      if (rule.tag) used.add(`${rule.action}:${rule.tag}`);
    });
    syncBulkRuleSelections();
    const optionCount = (tag) => isWhatsappSource
        ? whatsappBulkContacts.filter(contact => (contact.labelRefs || []).some(label => label.key === tag.value)).length
        : list.contacts.filter(contact => contact.tag === tag.value).length;
    $("#bulkTagRules").innerHTML = bulkTagRules.map((rule, index) => {
      const otherUsed = new Set(bulkTagRules
        .filter(candidate => candidate.id !== rule.id && candidate.action === rule.action && candidate.tag)
        .map(candidate => candidate.tag));
      const availableForRule = tags.filter(tag => !otherUsed.has(tag.value));
      const emptyLabel = !source ? "Selecione uma origem" : tags.length ? "Selecione uma etiqueta" : "Nenhuma etiqueta encontrada";
      return `<div class="bulk-tag-rule${rule.action === "exclude" ? " is-exclude" : ""}" data-bulk-rule-id="${escapeHtml(rule.id)}">
        <select data-bulk-rule-action aria-label="Ação da regra ${index + 1}" ${!source ? "disabled" : ""}>
          <option value="include" ${rule.action === "include" ? "selected" : ""}>Incluir</option>
          ${isWhatsappSource ? `<option value="exclude" ${rule.action === "exclude" ? "selected" : ""}>Excluir</option>` : ""}
        </select>
        <select data-bulk-rule-tag aria-label="Etiqueta da regra ${index + 1}" ${!tags.length ? "disabled" : ""}>
          <option value="">${emptyLabel}</option>
          ${availableForRule.map(tag => `<option value="${escapeHtml(tag.value)}" ${tag.value === rule.tag ? "selected" : ""}>${escapeHtml(tag.displayName)} (${optionCount(tag)})</option>`).join("")}
        </select>
        <button type="button" data-remove-bulk-rule aria-label="Remover regra ${index + 1}" ${bulkTagRules.length === 1 ? "disabled" : ""}>×</button>
      </div>`;
    }).join("");
    $("#bulkAdvancedFilters").classList.toggle("hidden", !source);
    $("#bulkAddTagRule").disabled = !tags.length || bulkTagRules.some(rule => !rule.tag);
    $("#bulkIncludeModeWrap").classList.toggle("hidden", !isWhatsappSource || selectedBulkTagValues.length < 2);
    document.querySelectorAll("[data-bulk-match]").forEach(button => {
      const active = button.dataset.bulkMatch === bulkIncludeMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = selectedBulkTagValues.length < 2;
    });
    $("#bulkTagHelper").textContent = source === WHATSAPP_LABEL_CONTACTS
      ? "Adicione ao menos uma regra Incluir. Regras Excluir retiram contatos da seleção."
      : source === WHATSAPP_ALL_CONTACTS
        ? "Sem regra Incluir, todos entram; use Excluir para retirar contatos."
      : list
        ? "Sem regra, todos os contatos da lista entram."
        : "Escolha uma origem para ver as etiquetas disponíveis.";
    $("#bulkTagSelectionBadge").textContent = `${selectedBulkTags().length} selecionada(s)`;
    $("#bulkExcludeSelectionBadge").textContent = `${selectedBulkExcludedTagValues.length} etiqueta${selectedBulkExcludedTagValues.length === 1 ? "" : "s"}`;
  }

  function bulkRecipientSelection() {
    const source = $("#bulkContactList").value;
    const list = contactLists.find(item => item.id === source);
    const isWhatsappSource = [WHATSAPP_ALL_CONTACTS, WHATSAPP_LABEL_CONTACTS].includes(source);
    const sourceContacts = isWhatsappSource ? whatsappBulkContacts : list?.contacts || [];
    const included = sourceContacts.filter(contact => {
      if (!selectedBulkTagValues.length) return source !== WHATSAPP_LABEL_CONTACTS;
      const matches = selectedBulkTagValues.map(tag => isWhatsappSource
        ? (contact.labelRefs || []).some(label => label.key === tag)
        : contact.tag === tag);
      return isWhatsappSource && bulkIncludeMode === "all" ? matches.every(Boolean) : matches.some(Boolean);
    });
    const contacts = isWhatsappSource && selectedBulkExcludedTagValues.length
      ? included.filter(contact => !selectedBulkExcludedTagValues.some(tag =>
          (contact.labelRefs || []).some(label => label.key === tag)))
      : included;
    return {
      sourceCount: source === WHATSAPP_LABEL_CONTACTS
        ? sourceContacts.filter(contact => (contact.labelRefs || []).length).length
        : sourceContacts.length,
      includedCount: included.length,
      excludedCount: included.length - contacts.length,
      contacts
    };
  }

  function selectedBulkContacts() {
    return bulkRecipientSelection().contacts;
  }

  function normalizeWhatsappBulkContacts(chats) {
    const contactsByPhone = new Map();
    (Array.isArray(chats) ? chats : []).forEach(chat => {
      const chatId = String(chat?.chatId || "");
      if (chat?.isGroup || chatId.endsWith("@g.us") || chatId.endsWith("@broadcast")) return;
      const phone = normalizeWhatsappPhone(chat?.phone || chatId.split("@")[0]);
      if (phone.length < 10) return;
      const labelRefs = (Array.isArray(chat?.labels) ? chat.labels : [])
        .map(label => ({
          id: String(typeof label === "string" ? "" : label?.id || "").trim(),
          name: String(typeof label === "string" ? label : label?.name || "").trim()
        }))
        .filter(label => label.name)
        .map(label => ({ ...label, key: label.id ? `id:${label.id}` : `name:${normalizeHeader(label.name)}` }));
      const previous = contactsByPhone.get(phone);
      if (previous) {
        const byKey = new Map([...previous.labelRefs, ...labelRefs].map(label => [label.key, label]));
        previous.labelRefs = [...byKey.values()];
        previous.labels = [...new Set(previous.labelRefs.map(label => label.name))];
        previous.tag = previous.labels.join(", ");
        return;
      }
      const uniqueRefs = [...new Map(labelRefs.map(label => [label.key, label])).values()];
      const labels = [...new Set(uniqueRefs.map(label => label.name))];
      const fullName = String(chat?.name || phone).trim();
      contactsByPhone.set(phone, {
        id: `whatsapp:${chatId || phone}`,
        firstName: fullName,
        lastName: "",
        phone,
        tag: labels.join(", "),
        labels,
        labelRefs: uniqueRefs
      });
    });
    return [...contactsByPhone.values()].sort((a, b) =>
      a.firstName.localeCompare(b.firstName, "pt-BR")
    );
  }

  async function loadWhatsappBulkContacts({ force = false } = {}) {
    if (whatsappBulkContactsLoading) return;
    if (whatsappBulkContactsLoaded && !force) return;
    const feedback = $("#bulkFeedback");
    whatsappBulkContactsLoading = true;
    feedback.textContent = "Carregando contatos e etiquetas do WhatsApp...";
    try {
      const whatsappTab = await getWhatsAppTab();
      if (!whatsappTab) throw new Error("Abra o WhatsApp Web antes de carregar os contatos.");
      const result = await chrome.tabs.sendMessage(whatsappTab.id, { type: "WF_KANBAN_CHATS" });
      if (!result?.ok) throw new Error(result?.error || "O WhatsApp não retornou os contatos.");
      whatsappBulkContacts = normalizeWhatsappBulkContacts(result.chats);
      whatsappBulkContactsLoaded = true;
      await renderBulkOptions();
      feedback.textContent = whatsappBulkContacts.length
        ? `${whatsappBulkContacts.length} contato(s) carregado(s) diretamente do WhatsApp.`
        : "Nenhum contato individual foi encontrado nas conversas do WhatsApp.";
    } catch (error) {
      whatsappBulkContacts = [];
      whatsappBulkContactsLoaded = false;
      feedback.textContent = `Erro ao carregar contatos do WhatsApp: ${error?.message || error}`;
    } finally {
      whatsappBulkContactsLoading = false;
      renderBulkTagOptions();
      updateBulkRecipientCount();
    }
  }

  function updateBulkRecipientCount() {
    const selection = bulkRecipientSelection();
    const count = selection.contacts.length;
    const source = $("#bulkContactList").value;
    $("#bulkRecipientCount").textContent = `${count} contato${count === 1 ? "" : "s"} receber${count === 1 ? "á" : "ão"}`;
    $("#bulkContactCountBadge").textContent = `${selection.sourceCount} contato${selection.sourceCount === 1 ? "" : "s"}`;
    $("#bulkTagSelectionBadge").textContent = `${selectedBulkTags().length} selecionada(s)`;
    $("#bulkExcludeSelectionBadge").textContent = `${selectedBulkExcludedTagValues.length} etiqueta${selectedBulkExcludedTagValues.length === 1 ? "" : "s"}`;
    const includedNames = bulkTagNames(selectedBulkTagValues);
    const excludedNames = bulkTagNames(selectedBulkExcludedTagValues);
    const inclusionRule = !includedNames.length
      ? "Todos os contatos da origem"
      : includedNames.length === 1
        ? `Com ${includedNames[0]}`
        : bulkIncludeMode === "all"
          ? `Com todas: ${includedNames.join(" + ")}`
          : `Com qualquer uma: ${includedNames.join(" ou ")}`;
    const incompleteRule = incompleteBulkRuleIndex(source);
    $("#bulkFilterRule").textContent = !source
      ? "Escolha uma origem para montar o público."
      : incompleteRule >= 0
        ? `Escolha uma etiqueta na regra ${incompleteRule + 1} ou remova essa regra antes de iniciar.`
      : source === WHATSAPP_LABEL_CONTACTS && !selectedBulkTagValues.length
        ? "Adicione ao menos uma regra Incluir para escolher os destinatários."
        : `${inclusionRule}${excludedNames.length ? `, exceto quem tiver ${excludedNames.join(" ou ")}` : ""}.`;
    $("#bulkFilterBreakdown").innerHTML = source
      ? `<span>${selection.sourceCount} na origem</span><span>→</span><span>${selection.includedCount} após inclusão</span><span>→</span><span class="bulk-excluded-count">${selection.excludedCount} excluído${selection.excludedCount === 1 ? "" : "s"}</span><span>→</span><b>${count} receber${count === 1 ? "á" : "ão"}</b>`
      : "";
    $("#bulkRecipientPreviewSummary").textContent = `Ver destinatários (${count})`;
    $("#bulkRecipientPreviewList").innerHTML = count
      ? selection.contacts.map(contact => {
          const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phone;
          return `<div class="bulk-recipient-item" role="listitem"><div><strong>${escapeHtml(name)}</strong><small>+${escapeHtml(contact.phone || "")}</small></div><div class="bulk-recipient-labels">${escapeHtml((contact.labels || (contact.tag ? [contact.tag] : [])).join(", "))}</div></div>`;
        }).join("")
      : '<div class="bulk-recipient-empty">Nenhum contato corresponde aos filtros atuais.</div>';
  }

  function campaignStatusLabel(status) {
    if (status === "running") return "Em execução";
    if (status === "paused") return "Pausada";
    if (status === "completed") return "Concluída";
    return "Interrompida";
  }

  function campaignRate(amount, total) {
    return total ? `${Math.round((Number(amount || 0) / total) * 100)}%` : "0%";
  }

  function friendlyCampaignFailure(value) {
    const reason = String(value || "").trim();
    if (!reason) return "";
    if (/contact is blocked|contato bloqueado/i.test(reason)) return "Contato bloqueado.";
    if (/no lid for user|does not have whatsapp|não possui whatsapp|not registered/i.test(reason)) {
      return "Número sem WhatsApp.";
    }
    if (/invalid|inválid/i.test(reason)) return "Telefone inválido.";
    if (/timeout|tempo esgotado|não confirmou/i.test(reason)) {
      return "O WhatsApp não confirmou o envio.";
    }
    return reason.length > 180 ? `${reason.slice(0, 177)}...` : reason;
  }

  function campaignFailureEntries(campaign) {
    const errors = (Array.isArray(campaign?.errors) ? campaign.errors : [])
      .map(item => ({
        phone: String(item?.phone || ""),
        reason: String(item?.error || "")
      }));
    const usedErrors = new Set();
    const entries = (Array.isArray(campaign?.recipients) ? campaign.recipients : [])
      .filter(recipient => recipient?.state === "failed")
      .map(recipient => {
        const phone = String(recipient.phone || "");
        const normalizedPhone = normalizePhone(phone);
        let errorIndex = errors.findIndex((item, index) =>
          !usedErrors.has(index) &&
          normalizedPhone &&
          normalizePhone(item.phone) === normalizedPhone
        );
        if (errorIndex < 0 && !normalizedPhone) {
          errorIndex = errors.findIndex((item, index) =>
            !usedErrors.has(index) && !normalizePhone(item.phone)
          );
        }
        if (errorIndex >= 0) usedErrors.add(errorIndex);
        const matchedError = errorIndex >= 0 ? errors[errorIndex] : null;
        return {
          name: String(recipient.name || "").trim() || "Contato sem nome",
          phone: phone || matchedError?.phone || "",
          reason: friendlyCampaignFailure(recipient.error || matchedError?.reason)
        };
      });

    errors.forEach((item, index) => {
      if (usedErrors.has(index)) return;
      entries.push({
        name: "Contato sem nome",
        phone: item.phone,
        reason: friendlyCampaignFailure(item.reason)
      });
    });
    return entries;
  }

  function campaignContactPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits ? `+${digits}` : "Telefone não informado";
  }

  function campaignActivityDetail(value, action) {
    let timestamp = Number(value || 0);
    if (!Number.isFinite(timestamp) || timestamp < 1000000000) return "";
    if (timestamp < 1e12) timestamp *= 1000;
    const date = new Date(timestamp);
    return Number.isFinite(date.getTime())
      ? `${action} em ${date.toLocaleString("pt-BR")}`
      : "";
  }

  function campaignActivityEntries(campaign, kind) {
    const timestampKey = {
      sent: "sentAt",
      opened: "openedAt",
      responded: "respondedAt"
    }[kind];
    const action = {
      sent: "Enviado",
      opened: "Aberto",
      responded: "Respondido"
    }[kind];
    if (!timestampKey || !action) return [];
    return (Array.isArray(campaign?.recipients) ? campaign.recipients : [])
      .filter(recipient => Boolean(recipient?.[timestampKey]))
      .map(recipient => ({
        name: String(recipient.name || "").trim() || "Contato sem nome",
        phone: String(recipient.phone || ""),
        reason: campaignActivityDetail(recipient[timestampKey], action)
      }));
  }

  function campaignContactsConfig(kind) {
    if (kind === "sent") {
      return {
        counter: "sent",
        title: "Contatos enviados",
        singular: "envio",
        plural: "envios",
        empty: "Nenhum contato enviado nesta campanha."
      };
    }
    if (kind === "failed") {
      return {
        counter: "failed",
        title: "Contatos não enviados",
        singular: "falha",
        plural: "falhas",
        empty: "Nenhum contato com falha nesta campanha."
      };
    }
    if (kind === "opened") {
      return {
        counter: "opened",
        title: "Contatos que abriram",
        singular: "abertura",
        plural: "aberturas",
        empty: "Nenhum contato abriu esta campanha."
      };
    }
    if (kind === "responded") {
      return {
        counter: "responded",
        title: "Contatos que responderam",
        singular: "resposta",
        plural: "respostas",
        empty: "Nenhum contato respondeu esta campanha."
      };
    }
    return null;
  }

  function campaignContactEntries(campaign, kind) {
    return kind === "failed"
      ? campaignFailureEntries(campaign)
      : campaignActivityEntries(campaign, kind);
  }

  function normalizeCampaignContactSearch(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function filterCampaignContactEntries(entries, query) {
    const rawQuery = String(query || "");
    const normalizedQuery = normalizeCampaignContactSearch(rawQuery);
    const phoneQuery = /\d/.test(rawQuery) && !/\p{L}/u.test(rawQuery)
      ? rawQuery.replace(/\D/g, "")
      : "";
    if (!normalizedQuery && !phoneQuery) return entries;
    return entries.filter(entry => {
      const name = normalizeCampaignContactSearch(entry?.name);
      const phone = String(entry?.phone || "").replace(/\D/g, "");
      return (
        (normalizedQuery && name.includes(normalizedQuery)) ||
        (phoneQuery && phone.includes(phoneQuery))
      );
    });
  }

  function renderCampaignContactsModal(campaign, kind) {
    const config = campaignContactsConfig(kind);
    if (!config) return;
    const allEntries = campaignContactEntries(campaign, kind);
    const query = $("#campaignContactsSearch")?.value || "";
    const entries = filterCampaignContactEntries(allEntries, query);
    const declaredTotal = Number(campaign?.[config.counter] || 0);
    const total = Math.max(declaredTotal, allEntries.length);
    $("#campaignContactsTitle").textContent = config.title;
    $("#campaignContactsCount").textContent =
      query.trim()
        ? `${entries.length} de ${total} contato(s)`
        : `${campaign?.name || "Campanha"} · ${total} ${total === 1 ? config.singular : config.plural}`;
    $("#campaignContactsList").innerHTML = entries.length
      ? entries.map(entry => `
            <div class="campaign-contact-item ${kind === "failed" ? "failed" : ""}" role="listitem">
              <div class="campaign-contact-item-head">
                <strong title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</strong>
                <span>${escapeHtml(campaignContactPhone(entry.phone))}</span>
              </div>
              ${entry.reason ? `<small>${escapeHtml(entry.reason)}</small>` : ""}
            </div>
          `).join("") +
          (!query.trim() && declaredTotal > allEntries.length
            ? `<div class="campaign-contacts-empty" role="status">Há mais ${
                declaredTotal - allEntries.length
              } contato(s) sem detalhes armazenados.</div>`
            : "")
      : `<div class="campaign-contacts-empty" role="status">${
          query.trim()
            ? "Nenhum contato encontrado para esta busca."
            : declaredTotal
              ? "Os contatos desta campanha não possuem detalhes armazenados."
              : config.empty
        }</div>`;
  }

  function openCampaignContactsModal(campaignId, kind, trigger) {
    const campaign = campaigns.find(item => item.id === campaignId);
    const config = campaignContactsConfig(kind);
    if (!campaign || !config || Number(campaign[config.counter] || 0) <= 0) return;
    openCampaignContacts = { campaignId: campaign.id, kind };
    contactsModalReturnFocus = trigger || document.activeElement;
    $("#campaignContactsSearch").value = "";
    renderCampaignContactsModal(campaign, kind);
    $("#campaignContactsModal").classList.remove("hidden");
    document.body.classList.add("campaign-modal-open");
    requestAnimationFrame(() => $("#campaignContactsSearch")?.focus());
  }

  function closeCampaignContactsModal() {
    if ($("#campaignContactsModal").classList.contains("hidden")) return;
    const current = openCampaignContacts;
    $("#campaignContactsModal").classList.add("hidden");
    document.body.classList.remove("campaign-modal-open");
    $("#campaignContactsSearch").value = "";
    openCampaignContacts = null;
    const currentTrigger = contactsModalReturnFocus?.isConnected
      ? contactsModalReturnFocus
      : [...document.querySelectorAll("[data-campaign-contacts]")].find(
          item =>
            item.dataset.campaignId === current?.campaignId &&
            item.dataset.campaignContacts === current?.kind
        );
    currentTrigger?.focus();
    contactsModalReturnFocus = null;
  }

  function campaignEditableMessages(campaign) {
    const execution = campaign?.execution || {};
    const messages = (
      Array.isArray(execution.texts) && execution.texts.length
        ? execution.texts
        : [execution.text]
    )
      .slice(0, 5)
      .map(value => String(value || ""));
    return messages.length ? messages : [""];
  }

  function renderCampaignMessageFields(messages = null) {
    const values = messages || [...document.querySelectorAll("[data-campaign-message]")]
      .map(textarea => textarea.value);
    activeCampaignMessageTextarea = null;
    $("#campaignMessageFields").innerHTML = values.map((message, index) => `
      <div class="campaign-message-field">
        <div class="campaign-message-field-head">
          <span>Mensagem ${index + 1}</span>
          ${values.length > 1
            ? `<button type="button" data-remove-campaign-message="${index}"
                title="Remover variação" aria-label="Remover mensagem ${index + 1}">×</button>`
            : ""}
        </div>
        <textarea data-campaign-message="${index}"
          placeholder="Escreva a mensagem da campanha.">${escapeHtml(message)}</textarea>
      </div>
    `).join("");
    $("#addCampaignMessageVariation").disabled = values.length >= 5;
  }

  function updateCampaignEditDelay() {
    $("#campaignEditFixedDelay").classList.toggle("hidden", editingCampaignVaryDelay);
    $("#campaignEditRangeDelay").classList.toggle("hidden", !editingCampaignVaryDelay);
    $("#campaignEditToggleDelay").textContent = editingCampaignVaryDelay
      ? "Usar tempo fixo"
      : "Variar intervalo";
    $("#campaignEditToggleDelay").classList.toggle("active", editingCampaignVaryDelay);
  }

  function closeCampaignMessageEditor() {
    if ($("#campaignMessageModal").classList.contains("hidden")) return;
    $("#campaignMessageModal").classList.add("hidden");
    document.body.classList.remove("campaign-modal-open");
    editingCampaignMessageId = "";
    activeCampaignMessageTextarea = null;
    $("#campaignMessageFeedback").textContent = "";
    campaignMessageReturnFocus?.focus?.();
    campaignMessageReturnFocus = null;
  }

  async function openCampaignMessageEditor(trigger) {
    const campaign = campaigns.find(item =>
      item.id === (trigger?.dataset.campaignId || pinnedCampaignId)
    ) || campaigns.find(item => item.status === "paused");
    if (!campaign) return;
    if (campaign.status !== "paused") {
      $("#bulkFeedback").textContent =
        "Pause a campanha antes de editar suas configurações.";
      return;
    }
    editingCampaignMessageId = campaign.id;
    campaignMessageReturnFocus = trigger || document.activeElement;
    $("#campaignMessageFeedback").textContent = "";
    renderCampaignMessageFields(campaignEditableMessages(campaign));
    const usesMessage = campaign.sendType !== "flow";
    $("#campaignEditMessageSection").classList.toggle("hidden", !usesMessage);
    $("#campaignMessageModalHint").textContent = usesMessage
      ? "Edite as mensagens e o intervalo dos próximos contatos pendentes."
      : "Edite o intervalo dos próximos contatos pendentes.";
    const execution = campaign.execution || {};
    editingCampaignVaryDelay = Boolean(execution.varyDelay);
    $("#campaignEditDelay").value = Math.max(
      1,
      Number(execution.delaySeconds) || 5
    );
    $("#campaignEditDelayMin").value = Math.max(
      1,
      Number(execution.delayMinSeconds) || 5
    );
    $("#campaignEditDelayMax").value = Math.max(
      Number($("#campaignEditDelayMin").value),
      Number(execution.delayMaxSeconds) || 10
    );
    updateCampaignEditDelay();
    $("#campaignMessageModal").classList.remove("hidden");
    document.body.classList.add("campaign-modal-open");
    requestAnimationFrame(() =>
      (
        usesMessage
          ? $("#campaignMessageFields [data-campaign-message]")
          : $("#campaignEditDelay")
      )?.focus()
    );
  }

  async function saveCampaignMessageEditor() {
    const messages = [...document.querySelectorAll("[data-campaign-message]")]
      .map(textarea => textarea.value.trim())
      .filter(Boolean)
      .slice(0, 5);
    const feedback = $("#campaignMessageFeedback");
    const delaySeconds = Number($("#campaignEditDelay").value);
    const delayMinSeconds = Number($("#campaignEditDelayMin").value);
    const delayMaxSeconds = Number($("#campaignEditDelayMax").value);
    if (
      (!editingCampaignVaryDelay && (!Number.isFinite(delaySeconds) || delaySeconds < 1 || delaySeconds > 3600)) ||
      (editingCampaignVaryDelay && (
        !Number.isFinite(delayMinSeconds) ||
        !Number.isFinite(delayMaxSeconds) ||
        delayMinSeconds < 1 ||
        delayMaxSeconds < delayMinSeconds ||
        delayMaxSeconds > 3600
      ))
    ) {
      return void (feedback.textContent =
        "Informe um intervalo válido entre 1 e 3600 segundos.");
    }

    const button = $("#saveCampaignMessageEdit");
    button.disabled = true;
    feedback.textContent = "Salvando...";
    try {
      const stored = await chrome.storage.local.get("wfCampaigns");
      const latestCampaigns = Array.isArray(stored.wfCampaigns)
        ? stored.wfCampaigns
        : [];
      const campaign = latestCampaigns.find(item =>
        String(item.id) === String(editingCampaignMessageId)
      );
      if (!campaign) throw new Error("A campanha pausada não foi encontrada.");
      if (campaign.status !== "paused") {
        throw new Error("Pause a campanha antes de salvar as configurações.");
      }
      const sendType = campaign.sendType;
      if (sendType !== "flow" && !messages.length) {
        throw new Error("Mantenha ao menos uma mensagem preenchida.");
      }

      campaign.execution = {
        ...(campaign.execution || {}),
        ...(sendType !== "flow"
          ? { text: messages[0], texts: messages }
          : {}),
        delaySeconds: Math.max(1, Math.floor(delaySeconds || 5)),
        varyDelay: editingCampaignVaryDelay,
        delayMinSeconds: Math.max(1, Math.floor(delayMinSeconds || 5)),
        delayMaxSeconds: Math.max(
          1,
          Math.floor(delayMaxSeconds || delayMinSeconds || 10)
        )
      };
      campaign.updatedAt = Math.max(
        Date.now(),
        Number(campaign.updatedAt || 0) + 1
      );
      await chrome.storage.local.set({ wfCampaigns: latestCampaigns });
      campaigns = latestCampaigns;
      $("#bulkFeedback").textContent =
        "Campanha atualizada. Clique em Play para continuar do próximo contato.";
      closeCampaignMessageEditor();
      renderCampaigns();
    } catch (error) {
      feedback.textContent = `Erro: ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
  }

  function campaignProgressCount(campaign) {
    if (!Array.isArray(campaign.recipients)) {
      return Math.min(
        Number(campaign.total || 0),
        Number(campaign.processed ?? (Number(campaign.sent || 0) + Number(campaign.failed || 0)))
      );
    }
    const recipientProgress = campaign.recipients.filter(recipient =>
      ["sent", "failed"].includes(recipient.state)
    ).length;
    return Math.min(
      Number(campaign.total || 0),
      Math.max(recipientProgress, Number(campaign.processed || 0))
    );
  }

  function campaignContactLabel(recipient, fallback = "—") {
    if (!recipient) return fallback;
    const phone = String(recipient.phone || "").replace(/\D/g, "");
    const name = String(recipient.name || "").trim();
    if (name && phone) return `${name} — +${phone}`;
    return name || (phone ? `+${phone}` : fallback);
  }

  function campaignLastRecipient(campaign) {
    return [...(campaign.recipients || [])]
      .filter(recipient => recipient.sentAt)
      .sort((a, b) => Number(b.sentAt) - Number(a.sentAt))[0];
  }

  function campaignNextRecipient(campaign) {
    return (campaign.recipients || []).find(recipient =>
      !recipient.sentAt && recipient.state !== "failed"
    );
  }

  const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.9v12.2c0 .8.9 1.3 1.6.8l9-6.1a1 1 0 0 0 0-1.6l-9-6.1C3.9.6 3 1.1 3 1.9Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.2A1.2 1.2 0 0 1 4.2 1h1.6A1.2 1.2 0 0 1 7 2.2v11.6A1.2 1.2 0 0 1 5.8 15H4.2A1.2 1.2 0 0 1 3 13.8V2.2Zm6 0A1.2 1.2 0 0 1 10.2 1h1.6A1.2 1.2 0 0 1 13 2.2v11.6a1.2 1.2 0 0 1-1.2 1.2h-1.6A1.2 1.2 0 0 1 9 13.8V2.2Z"/></svg>';

  function campaignHistoryDetails(campaign) {
    const progress = campaignProgressCount(campaign);
    const total = Number(campaign.total || 0);
    return `
      <div class="campaign-history-details">
        <div class="campaign-progress" title="${progress}/${total}" aria-label="Progresso: ${progress} de ${total}">
          <span style="width:${campaignRate(progress, total)}"></span>
        </div>
        <div class="campaign-current">
          <div><span>Último enviado</span><strong>${escapeHtml(campaignContactLabel(campaignLastRecipient(campaign), campaign.lastSent || "—"))}</strong></div>
          <div><span>Próximo envio</span><strong>${escapeHtml(campaignContactLabel(campaignNextRecipient(campaign), campaign.nextSend || "—"))}</strong></div>
        </div>
        ${(campaign.interruptionReason || campaign.pauseReason) ? `<div class="campaign-interruption-reason">${escapeHtml(campaign.interruptionReason || campaign.pauseReason)}</div>` : ""}
        <div class="campaign-stats">
          <button class="campaign-contacts-trigger" type="button"
            data-campaign-id="${escapeHtml(String(campaign.id))}" data-campaign-contacts="sent"
            title="Ver contatos enviados" aria-haspopup="dialog"
            aria-controls="campaignContactsModal"
            ${Number(campaign.sent || 0) > 0 ? "" : "disabled"}>
            <span>Enviados</span><strong>${Number(campaign.sent || 0)}</strong>
          </button>
          <button class="campaign-contacts-trigger" type="button"
            data-campaign-id="${escapeHtml(String(campaign.id))}" data-campaign-contacts="failed"
            title="Ver contatos que não foram enviados" aria-haspopup="dialog"
            aria-controls="campaignContactsModal"
            ${Number(campaign.failed || 0) > 0 ? "" : "disabled"}>
            <span>Falhas</span><strong>${Number(campaign.failed || 0)}</strong>
          </button>
          <div><span>Taxa de aproveitamento</span><strong>${campaignRate(campaign.sent, Number(campaign.sent || 0) + Number(campaign.failed || 0))}</strong></div>
          <div><span>Conclusão</span><strong>${campaignRate(progress, total)}</strong></div>
          <button class="campaign-contacts-trigger" type="button"
            data-campaign-id="${escapeHtml(String(campaign.id))}" data-campaign-contacts="opened"
            title="Ver contatos que abriram" aria-haspopup="dialog"
            aria-controls="campaignContactsModal"
            ${Number(campaign.opened || 0) > 0 ? "" : "disabled"}>
            <span>Abertos</span><strong>${Number(campaign.opened || 0)}</strong>
          </button>
          <div><span>Taxa de abertura</span><strong>${campaignRate(campaign.opened, campaign.sent)}</strong></div>
          <button class="campaign-contacts-trigger" type="button"
            data-campaign-id="${escapeHtml(String(campaign.id))}" data-campaign-contacts="responded"
            title="Ver contatos que responderam" aria-haspopup="dialog"
            aria-controls="campaignContactsModal"
            ${Number(campaign.responded || 0) > 0 ? "" : "disabled"}>
            <span>Respondidos</span><strong>${Number(campaign.responded || 0)}</strong>
          </button>
          <div><span>Taxa de resposta</span><strong>${campaignRate(campaign.responded, campaign.sent)}</strong></div>
        </div>
      </div>
    `;
  }

  function setBulkFormLocked(locked) {
    const form = document.querySelector(".bulk-form");
    if (!form) return;
    form.classList.toggle("is-preparing", locked);
    form.querySelectorAll("input, select, textarea, button:not(#startBulkSend)").forEach(control => {
      if (locked) {
        if (!bulkControlStates.has(control)) {
          bulkControlStates.set(control, control.disabled);
        }
        control.disabled = true;
      } else if (bulkControlStates.has(control)) {
        control.disabled = bulkControlStates.get(control);
        bulkControlStates.delete(control);
      }
    });
  }

  function configureCampaignContactsTrigger(selector, campaign, kind) {
    const trigger = $(selector);
    const config = campaignContactsConfig(kind);
    const count = Number(campaign?.[config.counter] || 0);
    trigger.dataset.campaignId = campaign.id;
    trigger.dataset.campaignContacts = kind;
    trigger.disabled = count <= 0;
    const actions = {
      sent: "foram enviados",
      failed: "não foram enviados",
      opened: "abriram",
      responded: "responderam"
    };
    trigger.setAttribute(
      "aria-label",
      count > 0
        ? `Ver ${count} contato(s) que ${actions[kind]}`
        : `Nenhum contato ${
            kind === "sent"
              ? "enviado"
              : kind === "failed"
                ? "com falha"
                : kind === "opened"
                  ? "abriu"
                  : "respondeu"
          }`
    );
  }

  function renderCampaigns() {
    const liveCampaign = campaigns.find(item => ["running", "paused"].includes(item.status));
    if (liveCampaign && !pinnedCampaignId) pinnedCampaignId = liveCampaign.id;
    const pinnedCampaign = pinnedCampaignId
      ? campaigns.find(item => item.id === pinnedCampaignId)
      : null;
    const panelCampaign = liveCampaign || pinnedCampaign;
    const historyCampaigns = campaigns.filter(item =>
      !["running", "paused"].includes(item.status) &&
      item.id !== panelCampaign?.id
    );
    if (!historyCampaigns.some(item => item.id === selectedCampaignId)) selectedCampaignId = "";

    $("#campaignHistoryCount").textContent = String(historyCampaigns.length);
    $("#deleteCampaignHistory").disabled =
      campaignHistoryDeletePending ||
      !campaigns.some(item => !["running", "paused"].includes(item.status));
    $("#startBulkSend").disabled = bulkRequestPending || Boolean(liveCampaign);
    setBulkFormLocked(bulkRequestPending);
    $("#campaignHistory").innerHTML = historyCampaigns.length
      ? historyCampaigns.map(campaign => `
          <div class="campaign-history-item${selectedCampaignId === campaign.id ? " is-expanded" : ""}">
            <button type="button" class="campaign-history-main" data-campaign-id="${campaign.id}">
              <div><strong>${escapeHtml(campaign.name)}</strong><span>${new Date(campaign.createdAt).toLocaleString("pt-BR")}</span></div>
              <div><strong>${escapeHtml(campaignStatusLabel(campaign.status))}</strong><span>${escapeHtml(campaign.listName || "Lista")}</span></div>
              <div><strong>${Number(campaign.sent || 0)} enviados</strong><span>${Number(campaign.failed || 0)} falhas</span></div>
              <div><strong>${campaignRate(campaign.responded, campaign.sent)} respostas</strong><span>${campaignRate(campaign.opened, campaign.sent)} aberturas</span></div>
            </button>
            ${["running", "paused"].includes(campaign.status)
              ? "<span></span>"
              : `<button type="button" class="campaign-history-delete" data-delete-campaign="${campaign.id}"
                  title="Excluir campanha" aria-label="Excluir campanha">×</button>`}
            ${selectedCampaignId === campaign.id ? campaignHistoryDetails(campaign) : ""}
          </div>
        `).join("")
      : '<div class="module-empty">Nenhuma campanha realizada.</div>';

    const campaign = panelCampaign;
    $("#bulkCampaignPanel").classList.toggle("hidden", !campaign);
    if (openCampaignContacts) {
      const modalCampaign = campaigns.find(
        item => item.id === openCampaignContacts.campaignId
      );
      if (modalCampaign) {
        renderCampaignContactsModal(modalCampaign, openCampaignContacts.kind);
      } else {
        closeCampaignContactsModal();
      }
    }
    if (!campaign) return;

    const status = campaignStatusLabel(campaign.status);
    $("#campaignActiveName").textContent = campaign.name;
    $("#campaignActiveDate").textContent = new Date(campaign.createdAt).toLocaleString("pt-BR");
    $("#campaignStatusBadge").textContent = status;
    $("#campaignStatusBadge").className = `campaign-status ${campaign.status}`;
    const pauseReason = String(campaign.pauseReason || "");
    $("#campaignPauseReason").textContent = pauseReason;
    $("#campaignPauseReason").classList.toggle(
      "hidden",
      campaign.status !== "paused" || !pauseReason
    );
    const campaignIsLive = ["running", "paused"].includes(campaign.status);
    const canEditCampaign = campaignIsLive;
    $("#campaignEditMessages").classList.toggle(
      "hidden",
      !canEditCampaign
    );
    $("#campaignEditMessages").dataset.campaignId = campaign.id;
    $("#campaignEditMessages").disabled =
      !canEditCampaign || campaign.status !== "paused";
    $("#campaignEditMessages").title = campaign.status === "paused"
      ? "Editar campanha"
      : "Pause a campanha para editar";
    $("#campaignEditMessages").setAttribute(
      "aria-label",
      $("#campaignEditMessages").title
    );
    $("#campaignPlayPause").classList.toggle("hidden", !campaignIsLive);
    $("#campaignCancel").classList.toggle("hidden", !campaignIsLive);
    $("#campaignPlayPause").innerHTML = campaign.status === "paused" ? playIcon : pauseIcon;
    $("#campaignPlayPause").title = campaign.status === "paused" ? "Retomar campanha" : "Pausar campanha";
    $("#campaignPlayPause").setAttribute("aria-label", $("#campaignPlayPause").title);
    $("#campaignDelete").classList.add("hidden");
    const progress = campaignProgressCount(campaign);
    const total = Number(campaign.total || 0);
    $("#campaignLastSent").textContent = campaignContactLabel(
      campaignLastRecipient(campaign),
      campaign.lastSent || "—"
    );
    $("#campaignNextSend").textContent = campaignContactLabel(
      campaignNextRecipient(campaign),
      campaign.nextSend || "—"
    );
    $("#campaignSent").textContent = String(campaign.sent || 0);
    $("#campaignFailed").textContent = String(campaign.failed || 0);
    $("#campaignOpened").textContent = String(campaign.opened || 0);
    $("#campaignResponded").textContent = String(campaign.responded || 0);
    configureCampaignContactsTrigger("#campaignSentMetric", campaign, "sent");
    configureCampaignContactsTrigger("#campaignFailureMetric", campaign, "failed");
    configureCampaignContactsTrigger("#campaignOpenedMetric", campaign, "opened");
    configureCampaignContactsTrigger("#campaignRespondedMetric", campaign, "responded");
    $("#campaignCompletion").textContent = campaignRate(progress, total);
    $("#campaignOpenRate").textContent = campaignRate(campaign.opened, campaign.sent);
    $("#campaignResponseRate").textContent = campaignRate(campaign.responded, campaign.sent);
    $("#campaignSuccessRate").textContent = campaignRate(
      campaign.sent,
      Number(campaign.sent || 0) + Number(campaign.failed || 0)
    );
    $("#campaignProgressBar").style.width = campaignRate(progress, total);
    $("#campaignProgressBar").parentElement.title = `${progress}/${total}`;
    $("#campaignProgressBar").parentElement.setAttribute("aria-label", `Progresso: ${progress} de ${total}`);
    if (campaign.id !== lastRenderedLiveCampaignId) {
      lastRenderedLiveCampaignId = campaign.id;
      requestAnimationFrame(() => {
        $("#bulkCampaignPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  async function loadCampaigns() {
    const stored = await chrome.storage.local.get("wfCampaigns");
    campaigns = Array.isArray(stored.wfCampaigns) ? stored.wfCampaigns : [];
    renderCampaigns();
  }

  const campaignHistoryHeaders = [
    "Versao", "ID", "Nome", "Lista", "Fluxo", "Tipo", "Status",
    "CriadaEm", "IniciadaEm", "FinalizadaEm", "Total", "Enviados",
    "Falhas", "Abertos", "Respondidos", "Processados", "UltimoEnviado",
    "DestinatariosJSON", "ErrosJSON", "MotivoInterrupcao"
  ];

  function historyCsvCell(value) {
    const text = String(value ?? "");
    return /[",;\t\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function historyDate(value) {
    const number = Number(value || 0);
    return number ? new Date(number).toISOString() : "";
  }

  function parseHistoryDate(value) {
    if (!value) return null;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  $("#exportCampaignHistory").addEventListener("click", () => {
    const history = campaigns.filter(item => !["running", "paused"].includes(item.status));
    const feedback = $("#campaignHistoryFeedback");
    if (!history.length) {
      feedback.textContent = "Não há campanhas no histórico para exportar.";
      return;
    }
    const rows = [
      campaignHistoryHeaders,
      ...history.map(campaign => [
        "1",
        campaign.id,
        campaign.name,
        campaign.listName,
        campaign.flowName,
        campaign.sendType,
        campaign.status,
        historyDate(campaign.createdAt),
        historyDate(campaign.startedAt),
        historyDate(campaign.finishedAt),
        campaign.total,
        campaign.sent,
        campaign.failed,
        campaign.opened,
        campaign.responded,
        campaign.processed,
        campaign.lastSent,
        JSON.stringify(campaign.recipients || []),
        JSON.stringify(campaign.errors || []),
        campaign.interruptionReason || ""
      ])
    ];
    const csv = "\uFEFF" + rows.map(row => row.map(historyCsvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-campanhas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = `${history.length} campanha(s) exportada(s).`;
  });

  $("#importCampaignHistory").addEventListener("click", () => {
    $("#campaignHistoryFile").click();
  });

  $("#campaignHistoryFile").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    const feedback = $("#campaignHistoryFeedback");
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      feedback.textContent = "Selecione um arquivo CSV de histórico.";
      return;
    }
    if (campaigns.some(item => ["running", "paused"].includes(item.status))) {
      feedback.textContent = "Finalize ou interrompa a campanha atual antes de importar um histórico.";
      return;
    }
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("O arquivo não contém campanhas.");
      const headers = rows[0].map(value =>
        normalizeHeader(value).replace(/^\uFEFF/, "")
      );
      const column = name => headers.indexOf(normalizeHeader(name));
      if (column("ID") < 0 || column("Nome") < 0 || column("DestinatariosJSON") < 0) {
        throw new Error("Este CSV não corresponde a um histórico do WhatsFlow.");
      }
      const existingIds = new Set(campaigns.map(item => String(item.id)));
      const imported = [];
      for (const row of rows.slice(1)) {
        const value = name => row[column(name)] ?? "";
        let recipients = [];
        let errors = [];
        try {
          recipients = JSON.parse(value("DestinatariosJSON") || "[]");
          errors = JSON.parse(value("ErrosJSON") || "[]");
        } catch {
          throw new Error(`Dados internos inválidos na campanha "${value("Nome")}".`);
        }
        const originalId = String(value("ID") || uid());
        if (existingIds.has(originalId)) continue;
        existingIds.add(originalId);
        const originalStatus = String(value("Status") || "interrupted");
        imported.push({
          id: originalId,
          runnerId: "imported",
          name: String(value("Nome") || "Campanha importada"),
          listName: String(value("Lista") || ""),
          flowName: String(value("Fluxo") || ""),
          sendType: String(value("Tipo") || ""),
          status: ["completed", "interrupted"].includes(originalStatus)
            ? originalStatus
            : "interrupted",
          createdAt: parseHistoryDate(value("CriadaEm")) || Date.now(),
          startedAt: parseHistoryDate(value("IniciadaEm")),
          finishedAt: parseHistoryDate(value("FinalizadaEm")) || Date.now(),
          total: Math.max(0, Number(value("Total")) || recipients.length),
          sent: Math.max(0, Number(value("Enviados")) || 0),
          failed: Math.max(0, Number(value("Falhas")) || 0),
          opened: Math.max(0, Number(value("Abertos")) || 0),
          responded: Math.max(0, Number(value("Respondidos")) || 0),
          processed: Math.max(0, Number(value("Processados")) || 0),
          lastSent: String(value("UltimoEnviado") || ""),
          nextSend: "",
          recipients: Array.isArray(recipients) ? recipients : [],
          errors: Array.isArray(errors) ? errors : [],
          interruptionReason: String(value("MotivoInterrupcao") || ""),
          importedAt: Date.now()
        });
      }
      if (!imported.length) {
        feedback.textContent = "Nenhuma campanha nova foi importada; os registros já existiam.";
        return;
      }
      campaigns = [...imported, ...campaigns]
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
        .slice(0, 100);
      await chrome.storage.local.set({ wfCampaigns: campaigns });
      renderCampaigns();
      feedback.textContent = `${imported.length} campanha(s) importada(s) e salva(s).`;
    } catch (error) {
      feedback.textContent = `Erro ao importar: ${error?.message || error}`;
    }
  });

  document.querySelectorAll("[data-app-section]").forEach(button => {
    button.addEventListener("click", () => {
      const section = button.dataset.appSection;
      if (section !== "flows" && typeof closeLibrary === "function") closeLibrary(false);
      document.querySelectorAll("[data-app-section]").forEach(item =>
        item.classList.toggle("active", item === button)
      );
      $("#flowsSection").classList.toggle("hidden", section !== "flows");
      $("#contactsSection").classList.toggle("hidden", section !== "contacts");
      $("#bulkSection").classList.toggle("hidden", section !== "bulk");
      $(".workflow-actions").classList.toggle("hidden", section !== "flows");
      if (section !== "bulk") {
        pinnedCampaignId = "";
        lastRenderedLiveCampaignId = "";
      } else {
        renderBulkOptions();
        renderCampaigns();
      }
    });
  });

  $("#importContacts").addEventListener("click", async () => {
    const file = $("#contactFile").files[0];
    const name = $("#contactListName").value.trim();
    const feedback = $("#contactImportFeedback");
    if (!name || !file) {
      feedback.textContent = "Informe o nome da lista e selecione uma planilha.";
      return;
    }
    try {
      feedback.textContent = "Importando...";
      const contacts = await readContactFile(file);
      if (!contacts.length) throw new Error("Nenhum contato válido foi encontrado.");
      const list = { id: uid(), name, contacts, createdAt: Date.now() };
      contactLists.push(list);
      selectedContactListId = list.id;
      await saveContactLists();
      $("#contactListName").value = "";
      $("#contactFile").value = "";
      feedback.textContent = `${contacts.length} contato(s) importado(s).`;
      renderContactLists();
    } catch (error) {
      feedback.textContent = `Erro: ${error?.message || error}`;
    }
  });

  $("#contactLists").addEventListener("click", async event => {
    const deleteButton = event.target.closest("[data-delete-contact-list]");
    if (deleteButton) {
      await deleteContactListById(deleteButton.dataset.deleteContactList);
      return;
    }

    const downloadButton = event.target.closest("[data-download-contact-list]");
    if (downloadButton) {
      downloadContactListById(downloadButton.dataset.downloadContactList);
      return;
    }

    const item = event.target.closest("[data-contact-list]");
    if (!item) return;
    selectedContactListId = item.dataset.contactList;
    selectedTagFilter = "";
    addingManualContact = false;
    selectedContactId = "";
    renderContactLists();
  });

  $("#contactTagFilter").addEventListener("change", event => {
    selectedTagFilter = event.target.value;
    renderContactLists();
  });

  $("#addManualContact").addEventListener("click", () => {
    addingManualContact = true;
    renderContactLists();
    $("#contactsTableBody [data-manual-contact='firstName']")?.focus();
  });

  async function commitManualContact() {
    if (!addingManualContact || manualContactSavePending) return false;
    const row = $("#contactsTableBody [data-manual-contact-row]");
    const list = selectedList();
    if (!row || !list) return false;

    const value = field =>
      row.querySelector(`[data-manual-contact="${field}"]`)?.value.trim() || "";
    const firstName = value("firstName");
    const phone = normalizePhone(value("phone"));
    if (!firstName || phone.length < 10) {
      alert("Informe o nome e um telefone válido.");
      const invalidField = !firstName ? "firstName" : "phone";
      row.querySelector(`[data-manual-contact="${invalidField}"]`)?.focus();
      return false;
    }

    manualContactSavePending = true;
    const contact = {
      id: uid(),
      firstName,
      lastName: value("lastName"),
      phone,
      tag: value("tag")
    };
    list.contacts.push(contact);
    addingManualContact = false;

    try {
      await saveContactLists();
      renderContactLists();
      return true;
    } catch (error) {
      list.contacts = list.contacts.filter(item => item.id !== contact.id);
      addingManualContact = true;
      alert(`Não foi possível salvar o contato: ${error?.message || error}`);
      renderContactLists();
      $("#contactsTableBody [data-manual-contact='firstName']")?.focus();
      return false;
    } finally {
      manualContactSavePending = false;
    }
  }

  $("#contactsTableBody").addEventListener("click", event => {
    if (event.target.closest("[data-cancel-manual-contact]")) {
      addingManualContact = false;
      renderContactLists();
      return;
    }
  });

  $("#contactsTableBody").addEventListener("keydown", event => {
    if (!event.target.matches("[data-manual-contact]") || event.key !== "Enter") return;
    event.preventDefault();
    commitManualContact();
  });

  $("#contactsTableBody").addEventListener("focusout", event => {
    const row = event.target.closest("[data-manual-contact-row]");
    if (!row || !addingManualContact) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget && row.contains(nextTarget)) return;

    if (nextTarget) {
      commitManualContact();
      return;
    }

    setTimeout(() => {
      const currentRow = $("#contactsTableBody [data-manual-contact-row]");
      if (
        currentRow &&
        addingManualContact &&
        !currentRow.contains(document.activeElement)
      ) {
        commitManualContact();
      }
    }, 0);
  });

  $("#contactsTableBody").addEventListener("click", event => {
    const deleteButton = event.target.closest("[data-delete-contact]");
    if (deleteButton) {
      const list = selectedList();
      const contact = list?.contacts.find(item => item.id === deleteButton.dataset.deleteContact);
      if (!list || !contact) return;
      const label = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phone;
      if (!confirm(`Excluir o contato "${label}" desta lista?`)) return;
      list.contacts = list.contacts.filter(item => item.id !== contact.id);
      selectedContactId = "";
      saveContactLists().then(renderContactLists);
      return;
    }

    const cell = event.target.closest("[data-contact-field]");
    if (!cell || cell.isContentEditable) return;
    selectedContactId = cell.dataset.contactId;
    document.querySelectorAll("#contactsTableBody [data-contact-row]").forEach(row => {
      row.classList.toggle("selected", row.dataset.contactRow === selectedContactId);
    });
    cell.dataset.originalValue = cell.textContent;
    cell.contentEditable = "true";
    cell.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cell);
    selection.removeAllRanges();
    selection.addRange(range);
  });

  $("#contactsTableBody").addEventListener("keydown", event => {
    const cell = event.target.closest("[data-contact-field]");
    if (!cell?.isContentEditable) return;
    if (event.key === "Enter") {
      event.preventDefault();
      cell.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cell.textContent = cell.dataset.originalValue || "";
      cell.dataset.cancelEdit = "true";
      cell.blur();
    }
  });

  $("#contactsTableBody").addEventListener("focusout", async event => {
    const cell = event.target.closest("[data-contact-field]");
    if (!cell?.isContentEditable) return;
    cell.contentEditable = "false";
    if (cell.dataset.cancelEdit === "true") {
      delete cell.dataset.cancelEdit;
      return;
    }

    const list = selectedList();
    const contact = list?.contacts.find(item => item.id === cell.dataset.contactId);
    const field = cell.dataset.contactField;
    if (!contact || !["firstName", "lastName", "phone", "tag"].includes(field)) return;

    let value = cell.textContent.replace(/\s+/g, " ").trim();
    if (field === "phone") value = normalizePhone(value);
    if ((field === "firstName" && !value) || (field === "phone" && value.length < 10)) {
      cell.textContent = cell.dataset.originalValue || "";
      return;
    }

    contact[field] = value;
    await saveContactLists();
    renderContactLists();
  });

  $("#selectedContactListName").addEventListener("click", event => {
    const list = selectedList();
    if (!list || event.currentTarget.isContentEditable) return;
    originalListName = list.name;
    event.currentTarget.contentEditable = "true";
    event.currentTarget.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(event.currentTarget);
    selection.removeAllRanges();
    selection.addRange(range);
  });

  $("#selectedContactListName").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.textContent = originalListName;
      event.currentTarget.blur();
    }
  });

  $("#selectedContactListName").addEventListener("blur", async event => {
    if (!event.currentTarget.isContentEditable) return;
    const list = selectedList();
    const nextName = event.currentTarget.textContent.trim();
    event.currentTarget.contentEditable = "false";
    if (list && nextName) {
      list.name = nextName;
      await saveContactLists();
    }
    renderContactLists();
  });

  $("#bulkSendType").addEventListener("change", event => {
    const useFlow = event.target.value === "flow";
    $("#bulkFlowField").classList.toggle("hidden", !useFlow);
    $("#bulkMessageField").classList.toggle("hidden", useFlow);
  });
  $("#bulkContactList").addEventListener("change", async () => {
    renderBulkTagOptions({ preserveSelection: false });
    updateBulkRecipientCount();
    if ([WHATSAPP_ALL_CONTACTS, WHATSAPP_LABEL_CONTACTS].includes($("#bulkContactList").value)) {
      await loadWhatsappBulkContacts({ force: true });
    } else {
      $("#bulkFeedback").textContent = "";
    }
  });
  $("#bulkTagRules").addEventListener("change", event => {
    const row = event.target.closest("[data-bulk-rule-id]");
    const rule = bulkTagRules.find(candidate => candidate.id === row?.dataset.bulkRuleId);
    if (!rule) return;
    if (event.target.matches("[data-bulk-rule-action]")) {
      rule.action = event.target.value === "exclude" &&
        [WHATSAPP_ALL_CONTACTS, WHATSAPP_LABEL_CONTACTS].includes($("#bulkContactList").value)
        ? "exclude" : "include";
    } else if (event.target.matches("[data-bulk-rule-tag]")) {
      rule.tag = event.target.value;
    } else return;
    renderBulkTagOptions();
    updateBulkRecipientCount();
  });
  $("#bulkTagRules").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-bulk-rule]");
    if (!button) return;
    const id = button.closest("[data-bulk-rule-id]")?.dataset.bulkRuleId;
    bulkTagRules = bulkTagRules.filter(rule => rule.id !== id);
    renderBulkTagOptions();
    updateBulkRecipientCount();
  });
  $("#bulkAddTagRule").addEventListener("click", () => {
    bulkTagRules.push(newBulkTagRule());
    renderBulkTagOptions();
    updateBulkRecipientCount();
    $("#bulkTagRules [data-bulk-rule-id]:last-child [data-bulk-rule-action]")?.focus();
  });
  $("#bulkIncludeModeWrap").addEventListener("click", event => {
    const button = event.target.closest("[data-bulk-match]");
    if (!button || button.disabled) return;
    bulkIncludeMode = button.dataset.bulkMatch === "all" ? "all" : "any";
    renderBulkTagOptions();
    updateBulkRecipientCount();
  });

  $("#campaignHistory").addEventListener("click", event => {
    const contactsButton = event.target.closest("[data-campaign-contacts]");
    if (contactsButton) {
      openCampaignContactsModal(
        contactsButton.dataset.campaignId,
        contactsButton.dataset.campaignContacts,
        contactsButton
      );
      return;
    }
    const deleteButton = event.target.closest("[data-delete-campaign]");
    if (deleteButton) {
      deleteCampaign(deleteButton.dataset.deleteCampaign);
      return;
    }
    const item = event.target.closest("[data-campaign-id]");
    if (!item) return;
    selectedCampaignId = selectedCampaignId === item.dataset.campaignId
      ? ""
      : item.dataset.campaignId;
    renderCampaigns();
  });

  [
    "#campaignSentMetric",
    "#campaignFailureMetric",
    "#campaignOpenedMetric",
    "#campaignRespondedMetric"
  ]
    .forEach(selector => {
      $(selector).addEventListener("click", event => {
        openCampaignContactsModal(
          event.currentTarget.dataset.campaignId,
          event.currentTarget.dataset.campaignContacts,
          event.currentTarget
        );
      });
    });

  $("#campaignContactsSearch").addEventListener("input", () => {
    if (!openCampaignContacts) return;
    const campaign = campaigns.find(
      item => item.id === openCampaignContacts.campaignId
    );
    if (campaign) {
      renderCampaignContactsModal(campaign, openCampaignContacts.kind);
    }
  });

  $("#closeCampaignContacts").addEventListener("click", closeCampaignContactsModal);

  $("#campaignContactsModal").addEventListener("click", event => {
    if (event.target === event.currentTarget) closeCampaignContactsModal();
  });

  $("#campaignEditMessages").addEventListener("click", async event => {
    try {
      await openCampaignMessageEditor(event.currentTarget);
    } catch (error) {
      $("#bulkFeedback").textContent =
        `Erro ao abrir a campanha: ${error?.message || error}`;
    }
  });
  $("#closeCampaignMessageModal").addEventListener(
    "click",
    closeCampaignMessageEditor
  );
  $("#cancelCampaignMessageEdit").addEventListener(
    "click",
    closeCampaignMessageEditor
  );
  $("#campaignMessageModal").addEventListener("click", event => {
    if (event.target === event.currentTarget) closeCampaignMessageEditor();
  });
  $("#addCampaignMessageVariation").addEventListener("click", () => {
    const messages = [...document.querySelectorAll("[data-campaign-message]")]
      .map(textarea => textarea.value);
    if (messages.length >= 5) return;
    renderCampaignMessageFields([...messages, ""]);
    [...document.querySelectorAll("[data-campaign-message]")].at(-1)?.focus();
  });
  $("#campaignMessageFields").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-campaign-message]");
    if (!remove) return;
    const messages = [...document.querySelectorAll("[data-campaign-message]")]
      .map(textarea => textarea.value);
    if (messages.length <= 1) return;
    messages.splice(Number(remove.dataset.removeCampaignMessage), 1);
    renderCampaignMessageFields(messages);
  });
  $("#campaignMessageFields").addEventListener("focusin", event => {
    if (event.target.matches("[data-campaign-message]")) {
      activeCampaignMessageTextarea = event.target;
    }
  });
  $("#campaignEditMessageSection").addEventListener("click", event => {
    const button = event.target.closest("[data-campaign-variable]");
    if (!button) return;
    const textarea =
      activeCampaignMessageTextarea ||
      $("#campaignMessageFields [data-campaign-message]");
    if (!textarea) return;
    const variable = button.dataset.campaignVariable;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.setRangeText(variable, start, end, "end");
    textarea.focus();
  });
  $("#campaignEditToggleDelay").addEventListener("click", () => {
    editingCampaignVaryDelay = !editingCampaignVaryDelay;
    updateCampaignEditDelay();
  });
  $("#saveCampaignMessageEdit").addEventListener(
    "click",
    saveCampaignMessageEditor
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && editingCampaignMessageId) {
      event.preventDefault();
      closeCampaignMessageEditor();
      return;
    }
    if (event.key === "Tab" && editingCampaignMessageId) {
      const modal = $("#campaignMessageModal");
      const dialog = $(".campaign-message-dialog");
      const focusable = [...modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        document.activeElement === dialog ||
        !modal.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === "Escape" && openCampaignContacts) {
      event.preventDefault();
      closeCampaignContactsModal();
      return;
    }
    if (event.key === "Tab" && openCampaignContacts) {
      const focusable = [...$("#campaignContactsModal").querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) {
        event.preventDefault();
        $(".campaign-contacts-dialog")?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        document.activeElement === $(".campaign-contacts-dialog") ||
        !$("#campaignContactsModal").contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  $("#campaignPlayPause").addEventListener("click", async () => {
    const campaign = campaigns.find(item => ["running", "paused"].includes(item.status));
    if (!campaign || !["running", "paused"].includes(campaign.status)) return;
    const tab = await getWhatsAppTab();
    if (!tab) return void ($("#bulkFeedback").textContent = "Abra o WhatsApp Web para controlar a campanha.");
    const action = campaign.status === "paused" ? "resume" : "pause";
    try {
      if (action === "resume") {
        $("#bulkFeedback").textContent =
          "Confirmando a nova conexão do WhatsApp antes de retomar...";
        await ensureBulkReceiver(tab.id);
      }
      const result = await chrome.tabs.sendMessage(tab.id, {
        type: "WF_BULK_CONTROL",
        payload: { campaignId: campaign.id, action }
      });
      if (!result?.ok) {
        throw new Error(result?.error || "O WhatsApp não confirmou o controle da campanha.");
      }
      $("#bulkFeedback").textContent = action === "resume"
        ? "Campanha retomada do próximo contato pendente."
        : "Campanha pausada com segurança.";
    } catch (error) {
      $("#bulkFeedback").textContent =
        `Não foi possível ${action === "resume" ? "retomar" : "pausar"}: ${error?.message || error}`;
    }
  });

  async function deleteCampaign(campaignId) {
    const campaign = campaigns.find(item => item.id === campaignId);
    if (!campaign || ["running", "paused"].includes(campaign.status)) return;
    if (!confirm(`Excluir a campanha "${campaign.name}" e todas as suas estatísticas?`)) return;
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
    if (tabs.length) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: "WF_BULK_CONTROL",
          payload: { campaignId: campaign.id, action: "delete" }
        });
      } catch {}
    }
    campaigns = campaigns.filter(item => item.id !== campaign.id);
    selectedCampaignId = campaigns[0]?.id || "";
    await chrome.storage.local.set({ wfCampaigns: campaigns });
    renderCampaigns();
  }

  async function deleteAllCampaignHistory() {
    const history = campaigns.filter(item =>
      !["running", "paused"].includes(item.status)
    );
    const feedback = $("#campaignHistoryFeedback");
    if (!history.length) {
      feedback.textContent = "Não há campanhas no histórico para excluir.";
      renderCampaigns();
      return;
    }
    if (!confirm(
      `Excluir permanentemente as ${history.length} campanhas do histórico e todas as suas estatísticas?`
    )) return;

    const historyIds = new Set(history.map(item => String(item.id)));
    campaignHistoryDeletePending = true;
    renderCampaigns();
    try {
      try {
        const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
        await Promise.allSettled(
          tabs
            .filter(tab => Number.isInteger(tab.id))
            .map(tab => chrome.tabs.sendMessage(tab.id, {
              type: "WF_BULK_CONTROL",
              payload: {
                action: "delete-many",
                campaignIds: [...historyIds]
              }
            }))
        );
      } catch {}

      const stored = await chrome.storage.local.get("wfCampaigns");
      const latestCampaigns = Array.isArray(stored.wfCampaigns)
        ? stored.wfCampaigns
        : [];
      campaigns = latestCampaigns.filter(item =>
        !historyIds.has(String(item.id)) ||
        ["running", "paused"].includes(item.status)
      );
      const remainingIds = new Set(campaigns.map(item => String(item.id)));
      const removedCount = [...historyIds].filter(id => !remainingIds.has(id)).length;

      if (!remainingIds.has(String(selectedCampaignId))) selectedCampaignId = "";
      if (!remainingIds.has(String(pinnedCampaignId))) pinnedCampaignId = "";
      if (
        openCampaignContacts &&
        !remainingIds.has(String(openCampaignContacts.campaignId))
      ) {
        closeCampaignContactsModal();
      }

      await chrome.storage.local.set({ wfCampaigns: campaigns });
      feedback.textContent = `${removedCount} campanha(s) excluída(s) do histórico.`;
    } catch (error) {
      feedback.textContent = `Erro ao excluir o histórico: ${error?.message || error}`;
    } finally {
      campaignHistoryDeletePending = false;
      renderCampaigns();
    }
  }

  $("#deleteCampaignHistory").addEventListener("click", deleteAllCampaignHistory);

  $("#campaignDelete").addEventListener("click", () => {
    deleteCampaign(selectedCampaignId);
  });

  $("#campaignCancel").addEventListener("click", async () => {
    const campaign = campaigns.find(item => ["running", "paused"].includes(item.status));
    if (!campaign || !["running", "paused"].includes(campaign.status)) return;
    if (!confirm(`Cancelar a campanha "${campaign.name}"? Ela ficará no histórico como interrompida.`)) return;
    const tab = await getWhatsAppTab();
    if (!tab) return void ($("#bulkFeedback").textContent = "Abra o WhatsApp Web para cancelar a campanha.");
    await chrome.tabs.sendMessage(tab.id, {
      type: "WF_BULK_CONTROL",
      payload: { campaignId: campaign.id, action: "cancel" }
    });
  });

  $("#bulkVariablesMenu").addEventListener("click", event => {
    const button = event.target.closest("[data-bulk-variable]");
    if (!button) return;
    const textarea = activeBulkMessageTextarea || $("#bulkMessage");
    const variable = button.dataset.bulkVariable;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.setRangeText(variable, start, end, "end");
    textarea.focus();
  });

  function updateBulkMessageVariations() {
    const variations = [...document.querySelectorAll(".bulk-message-variation")];
    variations.forEach((variation, index) => {
      variation.querySelector(".bulk-message-variation-head").classList.toggle(
        "hidden",
        variations.length === 1
      );
      variation.querySelector(".bulk-message-variation-head span").textContent =
        variations.length > 1 ? `Mensagem ${index + 1}` : "Mensagem";
      variation.querySelector("[data-remove-bulk-message]").classList.toggle(
        "hidden",
        variations.length === 1
      );
    });
    $("#addBulkMessageVariation").disabled = variations.length >= 5;
    $("#addBulkMessageVariation").textContent =
      variations.length >= 5 ? "Limite de 5 variações" : "+ Variação";
  }

  $("#bulkMessageVariations").addEventListener("focusin", event => {
    if (event.target.matches("[data-bulk-message]")) {
      activeBulkMessageTextarea = event.target;
    }
  });

  $("#addBulkMessageVariation").addEventListener("click", () => {
    const container = $("#bulkMessageVariations");
    if (container.querySelectorAll(".bulk-message-variation").length >= 5) return;
    const variation = document.createElement("div");
    variation.className = "bulk-message-variation";
    variation.innerHTML = `
      <div class="bulk-message-variation-head">
        <span>Mensagem</span>
        <button type="button" data-remove-bulk-message aria-label="Remover variação">×</button>
      </div>
      <textarea data-bulk-message placeholder="Escreva outra variação da mensagem."></textarea>
    `;
    container.appendChild(variation);
    updateBulkMessageVariations();
    variation.querySelector("textarea").focus();
  });

  $("#bulkMessageVariations").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-bulk-message]");
    if (!remove) return;
    const variations = document.querySelectorAll(".bulk-message-variation");
    if (variations.length <= 1) return;
    remove.closest(".bulk-message-variation").remove();
    activeBulkMessageTextarea = null;
    updateBulkMessageVariations();
  });

  $("#bulkToggleDelay").addEventListener("click", () => {
    varyBulkDelay = !varyBulkDelay;
    $("#bulkFixedDelay").classList.toggle("hidden", varyBulkDelay);
    $("#bulkRangeDelay").classList.toggle("hidden", !varyBulkDelay);
    $("#bulkToggleDelay").textContent = varyBulkDelay ? "Usar tempo fixo" : "Variar intervalo";
    $("#bulkToggleDelay").classList.toggle("active", varyBulkDelay);
  });

  async function sendBulkRequest(tabId, payload) {
    await ensureBulkReceiver(tabId);
    return chrome.tabs.sendMessage(tabId, {
      type: "WF_BULK_START",
      payload
    });
  }

  async function getWhatsAppTab() {
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
    return tabs.sort((first, second) =>
      Number(second.lastAccessed || 0) - Number(first.lastAccessed || 0)
    )[0] || null;
  }

  async function waitForBulkReceiver(tabId, timeout = 70000) {
    const startedAt = Date.now();
    let lastReady = null;
    let lastError = "";
    let protocolMismatchSince = 0;
    while (Date.now() - startedAt < timeout) {
      try {
        const ready = await chrome.tabs.sendMessage(tabId, { type: "WF_BULK_READY" });
        lastReady = ready;
        if (ready?.transientError) lastError = String(ready.transientError);
        if (
          ready?.protocol === 13 &&
          ready?.bridgeVersion === 13 &&
          ready.bridgeReady &&
          ready.authenticated &&
          ready.connected
        ) return ready;
        if (ready?.error) {
          throw new Error(`Falha ao carregar o motor no WhatsApp: ${ready.error}`);
        }
        if (
          (ready?.protocol && ready.protocol !== 13) ||
          (ready?.bridgeVersion && ready.bridgeVersion !== 13)
        ) {
          protocolMismatchSince ||= Date.now();
          $("#bulkFeedback").textContent = "Aguardando a versão atual da extensão no WhatsApp...";
          if (Date.now() - protocolMismatchSince > 5000) {
            throw new Error(
              "A aba do WhatsApp está usando uma versão antiga da extensão. Recarregue a extensão em chrome://extensions e atualize o WhatsApp Web."
            );
          }
        } else if (!ready?.bridgeReady) {
          protocolMismatchSince = 0;
          $("#bulkFeedback").textContent = "Carregando o motor dentro do WhatsApp...";
        } else if (!ready?.authenticated) {
          protocolMismatchSince = 0;
          $("#bulkFeedback").textContent = "Aguardando a autenticação do WhatsApp Web...";
        } else if (!ready?.connected) {
          protocolMismatchSince = 0;
          $("#bulkFeedback").textContent = "WhatsApp Web desconectado. Aguardando reconexão...";
        }
      } catch (error) {
        lastError = String(error?.message || error);
        if (/versão antiga da extensão|Falha ao carregar o motor/i.test(String(error?.message || error))) {
          throw error;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (
      (lastReady?.protocol && lastReady.protocol !== 13) ||
      (lastReady?.bridgeVersion && lastReady.bridgeVersion !== 13)
    ) {
      throw new Error("Recarregue a extensão em chrome://extensions e depois atualize o WhatsApp Web.");
    }
    if (!lastReady?.bridgeReady) {
      throw new Error("O motor não carregou dentro do WhatsApp Web. Atualize a aba e tente novamente.");
    }
    if (!lastReady?.authenticated) {
      throw new Error("O WhatsApp Web não está autenticado. Conecte sua conta e tente novamente.");
    }
    if (!lastReady?.connected) {
      throw new Error("O WhatsApp Web está desconectado. Restabeleça a conexão antes de iniciar.");
    }
    if (lastError) {
      throw new Error(`A aba do WhatsApp não respondeu à extensão: ${lastError}`);
    }
    throw new Error("A aba do WhatsApp não respondeu à extensão. Atualize a aba e tente novamente.");
  }

  async function ensureBulkReceiver(tabId) {
    try {
      const ready = await chrome.tabs.sendMessage(tabId, { type: "WF_BULK_READY" });
      if (ready?.protocol === 13 && ready?.bridgeVersion === 13) {
        if (ready.bridgeReady && ready.authenticated && ready.connected) return ready;
        return waitForBulkReceiver(tabId);
      }
      await chrome.tabs.reload(tabId);
      return waitForBulkReceiver(tabId);
    } catch (error) {
      const message = String(error?.message || error);
      if (!/Receiving end does not exist|Could not establish connection/i.test(message)) {
        throw error;
      }

      await chrome.tabs.reload(tabId);
      return waitForBulkReceiver(tabId);
    }
  }

  $("#startBulkSend").addEventListener("click", async () => {
    const contactSource = $("#bulkContactList").value;
    const list = contactLists.find(item => item.id === contactSource);
    const isWhatsappSource = [WHATSAPP_ALL_CONTACTS, WHATSAPP_LABEL_CONTACTS].includes(contactSource);
    const selectedTags = selectedBulkTags();
    const selectedTagNames = bulkTagNames(selectedTags);
    const excludedTagNames = bulkTagNames(selectedBulkExcludedTagValues);
    const contacts = selectedBulkContacts();
    const type = $("#bulkSendType").value;
    const flowId = $("#bulkFlow").value;
    const texts = [...document.querySelectorAll("[data-bulk-message]")]
      .map(textarea => textarea.value.trim())
      .filter(Boolean);
    const text = texts[0] || "";
    const delaySeconds = Math.max(1, Number($("#bulkDelay").value) || 5);
    const delayMinSeconds = Math.max(1, Number($("#bulkDelayMin").value) || 5);
    const delayMaxSeconds = Math.max(delayMinSeconds, Number($("#bulkDelayMax").value) || delayMinSeconds);
    const campaignName = $("#bulkCampaignName").value.trim();
    const feedback = $("#bulkFeedback");

    if (!campaignName) return void (feedback.textContent = "Informe um nome para a campanha.");
    if (campaigns.some(item => ["running", "paused"].includes(item.status))) {
      return void (feedback.textContent = "Já existe uma campanha em execução ou pausada.");
    }
    if (!list && !isWhatsappSource) return void (feedback.textContent = "Selecione uma origem de contatos.");
    const incompleteRule = incompleteBulkRuleIndex(contactSource);
    if (incompleteRule >= 0) {
      return void (feedback.textContent = `Escolha uma etiqueta na regra ${incompleteRule + 1} ou remova essa regra antes de iniciar.`);
    }
    if (contactSource === WHATSAPP_LABEL_CONTACTS && !selectedTags.length) {
      return void (feedback.textContent = "Selecione ao menos uma etiqueta do WhatsApp.");
    }
    if (!contacts.length) return void (feedback.textContent = "Nenhum contato corresponde ao filtro selecionado.");
    if (type === "flow" && !flowId) return void (feedback.textContent = "Selecione um fluxo.");
    if (type === "message" && !texts.length) return void (feedback.textContent = "Escreva ao menos uma mensagem.");
    const filterSummary = isWhatsappSource
      ? `${selectedTagNames.length ? `Incluir (${bulkIncludeMode === "all" ? "todas juntas" : "qualquer uma"}): ${selectedTagNames.join(", ")}` : "Incluir: todos os contatos"}${excludedTagNames.length ? `\nExcluir se tiver: ${excludedTagNames.join(", ")}` : ""}`
      : selectedTagNames.length ? `Etiquetas da lista: ${selectedTagNames.join(", ")}` : "Todos os contatos da lista";
    if (!confirm(`Iniciar o envio para ${contacts.length} contato(s)?\n${filterSummary}`)) return;

    const button = $("#startBulkSend");
    bulkRequestPending = true;
    button.disabled = true;
    renderCampaigns();
    let campaignStarted = false;
    feedback.textContent = "Procurando o WhatsApp Web...";
    try {
      const whatsappTab = await getWhatsAppTab();
      if (!whatsappTab) throw new Error("Abra o WhatsApp Web antes de iniciar.");
      selectedCampaignId = "";
      feedback.textContent = "Preparando o motor do WhatsApp...";
      const result = await sendBulkRequest(whatsappTab.id, {
        name: campaignName,
        listName: isWhatsappSource
          ? (contactSource === WHATSAPP_ALL_CONTACTS ? "WhatsApp — todos os contatos" : `WhatsApp — ${selectedTagNames.join(", ")}`)
          : list.name,
        listId: isWhatsappSource ? contactSource : list.id,
        tagFilter: filterSummary.replaceAll("\n", " | "),
        contacts,
        sendType: type,
        flowId,
        text,
        texts,
        delaySeconds,
        varyDelay: varyBulkDelay,
        delayMinSeconds,
        delayMaxSeconds
      });
      if (!result?.ok) throw new Error(result?.error || "Falha no disparo.");
      if (result.started) {
        campaignStarted = true;
        pinnedCampaignId = result.campaignId || pinnedCampaignId;
        bulkRequestPending = false;
        renderCampaigns();
        feedback.textContent = `Campanha iniciada para ${contacts.length} contato(s).`;
        return;
      }
      if (result.cancelled) {
        feedback.textContent = `Campanha interrompida: ${result.sent} enviado(s), ${result.failed} falha(s).`;
        return;
      }
      feedback.textContent = `Concluído: ${result.sent} enviado(s), ${result.failed} falha(s).`;
    } catch (error) {
      const message = String(error?.message || error);
      feedback.textContent = /Extension context invalidated/i.test(message)
        ? "A extensão foi recarregada. Feche esta página, abra novamente o WhatsFlow e atualize o WhatsApp Web."
        : `Erro: ${message}`;
    } finally {
      if (!campaignStarted) bulkRequestPending = false;
      renderCampaigns();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.wfContactLists) {
      contactLists = Array.isArray(changes.wfContactLists.newValue)
        ? changes.wfContactLists.newValue
        : [];
      if (!contactLists.some(list => list.id === selectedContactListId)) {
        selectedContactListId = contactLists[0]?.id || "";
      }
      renderContactLists();
    }
    if (changes.wfFlows) renderBulkOptions();
    if (changes.wfCampaigns) {
      campaigns = Array.isArray(changes.wfCampaigns.newValue) ? changes.wfCampaigns.newValue : [];
      const liveCampaign = campaigns.find(item => ["running", "paused"].includes(item.status));
      if (liveCampaign) {
        pinnedCampaignId ||= liveCampaign.id;
        bulkRequestPending = false;
      }
      renderCampaigns();
    }
  });

  updateBulkMessageVariations();
  loadContactLists();
  loadCampaigns();
  setInterval(() => loadCampaigns().catch(() => {}), 1000);
})();
