const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const storage = {
  bots: [],
  quickMessages: [{
    type: "text",
    title: "Resposta",
    content: "Olá <name>! Seu usuário é <username>."
  }],
  flowsiChatbotDirectBaselineReady: true,
  flowsiChatbotNotificationBaselineReady: true,
  flowsiChatbotSeenDirect: [],
  flowsiChatbotSeenComments: [],
  flowsiChatbotSeenFollowers: [],
  flowsiChatbotCompletedActions: [],
  contactList: [],
  flowsiManualContacts: [],
  kanbanColumns: [
    { id: "all-chats", title: "Todas", profiles: [] },
    { id: "leads", title: "Leads", profiles: [] }
  ],
  flowsiKanbanAssignmentsV2: {}
};
const sentMessages = [];
const commentReplies = [];
const commentReplyRequests = [];
const fetchCalls = [];
let failPublicReplyOnce = false;
let loseTemporaryReplyPortOnce = false;
let mainSendStatus = "sent";
let deliveryConversationVisible = false;
let deliveryConfirmationStatus = "sent";

const chrome = {
  cookies: { getAll: async () => [], get: async () => null },
  tabs: {
    query: async () => [{ id: 1, url: "https://www.instagram.com/direct/inbox/" }],
    create: async () => loseTemporaryReplyPortOnce ? { id: 90 } : ({}),
    get: async tabId => ({ id: tabId, status: "complete" }),
    remove: async () => {},
    update: async () => ({}),
    sendMessage: async (_tabId, payload) => {
      if (payload?.action === "flowsiChatbotBridgeReady") {
        return { success: true };
      }
      if (payload?.action === "flowsiChatbotReplyCommentMain") {
        commentReplyRequests.push({ tabId: _tabId, payload });
        if (loseTemporaryReplyPortOnce) {
          if (_tabId === 1) {
            return { success: false, status: "unconfirmed", error: "use permalink" };
          }
          loseTemporaryReplyPortOnce = false;
          throw new Error("message port closed after dispatch");
        }
        if (failPublicReplyOnce) {
          failPublicReplyOnce = false;
          return { success: false, status: "unconfirmed", error: "temporary" };
        }
        commentReplies.push(payload);
        return {
          success: true,
          status: "sent",
          transport: "instagram-page-comment-api"
        };
      }
      if (payload?.action === "flowsiChatbotReadNotifications") {
        return {
          success: true,
          transport: "instagram-page-notifications",
          notifications: [{
            notification_type: "activity",
            id: "page-follow-1",
            text: "começou a seguir você.",
            actor: {
              id: "301",
              username: "seguidor.da.home",
              full_name: "Seguidor da Home"
            }
          }]
        };
      }
      if (payload?.action === "flowsiChatbotReadInbox") {
        return {
          success: true,
          primary: [{ thread_id: "page-primary", users: [], items: [] }],
          general: [{ thread_id: "page-general", users: [], items: [] }],
          viewerId: "100"
        };
      }
      if (payload?.action === "flowsiChatbotReadVisibleInbox") {
        return {
          success: true,
          threads: [{ thread_id: "visible-recent", users: [], items: [] }]
        };
      }
      if (payload?.action === "flowsiChatbotSnapshotOutgoingMessage") {
        return {
          success: true,
          activeConversation: deliveryConversationVisible,
          threadId: "visible-thread",
          route: "/direct/t/visible-thread/",
          tokens: ["before-message"]
        };
      }
      if (payload?.action === "flowsiChatbotConfirmOutgoingMessage") {
        return deliveryConfirmationStatus === "sent"
          ? {
              success: true,
              status: "sent",
              threadId: "visible-thread",
              transport: "reference-bundle-mqtt-dom-verified",
              confirmation: "outgoing-bubble"
            }
          : {
              success: false,
              status: "unconfirmed",
              error: "A nova mensagem não apareceu como bolha de saída no Direct."
            };
      }
      if (payload?.action === "flowsiChatbotSendMessageMain") {
        sentMessages.push(payload);
        return {
          success: true,
          status: mainSendStatus,
          transport: mainSendStatus === "sent" ? "instagram-page-http" : "unconfirmed"
        };
      }
      if (payload?.action === "sendMessage") {
        sentMessages.push(payload);
        return { status: "activated" };
      }
      sentMessages.push(payload);
      return { success: true, status: "queued" };
    }
  },
  storage: {
    local: {
      get: async keys => {
        const names = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(names.map(key => [key, storage[key]]));
      },
      set: async values => Object.assign(storage, values)
    }
  },
  runtime: {
    onMessage: { addListener() {} },
    onInstalled: { addListener() {} }
  },
  alarms: { create() {}, onAlarm: { addListener() {} } }
};

