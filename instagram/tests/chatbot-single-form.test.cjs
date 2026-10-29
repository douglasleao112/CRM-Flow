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

console.log("chatbot-single-form: 8 assertions passed");
