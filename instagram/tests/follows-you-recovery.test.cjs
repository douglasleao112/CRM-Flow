const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const worker = fs.readFileSync(path.join(root, "crm-background.js"), "utf8");
const recovery = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "content", "follows-you-recovery.js"),
  "utf8"
);

const instagramScript = manifest.content_scripts.find(entry =>
  entry.matches?.includes("https://www.instagram.com/*") &&
  entry.js?.includes("instagram/src/pages/content/index.js")
);

assert.ok(instagramScript, "Instagram isolated content script must exist");
assert.ok(
  instagramScript.js.includes("instagram/src/pages/content/follows-you-recovery.js"),
  "relationship recovery must load on normal Instagram navigation"
);
assert.match(worker, /chrome\.tabs\.query\(\{ url: "https:\/\/www\.instagram\.com\/\*" \}\)/);
assert.match(worker, /files: \["instagram\/src\/pages\/content\/follows-you-recovery\.js"\]/);
assert.doesNotMatch(worker, /chrome\.tabs\.reload/);
assert.match(recovery, /action: "flowsiFetchRelationship"/);
assert.match(recovery, /typeof response\?\.followsYou !== "boolean"/);
assert.match(recovery, /renderBadge\(current\.header, response\.followsYou\)/);
assert.match(recovery, /data-flowsi-follows-you-status", "complete"/);
assert.match(recovery, /hideBadge\(current\.header\)/);

console.log("follows-you-recovery: 10 assertions passed");
