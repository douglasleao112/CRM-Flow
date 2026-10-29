const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bundle = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "index.e4b3aa7a.js"),
  "utf8",
);

const openNewBotHandler = bundle.match(
  /const w = \(O\) => \{[\s\S]*?\n\s*\},\n\s*P = \(\) =>/,
)?.[0] || "";

assert.match(openNewBotHandler, /\.flowsi-chatbot-edit-inline-container/);
assert.match(openNewBotHandler, /q\.remove\(\)/);
assert.match(openNewBotHandler, /data-flowsi-hidden-by-editor/);
assert.match(openNewBotHandler, /b\.style\.removeProperty\("display"\)/);
assert.match(openNewBotHandler, /delete b\.dataset\.flowsiHiddenByEditor/);
assert.match(
  openNewBotHandler,
  /m && e === O[\s\S]{0,80}t\(null\)[\s\S]{0,80}setTimeout\(\(\) => t\(O\), 0\)/,
);
assert.match(openNewBotHandler, /g\(\[\]\)/);
assert.match(bundle, /onClick: \(\) => w\("comment"\)/);
assert.match(
  bundle,
  /q\.filter\(\(b\) => b && b\.title\)[\s\S]{0,120}type: b\.type \|\| "text"/,
  "O seletor de criação deve incluir todos os tipos de mensagem pronta",
);
assert.doesNotMatch(
  bundle,
  /q\.filter\(\(b\) => b\.type === "text"\)/,
  "O seletor não pode voltar a limitar o chatbot a texto",
);

console.log("chatbot-single-form: 10 assertions passed");
