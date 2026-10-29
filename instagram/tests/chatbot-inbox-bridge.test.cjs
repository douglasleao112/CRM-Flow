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
  assert.match(loader, /flowsi-chatbot-inbox-request-v2/);
  assert.match(main, /flowsi-chatbot-inbox-request-v2/);
  assert.match(loader, /flowsi-chatbot-inbox-response-v2/);
  assert.match(background, /fetchDirectInboxUnified\(csrfToken\)/);
  assert.match(background, /transports\.push\("authenticated-background"\)/);
  assert.match(background, /mergeDirectThreadCollections/);
});

test("a última leitura do chatbot fica diagnosticável", () => {
  assert.match(background, /flowsiChatbotLastInboxCheck/);
  assert.match(background, /primaryThreads: directInbox\.primary\.length/);
  assert.match(background, /generalThreads: directInbox\.general\.length/);
});

test("o envio só conclui depois da confirmação real do Instagram", () => {
  assert.match(
    main,
    /sendChatbotDirect\([\s\S]{0,120}username,[\s\S]{0,80}message,[\s\S]{0,80}threadId,[\s\S]{0,80}viewerId,[\s\S]{0,80}trustedThreadId,[\s\S]{0,80}requestId/,
  );
  assert.match(main, /sendChatbotThroughThreadUi\(threadId, text\)/);
  assert.match(main, /resolveChatbotDestination/);
  assert.match(main, /create_group_thread/);
  assert.match(main, /sendChatbotViaReferenceMqtt/);
  assert.match(main, /mqttResult\?\.transport \|\| "instagram-mqtt"/);
  assert.match(main, /instagram-thread-ui-verified/);
  assert.match(main, /countVisibleMessages\(\) > beforeCount/);
  assert.match(main, /broadcastResponse\.ok && broadcastPayload\?\.status === "ok"/);
  assert.match(main, /transport: "instagram-page-http"/);
  assert.match(loader, /flowsiChatbotSendMessageMain/);
  assert.match(loader, /preview\}\|\$\{timeLine\}\|\$\{unreadState\}/);
  assert.match(background, /response\.status !== "sent"/);
  assert.match(background, /fallback\.status !== "sent"/);
});

test("imagem, áudio e vídeo usam a ponte de anexos sem abrir uma janela visível", () => {
  assert.match(background, /action: "flowsiChatbotSendMediaMain"/);
  assert.match(background, /\["image", "voice", "video", "file", "document"\]/);
  assert.match(background, /type === "script"/);
  assert.match(loader, /flowsi-chatbot-media-send-request-v1/);
  assert.match(loader, /readSavedQuickMessageVideo/);
  assert.match(loader, /indexedDB\.open\("keyval-store", 1\)/);
  assert.match(main, /sendChatbotMediaThroughThreadUi/);
  assert.match(main, /left: "-12000px"/);
  assert.match(main, /input\[type="file"\]/);
  assert.match(main, /instagram-thread-media-ui-verified/);
});

test("o chatbot resolve o usuário e o thread_id real antes de responder", () => {
  assert.match(loader, /threadId: String\(threadId \|\| ""\)/);
  assert.match(background, /candidate\.threadId/);
  assert.match(main, /existingThreadId = ""/);
  assert.match(main, /resolveChatbotDestination\([\s\S]*existingThreadId/);
  assert.match(main, /let threadId = String\(safeTrustedThreadId \|\| cached\?\.threadId \|\| ""\)/);
  assert.match(main, /if \(safeTrustedThreadId\)/);
  assert.match(main, /void hintedThreadId/);
  assert.match(main, /Never promote the URL hint to MQTT ID/);
  assert.match(main, /normalize\(user\?\.username\) === normalize\(username\)/);
  assert.match(main, /match\?\.viewer_id/);
  assert.match(main, /recipient_users: `\["\$\{userId\}"\]`/);
  assert.match(main, /chatbotThreadCache\.set\(username/);
});

test("o chatbot sempre combina a API com mensagens recentes do inbox visível", () => {
  assert.match(loader, /flowsiChatbotReadVisibleInbox/);
  assert.match(loader, /minutes <= 5/);
  assert.match(loader, /visibleConversationRows\(\)/);
  assert.match(loader, /flowsiChatbotDomInboxState/);
  assert.match(loader, /\^\(voce\|you\)\(:\| enviou\| sent\)/);
  assert.match(background, /transports\.push\("visible-inbox"\)/);
  assert.match(background, /transports\.push\("authenticated-background"\)/);
  assert.match(background, /mergeDirectThreadCollections\([\s\S]*visibleThreads/);
});

test("o chatbot abre contadores de mensagens não lidas e recupera o texto real", () => {
  assert.match(loader, /unreadMessageCount/);
  assert.match(loader, /new messages/);
  assert.match(loader, /readUnreadMessagesFromConversation/);
  assert.match(loader, /row\.click\(\)/);
  assert.match(loader, /aria-roledescription="message"/);
  assert.match(loader, /article\.getAttribute\("aria-labelledby"\)/);
  assert.match(loader, /domMessageId \|\| index/);
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
  assert.doesNotMatch(background, /action: "sendMessage"/);
  assert.match(background, /action: "flowsiChatbotSnapshotOutgoingMessage"/);
  assert.match(background, /action: "flowsiChatbotSendMessageMain"/);
  assert.match(background, /action: "flowsiChatbotConfirmOutgoingMessage"/);
  assert.match(background, /confirmation\?\.success !== true \|\| confirmation\.status !== "sent"/);
  assert.match(background, /confirmation: "instagram-ack\+outgoing-bubble"/);
  assert.match(loader, /reference-bundle-mqtt-dom-verified/);
  assert.match(loader, /confirmation: "outgoing-bubble"/);
  assert.match(loader, /\[role="article"\]\[aria-roledescription="message"\]/);
  assert.match(background, /directThreads: uniqueThreads\.length,\s*direct/);
});
