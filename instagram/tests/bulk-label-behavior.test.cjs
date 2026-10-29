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
const ptBr = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "_locales", "pt_BR", "messages.json"),
  "utf8",
));
const rootPtBr = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "_locales", "pt_BR", "messages.json"),
  "utf8",
));

assert.match(bundle, /C === "nao"\s*&&\s*I\("div"/);
const destinationSelect = bundle.match(
  /id: "onSuccessLabel"[\s\S]*?children: \[[\s\S]*?i\s*\.slice\(1\)/,
)[0];
assert.doesNotMatch(destinationSelect, /required: !0/);
assert.match(
  destinationSelect,
  /value: ""[\s\S]{0,140}S\("bulk_keep_current_column"\) \|\| "Manter coluna atual"/,
);
assert.match(bundle, /onSuccessLabel: C === "sim" \? "" : g/);
assert.match(bundle, /onSuccessLabelRemove: r/);
assert.match(bundle, /flowsiBulkApplyLabels_20261029 = async/);
assert.match(bundle, /flowsiBulkCrmMutation_20261029 = \(e\)[\s\S]{0,180}action: "flowsiCrmMutate"/);
assert.match(bundle, /t === "sim"[\s\S]{0,120}mutation: "remove"[\s\S]{0,80}username: n/);
assert.match(bundle, /const i = String\(r \|\| ""\)\.trim\(\);[\s\S]{0,50}if \(!i\) return null/);
assert.match(bundle, /mutation: "move"[\s\S]{0,100}columnId: i[\s\S]{0,100}username: n/);
assert.doesNotMatch(
  bundle.match(/flowsiBulkApplyLabels_20261029 = async[\s\S]*?flowsiBulkWait_20261029/)[0],
  /flowsiBulkStorageSet_20261029\(\{ kanbanColumns:/,
);
assert.match(
  bundle,
  /await flowsiBulkSendConfirmed_20261029[\s\S]{0,900}await flowsiBulkApplyLabels_20261029[\s\S]{0,180}t\.profiles\.shift\(\)/,
);
assert.match(
  bundle,
  /if \(!s\.flowsiBulkDeliveryConfirmedAt\)[\s\S]{0,420}s\.flowsiBulkDeliveryConfirmedAt = new Date\(\)\.toISOString\(\)[\s\S]{0,140}flowsiBulkStorageSet_20261029\(\{ bulkdata: t \}\)/,
);
assert.match(
  bundle,
  /flowsiBulkDeliveryConfirmedAt: o, \.\.\.a[\s\S]{0,240}profile: \{ \.\.\.a, username: n/,
);
assert.match(bundle, /flowsiBulkLoadColumns_20261029 = \(\) =>/);
assert.match(
  bundle,
  /chrome\.storage\.onChanged\.addListener\(N\)[\s\S]{0,180}window\.addEventListener\("focus", B\)/,
);
assert.match(bundle, /onFocus: flowsiBulkLoadColumns_20261029/g);
assert.doesNotMatch(
  bundle.match(/id: "recipientType"[\s\S]*?id: "onSuccessLabelRemove"/)[0],
  /profiles\.length > 0/,
);
assert.equal(
  ptBr.on_success_remove_column.message,
  "Ao enviar com sucesso, remover da coluna atual?",
);
assert.equal(ptBr.bulk_keep_current_column.message, "Manter coluna atual");
assert.equal(
  rootPtBr.on_success_remove_column.message,
  "Ao enviar com sucesso, remover da coluna atual?",
);
assert.equal(rootPtBr.bulk_keep_current_column.message, "Manter coluna atual");
assert.equal(ptBr.bulk_message_remain_text.message, "Mensagens enviadas");
assert.match(
  bundle,
  /flowsiBulkCompletedCount_20261029 = \(\) =>[\s\S]{0,100}a - t\.profiles\.length/,
);
assert.match(
  bundle,
  /"Enviando mensagem\.\.\.",[\s\S]{0,100}flowsiBulkCompletedCount_20261029\(\)[\s\S]{0,60}\ba\b/,
);
assert.match(
  bundle,
  /e\.updateStatus\("Campanha concluída com sucesso\.", "—", a, a, !1\)/,
);

console.log("bulk-label-behavior: 26 assertions passed");
