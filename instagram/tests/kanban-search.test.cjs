const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const board = fs.readFileSync(
  path.join(root, "assets/js/index.e4b3aa7a.js"),
  "utf8"
);
const content = fs.readFileSync(
  path.join(root, "src/pages/content/index.js"),
  "utf8"
);

test("a lupa aparece no cabeçalho da coluna Todas", () => {
  assert.match(board, /className: "flowsi-kanban-search-toggle"/);
  assert.match(board, /aria-label": "Pesquisar contatos"/);
  assert.match(board, /f\("circle", \{ cx: "11", cy: "11", r: "8" \}\)/);
  assert.match(board, /f\("path", \{ d: "m21 21-4\.3-4\.3" \}\)/);
});

test("o campo abre acima dos cards e pesquisa nome ou arroba", () => {
  assert.match(board, /placeholder: "Pesquisar por nome ou @"/);
  assert.match(board, /width: "calc\(100% \+ 24px\)"/);
  assert.match(board, /margin: "4px -12px 8px"/);
  assert.match(board, /\[w\.name, w\.full_name, w\.username\]/);
  assert.match(board, /\.some\(\(P\) => P\.includes\(flowsiNormalizedQuery_20261029\)\)/);
  assert.match(board, /\.normalize\("NFD"\)/);
  assert.match(board, /children: "Nenhum contato encontrado\."/);
});

test("filtrar não altera os contatos e arrastar usa o id real do card", () => {
  assert.match(board, /flowsiVisibleProfiles_20261029\.map/);
  assert.match(board, /draggableId: flowsiDraggedId_20261029/);
  assert.match(board, /String\(R\.id\) === String\(flowsiDraggedId_20261029\)/);
  assert.match(board, /flowsiSourceIndex_20261029 >= 0/);
});

test("o reposicionamento dos botões continua apontando para atualizar", () => {
  assert.match(board, /className: "flowsi-kanban-refresh-trigger"/);
  assert.match(content, /button\.flowsi-kanban-refresh-trigger/);
});
