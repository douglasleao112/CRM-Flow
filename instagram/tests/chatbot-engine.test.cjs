const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const storage = {
  bots: [],
  quickMessages: [{ type: "text", title: "Resposta", content: "Mensagem automática" }],
  flowsiChatbotDirectBaselineReady: true,
  flowsiChatbotNotificationBaselineReady: true,
  flowsiChatbotSeenDirect: [],
  flowsiChatbotSeenComments: [],
  flowsiChatbotSeenFollowers: [],
  flowsiChatbotCompletedActions: []
};
const sentMessages = [];
const fetchCalls = [];
let failPublicReplyOnce = false;
let mainSendStatus = "sent";

const chrome = {
  cookies: { getAll: async () => [], get: async () => null },
  tabs: {
    query: async () => [{ id: 1, url: "https://www.instagram.com/direct/inbox/" }],
    create: async () => ({}),
    update: async () => ({}),
    sendMessage: async (_tabId, payload) => {
      if (payload?.action === "flowsiChatbotReadInbox") {
        return {
          success: true,
          primary: [{ thread_id: "page-primary", users: [], items: [] }],
          general: [{ thread_id: "page-general", users: [], items: [] }],
          viewerId: "100"
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
  sendMessageToInstagram,
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
    publicCommentReply: "Te enviei no Direct!"
  };

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

  const pageInbox = await api.fetchDirectInboxFromInstagramTab(1, "csrf");
  assert.equal(pageInbox.transport, "instagram-page");
  assert.equal(pageInbox.primary.length, 1);
  assert.equal(pageInbox.general.length, 1);
  assert.equal(pageInbox.viewerId, "100");

  const directThread = {
    thread_id: "thread-1",
    users: [{ pk: "200", username: "cliente.direct" }],
    items: [{ item_id: "direct-1", user_id: "200", text: "Eu quero detalhes" }]
  };
  await api.processDirectInbox(1, [directThread], [bot], "100");
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].username, "cliente.direct");
  await api.processDirectInbox(1, [directThread], [bot], "100");
  assert.equal(sentMessages.length, 1, "Direct não pode ser enviado duas vezes");

  const comment = {
    notif_name: "comment",
    pk: "notification-comment-1",
    args: {
      comment_id: "comment-1",
      comment_text: "QUERO",
      profile_name: "cliente.comentario",
      media_id: "media-1"
    }
  };
  await api.processInstagramNotifications(1, [comment], [bot], "csrf");
  assert.equal(sentMessages.length, 2);
  assert.equal(
    fetchCalls.some(call => call.url.includes("/media/media-1/comment/")),
    true,
    "A resposta pública precisa usar o endpoint da postagem"
  );
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
  await api.processInstagramNotifications(1, [retryComment], [bot], "csrf");
  assert.equal(sentMessages.length, 3, "Retry da resposta pública não pode duplicar o Direct");

  const follower = {
    notif_name: "follow",
    pk: "notification-follow-1",
    args: { profile_name: "novo.seguidor", profile_id: "300" }
  };
  await api.processInstagramNotifications(1, [follower], [bot], "csrf");
  assert.equal(sentMessages.length, 4);
  assert.equal(sentMessages[3].username, "novo.seguidor");
  await api.processInstagramNotifications(1, [follower], [bot], "csrf");
  assert.equal(sentMessages.length, 4, "Novo seguidor não pode receber Direct duplicado");

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
  assert.equal(sentMessages.length, 5, "O primeiro poll não pode engolir um gatilho recente");
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
  assert.equal(sentMessages.length, 7, "Todos os novos itens da conversa precisam ser avaliados");

  await api.fetchDirectInboxFolder(0, "csrf");
  assert.equal(
    fetchCalls.at(-1).url.includes("thread_message_limit=10"),
    true,
    "A consulta do Direct precisa solicitar os itens das conversas"
  );

  mainSendStatus = "queued";
  await assert.rejects(
    () => api.sendMessageToInstagram("cliente.sem.confirmacao", "Teste", 1),
    /não confirmou/i,
    "Uma fila sem confirmação não pode ser registrada como envio concluído"
  );

  console.log("chatbot-engine: 28 assertions passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
