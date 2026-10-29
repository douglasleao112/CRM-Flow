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

assert.match(bundle, /O\.droppableId === q\.droppableId && O\.index === q\.index/);
assert.match(bundle, /flowsiOptimisticColumns_20261029 = r\.map/);
assert.match(bundle, /flowsiOptimisticSource_20261029\.profiles\.splice\([\s\S]{0,180}flowsiSourceIndex_20261029 >= 0/);
assert.match(bundle, /flowsiOptimisticDestination_20261029\.profiles\.splice/);
assert.match(bundle, /n\(flowsiOptimisticColumns_20261029\)/);
assert.match(bundle, /: \(n\(r\),[\s\S]{0,120}Não foi possível mover o contato/);
assert.match(bundle, /index: q\.index/);
assert.match(background, /const requestedIndex = Number\(message\.index\)/);
assert.match(background, /Number\.isInteger\(requestedIndex\) && requestedIndex >= 0/);
assert.doesNotMatch(background, /Number\(message\.index\) \|\| nextTarget\.profiles\.length/);

console.log("kanban-optimistic-move: 10 assertions passed");