const context = {
  chrome,
  console,
  URLSearchParams,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async (url, options = {}) => {
    fetchCalls.push({ url: String(url), options });
    if (String(url).includes("/api/v1/direct_v2/inbox/")) {
      const payload = { status: "ok", inbox: { threads: [] } };
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload)
      };
    }
    if (failPublicReplyOnce && String(url).includes("/comment/")) {
      failPublicReplyOnce = false;
      return {
        ok: false,
        status: 500,
        json: async () => ({ status: "fail", message: "temporary" }),
        text: async () => ""
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
      text: async () => ""
    };
  }
};
context.globalThis = context;

const backgroundPath = path.join(__dirname, "..", "src", "pages", "background", "index.js");
const source = fs.readFileSync(backgroundPath, "utf8") + `
globalThis.__chatbotTestApi = {
  botMatchesText,
  findTemplate,
  personalizeChatbotMessage,
  sendMessageToInstagram,
  collectInstagramNotifications,
  isFollowerNotification,
  notificationUsername,
  fetchNotificationsFromInstagramTab,
  fetchDirectInboxFolder,
  fetchDirectInboxFromInstagramTab,
  processDirectInbox,
  processInstagramNotifications
};`;
vm.runInNewContext(source, context, { filename: backgroundPath });

(async () => {
  const api = context.__chatbotTestApi;
  const bot = {
    id: "bot-1",
    type: "comment",
    start: true,
    keywords: ["QUERO"],
    template: "Resposta",
    triggerDirect: true,
    triggerPostComments: true,
    triggerNewFollowers: true,
    publicCommentReply: "<name>, te enviei no Direct!",
    addLabel: true,
    labelColumnId: "leads"
  };

  const pageNotifications = await api.fetchNotificationsFromInstagramTab(1, "csrf");
  assert.equal(pageNotifications.transport, "instagram-page-notifications");
  assert.equal(pageNotifications.notifications.length, 1);
  assert.equal(api.isFollowerNotification(pageNotifications.notifications[0]), true);
  assert.equal(api.notificationUsername(pageNotifications.notifications[0]), "seguidor.da.home");

  assert.equal(api.botMatchesText(bot, "quero"), true);
  assert.equal(api.botMatchesText(bot, "Eu QUERO saber mais"), true);
  assert.equal(api.botMatchesText(bot, "querosene"), false);
  const cardBot = { ...bot, keywords: ["ta", "ola"] };
  assert.equal(api.botMatchesText(cardBot, "Ta"), true);
  assert.equal(api.botMatchesText(cardBot, "OLÁ"), true);
  assert.equal(
    api.findTemplate([{ title: " Boas Vindas ", content: "Olá" }], { template: "boas vindas" }).content,
    "Olá"
  );
  assert.equal(
    api.personalizeChatbotMessage(
      "Oi <name>; nome: <nome>; primeiro: <primeironome> (<username>)",
      {
        name: "  Maria   da Silva ",
        username: "@maria.silva"
      }
    ),
    "Oi Maria da Silva; nome: Maria da Silva; primeiro: Maria (maria.silva)",
    "Nome composto deve preencher o nome completo e somente a primeira palavra"
  );
  assert.equal(
    api.personalizeChatbotMessage(
      "Oi <NAME> <NoMe> <PRIMEIRONOME>",
      { username: "@sem.nome" }
    ),
    "Oi sem.nome sem.nome sem.nome",
    "As tags devem ignorar maiúsculas e usar o @ sem arroba como fallback"
  );
  assert.equal(
    api.personalizeChatbotMessage("Oi <name> / <nome> / <primeironome>", {
      name: "$& Cliente Especial",
      username: "@cliente.especial"
    }),
    "Oi $& Cliente Especial / $& Cliente Especial / $&",
    "Caracteres de substituição devem permanecer literais no nome completo e no primeiro nome"
  );
  assert.equal(
    api.personalizeChatbotMessage("Oi <name> <nome> <primeironome>", {}),
    "Oi",
    "Sem identificador, nenhuma tag de nome pode vazar no envio"
  );
  const personalizedWithoutLiteralTags = api.personalizeChatbotMessage(
    "<NAME>|<nome>|<PrimeiroNome>|<username>",
    { name: "Ana Beatriz", username: "@ana.beatriz" }
  );
  assert.equal(personalizedWithoutLiteralTags, "Ana Beatriz|Ana Beatriz|Ana|ana.beatriz");
  assert.doesNotMatch(
    personalizedWithoutLiteralTags,
    /<\s*(?:name|nome|primeironome|username)\s*>/i,
    "Nenhuma tag personalizada pode permanecer literal"
  );

  const pageInbox = await api.fetchDirectInboxFromInstagramTab(1, "csrf");
  assert.equal(pageInbox.transport, "instagram-page+visible-inbox");
  assert.equal(pageInbox.primary.length, 2);
  assert.equal(pageInbox.general.length, 1);
  assert.equal(pageInbox.viewerId, "100");

  const directThread = {
    thread_id: "thread-1",
    users: [{ pk: "200", username: "cliente.direct", full_name: "Cliente do Direct" }],
    items: [{ item_id: "direct-1", user_id: "200", text: "Eu quero detalhes" }]
  };
  await api.processDirectInbox(1, [directThread], [bot], "100");
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].username, "cliente.direct");
  assert.equal(sentMessages[0].message, "Olá Cliente do Direct! Seu usuário é cliente.direct.");
  assert.doesNotMatch(sentMessages[0].message, /<name>/i);
  assert.equal(storage.flowsiKanbanAssignmentsV2["cliente.direct"]?.columnId, "leads");
  await api.processDirectInbox(1, [directThread], [bot], "100");
  assert.equal(sentMessages.length, 1, "Direct não pode ser enviado duas vezes");
  assert.equal(
    storage.kanbanColumns.find(column => column.id === "leads")?.profiles
      .filter(profile => profile.username === "cliente.direct").length,
    1,
    "O retry do Direct não pode duplicar o card na etiqueta"
  );

  const comment = {
    notif_name: "comment",
    pk: "notification-comment-1",
    args: {
      comment_id: "comment-1",
      comment_text: "QUERO",
      profile_name: "cliente.comentario",
      full_name: "Cliente Comentário",
      media: [{ id: "38200000000000001_100" }]
    }
  };
  await api.processInstagramNotifications(1, [comment], [bot], "csrf");
  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[1].message, "Olá Cliente Comentário! Seu usuário é cliente.comentario.");
  assert.doesNotMatch(sentMessages[1].message, /<name>/i);
  assert.equal(
    commentReplies[0].message,
    "Cliente Comentário, te enviei no Direct!",
    "A resposta pública precisa usar a sessão da página e personalizar <name>"
  );
  assert.equal(commentReplies[0].mediaId, "38200000000000001_100");
  assert.equal(commentReplies[0].commentId, "comment-1");
  assert.equal(storage.flowsiKanbanAssignmentsV2["cliente.comentario"]?.columnId, "leads");
  await api.processInstagramNotifications(1, [comment], [bot], "csrf");
  assert.equal(sentMessages.length, 2, "Comentário não pode disparar Direct duplicado");

  failPublicReplyOnce = true;
  const retryComment = {
    notif_name: "comment",
    pk: "notification-comment-2",
    args: {
      comment_id: "comment-2",
      comment_text: "quero",
      profile_name: "cliente.retry",
      media_id: "media-2"
    }
  };
  await api.processInstagramNotifications(1, [retryComment], [bot], "csrf");
  assert.equal(sentMessages.length, 3);
  assert.equal(
    sentMessages[2].message,
    "Olá cliente.retry! Seu usuário é cliente.retry.",
    "Quando o payload não trouxer nome, deve usar o username sem @"
  );
  assert.doesNotMatch(sentMessages[2].message, /<name>/i);
  await api.processInstagramNotifications(1, [retryComment], [bot], "csrf");
  assert.equal(sentMessages.length, 3, "Retry da resposta pública não pode duplicar o Direct");
  assert.equal(commentReplies.length, 2, "O retry deve repetir somente a resposta pública que falhou");

  const ambiguousComment = {
    notif_name: "comment",
    pk: "notification-comment-ambiguous",
    args: {
      comment_id: "comment-ambiguous",
      comment_text: "quero",
      profile_name: "cliente.ambiguo",
      media_id: "38200000000000003_100"
    }
  };
  const requestsBeforeAmbiguousAttempt = commentReplyRequests.length;
  storage.flowsiChatbotCompletedActions.push("comment-ambiguous:bot-1:dm");
  loseTemporaryReplyPortOnce = true;
  await api.processInstagramNotifications(1, [ambiguousComment], [bot], "csrf");
  assert.ok(
    storage.flowsiChatbotCompletedActions.includes("comment-ambiguous:bot-1:public-reply"),
    "Perda da porta depois do despacho deve persistir a tentativa ambigua"
  );
  await api.processInstagramNotifications(1, [ambiguousComment], [bot], "csrf");
  assert.equal(
    commentReplyRequests.length - requestsBeforeAmbiguousAttempt,
    2,
    "O ciclo seguinte nao pode repetir uma resposta publica ja despachada"
  );

  const follower = {
    notif_name: "follow",
    pk: "notification-follow-1",
    args: {
      profile_name: "novo.seguidor",
      profile_id: "300",
      full_name: "Novo Seguidor"
    }
  };
  await api.processInstagramNotifications(1, [follower], [bot], "csrf");
  assert.equal(sentMessages.length, 3, "O gatilho legado de novo seguidor deve permanecer desativado");
  await api.processInstagramNotifications(1, [follower], [bot], "csrf");
  assert.equal(sentMessages.length, 3, "Novo seguidor nunca deve receber Direct automático");

  const followerFromCurrentPayload = pageNotifications.notifications[0];
  await api.processInstagramNotifications(1, [followerFromCurrentPayload], [bot], "csrf");
  assert.equal(sentMessages.length, 3, "Atividade de seguidor também deve ser ignorada");
  await api.processInstagramNotifications(1, [followerFromCurrentPayload], [bot], "csrf");
  assert.equal(sentMessages.length, 3, "Atividade repetida de seguidor deve continuar ignorada");
  assert.equal(
    sentMessages.some(item => /<\s*name\s*>/i.test(String(item?.message || ""))),
    false,
    "Nenhum gatilho ativo pode enviar a tag <name> literalmente"
  );

  storage.flowsiChatbotDirectBaselineReady = false;
  storage.flowsiChatbotSeenDirect = [];
  storage.flowsiChatbotCompletedActions = [];
  const nowMicros = Date.now() * 1000;
  const firstPollThread = {
    thread_id: "thread-first-poll",
    users: [{ pk: "400", username: "cliente.primeiro.poll" }],
    items: [
      {
        item_id: "direct-recent-non-match",
        user_id: "400",
        text: "TETE",
        timestamp: nowMicros + 1000
      },
      {
        item_id: "direct-recent",
        user_id: "400",
        text: "QUERO agora",
        timestamp: nowMicros
      },
      {
        item_id: "direct-old",
        user_id: "400",
        text: "QUERO antigo",
        timestamp: nowMicros - 10 * 60 * 1000 * 1000
      }
    ]
  };
  await api.processDirectInbox(1, [firstPollThread], [bot], "100");
  assert.equal(sentMessages.length, 4, "O primeiro poll não pode engolir um gatilho recente");
  assert.equal(storage.flowsiChatbotSeenDirect.includes("direct-old"), true);
  assert.equal(storage.flowsiChatbotSeenDirect.includes("direct-recent"), true);

  const multiItemThread = {
    thread_id: "thread-multiple-items",
    users: [{ pk: "500", username: "cliente.multiplos" }],
    items: [
      { item_id: "direct-multi-1", user_id: "500", text: "quero um", timestamp: nowMicros + 1000 },
      { item_id: "direct-multi-2", user_id: "500", text: "quero dois", timestamp: nowMicros + 2000 }
    ]
  };
  await api.processDirectInbox(1, [multiItemThread], [bot], "100");
  assert.equal(sentMessages.length, 6, "Todos os novos itens da conversa precisam ser avaliados");

  await api.fetchDirectInboxFolder(0, "csrf");
  assert.equal(
    fetchCalls.at(-1).url.includes("thread_message_limit=10"),
    true,
    "A consulta do Direct precisa solicitar os itens das conversas"
  );

  deliveryConversationVisible = true;
  deliveryConfirmationStatus = "sent";
  mainSendStatus = "sent";
  const confirmedStart = sentMessages.length;
  const confirmedSend = await api.sendMessageToInstagram(
    "cliente.confirmado",
    "Mensagem confirmada",
    1,
    "visible-thread"
  );
  assert.equal(confirmedSend.status, "sent");
  assert.equal(confirmedSend.confirmation, "instagram-ack+outgoing-bubble");
  assert.equal(confirmedSend.transport, "instagram-page-http");
  assert.deepEqual(
    sentMessages.slice(confirmedStart).map(item => item.action),
    ["flowsiChatbotSendMessageMain"],
    "A confirmação visual não pode disparar um segundo transporte"
  );

  deliveryConfirmationStatus = "unconfirmed";
  const unconfirmedStart = sentMessages.length;
  await assert.rejects(
    () => api.sendMessageToInstagram(
      "cliente.sem.bolha",
      "Mensagem sem bolha",
      1,
      "visible-thread"
    ),
    /não apareceu como bolha de saída/i
  );
  assert.deepEqual(
    sentMessages.slice(unconfirmedStart).map(item => item.action),
    ["flowsiChatbotSendMessageMain"],
    "Sem bolha confirmada, não deve haver fallback que duplique o envio em voo"
  );

  deliveryConversationVisible = false;
  mainSendStatus = "queued";
  await assert.rejects(
    () => api.sendMessageToInstagram("cliente.sem.confirmacao", "Teste", 1),
    /não confirmou/i,
    "Uma fila sem confirmação não pode ser registrada como envio concluído"
  );

  console.log("chatbot-engine: 31 assertions passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
