const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bundlePath = path.join(
  __dirname,
  "..",
  "assets",
  "js",
  "index.e4b3aa7a.js",
);
const bundle = fs.readFileSync(bundlePath, "utf8");

assert.match(bundle, /C === "nao"\s*&&\s*I\("div"/);
assert.match(bundle, /id: "onSuccessLabel"[\s\S]{0,180}required: !0/);
assert.match(bundle, /onSuccessLabel: C === "sim" \? "" : g/);
assert.match(bundle, /onSuccessLabelRemove: r/);
assert.match(bundle, /if \(p === "sim"\)[\s\S]{0,450}else if \(_ >= 0\)/);
assert.match(bundle, /profiles\.some\(flowsiBulkSameProfile_20261029\)/);

console.log("bulk-label-behavior: 6 assertions passed");
