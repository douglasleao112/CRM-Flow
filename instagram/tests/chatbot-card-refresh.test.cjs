const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contentScript = fs.readFileSync(
  path.join(__dirname, "..", "src", "pages", "content", "index.js"),
  "utf8",
);

assert.match(contentScript, /const bot = reversed\[index\]/);
assert.match(contentScript, /text === "Keywords:" \|\| text === "Gatilho:"/);
assert.match(contentScript, /Array\.isArray\(bot\.keywords\)/);
assert.match(contentScript, /text === "Template:" \|\| text === "Mensagem:"/);
assert.match(contentScript, /String\(bot\.template \|\| ""\)/);
assert.match(contentScript, /row\.replaceChildren\(label/);
assert.match(contentScript, /row\.textContent\.trim\(\) !==/);

console.log("chatbot-card-refresh: 7 assertions passed");
