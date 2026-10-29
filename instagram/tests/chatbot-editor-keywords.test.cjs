const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contentScript = fs.readFileSync(
  path.join(__dirname, "..", "src", "pages", "content", "index.js"),
  "utf8",
);

assert.match(contentScript, /id="flowsi-edit-keyword-list"/);
assert.match(contentScript, /id="flowsi-edit-keyword-add"/);
assert.match(contentScript, /event\.key !== "Enter" && event\.key !== ","/);
assert.match(contentScript, /split\(\/\[,\\n\]\//);
assert.match(contentScript, /editKeywords = \[\.\.\.new Set\(\[\.\.\.editKeywords, \.\.\.additions\]\)\]/);
assert.match(contentScript, /editKeywords = editKeywords\.filter/);
assert.match(contentScript, /const keywords = \[\.\.\.editKeywords\]/);

console.log("chatbot-editor-keywords: 7 assertions passed");
