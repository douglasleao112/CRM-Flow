const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const worker = fs.readFileSync(path.join(root, "crm-background.js"), "utf8");
const main = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "content", "contact-scraper-main.js"),
  "utf8"
);
const background = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "background", "index.js"),
  "utf8"
);
const loader = fs.readFileSync(
  path.join(root, "instagram", "src", "pages", "content", "contact-loader.js"),
  "utf8"
);
const bundle = fs.readFileSync(
  path.join(root, "instagram", "assets", "js", "index.e4b3aa7a.js"),
  "utf8"
);

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Marcador inicial ausente: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Marcador final ausente: ${endMarker}`);
  return source.slice(start, end);
}

test("o manifesto autoriza todos os subdomínios usados pelo Direct e pelo MQTT", () => {
  assert.ok(
    manifest.host_permissions.includes("*://*.instagram.com/*"),
    "edge-chat.instagram.com precisa estar coberto pela permissão curinga"
  );
});

test("a restauração em abas abertas reinjeta a ponte do chatbot no mundo MAIN", () => {
  const fileMarker = '"instagram/src/pages/content/contact-scraper-main.js"';
  const fileIndex = worker.indexOf(fileMarker);
  assert.notEqual(fileIndex, -1, "contact-scraper-main.js precisa ser reinjetado após atualizar a extensão");

  const executeStart = worker.lastIndexOf("chrome.scripting.executeScript({", fileIndex);
  const executeEnd = worker.indexOf("}))", fileIndex);
  assert.notEqual(executeStart, -1, "a reinjeção precisa usar chrome.scripting.executeScript");
  assert.notEqual(executeEnd, -1, "não foi possível localizar o fim da reinjeção MAIN");

  const mainInjection = worker.slice(executeStart, executeEnd);
  assert.match(mainInjection, /world:\s*["']MAIN["']/);
  assert.match(mainInjection, /files:\s*\[\s*["']instagram\/src\/pages\/content\/contact-scraper-main\.js["']\s*\]/);
});

test("o envio usa um canal versionado para ignorar listeners antigos após recarregar a extensão", () => {
  assert.match(main, /INJECT_DISPATCH_DM_REQUEST_V5/);
  assert.match(bundle, /INJECT_DISPATCH_DM_REQUEST_V5/);
  assert.match(main, /flowsi-chatbot-send-request-v8/);
  assert.match(loader, /flowsi-chatbot-send-request-v8/);
  assert.doesNotMatch(main, /INJECT_DISPATCH_DM_REQUEST_V4/);
  assert.doesNotMatch(bundle, /INJECT_DISPATCH_DM_REQUEST_V4/);
  assert.doesNotMatch(main, /flowsi-chatbot-send-request-v6/);
  assert.doesNotMatch(loader, /flowsi-chatbot-send-request-v6/);
  assert.doesNotMatch(main, /flowsi-chatbot-send-request-v7/);
  assert.doesNotMatch(loader, /flowsi-chatbot-send-request-v7/);
  assert.doesNotMatch(main, /type:\s*["']INJECT_DISPATCH_DM_REQUEST["']/);
  assert.doesNotMatch(bundle, /type:\s*["']INJECT_DISPATCH_DM_REQUEST["']/);
});

test("todos os fallbacks reutilizam o mesmo client_context para o Instagram deduplicar", () => {
  const sender = between(
    main,
    "async function sendChatbotDirect",
    "async function resolveChatbotDestination"
  );
  const mqtt = between(
    main,
    "function sendChatbotViaReferenceMqtt",
    "async function sendChatbotThroughThreadUi"
  );
  assert.match(sender, /clientContext = `\$\{Date\.now\(\)\}\$\{Math\.floor/);
  assert.match(sender, /sendChatbotViaReferenceMqtt\([\s\S]{0,120}clientContext/);
  assert.match(sender, /client_context: clientContext/);
  assert.match(sender, /mutation_token: clientContext/);
  assert.match(sender, /offline_threading_id: clientContext/);
  assert.match(mqtt, /client_context: String\(clientContext \|\| ""\)/);
  assert.match(bundle, /client_context: requestedClientContext/);
  assert.match(bundle, /\? String\(requestedClientContext\)[\s\S]{0,80}: String\(co\(\)\)/);
});

test("fora da conversa aberta, o envio tenta MQTT antes dos fallbacks HTTP e de interface", () => {
  const sendDirect = between(
    main,
    "async function sendChatbotDirect",
    "async function resolveChatbotDestination"
  );
  const mqttIndex = sendDirect.indexOf("sendChatbotViaReferenceMqtt(");
  const httpIndex = sendDirect.indexOf("/api/v1/direct_v2/threads/broadcast/text/");
  const uiFallbackIndex = sendDirect.lastIndexOf("sendChatbotThroughThreadUi(");

  assert.notEqual(mqttIndex, -1, "sendChatbotDirect precisa tentar o transporte MQTT");
  assert.notEqual(httpIndex, -1, "o fallback HTTP precisa continuar disponível");
  assert.notEqual(uiFallbackIndex, -1, "o fallback pela interface precisa continuar disponível");
  assert.ok(mqttIndex < httpIndex, "MQTT precisa ocorrer antes do broadcast HTTP");
  assert.ok(
    mqttIndex < uiFallbackIndex,
    "para conversas fora da tela, MQTT precisa ocorrer antes do editor/iframe oculto"
  );
});

