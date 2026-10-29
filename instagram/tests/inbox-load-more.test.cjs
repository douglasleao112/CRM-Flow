const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "src/pages/background/index.js"), "utf8");
const content = fs.readFileSync(path.join(root, "src/pages/content/index.js"), "utf8");
const board = fs.readFileSync(path.join(root, "assets/js/index.e4b3aa7a.js"), "utf8");
const scraper = fs.readFileSync(path.join(root, "src/pages/content/contact-scraper-main.js"), "utf8");

test("carregar mais limita cada clique a 20 contatos novos", () => {
  assert.match(background, /const newContacts = cursor \? uniqueCandidates\.slice\(0, 20\)/);
  assert.match(background, /!knownKeys\.has\(key\)/);
  assert.match(background, /\.flatMap\(column => Array\.isArray\(column\?\.profiles\)/);
});

test("atualizar preserva os cards existentes e acrescenta somente novos", () => {
  assert.match(background, /const newContacts = cursor \? uniqueCandidates\.slice\(0, 20\) : uniqueCandidates/);
  assert.match(
    background,
    /const source = \[[\s\S]*\.\.\.contactList,[\s\S]*\.\.\.newContacts,[\s\S]*\.\.\.flowsiManualContacts,[\s\S]*\.\.\.assignedProfiles[\s\S]*\]/
  );
  assert.doesNotMatch(background, /: \[\.\.\.newContacts, \.\.\.flowsiManualContacts/);
  assert.match(background, /!knownKeys\.has\(key\)/);
});

test("contatos excedentes ficam disponíveis para o próximo clique", () => {
  assert.match(background, /const remainingContacts = cursor \? uniqueCandidates\.slice\(20\)/);
  assert.match(background, /flowsiInboxPendingContacts: remainingContacts/);
  assert.match(background, /remainingContacts\.length \|\| pageResult\.hasMore/);
});

test("o clique exibe o carregamento central existente", () => {
  assert.match(board, /data-flowsi-kanban-inbox-sync[\s\S]*loading-more/);
  assert.match(board, /loading-more-complete/);
  assert.match(board, /error:load-more/);
  assert.match(content, /Carregando mais contatos do inbox/);
});

test("cursores vazios reiniciam a busca e continuam ignorando contatos existentes", () => {
  assert.match(scraper, /const hasSavedCursor = \["primary", "general"\]\.some/);
  assert.match(scraper, /!loadMore \|\| !hasSavedCursor \|\| Boolean\(cursors\?\.\[source\.name\]\)/);
  assert.match(background, /rounds >= 6/);
  assert.match(background, /\.flatMap\(column => Array\.isArray\(column\?\.profiles\)/);
});

test("o botão circular usa o mesmo fallback de Primary e General", () => {
  assert.match(board, /cursor: k \? "flowsi-dom-more" : null,[\s\S]*apiOnly: !0/);
  assert.match(scraper, /const targetLabels = initialFolderTabs\.length/);
  assert.match(scraper, /const maximumPasses = loadMore \? 12 : 3/);
  assert.match(scraper, /newFolderContacts\.size < INBOX_CONTACT_LIMIT_PER_FOLDER/);
  assert.match(scraper, /if \(!knownDomKeys\.has\(key\)\) newFolderContacts\.add\(key\)/);
});

test("a coluna Todas oferece carregar mais depois do último card", () => {
  assert.match(board, /className: "flowsi-load-more-contacts-btn"/);
  assert.match(board, /children: "Carregar mais contatos"/);
  assert.match(board, /className: "flowsi-load-more-contacts-btn"[\s\S]*onClick: \(\) => s\(!0\)/);
  assert.match(board, /borderRadius: "10px"/);
});

test("as mensagens do Kanban usam a fila vertical de notificações", () => {
  assert.match(board, /window\.__flowsiToast = Y/);
  assert.match(content, /toastApi\.loading\(message, \{ id: toastId \}\)/);
  assert.match(content, /toastApi\.success\("Kanban atualizado com sucesso\."/);
  assert.match(content, /window\.addEventListener\("flowsi-toast-ready", render\)/);
  assert.doesNotMatch(
    content,
    /attributeFilter: \["data-flowsi-kanban-inbox-sync", "data-flowsi-inbox-diagnostics"\],[\s\S]{0,100}childList: true/
  );
});
