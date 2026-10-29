const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bundle = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "index.e4b3aa7a.js"),
  "utf8",
);

assert.match(bundle, /flowsiFirstName = \(e\) => String\(e \|\| ""\)\.trim\(\)\.split\(\/\\s\+\/\)\[0\]/);
assert.match(bundle, /\.replace\(\/<\\s\*\(\?:name\|nome\)\\s\*>\/gi, \(\) => t\)/);
assert.match(bundle, /\.replace\(\/<\\s\*primeironome\\s\*>\/gi, \(\) => flowsiFirstName\(t\)\)/);
assert.match(bundle, /content: M\.content \+ " <nome>"/);
assert.doesNotMatch(bundle, /content: M\.content \+ " <primeironome>"/);
assert.match(bundle, /onClick: \(\) => _\("<nome>"\)/);
assert.doesNotMatch(bundle, /onClick: \(\) => _\("<primeironome>"\)/);
assert.match(bundle, /c = flowsiFirstName\(d\)/);
assert.match(bundle, /\.replace\(\/<\\s\*username\\s\*>\/gi, \(\) => u\)/);
assert.doesNotMatch(bundle, /children: "username"/);

console.log("chatbot-name-tags-ui: 10 assertions passed");
