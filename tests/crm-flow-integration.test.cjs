const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const popup = fs.readFileSync(path.join(root, "popup.html"), "utf8");
const popupScript = fs.readFileSync(path.join(root, "popup.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "crm-background.js"), "utf8");
const instagramWorker = fs.readFileSync(
  path.join(root, "instagram/src/pages/background/index.js"),
  "utf8"
);
const instagramContactScraper = fs.readFileSync(
  path.join(root, "instagram/src/pages/content/contact-scraper-main.js"),
  "utf8"
);

assert.equal(manifest.name, "CRM Flow");
assert.equal(manifest.action.default_popup, "popup.html");
assert.equal(manifest.background.service_worker, "crm-background.js");
assert.equal(manifest.background.type, "module");
assert.ok(manifest.host_permissions.includes("https://web.whatsapp.com/*"));
assert.ok(manifest.host_permissions.includes("https://mail.google.com/*"));
assert.ok(
  manifest.host_permissions.includes("*://*.instagram.com/*"),
  "CRM Flow must authorize Instagram web, API, and edge-chat subdomains"
);
assert.ok(manifest.permissions.includes("cookies"));
assert.ok(manifest.content_scripts.some(entry =>
  entry.matches.includes("https://www.instagram.com/*") && entry.world === "MAIN"
));
assert.ok(manifest.content_scripts.some(entry =>
  entry.js?.includes("instagram/src/pages/content/index.js")
));
assert.match(worker, /import "\.\/background\.js"/);
assert.match(worker, /import "\.\/instagram\/src\/pages\/background\/index\.js"/);
assert.match(popup, /id="instagramTab"/);
assert.match(popup, /id="instagramPanel"/);
assert.match(popup, /Abrir Instagram/);
assert.doesNotMatch(popup, /CRM Flow para Instagram/);
assert.match(popup, /class="instagram-panel-icon"/);
assert.equal((popup.match(/<div>\s*<strong>/g) || []).length, 1);
assert.match(popup, /CRM para Instagram/);
assert.match(popupScript, /setPopupTab\("instagram"\)/);
assert.match(popupScript, /https:\/\/www\.instagram\.com\/direct\/inbox\//);
assert.doesNotMatch(
  instagramWorker,
  /runtime\.onInstalled[\s\S]{0,500}(?:tabs\.create|tabs\.update)/,
  "install/reload must not open, activate, or refresh Instagram"
);
assert.match(
  instagramContactScraper,
  /if \(apiOnly && apiResult\.successfulSources >= 2\)/,
  "API-only loading must fall back to the visible inbox when Instagram rejects a folder"
);

const referencedFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  ...manifest.content_scripts.flatMap(entry => [...(entry.js || []), ...(entry.css || [])]),
  ...manifest.declarative_net_request.rule_resources.map(entry => entry.path)
];
for (const relativePath of referencedFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `Arquivo ausente: ${relativePath}`);
}

console.log("crm-flow-integration: 24 assertions passed");
