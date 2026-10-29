const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contentScript = fs.readFileSync(
  path.join(__dirname, "..", "src", "pages", "content", "index.js"),
  "utf8",
);

assert.match(contentScript, /row\.classList\.add\("flowsi-follows-you-badge"\)/);
assert.match(contentScript, /borderRadius: "999px"/);
assert.match(contentScript, /padding: "4px 8px"/);
assert.match(contentScript, /fontSize: "11px"/);
assert.match(contentScript, /rgba\(22, 163, 74, \.06\)/);
assert.match(contentScript, /rgba\(220, 38, 38, \.05\)/);

console.log("follows-you-badge: 6 assertions passed");