test("o fallback de interface reconhece o editor Lexical real de 18 px", () => {
  const uiSender = between(
    main,
    "async function sendChatbotThroughThreadUi",
    "function topicListRoot"
  );

  assert.match(uiSender, /\[contenteditable=["']true["']\]/);
  assert.match(uiSender, /\[role=["']textbox["']\]/);
  assert.match(uiSender, /aria-placeholder/);
  assert.match(uiSender, /data-lexical-editor/);
  assert.doesNotMatch(
    uiSender,
    /rect\.height\s*>\s*20/,
    "o editor real do Instagram tem 18 px e não pode ser descartado"
  );
  assert.match(
    uiSender,
    /rect\.height\s*(?:>=\s*(?:1[0-8]|[1-9])|>\s*0)/,
    "o limite de altura precisa aceitar um editor de 18 px"
  );
});

test("o thread_id confiável do realtime evita depender da rota do Direct", () => {
  const sender = between(
    main,
    "async function sendChatbotDirect",
    "async function resolveChatbotDestination"
  );
  const resolver = between(
    main,
    "async function resolveChatbotDestination",
    "function sendChatbotViaReferenceMqtt"
  );

  assert.match(sender, /resolveChatbotDestination\([\s\S]*trustedThreadId/);
  assert.match(resolver, /const safeTrustedThreadId = \/\^\\d\+\$\/\.test/);
  assert.match(resolver, /if \(safeTrustedThreadId\)/);
  assert.match(resolver, /return \{ threadId: safeTrustedThreadId[\s\S]*trustedThreadId: true \}/);
  assert.match(sender, /sendChatbotThroughThreadUi\(String\(existingThreadId \|\| threadId\), text\)/);
});

test("o fallback do background preserva o threadId já detectado", () => {
  const sender = between(
    background,
    "async function sendMessageToInstagram",
    "async function fetchFollowingInBackground"
  );

  assert.match(
    sender,
    /action:\s*["']flowsiChatbotSendMessage["'],[\s\S]{0,240}threadId:\s*String\(threadId\s*\|\|\s*["']["']\)/,
    "o segundo transporte não pode perder o ID da conversa"
  );
});

test("o sender só conclui após o ack do Instagram e a bolha visível quando aplicável", () => {
  const sender = between(
    background,
    "async function sendMessageToInstagram",
    "async function fetchFollowingInBackground"
  );

  const snapshotIndex = sender.indexOf('action: "flowsiChatbotSnapshotOutgoingMessage"');
  const sendIndex = sender.indexOf('action: "flowsiChatbotSendMessageMain"');
  const confirmationIndex = sender.indexOf('action: "flowsiChatbotConfirmOutgoingMessage"');
  assert.ok(snapshotIndex >= 0 && snapshotIndex < sendIndex);
  assert.ok(confirmationIndex >= 0);
  assert.ok(sender.lastIndexOf("return confirmVisibleDelivery(response)") > sendIndex);
  assert.doesNotMatch(sender, /action: "sendMessage"/);
  assert.match(sender, /response\.success !== true \|\| response\.status !== "sent"/);
  assert.match(sender, /confirmation\?\.success !== true \|\| confirmation\.status !== "sent"/);

  assert.match(loader, /matchingVisibleMessageTokens/);
  assert.match(loader, /article\.getAttribute\("aria-labelledby"\)/);
  assert.match(loader, /outgoingOnly && isIncoming/);
  assert.match(loader, /\.find\(token => !baseline\.has\(token\)\)/);
  assert.match(loader, /transport: "reference-bundle-mqtt-dom-verified"/);

  const mqttBridge = between(bundle, 'const lo = Qa("mqtt");', "function co()");
  assert.match(mqttBridge, /subscribe\("\/ig_send_message_response"/);
  assert.match(mqttBridge, /onMessageArrived/);
  assert.doesNotMatch(mqttBridge, /onMessageDelivered\s*=/);
  assert.match(mqttBridge, /acknowledgementContext !== String\(d\)/);
  assert.match(mqttBridge, /statusCode === 0 \|\| \(statusCode >= 200 && statusCode < 300\)/);
  assert.match(mqttBridge, /cp: 3/);
  assert.match(mqttBridge, /ecp: 10/);
  assert.match(mqttBridge, /device_id: deviceId/);
  assert.match(bundle, /Math\.floor\(Math\.random\(\) \* Number\.MAX_SAFE_INTEGER\)/);
});
