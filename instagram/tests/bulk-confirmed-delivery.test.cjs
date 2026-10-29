const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bundle = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "index.e4b3aa7a.js"),
  "utf8",
);
const background = fs.readFileSync(
  path.join(__dirname, "..", "src", "pages", "background", "index.js"),
  "utf8",
);

const campaignStart = bundle.indexOf("async function Im()");
const campaignEnd = bundle.indexOf("function an(e)", campaignStart);
assert.ok(campaignStart > 0 && campaignEnd > campaignStart);
const campaign = bundle.slice(campaignStart, campaignEnd);

assert.doesNotMatch(bundle, /window\.open\("https:\/\/www\.instagram\.com\/direct\/inbox\/\?bulkMode=true"\)/);
assert.match(bundle, /chrome\.storage\.local\.set\(\{ bulkdata: W \}, \(\) => \{[\s\S]{0,220}Im\(\)/);
assert.doesNotMatch(bundle, /wm\s*&&\s*Im\(\)/);
assert.match(bundle, /Não dispare mensagens de uma campanha antiga sem um[\s\S]{0,180}chrome\.storage\.local\.remove\(\["bulkdata"\]\)/);
assert.doesNotMatch(campaign, /Qt\(`\/direct\/t\//);
assert.doesNotMatch(campaign, /setInterval\(/);
assert.doesNotMatch(campaign, /\bPt\(/);
assert.match(campaign, /await flowsiBulkSendConfirmed_20261029\(s, p, t\.campaignId\)/);
assert.ok(
  campaign.indexOf("await flowsiBulkSendConfirmed_20261029(s, p, t.campaignId)") <
    campaign.indexOf("t.profiles.shift()"),
  "the recipient must only be removed after Instagram confirms delivery",
);
assert.match(campaign, /finally \{[\s\S]{0,100}flowsiBulkCampaignRunning_20261029 = !1/);
assert.match(bundle, /threadId: String\(\(e == null \? void 0 : e\.threadId\) \|\| ""\)/);
assert.doesNotMatch(campaign, /messageId/);
assert.match(bundle, /flowsiBulkUniqueProfiles_20261029 = \[[\s\S]{0,420}new Map\(/);
assert.match(bundle, /campaignId: flowsiBulkCampaignId_20261029/);
assert.match(bundle, /campaignId: String\(r \|\| ""\)/);

assert.match(background, /message\?\.action === "flowsiBulkSendMessage"/);
assert.match(
  background,
  /message\?\.action === "flowsiBulkSendMessage"[\s\S]{0,160}sendBulkMessageOnce\(message, sender\.tab\?\.id \|\| null\)/,
);
assert.match(background, /const flowsiBulkSendInFlight = new Map\(\)/);
assert.match(background, /const flowsiBulkSendCompleted = new Map\(\)/);
assert.match(background, /if \(completed\) return \{ \.\.\.completed\.result, deduplicated: true \}/);
assert.match(background, /if \(flowsiBulkSendInFlight\.has\(key\)\) return flowsiBulkSendInFlight\.get\(key\)/);
assert.match(background, /error: error\?\.message \|\| "Falha ao enviar a mensagem em massa\."/);

console.log("bulk-confirmed-delivery: 22 assertions passed");
