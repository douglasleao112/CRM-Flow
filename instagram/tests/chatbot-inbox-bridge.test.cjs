const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "src/pages/content/contact-scraper-main.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "src/pages/content/contact-loader.js"), "utf8");
const background = fs.readFileSync(path.join(root, "src/pages/background/index.js"), "utf8");

test("o chatbot lê Primary e General dentro da sessão do Instagram", () => {
  assert.match(main, /fetchChatbotInboxFolder\(0\)/);
  assert.match(main, /fetchChatbotInboxFolder\(1\)/);
  assert.match(main, /thread_message_limit: "20"/);
  assert.match(main, /visual_message_return_type: "unseen"/);
  assert.match(main, /viewerId: currentAccountUserId\(\)/);
});

test("a ponte encaminha o inbox autenticado ao background", () => {
  assert.match(loader, /flowsiChatbotReadInbox/);
  assert.match(loader, /flowsi-chatbot-inbox-request/);
  assert.match(background, /instagram-page\+visible-inbox/);
  assert.match(background, /extension-background-fallback/);
});

test("a última leitura do chatbot fica diagnosticável", () => {
  assert.match(background, /flowsiChatbotLastInboxCheck/);
  assert.match(background, /primaryThreads: directInbox\.primary\.length/);
  assert.match(background, /generalThreads: directInbox\.general\.length/);
});

test("o envio só conclui depois da confirmação real do Instagram", () => {
  assert.match(main, /sendChatbotDirect\(username, message, threadId\)/);
  assert.match(main, /sendChatbotThroughThreadUi\(threadId, text, viewerId\)/);
  assert.match(main, /resolveChatbotThread/);
  assert.match(main, /create_group_thread/);
  assert.match(main, /sendChatbotViaReferenceMqtt/);
  assert.match(main, /reference-mqtt-ui-verified/);
  assert.match(main, /instagram-thread-ui-verified/);
  assert.match(main, /countVisibleMessages\(\) > beforeCount/);
  assert.match(main, /broadcastPayload\?\.status !== "ok"/);
  assert.match(main, /transport: "instagram-page-http"/);
  assert.match(loader, /flowsiChatbotSendMessageMain/);
  assert.match(loader, /preview\}\|\$\{timeLine\}\|\$\{unreadState\}/);
  assert.match(background, /response\.status !== "sent"/);
  assert.match(background, /fallback\.status === "queued"/);
});

test("o chatbot resolve o usuário e o thread_id real antes de responder", () => {
  assert.match(loader, /threadId: String\(threadId \|\| ""\)/);
  assert.match(background, /candidate\.threadId/);
  assert.match(main, /existingThreadId = ""/);
  assert.match(main, /resolveChatbotThread\([\s\S]*existingThreadId/);
  assert.match(main, /thread_id from the resulting Direct URL|authoritative/);
  assert.match(main, /\^\\d\+\$\/\.test\(String\(hintedThreadId/);
  assert.match(main, /normalize\(user\?\.username\) === normalize\(username\)/);
  assert.match(main, /recipient_users: `\["\$\{userId\}"\]`/);
  assert.match(main, /chatbotThreadCache\.set\(username/);
});

test("o chatbot sempre combina a API com mensagens recentes do inbox visível", () => {
  assert.match(loader, /flowsiChatbotReadVisibleInbox/);
  assert.match(loader, /minutes <= 5/);
  assert.match(loader, /visibleConversationRows\(\)/);
  assert.match(loader, /flowsiChatbotDomInboxState/);
  assert.match(loader, /\^\(voce\|you\)\(:\| enviou\| sent\)/);
  assert.match(background, /transport: "instagram-visible-inbox"/);
  assert.match(background, /instagram-page\+visible-inbox/);
  assert.match(background, /\.\.\.visibleThreads/);
});

test("o chatbot abre contadores de mensagens não lidas e recupera o texto real", () => {
  assert.match(loader, /unreadMessageCount/);
  assert.match(loader, /new messages/);
  assert.match(loader, /readUnreadMessagesFromConversation/);
  assert.match(loader, /row\.click\(\)/);
  assert.match(loader, /aria-roledescription="message"/);
  assert.match(loader, /message from/);
  assert.match(loader, /dom-open-/);
  assert.match(loader, /openedThreadId/);
  assert.match(loader, /groupedUnreadCount \|\| 1/);
});

test("o diagnóstico informa candidatos, correspondências, envios e erros", () => {
  assert.match(background, /candidates: candidates\.length/);
  assert.match(background, /stats\.matched/);
  assert.match(background, /stats\.sent/);
  assert.match(background, /stats\.errors/);
  assert.match(background, /stats\.lastError/);
  assert.match(background, /lastAttempt/);
  assert.match(background, /directThreads: uniqueThreads\.length,\s*direct/);
});
