const STORAGE_KEY = "emailSavedLists";

const fileInput = document.getElementById("fileInput");
const nameInput = document.getElementById("emailListName");
const saveButton = document.getElementById("saveEmailList");
const feedback = document.getElementById("savedEmailListFeedback");
const countBadge = document.getElementById("savedEmailListCount");
const listContainer = document.getElementById("savedEmailLists");
const saveModal = document.getElementById("emailListSaveModal");
const closeSaveModalButton = document.getElementById("closeEmailListSave");
const savedListsModal = document.getElementById("savedEmailListsModal");
const openSavedListsButton = document.getElementById("toggleSavedEmailLists");
const closeSavedListsModalButton = document.getElementById("closeSavedEmailLists");
const uploadListButton = document.getElementById("newEmailFileButton");

let savedLists = [];
let currentRecipientCount = 0;

function normalizeName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function suggestedName(fileName) {
  return normalizeName(String(fileName || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
}

function formatCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return `Criada em ${new Intl.DateTimeFormat("pt-BR").format(date)}`;
}

function setFeedback(message = "", kind = "") {
  feedback.textContent = message;
  feedback.className = `saved-email-list-feedback${kind ? ` ${kind}` : ""}`;
}

function updateSaveButton() {
  saveButton.disabled = !currentRecipientCount || !normalizeName(nameInput.value);
}

function openSaveModal() {
  if (!currentRecipientCount) return;
  setFeedback();
  saveModal.hidden = false;
  requestAnimationFrame(() => {
    nameInput.focus();
    nameInput.select();
  });
}

function closeSaveModal() {
  saveModal.hidden = true;
  setFeedback();
}

function openSavedListsModal() {
  savedListsModal.hidden = false;
  uploadListButton.classList.remove("active");
  openSavedListsButton.classList.add("active");
  openSavedListsButton.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => closeSavedListsModalButton.focus());
}

function closeSavedListsModal({ restoreFocus = true } = {}) {
  savedListsModal.hidden = true;
  openSavedListsButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) openSavedListsButton.focus();
}

function makeButton(text, className, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.title = title;
  return button;
}

function renderLists() {
  countBadge.textContent = String(savedLists.length);
  listContainer.replaceChildren();

  if (!savedLists.length) {
    const empty = document.createElement("div");
    empty.className = "saved-email-lists-empty";
    empty.textContent = "Nenhuma lista salva.";
    listContainer.appendChild(empty);
    return;
  }

  savedLists
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .forEach((list) => {
      const item = document.createElement("div");
      item.className = "saved-email-list-item";

      const info = document.createElement("div");
      info.className = "saved-email-list-info";
      const title = document.createElement("div");
      title.className = "saved-email-list-name";
      title.textContent = list.name;
      title.title = list.name;
      const meta = document.createElement("div");
      meta.className = "saved-email-list-meta";
      const amount = Array.isArray(list.recipients) ? list.recipients.length : 0;
      meta.textContent = `${formatCreatedAt(list.createdAt)} • ${amount} contato${amount === 1 ? "" : "s"}`;
      info.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "saved-email-list-actions";
      const useButton = makeButton("Usar", "saved-email-list-use", `Usar a lista ${list.name}`);
      useButton.addEventListener("click", () => useSavedList(list.id));
      const deleteButton = makeButton("×", "saved-email-list-delete", `Excluir a lista ${list.name}`);
      deleteButton.setAttribute("aria-label", `Excluir a lista ${list.name}`);
      deleteButton.addEventListener("click", () => deleteSavedList(list.id));
      actions.append(useButton, deleteButton);

      item.append(info, actions);
      listContainer.appendChild(item);
    });
}

async function refreshCurrentCount() {
  const { importedRecipients } = await chrome.storage.local.get("importedRecipients");
  currentRecipientCount = Array.isArray(importedRecipients) ? importedRecipients.length : 0;
  updateSaveButton();
}

async function loadSavedLists() {
  const data = await chrome.storage.local.get([STORAGE_KEY, "importedRecipients"]);
  savedLists = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  currentRecipientCount = Array.isArray(data.importedRecipients) ? data.importedRecipients.length : 0;
  renderLists();
  updateSaveButton();
}

async function saveCurrentList() {
  const name = normalizeName(nameInput.value);
  const { importedRecipients } = await chrome.storage.local.get("importedRecipients");
  const recipients = Array.isArray(importedRecipients) ? importedRecipients : [];

  if (!recipients.length) {
    setFeedback("Suba uma lista com emails válidos antes de salvar.", "error");
    await refreshCurrentCount();
    return;
  }
  if (!name) {
    setFeedback("Informe um nome para a lista.", "error");
    nameInput.focus();
    return;
  }

  const entry = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    createdAt: new Date().toISOString(),
    recipients: recipients.map((recipient) => ({ ...recipient }))
  };
  savedLists = [entry, ...savedLists];
  await chrome.storage.local.set({ [STORAGE_KEY]: savedLists });
  renderLists();
  closeSaveModal();
}

async function useSavedList(id) {
  const list = savedLists.find((item) => item.id === id);
  if (!list || !Array.isArray(list.recipients) || !list.recipients.length) {
    setFeedback("Essa lista não possui contatos válidos.", "error");
    return;
  }
  const recipients = list.recipients.map((recipient) => ({ ...recipient }));
  nameInput.value = list.name;
  window.dispatchEvent(new CustomEvent("mkt-email-list-selected", {
    detail: { name: list.name, recipients }
  }));
  closeSavedListsModal({ restoreFocus: false });
}

async function deleteSavedList(id) {
  const list = savedLists.find((item) => item.id === id);
  savedLists = savedLists.filter((item) => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: savedLists });
  renderLists();
  setFeedback(list ? `Lista “${list.name}” excluída.` : "Lista excluída.");
}

fileInput.addEventListener("change", () => {
  const files = [...(fileInput.files || [])];
  if (files.length) {
    nameInput.value = files.length === 1 ? suggestedName(files[0].name) : `${files.length} listas`;
    setFeedback("Após a importação, confirme o nome e salve para usar depois.");
  }
  updateSaveButton();
});

nameInput.addEventListener("input", updateSaveButton);
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !saveButton.disabled) saveCurrentList();
});
saveButton.addEventListener("click", saveCurrentList);
closeSaveModalButton.addEventListener("click", closeSaveModal);
saveModal.addEventListener("click", (event) => {
  if (event.target === saveModal) closeSaveModal();
});
openSavedListsButton.addEventListener("click", openSavedListsModal);
closeSavedListsModalButton.addEventListener("click", () => closeSavedListsModal());
savedListsModal.addEventListener("click", (event) => {
  if (event.target === savedListsModal) closeSavedListsModal();
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".list-save-open")) openSaveModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!saveModal.hidden) closeSaveModal();
  else if (!savedListsModal.hidden) closeSavedListsModal();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.importedRecipients) {
    currentRecipientCount = Array.isArray(changes.importedRecipients.newValue)
      ? changes.importedRecipients.newValue.length
      : 0;
    if (!currentRecipientCount && !saveModal.hidden) closeSaveModal();
    updateSaveButton();
  }
  if (changes[STORAGE_KEY]) {
    savedLists = Array.isArray(changes[STORAGE_KEY].newValue) ? changes[STORAGE_KEY].newValue : [];
    renderLists();
  }
});

loadSavedLists();
