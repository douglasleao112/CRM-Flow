const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bundle = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "index.e4b3aa7a.js"),
  "utf8",
);

assert.match(
  bundle,
  /flowsiOpenChatFromProfile_20261028\(\s*e\.username,\s*e\.threadId,\s*\)/,
  "O card deve encaminhar somente o threadId pertencente ao contato",
);
assert.doesNotMatch(
  bundle,
  /flowsiOpenChatFromProfile_20261028\(\s*e\.username,\s*e\.threadId \|\| e\.id/,
  "Um ID de perfil nunca pode ser tratado como ID de conversa",
);
assert.doesNotMatch(
  bundle,
  /Date\.now\(\) - d > 4e3 && p\[0\]/,
  "A primeira conversa encontrada na página nunca pode substituir o contato clicado",
);
assert.match(
  bundle,
  /if \(l && g\) return u;/,
  "O thread só pode ser aceito depois de confirmar o @ do contato",
);
assert.match(
  bundle,
  /if \(!p\) throw new Error\("O Instagram retornou uma conversa inválida\."\)/,
);

console.log("kanban-chat-targeting: 5 assertions passed");
