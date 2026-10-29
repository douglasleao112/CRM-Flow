const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(
  path.join(root, "src", "pages", "content", "index.js"),
  "utf8",
);
const earlyTransition = fs.readFileSync(
  path.join(root, "src", "pages", "content", "kanban-transition.js"),
  "utf8",
);
const rootManifest = JSON.parse(fs.readFileSync(
  path.join(root, "..", "manifest.json"),
  "utf8",
));

const earlyScripts = rootManifest.content_scripts.find(entry =>
  entry.run_at === "document_start" &&
  entry.matches?.includes("https://www.instagram.com/*")
);

assert.ok(earlyScripts);
assert.equal(earlyScripts.js[0], "instagram/src/pages/content/kanban-transition.js");
assert.match(earlyTransition, /sessionStorage\.getItem\(REQUEST_KEY\)/);
assert.match(earlyTransition, /body > \* \{[\s\S]{0,80}visibility: hidden !important/);
assert.match(earlyTransition, /body > #flowsi-nav-bar \*/);
assert.match(content, /sessionStorage\.setItem\("flowsiOpenKanbanAfterInbox"[\s\S]{0,140}showKanbanNavigationCurtain\(\)[\s\S]{0,220}navigateToInstagramInbox\(\)/);
assert.match(content, /new URL\(link\.href, window\.location\.href\)\.pathname === "\/direct\/inbox\/"/);
assert.match(content, /navigateToInstagramInbox\(\)[\s\S]{0,100}openPendingKanbanAfterNavigation\(\)/);
assert.match(content, /window\.location\.pathname === "\/direct\/inbox\/"[\s\S]{0,100}openPendingKanbanOnInbox\(\)/);
assert.match(content, /button\.click\(\);[\s\S]{0,80}releaseWhenBoardIsReady\(\)/);
assert.match(content, /function isKanbanSurfaceVisible\(\)[\s\S]{0,400}getBoundingClientRect\(\)/);
assert.match(content, /isKanbanSurfaceVisible\(\)[\s\S]{0,100}finishTransition\(\)/);
assert.match(content, /style\.display !== "none"[\s\S]{0,180}rect\.height > 0/);
assert.match(content, /clearKanbanNavigationCurtain\(\)/);

console.log("kanban-smooth-navigation: 14 assertions passed");
