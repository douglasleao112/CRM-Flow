const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const board = fs.readFileSync(
  path.join(root, "assets/js/index.e4b3aa7a.js"),
  "utf8"
);

test("clicar novamente no Kanban fecha a interface e volta ao inbox", () => {
  assert.match(board, /const flowsiClosingKanban_20261029 = g && e/);
  assert.match(board, /window\.location\.pathname !== "\/direct\/inbox\/"/);
  assert.match(board, /flowsiInboxLink_20261029\.click\(\)/);
  assert.match(board, /yg\("\/direct\/inbox\/"\)/);
  assert.match(board, /\(t\(!1\), n\(null\)\)/);
});

test("o primeiro clique continua abrindo o Kanban", () => {
  assert.match(board, /\(t\(g \? !0 : !1\), n\(null\)\)/);
});
