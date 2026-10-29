const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const content = fs.readFileSync(path.join(root, "src", "pages", "content", "index.js"), "utf8");
const bundle = fs.readFileSync(path.join(root, "assets", "js", "index.e4b3aa7a.js"), "utf8");

assert.match(content, /const hideFollowsYouInNotebook = panel =>/);
assert.match(content, /if \(row\) row\.style\.display = "none"/);
assert.match(content, /data-flowsi-follows-you-status", "unavailable"\);[\s\S]{0,100}hideFollowsYouInNotebook\(panel\)/);
assert.match(bundle, /\[l, g\] = x\.exports\.useState\(null\)/);
assert.match(bundle, /display: typeof l === "boolean" \? "flex" : "none"/);
assert.match(bundle, /typeof c\.follows_viewer === "boolean" \? c\.follows_viewer : null/);
assert.match(bundle, /follows_viewer: null/);

console.log("follows-you-unknown: 7 assertions passed");
