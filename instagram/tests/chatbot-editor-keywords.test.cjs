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
assert.match(contentScript, /id="flowsi-edit-add-label"/);
assert.match(contentScript, /id="flowsi-edit-label-column"/);
assert.match(contentScript, /id="flowsi-add-label"/);
assert.match(contentScript, /id="flowsi-label-column"/);
assert.match(contentScript, /column\.id \|\| ""\) !== "all-chats"/);
assert.match(contentScript, /addLabel: addLabel\.checked/);
assert.match(contentScript, /labelColumnId: addLabel\.checked \? labelSelect\.value : ""/);
assert.match(contentScript, /const availableTemplates = quickMessages[\s\S]{0,180}type: item\.type \|\| "text"/);
assert.doesNotMatch(contentScript, /const textTemplates = quickMessages\.filter/);

console.log("chatbot-editor-keywords: 16 assertions passed");
