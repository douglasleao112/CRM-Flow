(() => {
  if (window.__WF_PAGE_BRIDGE__) return;
  window.__WF_PAGE_BRIDGE__ = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const BRIDGE_VERSION = 14;
  const bridgeStartedAt = Date.now();
  let voiceWppPromise = null;
  let bridgeListenersInstalled = false;
  let bridgeListenerTransport = "";
  let nativeMessagePollerInstalled = false;
  let lastResolvedActiveChat = { chatId: "", name: "", title: "" };
  const polledMessageIds = new Set();
  const polledMessageOrder = [];

  const getWPP = () => {
    const loaderState = window.__WF_VENDOR_LOADER__?.state;
    if (loaderState && loaderState !== "ready") return null;
    return window.__WF_WPP__ || window.WFWPP || null;
  };

  function getNativeEngine() {
    try {
      const api = typeof window.WWebJSBt?.getChat === "function"
        ? window.WWebJSBt
        : window.WWebJS;
      let btSender = null;
      try {
        btSender = window.getBTWebJS?.();
      } catch {}
      const sender = typeof btSender?.sendMessage === "function"
        ? btSender
        : api;
      const store = window.getStore?.();
      const prepare =
        store?.PrepareMessageSendingAction?.prepareChatForMessageSending;
      if (
        typeof api?.getChat !== "function" ||
        typeof sender?.sendMessage !== "function" ||
        typeof prepare !== "function" ||
        typeof store?.QueryExist !== "function" ||
        !store?.Msg ||
        !store?.Chat ||
        !store?.WidFactory
      ) {
        return null;
      }
      return {
        api,
        sender,
        store,
        prepare,
        transport: sender === btSender ? "btwebjs" : "wwebjs"
      };
    } catch {
      return null;
    }
  }

  function getEngineCapabilities() {
    const wpp = getWPP();
    const native = getNativeEngine();
    const wppEvents =
      typeof wpp?.chat?.on === "function" ||
      typeof wpp?.on === "function";
    const nativeEvents = typeof native?.store?.Msg?.on === "function";
    const nativeReady = Boolean(native);
    const wppReady = Boolean(
      typeof wpp?.chat?.sendTextMessage === "function" &&
      typeof wpp?.contact?.queryExists === "function" &&
      wpp?.isReady === true
    );

    return {
      available: nativeReady || Boolean(wpp),
      injected: Boolean(wpp?.isInjected),
      ready: Boolean(wpp?.isReady),
      events: wppEvents || nativeEvents,
      chatApi: typeof wpp?.chat?.sendTextMessage === "function",
      contactApi: typeof wpp?.contact?.queryExists === "function",
      nativeReady,
      nativeChatApi:
        typeof native?.api?.getChat === "function" &&
        typeof native?.sender?.sendMessage === "function",
      nativeContactApi: typeof native?.store?.QueryExist === "function",
      nativePrepared: typeof native?.prepare === "function",
      transport: nativeReady
        ? native.transport
        : (wppReady ? "wppconnect" : ""),
      version: nativeReady
        ? String(
            window.WWebJSBt?.version ||
            window.WWebJS?.version ||
            native.transport
          )
        : String(wpp?.version || "")
    };
  }

  function isOperationalEngine() {
    const capabilities = getEngineCapabilities();
    return Boolean(
      capabilities.nativeReady ||
      (
        capabilities.chatApi &&
        capabilities.contactApi &&
        capabilities.ready
      )
    );
  }

  function preferredTransport() {
    const native = getNativeEngine();
    if (native) return native.transport;
    return isOperationalEngine() ? "wppconnect" : "";
  }

  function withTimeout(promise, timeoutMs, message) {
    let timer;

    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(message);
          error.code = "WF_SEND_TIMEOUT";
          reject(error);
        }, timeoutMs);
      })
    ]).finally(() => clearTimeout(timer));
  }

  function serializeWid(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value._serialized) return value._serialized;
    if (value.user && value.server) return `${value.user}@${value.server}`;
    return String(value);
  }

  function serializeMessageKey(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value.waMessageKey) return serializeMessageKey(value.waMessageKey);
    if (value._serialized) return String(value._serialized);
    if (value.id?._serialized) return String(value.id._serialized);
    const remote = serializeWid(value.remote || value.id?.remote);
    const id = value.id?.id || (
      typeof value.id === "string" ? value.id : ""
    );
    if (remote && id) {
      return `${Boolean(value.fromMe || value.id?.fromMe)}_${remote}_${id}`;
    }
    if (id) return String(id);
    const serialized = String(value);
    return serialized === "[object Object]" ? "" : serialized;
  }

  function serializeMessage(msg) {
    const attributes = msg?.attributes || {};
    const messageKey =
      msg?.waMessageKey ||
      msg?.id?.waMessageKey ||
      attributes?.waMessageKey ||
      attributes?.id?.waMessageKey ||
      {};
    const serializedId = serializeMessageKey(msg?.id || msg);
    const rawFromMe =
      msg?.fromMe ??
      msg?.id?.fromMe ??
      messageKey?.fromMe ??
      attributes?.fromMe ??
      attributes?.id?.fromMe;
    const rawTimestamp = Number(
      msg?.t || msg?.timestamp || attributes?.t || attributes?.timestamp || 0
    );
    const id = serializedId || `${Date.now()}-${Math.random()}`;

    const chatId =
      serializeWid(msg?.chatId) ||
      serializeWid(attributes?.chatId) ||
      serializeWid(msg?.from) ||
      serializeWid(msg?.id?.remote) ||
      serializeWid(messageKey?.remote) ||
      serializeWid(attributes?.from) ||
      serializeWid(attributes?.id?.remote) ||
      serializeWid(msg?.to);

    return {
      id: String(id),
      chatId,
      from: serializeWid(msg?.from || attributes?.from),
      to: serializeWid(msg?.to || attributes?.to),
      author: serializeWid(msg?.author || attributes?.author),
      body: String(msg?.body || msg?.caption || attributes?.body || attributes?.caption || ""),
      type: String(msg?.type || attributes?.type || ""),
      fromMe: Boolean(rawFromMe),
      fromMeKnown: rawFromMe !== undefined && rawFromMe !== null,
      isGroup: chatId.endsWith("@g.us"),
      timestamp: rawTimestamp,
      timestampKnown: Number.isFinite(rawTimestamp) && rawTimestamp > 0,
      idKnown: Boolean(serializedId)
    };
  }

  function emit(type, payload = {}) {
    window.postMessage({ source: "WF_PAGE", type, ...payload }, "*");
  }

  function getNativeStreamState(native) {
    try {
      const stream =
        window.AuthStoreBt?.Stream ||
        window.AuthStore?.Stream ||
        native?.store?.WAWebStreamModel?.Stream ||
        native?.store?.Stream;
      const rawState =
        stream?.state ||
        stream?.get?.("state") ||
        stream?.socket?.state;
      if (typeof rawState !== "string" && typeof rawState !== "number") return "";
      return String(rawState).trim().toUpperCase();
    } catch {
      return "";
    }
  }

  function getAccountId() {
    const wpp = getWPP();
    const native = getNativeEngine();
    const candidates = [];
    for (const getter of [
      wpp?.conn?.getMyUserWid,
      wpp?.conn?.getMyUserId,
      wpp?.conn?.getMyDeviceId
    ]) {
      if (typeof getter !== "function") continue;
      try {
        const value = getter.call(wpp.conn);
        if (!value?.then) candidates.push(value);
      } catch {}
    }
    candidates.push(native?.store?.Conn?.wid, native?.store?.Conn?.me);
    for (const getter of [
      native?.store?.UserPrefs?.getMaybeMeUser,
      native?.store?.UserPrefs?.getMeUser
    ]) {
      if (typeof getter !== "function") continue;
      try {
        const value = getter.call(native.store.UserPrefs);
        if (!value?.then) candidates.push(value);
      } catch {}
    }
    for (const candidate of candidates) {
      const value = serializeWid(candidate);
      if (value) return value;
    }
    return "";
  }

  function getConnectionState() {
    const wpp = getWPP();
    const native = getNativeEngine();
    let authenticated = false;
    let whatsappOnline = true;
    const wppAuthenticationKnown =
      typeof wpp?.conn?.isAuthenticated === "function";

    try {
      authenticated = Boolean(wpp?.conn?.isAuthenticated?.());
      const online = wpp?.conn?.isOnline;
      if (typeof online === "function") whatsappOnline = online() !== false;
      else if (typeof online === "boolean") whatsappOnline = online;
    } catch {
      whatsappOnline = false;
    }

    if (native) {
      const streamState = getNativeStreamState(native);
      const disconnectedStates = new Set([
        "CONFLICT",
        "DEPRECATED_VERSION",
        "DISCONNECTED",
        "LOGOUT",
        "PROXYBLOCK",
        "SMB_TOS_BLOCK",
        "TIMEOUT",
        "TOS_BLOCK",
        "UNLAUNCHED",
        "UNPAIRED",
        "UNPAIRED_IDLE"
      ]);
      const nativeStateKnown = streamState === "CONNECTED" || disconnectedStates.has(streamState);
      if (nativeStateKnown) {
        // O Stream interno do próprio WhatsApp é a fonte mais atual após a
        // máquina voltar do standby. WA-JS pode manter isOnline=false em cache.
        authenticated = !disconnectedStates.has(streamState);
        whatsappOnline = !disconnectedStates.has(streamState);
      } else if (!authenticated && wppAuthenticationKnown) {
        // Se o próprio namespace do WhatsFlow informou logout, a simples
        // presença do Store nativo não deve transformar isso em "conectado".
        authenticated = false;
        whatsappOnline = false;
      } else if (!wppAuthenticationKnown) {
        // Builds exclusivamente nativos não expõem Stream/conn, mas continuam
        // operacionais; o envio ainda fará a validação definitiva.
        authenticated = true;
        whatsappOnline = true;
      }
    }

    return {
      authenticated,
      connected: authenticated && globalThis.navigator?.onLine !== false && whatsappOnline,
      accountId: getAccountId()
    };
  }

  function loadVoiceWPP() {
    const namespacedWpp = getWPP();
    if (typeof namespacedWpp?.chat?.sendFileMessage !== "function") {
      return Promise.reject(new Error("Biblioteca de mensagem de voz não inicializou."));
    }
    voiceWppPromise ||= Promise.resolve(namespacedWpp);
    return voiceWppPromise;
  }

  async function waitForEngine(timeoutMs = 65000) {
    const started = Date.now();
    let listenerOwner = null;
    while (Date.now() - started < timeoutMs) {
      if (isOperationalEngine()) return true;
      const wpp = getWPP();
      if (wpp && listenerOwner !== wpp) {
        listenerOwner = wpp;
        try {
          wpp.loader?.onInjected?.(() => {});
        } catch {}
        try {
          wpp.loader?.onReady?.(() => {});
        } catch {}
      }
      await sleep(500);
    }
    return false;
  }

  function emitIncomingMessage(msg) {
    const data = serializeMessage(msg);
    if (!data.timestampKnown) {
      data.timestamp = Date.now();
      data.timestampKnown = true;
    }
    if (
      data.fromMeKnown &&
      !data.fromMe &&
      data.idKnown &&
      data.chatId
    ) {
      if (!data.isGroup) emit("INCOMING_ACTIVITY", { message: data });
      if (hasUserMessageContent(data)) emit("NEW_MESSAGE", { message: data });
    }
  }

  function emitMessageAck(msg, explicitAck) {
    const messageId = serializeMessageKey(msg?.id || msg);
    if (!messageId) return;
    const ack = Number(explicitAck ?? msg?.ack ?? 0);
    emit("MESSAGE_ACK", {
      messageId,
      chatId:
        serializeWid(msg?.chatId) ||
        serializeWid(msg?.to) ||
        serializeWid(msg?.id?.remote),
      ack: Number.isFinite(ack) ? ack : 0
    });
  }

  function isCurrentNativeMessage(msg) {
    // Builds antigos marcavam a chegada com isNewMsg. Em builds recentes do
    // WhatsApp esse campo pode vir falso/ausente, enquanto isLive continua
    // identificando a mensagem adicionada em tempo real. Mensagens restauradas
    // pelo histórico não têm isLive=true e permanecem ignoradas.
    if (msg?.isNewMsg === true || msg?.isLive === true) return true;
    const rawTimestamp = Number(
      msg?.t || msg?.timestamp || msg?.attributes?.t || msg?.attributes?.timestamp || 0
    );
    const timestamp = rawTimestamp && rawTimestamp < 1e12
      ? rawTimestamp * 1000
      : rawTimestamp;
    const rawFromMe =
      msg?.fromMe ??
      msg?.id?.fromMe ??
      msg?.waMessageKey?.fromMe ??
      msg?.id?.waMessageKey?.fromMe ??
      msg?.attributes?.fromMe ??
      msg?.attributes?.waMessageKey?.fromMe;
    return Boolean(
      rawFromMe === false &&
      serializeMessageKey(msg?.id || msg) &&
      Number.isFinite(timestamp) &&
      timestamp > 0 &&
      Math.abs(Date.now() - timestamp) <= 120000
    );
  }

  function installNativeListeners(native) {
    const messages = native?.store?.Msg;
    if (typeof messages?.on !== "function") return false;
    messages.on("add", msg => {
      if (!isCurrentNativeMessage(msg)) return;
      emitIncomingMessage(msg);
    });
    try {
      messages.on("change:ack", (msg, ack) => emitMessageAck(msg, ack));
    } catch {}
    bridgeListenersInstalled = true;
    bridgeListenerTransport = native.transport;
    return true;
  }

  function installWppListeners(wpp) {
    const eventBus = typeof wpp?.chat?.on === "function" ? wpp.chat : wpp;
    if (typeof eventBus?.on !== "function") return false;
    eventBus.on("chat.new_message", emitIncomingMessage);
    try {
      eventBus.on("chat.msg_ack_change", (...args) => {
        const payload = args.find(value =>
          value &&
          typeof value === "object" &&
          ("ack" in value || "ids" in value)
        ) || {};
        const ack = Number(
          args.find(value => typeof value === "number") ??
          payload.ack ??
          0
        );
        const rawIds = Array.isArray(payload.ids)
          ? payload.ids
          : [payload.id || args.find(value =>
              value &&
              typeof value === "object" &&
              (value._serialized || value.id)
            )];
        rawIds
          .map(serializeMessageKey)
          .filter(Boolean)
          .forEach(messageId => emit("MESSAGE_ACK", {
            messageId,
            chatId:
              serializeWid(payload.chat) ||
              serializeWid(payload.chatId) ||
              serializeWid(payload.to),
            ack
          }));
      });
    } catch {}
    bridgeListenersInstalled = true;
    bridgeListenerTransport = "wppconnect";
    return true;
  }

  function rememberPolledMessage(messageId) {
    if (!messageId || polledMessageIds.has(messageId)) return false;
    polledMessageIds.add(messageId);
    polledMessageOrder.push(messageId);
    while (polledMessageOrder.length > 2000) {
      polledMessageIds.delete(polledMessageOrder.shift());
    }
    return true;
  }

  function pollNativeIncomingMessages() {
    let store = null;
    try {
      store = getNativeEngine()?.store || window.getStore?.();
    } catch {}
    const messages = getCollectionModels(store?.Msg).slice(-150);
    const now = Date.now();
    messages.forEach(message => {
      const messageId = serializeMessageKey(message?.id || message);
      if (!rememberPolledMessage(messageId)) return;
      const timestamp = messageTimestampMs(message);
      if (
        messageFromMe(message) === false &&
        timestamp >= bridgeStartedAt - 5000 &&
        timestamp <= now + 60000 &&
        hasUserMessageContent(message)
      ) {
        emitIncomingMessage(message);
      }
    });
  }

  function installNativeMessagePoller() {
    if (nativeMessagePollerInstalled) return;
    nativeMessagePollerInstalled = true;
    pollNativeIncomingMessages();
    // Usa o timer da própria página. O polling é uma rede de segurança para
    // builds do WhatsApp que deixaram de emitir add/chat.new_message.
    window.setInterval?.(pollNativeIncomingMessages, 750);
  }

  function installPreferredListeners() {
    if (bridgeListenersInstalled) return true;
    const native = getNativeEngine();
    const nativeInstalled = Boolean(native && installNativeListeners(native));
    const wppInstalled = installWppListeners(getWPP());
    bridgeListenersInstalled = nativeInstalled || wppInstalled;
    bridgeListenerTransport = nativeInstalled && wppInstalled
      ? `${native.transport}+wppconnect`
      : nativeInstalled
        ? native.transport
        : wppInstalled
          ? "wppconnect"
          : "";
    return bridgeListenersInstalled;
  }

  async function initialize() {
    while (true) {
      const available = await waitForEngine();
      if (!available) {
        emit("BRIDGE_ERROR", {
          error: "O motor do WhatsFlow ainda está carregando no WhatsApp.",
          stage: "wa-js",
          capabilities: getEngineCapabilities()
        });
        await sleep(2000);
        continue;
      }

      try {
        installPreferredListeners();
        installNativeMessagePoller();
        if (!bridgeListenersInstalled) {
          bridgeListenersInstalled = true;
          bridgeListenerTransport = preferredTransport();
        }
        emit("BRIDGE_READY", {
          bridgeVersion: BRIDGE_VERSION,
          version: getEngineCapabilities().version || "native",
          capabilities: {
            ...getEngineCapabilities(),
            listenerTransport: bridgeListenerTransport
          },
          ...getConnectionState()
        });
        return;
      } catch (error) {
        emit("BRIDGE_ERROR", {
          error: error?.message || String(error),
          stage: "listeners",
          capabilities: getEngineCapabilities()
        });
        await sleep(2000);
      }
    }
  }

  async function readServerAck(messageId, initialAck) {
    let ack = Number(initialAck);
    if (Number.isFinite(ack) && ack < 0) {
      throw new Error("O WhatsApp recusou o envio da mensagem.");
    }
    if (Number.isFinite(ack) && ack >= 1) return ack;

    const native = getNativeEngine();
    if (messageId && native?.store?.Msg) {
      try {
        const nativeMessage = native.store.Msg.get?.(messageId);
        ack = Number(nativeMessage?.ack);
        if (Number.isFinite(ack) && ack < 0) {
          throw new Error("O WhatsApp recusou o envio da mensagem.");
        }
        if (Number.isFinite(ack) && ack >= 1) return ack;
      } catch (error) {
        if (/recusou/i.test(String(error?.message || error))) throw error;
      }
    }

    const chatApi = getWPP()?.chat;
    if (!messageId || typeof chatApi?.getMessageACK !== "function") return null;

    try {
      const ackInfo = await withTimeout(
        Promise.resolve(chatApi.getMessageACK(messageId)),
        1500,
        "Confirmação do WhatsApp ainda pendente."
      );
      ack = Number(ackInfo?.ack ?? ackInfo);
      if (Number.isFinite(ack) && ack < 0) {
        throw new Error("O WhatsApp recusou o envio da mensagem.");
      }
      if (Number.isFinite(ack) && ack >= 1) return ack;
    } catch (error) {
      if (/recusou/i.test(String(error?.message || error))) throw error;
    }
    return null;
  }

  function getCollectionModels(collection) {
    if (!collection) return [];
    try {
      if (typeof collection.getModelsArray === "function") {
        return collection.getModelsArray() || [];
      }
      if (Array.isArray(collection.models)) return collection.models;
      if (Array.isArray(collection._models)) return collection._models;
      if (Array.isArray(collection)) return collection;
    } catch {}
    return [];
  }

  function messageTimestampMs(message) {
    let timestamp = Number(
      message?.t ||
      message?.timestamp ||
      message?.attributes?.t ||
      message?.attributes?.timestamp ||
      0
    );
    if (timestamp && timestamp < 1e12) timestamp *= 1000;
    return timestamp;
  }

  function messageBody(message) {
    return String(
      message?.body ??
      message?.caption ??
      message?.text ??
      message?.attributes?.body ??
      message?.attributes?.caption ??
      message?.attributes?.text ??
      ""
    );
  }

  function messageFromMe(message) {
    const raw =
      message?.fromMe ??
      message?.id?.fromMe ??
      message?.waMessageKey?.fromMe ??
      message?.id?.waMessageKey?.fromMe ??
      message?.attributes?.fromMe ??
      message?.attributes?.id?.fromMe ??
      message?.attributes?.waMessageKey?.fromMe;
    if (raw === undefined || raw === null) return null;
    return Boolean(raw);
  }

  function messageChatId(message) {
    const fromMe = messageFromMe(message);
    return (
      serializeWid(message?.chatId) ||
      serializeWid(message?.attributes?.chatId) ||
      serializeWid(message?.waMessageKey?.remote) ||
      serializeWid(message?.id?.waMessageKey?.remote) ||
      serializeWid(message?.attributes?.waMessageKey?.remote) ||
      serializeWid(message?.id?.remote) ||
      serializeWid(message?.remote) ||
      serializeWid(fromMe === true ? message?.to : message?.from) ||
      serializeWid(message?.to) ||
      serializeWid(message?.from)
    );
  }

  function isTechnicalMessageType(message) {
    return /^(protocol|e2e_notification|notification|gp2|revoked|ciphertext|unknown|call_log|missed_call|reaction|reaction_message|poll_update|sender_key_distribution|placeholder)$/i
      .test(String(message?.type || message?.attributes?.type || "").trim());
  }

  function hasUserMessageContent(message) {
    if (isTechnicalMessageType(message)) return false;
    return Boolean(
      String(
        message?.body ||
        message?.caption ||
        message?.attributes?.body ||
        message?.attributes?.caption ||
        ""
      ).trim() ||
      String(message?.type || message?.attributes?.type || "").trim()
    );
  }

  function isSubstantiveIncomingMessage(message) {
    if (messageFromMe(message) !== false) return false;
    const chatId = messageChatId(message);
    if (!chatId || chatId.endsWith("@g.us")) return false;
    return hasUserMessageContent(message);
  }

  function messageTrackingToken(message) {
    return String(
      message?.comment ||
      message?.campaignId ||
      message?.messageContextInfo?.comment ||
      message?.messageContextInfo?.campaignId ||
      ""
    );
  }

  function sameChatId(left, right) {
    const a = String(left || "");
    const b = String(right || "");
    if (!a || !b) return false;
    if (a === b) return true;
    return a.split("@")[0] === b.split("@")[0];
  }

  function getNativeMessages(native, chat, chatId = "") {
    const expectedChatId = chatId || serializeWid(chat?.id);
    const scopedMessages = getCollectionModels(chat?.msgs);
    const globalMessages = getCollectionModels(native?.store?.Msg)
      .filter(message =>
        sameChatId(messageChatId(message), expectedChatId)
      );
    const candidates = [
      ...scopedMessages,
      ...globalMessages
    ];
    const seen = new Set();
    return candidates.filter(message => {
      const id = serializeMessageKey(message?.id || message);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  async function findRecentNativeOutgoing(
    native,
    chat,
    chatId,
    text,
    startedAt,
    ignoredIds = new Set(),
    trackingToken = "",
    timeoutMs = 2500
  ) {
    const deadline = Date.now() + timeoutMs;
    do {
      const match = getNativeMessages(native, chat, chatId)
        .filter(message => {
          const messageId = serializeMessageKey(message?.id || message);
          const timestamp = messageTimestampMs(message);
          return (
            messageId &&
            !ignoredIds.has(messageId) &&
            messageFromMe(message) === true &&
            messageBody(message) === String(text) &&
            sameChatId(messageChatId(message), chatId) &&
            (!timestamp || timestamp >= startedAt - 2000)
          );
        })
        .sort((left, right) => {
          // Algumas versões do WhatsApp removem comment/campaignId do modelo
          // depois do envio. O token continua sendo preferido, mas o texto,
          // destinatário, horário e IDs novos ainda confirmam o mesmo envio.
          const leftTracked = trackingToken && messageTrackingToken(left) === trackingToken ? 1 : 0;
          const rightTracked = trackingToken && messageTrackingToken(right) === trackingToken ? 1 : 0;
          return rightTracked - leftTracked ||
            messageTimestampMs(right) - messageTimestampMs(left);
        })[0];
      if (match && serializeMessageKey(match?.id || match)) return match;
      await sleep(125);
    } while (Date.now() < deadline);
    return null;
  }

  async function getNativeChat(native, chatId) {
    const chat = await withTimeout(
      Promise.resolve(native.api.getChat(chatId, { getAsModel: false })),
      8000,
      "O WhatsApp demorou para carregar esta conversa."
    );
    if (!chat) {
      throw new Error(
        `O número ${String(chatId).split("@")[0]} não possui WhatsApp.`
      );
    }
    return chat;
  }

  async function prepareNativeChat(native, chat) {
    await withTimeout(
      Promise.resolve(
        native.prepare.call(
          native.store.PrepareMessageSendingAction,
          chat
        )
      ),
      15000,
      "O WhatsApp demorou para preparar esta conversa."
    );
  }

  async function findRecentWppOutgoing(
    chatId,
    text,
    startedAt,
    ignoredIds,
    trackingToken,
    timeoutMs = 8000
  ) {
    const deadline = Date.now() + timeoutMs;
    do {
      let messages = [];
      try {
        messages = await getTrackedMessages(chatId, 50);
      } catch {}
      const match = (messages || [])
        .filter(message => {
          const messageId = serializeMessageKey(message?.id || message);
          const candidateChatId = messageChatId(message);
          const timestamp = messageTimestampMs(message);
          return (
            messageId &&
            !ignoredIds.has(messageId) &&
            messageFromMe(message) === true &&
            messageBody(message) === String(text) &&
            (!candidateChatId || sameChatId(candidateChatId, chatId)) &&
            (!timestamp || timestamp >= startedAt - 2000)
          );
        })
        .sort((left, right) => {
          const leftTracked = trackingToken && messageTrackingToken(left) === trackingToken ? 1 : 0;
          const rightTracked = trackingToken && messageTrackingToken(right) === trackingToken ? 1 : 0;
          return rightTracked - leftTracked ||
            messageTimestampMs(right) - messageTimestampMs(left);
        })[0];
      if (match) return match;
      await sleep(125);
    } while (Date.now() < deadline);
    return null;
  }

  async function checkRecentOutgoing(requestId, chatId, texts, since, timeoutMs = 1500) {
    try {
      const candidates = [...new Set(
        (Array.isArray(texts) ? texts : [texts])
          .map(value => String(value || ""))
          .filter(value => value.trim())
      )];
      if (!candidates.length) {
        emit("COMMAND_RESULT", { requestId, ok: true, result: { found: false } });
        return;
      }

      const startedAt = Number(since) > 0 ? Number(since) : Date.now() - 10 * 60 * 1000;
      const deadline = Date.now() + Math.max(1, Math.min(5000, Number(timeoutMs) || 1500));
      const native = getNativeEngine();
      let result = null;
      let resultChatId = chatId;

      if (native) {
        const chat = await getNativeChat(native, chatId);
        do {
          result = getNativeMessages(native, chat, chatId)
            .filter(message => {
              const timestamp = messageTimestampMs(message);
              return (
                serializeMessageKey(message?.id || message) &&
                messageFromMe(message) === true &&
                candidates.includes(messageBody(message)) &&
                sameChatId(messageChatId(message), chatId) &&
                (!timestamp || timestamp >= startedAt - 2000)
              );
            })
            .sort((left, right) => messageTimestampMs(right) - messageTimestampMs(left))[0] || null;
          if (result) break;
          await sleep(125);
        } while (Date.now() < deadline);
        resultChatId = messageChatId(result) || chatId;
      } else if (isOperationalEngine()) {
        do {
          let messages = [];
          try {
            messages = await getTrackedMessages(chatId, 80);
          } catch {}
          result = (messages || [])
            .filter(message => {
              const timestamp = messageTimestampMs(message);
              const candidateChatId = messageChatId(message);
              return (
                serializeMessageKey(message?.id || message) &&
                messageFromMe(message) === true &&
                candidates.includes(messageBody(message)) &&
                (!candidateChatId || sameChatId(candidateChatId, chatId)) &&
                (!timestamp || timestamp >= startedAt - 2000)
              );
            })
            .sort((left, right) => messageTimestampMs(right) - messageTimestampMs(left))[0] || null;
          if (result) break;
          await sleep(125);
        } while (Date.now() < deadline);
        resultChatId = messageChatId(result) || chatId;
      }

      const messageId = serializeMessageKey(result?.waMessageKey || result?.id || result);
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          found: Boolean(result && messageId),
          messageId,
          chatId: resultChatId,
          text: result ? messageBody(result) : ""
        }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error),
        errorCode: String(error?.code || "")
      });
    }
  }

  async function sendText(requestId, chatId, text, linkPreview = true, dedupeSince = 0) {
    try {
      if (!getConnectionState().connected) {
        const error = new Error("O WhatsApp Web está desconectado. Reconecte-o antes de enviar.");
        error.code = "WF_DISCONNECTED";
        throw error;
      }
      const transport = preferredTransport();
      const startedAt = Date.now();
      const sendToken = `wf:${String(requestId)}`;
      let result;
      let resultChatId = chatId;

      if (transport === "btwebjs" || transport === "wwebjs") {
        const native = getNativeEngine();
        const chat = await getNativeChat(native, chatId);
        const retryDedupeSince = Number(dedupeSince) > 0 ? Number(dedupeSince) : 0;
        if (retryDedupeSince) {
          result = await findRecentNativeOutgoing(
            native,
            chat,
            chatId,
            text,
            retryDedupeSince,
            new Set(),
            "",
            1
          );
        }
        if (result) {
          resultChatId = messageChatId(result) || chatId;
        } else {
          await prepareNativeChat(native, chat);
        const existingIds = new Set(
          getNativeMessages(native, chat, chatId)
            .map(message => serializeMessageKey(message?.id || message))
            .filter(Boolean)
        );
        const nativeOptions = {
          comment: sendToken,
          campaignId: sendToken
        };
        if (native.transport === "btwebjs") {
          if (linkPreview === false) nativeOptions.linkPreview = false;
        } else {
          nativeOptions.linkPreview = linkPreview !== false;
        }
        try {
          result = await withTimeout(
            Promise.resolve(native.sender.sendMessage(chat, text, nativeOptions)),
            20000,
            "O motor de envio não respondeu a tempo."
          );
        } catch (error) {
          if (error?.code !== "WF_SEND_TIMEOUT") throw error;
          result = await findRecentNativeOutgoing(
            native,
            chat,
            chatId,
            text,
            startedAt,
            existingIds,
            sendToken,
            10000
          );
          if (!result) throw error;
        }
        if (!serializeMessageKey(result?.waMessageKey || result?.id || result)) {
          result = await findRecentNativeOutgoing(
            native,
            chat,
            chatId,
            text,
            startedAt,
            existingIds,
            sendToken,
            10000
          );
        }
        resultChatId = messageChatId(result) || chatId;
        }
      } else if (transport === "wppconnect") {
        const retryDedupeSince = Number(dedupeSince) > 0 ? Number(dedupeSince) : 0;
        if (retryDedupeSince) {
          result = await findRecentWppOutgoing(
            chatId,
            text,
            retryDedupeSince,
            new Set(),
            "",
            1
          );
        }
        let existingMessages = [];
        if (!result) {
          try {
            existingMessages = await withTimeout(
              Promise.resolve(getTrackedMessages(chatId, 50)),
              2000,
              "O WhatsApp demorou para ler o histórico da conversa."
            );
          } catch {}
          const existingIds = new Set(
            (existingMessages || [])
              .map(message => serializeMessageKey(message?.id || message))
              .filter(Boolean)
          );
          try {
            result = await withTimeout(
              Promise.resolve(getWPP().chat.sendTextMessage(chatId, text, {
                markIsRead: true,
                linkPreview: linkPreview !== false,
                waitForAck: false,
                comment: sendToken,
                campaignId: sendToken
              })),
              20000,
              "O motor de envio não respondeu a tempo."
            );
          } catch (error) {
            if (error?.code !== "WF_SEND_TIMEOUT") throw error;
            result = await findRecentWppOutgoing(
              chatId,
              text,
              startedAt,
              existingIds,
              sendToken,
              8000
            );
            if (!result) throw error;
          }
          if (!serializeMessageKey(result?.waMessageKey || result?.id || result)) {
            result = await findRecentWppOutgoing(
              chatId,
              text,
              startedAt,
              existingIds,
              sendToken,
              8000
            );
          }
        }
        resultChatId =
          serializeWid(result?.chatId) ||
          serializeWid(result?.to) ||
          chatId;
      } else {
        throw new Error("O motor de envio ainda não está disponível no WhatsApp.");
      }
      if (!result) throw new Error("O WhatsApp não confirmou o envio da mensagem.");
      if (result?.sent === false) {
        throw new Error("O WhatsApp recusou o registro da mensagem.");
      }
      const sendOutcome = String(
        result?.sendMsgResult?.messageSendResult ??
        result?.sendMsgResult ??
        ""
      ).toUpperCase();
      if (sendOutcome.startsWith("ERROR")) {
        throw new Error("O WhatsApp recusou o envio da mensagem.");
      }
      const messageId = serializeMessageKey(
        result?.waMessageKey ||
        result?.id ||
        result
      );
      if (!messageId) {
        throw new Error("O WhatsApp não registrou a mensagem no histórico local.");
      }
      const serverAck = await readServerAck(messageId, result?.ack);
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          sent: true,
          messageId,
          ack: serverAck,
          ackPending: serverAck === null,
          chatId: resultChatId,
          transport
        }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error),
        errorCode: String(error?.code || "")
      });
    }
  }

  function getNativeWidFactory(native) {
    return (
      native?.store?.WidFactory ||
      (() => {
        try {
          return window.require?.("WAWebWidFactory");
        } catch {
          return null;
        }
      })()
    );
  }

  function getNativeQueryExists(native) {
    if (typeof native?.store?.QueryExist === "function") {
      return native.store.QueryExist;
    }
    try {
      return window.require?.("WAWebQueryExistsJob")?.queryWidExists;
    } catch {
      return null;
    }
  }

  async function resolveNativeChat(native, chatId) {
    const widFactory = getNativeWidFactory(native);
    const queryExists = getNativeQueryExists(native);
    if (typeof widFactory?.createWid !== "function" ||
        typeof queryExists !== "function") {
      throw new Error("O validador de contatos do WhatsApp ainda não carregou.");
    }

    const wid = widFactory.createWid(chatId);
    const exists = await queryExists(wid);
    if (!exists || exists?.canReceiveMessage === false) {
      throw new Error(
        `O número ${String(chatId).split("@")[0]} não possui WhatsApp.`
      );
    }
    const resolvedWid =
      serializeWid(exists?.wid) ||
      serializeWid(exists?.jid) ||
      serializeWid(exists?.id);
    if (!resolvedWid) {
      throw new Error(
        `O número ${String(chatId).split("@")[0]} não foi validado pelo WhatsApp.`
      );
    }
    const lid = serializeWid(exists?.lid);
    return {
      chatId: lid || resolvedWid,
      phoneChatId: resolvedWid,
      lid
    };
  }

  async function resolveChat(requestId, chatId) {
    try {
      const native = getNativeEngine();
      const nativeQuery = getNativeQueryExists(native);
      let nativeError = null;
      if (native && typeof nativeQuery === "function") {
        try {
          const resolved = await resolveNativeChat(native, chatId);
          emit("COMMAND_RESULT", {
            requestId,
            ok: true,
            result: resolved
          });
          return;
        } catch (error) {
          nativeError = error;
        }
      }

      const contactApi = getWPP()?.contact;
      if (typeof contactApi?.queryExists !== "function") {
        if (nativeError) throw nativeError;
        throw new Error("O validador de contatos do WhatsApp não está disponível.");
      }
      const exists = await contactApi.queryExists(chatId);
      if (!exists?.wid) {
        throw new Error(`O número ${String(chatId).split("@")[0]} não possui WhatsApp.`);
      }
      let lid = exists.lid;
      if (!lid && typeof contactApi.getPnLidEntry === "function") {
        try {
          const entry = await contactApi.getPnLidEntry(exists.wid);
          lid = entry?.lid || null;
        } catch {}
      }
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          chatId: serializeWid(lid || exists.wid),
          phoneChatId: serializeWid(exists.wid),
          lid: serializeWid(lid)
        }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  async function getTrackedMessages(chatId, count = 30) {
    const native = getNativeEngine();
    if (native) {
      try {
        const chat = await native.api.getChat(chatId, { getAsModel: false });
        return getNativeMessages(native, chat, chatId)
          .filter(message => sameChatId(messageChatId(message), chatId))
          .sort((left, right) =>
            messageTimestampMs(right) - messageTimestampMs(left)
          )
          .slice(0, count);
      } catch {}
    }

    const chatApi = getWPP()?.chat;
    const getMessages = chatApi?.getMessages;
    if (typeof getMessages === "function") {
      return getMessages.call(chatApi, chatId, { count });
    }
    return [];
  }

  async function getTrackedMessageAck(messageId) {
    const native = getNativeEngine();
    try {
      const message = native?.store?.Msg?.get?.(messageId);
      const ack = Number(message?.ack);
      if (Number.isFinite(ack)) return ack;
    } catch {}

    const chatApi = getWPP()?.chat;
    const getMessageACK = chatApi?.getMessageACK;
    if (typeof getMessageACK === "function") {
      const ackInfo = await getMessageACK.call(chatApi, messageId);
      return Number(ackInfo?.ack ?? ackInfo ?? 0);
    }
    return 0;
  }

  async function checkMessageAcks(requestId, messageIds = []) {
    try {
      const acks = await Promise.all(
        messageIds.map(async messageId => {
          try {
            const ack = await getTrackedMessageAck(messageId);
            return { messageId: String(messageId), ack };
          } catch {
            return { messageId: String(messageId), ack: 0 };
          }
        })
      );
      emit("COMMAND_RESULT", { requestId, ok: true, result: { acks } });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  async function checkCampaignActivity(requestId, recipients = []) {
    const activity = await Promise.all(recipients.map(async recipient => {
      let opened = false;
      const sentAt = Number(recipient.sentAt || 0);
      const responseBefore = Number(recipient.responseBefore || 0);
      const knownIds = new Set((recipient.messageIds || []).map(String));
      const chatIds = [...new Set((recipient.chatIds || []).map(String).filter(Boolean))];
      const responseCandidates = [];
      const seenResponseIds = new Set();

      for (const chatId of chatIds) {
        try {
          const messages = await getTrackedMessages(chatId, 30);
          for (const message of messages || []) {
            const messageId = serializeMessageKey(message?.id || message);
            const timestamp = messageTimestampMs(message);
            const fromMe = messageFromMe(message);
            if (
              fromMe === false &&
              messageId &&
              timestamp >= sentAt &&
              (!responseBefore || timestamp < responseBefore) &&
              isSubstantiveIncomingMessage(message) &&
              !seenResponseIds.has(messageId)
            ) {
              seenResponseIds.add(messageId);
              responseCandidates.push({ messageId, timestamp });
            }
            const matchesTrackedSend = knownIds.size
              ? knownIds.has(messageId)
              : Boolean(
                  timestamp &&
                  timestamp >= sentAt - 60000 &&
                  (!responseBefore || timestamp < responseBefore)
                );
            if (
              fromMe === true &&
              Number(message?.ack ?? 0) >= 3 &&
              matchesTrackedSend
            ) {
              opened = true;
            }
          }
        } catch {}
      }

      if (!opened && knownIds.size) {
        for (const messageId of knownIds) {
          try {
            if (await getTrackedMessageAck(messageId) >= 3) {
              opened = true;
              break;
            }
          } catch {}
        }
      }
      responseCandidates.sort((left, right) => left.timestamp - right.timestamp);
      const response = responseCandidates[0] || null;
      return {
        key: String(recipient.key),
        opened,
        responded: Boolean(response),
        respondedAt: response?.timestamp || 0,
        responseMessageId: response?.messageId || ""
      };
    }));
    emit("COMMAND_RESULT", { requestId, ok: true, result: { activity } });
  }

  function normalizeAudioDataUrl(dataUrl, mimeType, fileName) {
    if (!dataUrl || typeof dataUrl !== "string") {
      throw new Error("Conteúdo do áudio não encontrado.");
    }

    const lowerName = String(fileName || "").toLowerCase();
    const requestedMime = String(mimeType || "").toLowerCase();
    const isOgg =
      lowerName.endsWith(".ogg") ||
      lowerName.endsWith(".oga") ||
      requestedMime === "application/ogg";
    const isOpus =
      lowerName.endsWith(".opus") ||
      requestedMime === "audio/opus";

    // O mesmo OGG pode chegar do sistema como application/ogg ou sem MIME.
    // O WhatsApp móvel espera o conteúdo de voz declarado como áudio.
    if (
      isOgg ||
      isOpus ||
      dataUrl.startsWith("data:application/octet-stream;base64,") ||
      dataUrl.startsWith("data:application/ogg;base64,") ||
      dataUrl.startsWith("data:;base64,")
    ) {
      const targetMime =
        isOgg
          ? "audio/ogg"
          : isOpus
            ? "audio/opus"
          : requestedMime.startsWith("audio/")
            ? requestedMime
            : "audio/mpeg";

      return dataUrl.replace(/^data:[^;]*;base64,/, `data:${targetMime};base64,`);
    }

    return dataUrl;
  }

  function audioMimeType(block, content) {
    const declared = String(block.mimeType || "").toLowerCase();
    const match = String(content || "").match(/^data:([^;,]+)/i);
    const embedded = String(match?.[1] || "").toLowerCase();
    const lowerName = String(block.fileName || "").toLowerCase();

    if (
      lowerName.endsWith(".ogg") ||
      lowerName.endsWith(".oga") ||
      declared === "application/ogg"
    ) {
      return "audio/ogg";
    }
    if (declared.startsWith("audio/")) return declared;
    if (embedded.startsWith("audio/")) return embedded;
    return "audio/ogg";
  }

  async function sendFile(requestId, chatId, block) {
    try {
      if (!getConnectionState().connected) {
        const error = new Error("O WhatsApp Web está desconectado. Reconecte-o antes de enviar.");
        error.code = "WF_DISCONNECTED";
        throw error;
      }
      const blockType = block.type || block.mediaType || "document";
      const isAudio = blockType === "audio";

      const content = isAudio
        ? normalizeAudioDataUrl(
            block.dataUrl,
            block.mimeType,
            block.fileName
          )
        : block.dataUrl;

      if (!content) {
        throw new Error("Arquivo não cadastrado no bloco.");
      }

      const options = {
        type: blockType,
        filename: block.fileName || undefined,
        mimetype: block.mimeType || undefined,
        markIsRead: true,
        // O ACK de mídia pode nunca resolver em alguns builds do WhatsApp Web.
        // A fila deve continuar assim que o arquivo for aceito para envio.
        waitForAck: false
      };

      if (blockType === "image" || blockType === "video") {
        options.caption = block.caption || "";
        options.isViewOnce = Boolean(block.viewOnce);
      }

      if (isAudio) {
        // Mesma configuração usada pela extensão WaLeads 2.1.25.
        options.type = "audio";
        options.isPtt = block.isPtt !== false;
        options.createChat = true;
        delete options.filename;
        delete options.mimetype;
        delete options.markIsRead;
        delete options.waitForAck;
        delete options.waveform;
      }

      // A extensão de referência envia o Data URL/Base64 diretamente e faz
      // uma única chamada, sem converter para Blob/File.
      const senderWpp =
        isAudio && options.isPtt
          ? await loadVoiceWPP()
          : getWPP();

      const result = await withTimeout(
        senderWpp.chat.sendFileMessage(chatId, content, options),
        25000,
        "O WhatsApp não confirmou o início do envio do áudio."
      );
      if (!result) throw new Error("O WhatsApp não confirmou o envio da mídia.");
      const messageId = serializeMessageKey(result?.waMessageKey || result?.id || result);
      if (!messageId) {
        throw new Error("O WhatsApp não registrou a mídia no histórico local.");
      }
      const serverAck = await readServerAck(messageId, result?.ack);

      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          sent: true,
          messageId,
          ack: serverAck,
          ackPending: serverAck === null,
          chatId: serializeWid(result?.chatId) || serializeWid(result?.to) || chatId
        }
      });
    } catch (error) {
      console.error("[WA Flow] Falha ao enviar mídia:", error);

      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error:
          error?.message ||
          error?.name ||
          "Falha desconhecida ao enviar a mídia.",
        errorCode: String(error?.code || "")
      });
    }
  }

  async function setTyping(requestId, chatId, active) {
    try {
      let applied = false;

      if (active && typeof getWPP()?.chat?.markIsComposing === "function") {
        await getWPP().chat.markIsComposing(chatId);
        applied = true;
      } else if (!active && typeof getWPP()?.chat?.markIsPaused === "function") {
        await getWPP().chat.markIsPaused(chatId);
        applied = true;
      } else if (typeof getWPP()?.presence?.sendPresence === "function") {
        await getWPP().presence.sendPresence(
          chatId,
          active ? "composing" : "paused"
        );
        applied = true;
      }

      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: { applied }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          applied: false,
          warning: error?.message || String(error)
        }
      });
    }
  }

  async function setRecording(requestId, chatId, active) {
    try {
      let applied = false;

      if (active && typeof getWPP()?.chat?.markIsRecording === "function") {
        await getWPP().chat.markIsRecording(chatId);
        applied = true;
      } else if (!active && typeof getWPP()?.chat?.markIsPaused === "function") {
        await getWPP().chat.markIsPaused(chatId);
        applied = true;
      } else if (typeof getWPP()?.presence?.sendPresence === "function") {
        await getWPP().presence.sendPresence(chatId, active ? "recording" : "paused");
        applied = true;
      }

      emit("COMMAND_RESULT", { requestId, ok: true, result: applied });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  let extractionCancelled = false;

  function getExtractionApi(sourceType = "") {
    const candidates = [];
    try {
      candidates.push(window.WWebJSBt, window.WWebJS, window.getBTWebJS?.());
    } catch {}
    candidates.push(getWPP());

    return candidates.find(api => {
      if (
        !api ||
        typeof api?.chat?.list !== "function" ||
        typeof api?.contact?.list !== "function"
      ) {
        return false;
      }
      if (sourceType === "groups") {
        return typeof api?.group?.getParticipants === "function";
      }
      if (sourceType === "labels") {
        return typeof api?.labels?.getAllLabels === "function";
      }
      return true;
    }) || null;
  }

  function widParts(value) {
    if (!value) return { user: "", server: "", serialized: "" };
    if (typeof value === "string") {
      const [user = "", server = ""] = value.split("@");
      return {
        user,
        server,
        serialized: server ? `${user}@${server}` : value
      };
    }

    const serialized = String(value._serialized || "");
    const [serializedUser = "", serializedServer = ""] = serialized.split("@");
    const server = String(value.server || serializedServer || "");
    const rawUser =
      value.user ??
      (server && typeof value.id !== "object" ? value.id : "") ??
      serializedUser;
    const user = String(rawUser || serializedUser || "");

    return {
      user,
      server,
      serialized: serialized || (user && server ? `${user}@${server}` : "")
    };
  }

  function sourceId(value) {
    const wid = widParts(value);
    return wid.serialized || wid.user || String(value || "");
  }

  function labelId(value) {
    if (value && typeof value === "object") {
      return String(value.id ?? value.value ?? value._serialized ?? "");
    }
    return String(value ?? "");
  }

  function contactLabelIds(contact) {
    return (Array.isArray(contact?.labels) ? contact.labels : [])
      .map(labelId)
      .filter(Boolean);
  }

  function contactDisplayName(contact, fallback = "") {
    const value =
      contact?.name ||
      contact?.verifiedName ||
      contact?.pushname ||
      contact?.notifyName ||
      contact?.shortName ||
      contact?.formattedName ||
      contact?.mentionName ||
      fallback;
    return String(value || "").trim().slice(0, 240);
  }

  function chatDisplayName(chat) {
    try {
      if (typeof chat?.title === "function") {
        return String(chat.title() || "").trim();
      }
    } catch {}
    return String(
      chat?.formattedTitle ||
      chat?.name ||
      chat?.title ||
      chat?.contact?.name ||
      sourceId(chat?.id)
    ).trim();
  }

  function isGroupChat(chat) {
    if (chat?.isGroup === true) return true;
    const id = widParts(chat?.id);
    return id.server === "g.us" || id.serialized.endsWith("@g.us");
  }

  async function mapWithConcurrency(items, limit, mapper) {
    const values = Array.from(items || []);
    const results = new Array(values.length);
    let cursor = 0;

    const workers = Array.from(
      { length: Math.max(1, Math.min(Number(limit) || 1, values.length || 1)) },
      async () => {
        while (cursor < values.length) {
          const index = cursor++;
          results[index] = await mapper(values[index], index);
        }
      }
    );

    await Promise.all(workers);
    return results;
  }

  async function listGroupSources(api) {
    const chats = await api.chat.list({ onlyGroups: true });
    const groups = (Array.isArray(chats) ? chats : [])
      .filter(isGroupChat);

    return mapWithConcurrency(groups, 4, async group => {
      let participantsNum = 0;
      let unavailable = false;
      try {
        if (typeof api?.group?.getParticipants !== "function") {
          throw new Error("Participantes indisponíveis.");
        }
        const participants = await withTimeout(
          Promise.resolve(api.group.getParticipants(group.id)),
          12000,
          "O WhatsApp demorou para carregar os participantes."
        );
        participantsNum = Array.isArray(participants) ? participants.length : 0;
      } catch {
        unavailable = true;
      }

      return {
        id: sourceId(group.id),
        name: chatDisplayName(group) || "Grupo sem nome",
        participantsNum,
        unavailable
      };
    });
  }

  async function listLabelSources(api) {
    if (typeof api?.labels?.getAllLabels !== "function") {
      throw new Error(
        "As etiquetas não estão disponíveis nesta conta do WhatsApp."
      );
    }

    const [labels, contacts] = await Promise.all([
      api.labels.getAllLabels(),
      api.contact.list()
    ]);
    const userContacts = (Array.isArray(contacts) ? contacts : [])
      .filter(contact => contact?.isUser === true);

    return (Array.isArray(labels) ? labels : []).map(label => {
      const id = labelId(label?.id);
      return {
        id,
        name: String(label?.name || "Etiqueta sem nome").trim(),
        participantsNum: userContacts.filter(contact =>
          contactLabelIds(contact).includes(id)
        ).length
      };
    });
  }

  async function listExtractionSources(requestId, sourceType) {
    try {
      const type = sourceType === "labels" ? "labels" : "groups";
      const api = getExtractionApi(type);
      if (!api) {
        throw new Error(
          "O WhatsApp ainda está carregando os contatos. Aguarde e tente novamente."
        );
      }

      const sources = type === "groups"
        ? await listGroupSources(api)
        : await listLabelSources(api);

      sources.sort((left, right) =>
        String(left.name).localeCompare(String(right.name), "pt-BR")
      );

      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: { sourceType: type, sources }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  function directPhoneFromContact(contact) {
    const candidates = [
      contact?.phoneNumber,
      contact?.id,
      contact?.wid
    ];

    for (const candidate of candidates) {
      const wid = widParts(candidate);
      if (wid.server === "c.us" && /^\d{7,20}$/.test(wid.user)) {
        return wid.user;
      }
    }

    const contactWid = widParts(contact?.id || contact?.wid);
    const userid = String(contact?.userid || "");
    return contactWid.server !== "lid" && /^\d{7,20}$/.test(userid)
      ? userid
      : "";
  }

  async function resolveContactPhone(api, contact) {
    const direct = directPhoneFromContact(contact);
    if (direct) return { phone: direct, resolvedContact: null };

    const candidateWid = [contact?.id, contact?.wid]
      .map(widParts)
      .find(wid => wid.server === "lid" && wid.serialized);
    if (!candidateWid) return { phone: "", resolvedContact: null };

    const contactApis = [api?.contact, getWPP()?.contact]
      .filter((value, index, list) => value && list.indexOf(value) === index);

    for (const contactApi of contactApis) {
      if (typeof contactApi?.getPnLidEntry !== "function") continue;
      try {
        const entry = await contactApi.getPnLidEntry(candidateWid.serialized);
        const phoneWid = widParts(entry?.phoneNumber);
        if (phoneWid.server === "c.us" && /^\d{7,20}$/.test(phoneWid.user)) {
          return {
            phone: phoneWid.user,
            resolvedContact: entry?.contact || null
          };
        }
      } catch {}
    }

    return { phone: "", resolvedContact: null };
  }

  async function extractContactRecord(api, rawContact, tag) {
    const contact = rawContact?.contact || rawContact;
    if (!contact || rawContact?.isMe === true || contact?.isMe === true) {
      return null;
    }
    const { phone, resolvedContact } = await resolveContactPhone(api, contact);
    if (!phone) return null;

    return {
      name:
        contactDisplayName(contact) ||
        contactDisplayName(resolvedContact) ||
        `Contato ${phone.slice(-4)}`,
      phone,
      tag: String(tag || "").trim()
    };
  }

  function mergeExtractedContacts(records) {
    const contacts = new Map();
    let duplicates = 0;

    for (const record of records.filter(Boolean)) {
      const current = contacts.get(record.phone);
      if (!current) {
        contacts.set(record.phone, {
          name: record.name,
          phone: record.phone,
          tag: record.tag
        });
        continue;
      }

      duplicates++;
      if (!current.name && record.name) current.name = record.name;
      const tags = new Set(
        `${current.tag || ""}|${record.tag || ""}`
          .split("|")
          .map(item => item.trim())
          .filter(Boolean)
      );
      current.tag = [...tags].join(" | ");
    }

    return { contacts: [...contacts.values()], duplicates };
  }

  async function extractFromGroups(api, selectedIds, includeAdmins, customTag, stats) {
    const chats = await api.chat.list({ onlyGroups: true });
    const selected = new Set(selectedIds);
    const groups = (Array.isArray(chats) ? chats : []).filter(chat =>
      isGroupChat(chat) && selected.has(sourceId(chat.id))
    );
    const records = [];

    for (const group of groups) {
      if (extractionCancelled) break;
      try {
        if (typeof api?.group?.getParticipants !== "function") {
          throw new Error("Participantes indisponíveis.");
        }
        let participants = await withTimeout(
          Promise.resolve(api.group.getParticipants(group.id)),
          20000,
          "O WhatsApp demorou para carregar os participantes."
        );
        participants = Array.isArray(participants) ? participants : [];
        participants = participants.filter(participant =>
          participant?.isMe !== true && participant?.contact?.isMe !== true
        );
        if (!includeAdmins) {
          participants = participants.filter(participant =>
            !participant?.isAdmin && !participant?.isSuperAdmin
          );
        }
        stats.totalCandidates += participants.length;
        const extracted = await mapWithConcurrency(
          participants,
          8,
          participant => extractContactRecord(api, participant, customTag)
        );
        stats.unresolved += extracted.filter(record => !record).length;
        records.push(...extracted.filter(Boolean));
      } catch {
        stats.failures++;
      }
    }

    return records;
  }

  async function extractFromLabels(api, selectedIds, sourceNames, stats) {
    const selected = new Set(selectedIds);
    const contacts = await api.contact.list();
    const tagged = (Array.isArray(contacts) ? contacts : [])
      .filter(contact => {
        if (contact?.isUser !== true || contact?.isMe === true) return false;
        return contactLabelIds(contact).some(id => selected.has(id));
      });
    stats.totalCandidates += tagged.length;

    const records = await mapWithConcurrency(tagged, 8, async contact => {
      if (extractionCancelled) return null;
      const tags = contactLabelIds(contact)
        .filter(id => selected.has(id))
        .map(id => sourceNames.get(id) || id);
      return extractContactRecord(api, contact, tags.join(" | "));
    });
    stats.unresolved += records.filter(record => !record).length;
    return records.filter(Boolean);
  }

  async function extractContacts(requestId, payload = {}) {
    try {
      extractionCancelled = false;
      const sourceType = payload.sourceType === "labels" ? "labels" : "groups";
      const customTag = String(payload.customTag || "")
        .replace(/[|\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const selectedIds = [...new Set(
        (Array.isArray(payload.sourceIds) ? payload.sourceIds : [])
          .map(value => String(value || ""))
          .filter(Boolean)
      )].slice(0, 250);
      if (!selectedIds.length) {
        throw new Error("Selecione ao menos um grupo ou uma etiqueta.");
      }
      if (sourceType === "groups" && !customTag) {
        throw new Error("Informe a etiqueta dos contatos antes de extrair.");
      }

      const api = getExtractionApi(sourceType);
      if (!api) {
        throw new Error(
          "O WhatsApp ainda está carregando os contatos. Aguarde e tente novamente."
        );
      }

      const sourceNames = new Map(
        (Array.isArray(payload.sources) ? payload.sources : [])
          .map(source => [String(source?.id || ""), String(source?.name || "")])
      );
      const stats = {
        totalCandidates: 0,
        unresolved: 0,
        failures: 0,
        duplicates: 0
      };

      const records = sourceType === "groups"
        ? await extractFromGroups(
            api,
            selectedIds,
            payload.includeAdmins !== false,
            customTag,
            stats
          )
        : await extractFromLabels(api, selectedIds, sourceNames, stats);
      const merged = mergeExtractedContacts(records);
      stats.duplicates = merged.duplicates;

      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          sourceType,
          cancelled: extractionCancelled,
          contacts: merged.contacts,
          stats: {
            ...stats,
            contacts: merged.contacts.length,
            sources: selectedIds.length
          }
        }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  function cancelExtraction(requestId) {
    extractionCancelled = true;
    emit("COMMAND_RESULT", {
      requestId,
      ok: true,
      result: { cancelled: true }
    });
  }

  async function getActiveChat(requestId) {
    try {
      const wpp = getWPP();
      const native = getNativeEngine();
      const rawHeaderTitle = String(
        document.querySelector('#main header span[title]')?.getAttribute("title") ||
        document.querySelector('#main header [dir="auto"]')?.textContent ||
        ""
      ).trim();
      // Some WhatsApp header variants expose only a qualification fragment,
      // such as "(lead)", in the first dir=auto node. It is not a contact name.
      const headerTitle = /^\([^)]{1,30}\)$/.test(rawHeaderTitle) ? "" : rawHeaderTitle;

      let chat = null;
      try {
        chat = await wpp?.chat?.getActiveChat?.();
      } catch {}
      const nativeChatStore = native?.store?.Chat;
      const nativeChats =
        nativeChatStore?.getModelsArray?.() ||
        nativeChatStore?.models ||
        nativeChatStore?._models ||
        [];

      if (!serializeWid(chat?.id) && nativeChatStore) {
        chat =
          nativeChatStore.getActive?.() ||
          nativeChatStore.getActiveChat?.() ||
          nativeChats.find?.(item => item?.active || item?.isActive) ||
          null;
      }

      if (!serializeWid(chat?.id) && headerTitle && Array.isArray(nativeChats)) {
        const normalizedTitle = headerTitle.toLocaleLowerCase("pt-BR");
        chat = nativeChats.find(item => {
          const candidate = String(
            item?.name ||
            item?.formattedTitle ||
            item?.contact?.name ||
            item?.contact?.pushname ||
            ""
          ).trim().toLocaleLowerCase("pt-BR");
          return candidate && candidate === normalizedTitle;
        }) || null;
      }

      if (
        !serializeWid(chat?.id) &&
        headerTitle &&
        lastResolvedActiveChat.title === headerTitle &&
        lastResolvedActiveChat.chatId
      ) {
        chat = {
          id: lastResolvedActiveChat.chatId,
          name: lastResolvedActiveChat.name
        };
      }

      const chatId =
        serializeWid(chat?.id) ||
        serializeWid(chat?.wid) ||
        serializeWid(chat?.contact?.id);

      if (!chatId) {
        throw new Error("Abra uma conversa no WhatsApp antes de usar este controle.");
      }

      const name =
        chat?.name ||
        chat?.formattedTitle ||
        chat?.contact?.name ||
        chat?.contact?.pushname ||
        headerTitle ||
        chatId.split("@")[0];
      const phone = String(serializeWid(
        chat?.contact?.phoneNumber ||
        chat?.contact?.__x_phoneNumber ||
        chat?.phoneNumber ||
        (chatId.endsWith("@c.us") ? chatId : "")
      ) || "").split("@")[0].replace(/\D/g, "");
      lastResolvedActiveChat = { chatId, name, title: headerTitle };

      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          chatId,
          name,
          phone
        }
      });
    } catch (error) {
      emit("COMMAND_RESULT", {
        requestId,
        ok: false,
        error: error?.message || String(error)
      });
    }
  }

  function readBulkChatProperty(model, names) {
    for (const name of names) {
      try {
        const value = model?.[name] ?? model?.attributes?.[name] ?? model?.get?.(name);
        if (value !== undefined && value !== null && typeof value !== 'function') return value;
      } catch {}
    }
    return undefined;
  }
  function readBulkFavorite(chat) {
    const raw = readBulkChatProperty(chat, ['isFavorite', 'isFavourite', 'favorite', 'favourite']);
    if (typeof raw === 'boolean') return raw;
    try {
      if (typeof chat?.matchFilter === 'function') {
        const matched = chat.matchFilter('favorites');
        if (typeof matched === 'boolean') return matched;
      }
    } catch {}
    return null;
  }
  async function listKanbanChats(requestId, { includeGroups = false, forBulk = false } = {}) {
    try {
      const native = getNativeEngine();
      const store = native?.store?.Chat;
      let chats = getCollectionModels(store);
      if (!chats.length) {
        try {
          chats = await getWPP()?.chat?.list?.() || [];
        } catch {}
      }
      const wpp = getWPP();
      const labelCatalog = new Map();
      const contactLabelsById = new Map();
      if (typeof wpp?.labels?.getAllLabels === "function") {
        try {
          const labels = await wpp.labels.getAllLabels();
          (Array.isArray(labels) ? labels : []).forEach(label => {
            const id = labelId(label?.id);
            if (id) labelCatalog.set(id, {
              id,
              name: String(label?.name || "Etiqueta").trim(),
              color: label?.hexColor || label?.colorHex || label?.color || ""
            });
          });
        } catch {}
      }
      if (typeof wpp?.contact?.list === "function") {
        try {
          const contacts = await wpp.contact.list();
          (Array.isArray(contacts) ? contacts : []).forEach(item => {
            const ids = [
              serializeWid(item?.id),
              serializeWid(item?.wid),
              serializeWid(item?.phoneNumber),
              serializeWid(item?.accountLid)
            ].filter(Boolean);
            const labelIds = contactLabelIds(item);
            ids.forEach(id => contactLabelsById.set(id, labelIds));
          });
        } catch {}
      }
      const result = (await Promise.all(chats.map(async chat => {
        const chatId = serializeWid(chat?.id || chat?.wid || chat?.contact?.id);
        if (!chatId || (!includeGroups && chatId.endsWith('@g.us')) || chatId.includes('newsletter') || chatId.endsWith('@broadcast')) return null;
        const isGroup = chatId.endsWith('@g.us');
        const contact = chat?.contact || {};
        let phoneWid = serializeWid(
          contact?.phoneNumber ||
          contact?.__x_phoneNumber ||
          chat?.phoneNumber
        );
        if (!phoneWid && chatId.endsWith("@c.us")) phoneWid = chatId;
        if (!phoneWid && chatId.endsWith("@lid") && typeof wpp?.contact?.getPnLidEntry === "function") {
          try {
            const entry = await wpp.contact.getPnLidEntry(chatId);
            phoneWid = serializeWid(entry?.phoneNumber || entry?.wid || entry?.pn);
          } catch {}
        }
        const messages = forBulk ? [] : native ? getNativeMessages(native, chat, chatId) : getCollectionModels(chat?.msgs);
        const recentMessages = messages
          .filter(message => hasUserMessageContent(message))
          .sort((left, right) => messageTimestampMs(right) - messageTimestampMs(left))
          .slice(0, 50)
          .reverse()
          .map(message => {
            const type = String(message?.type || message?.attributes?.type || "chat");
            const rawBody = String(message?.body || message?.caption || message?.attributes?.body || "");
            const encodedMedia = /^(?:data:[^;]+;base64,|\/9j\/|iVBORw0KGgo|R0lGOD)/i.test(rawBody) ||
              (rawBody.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(rawBody));
            const mediaLabel = /image|photo/i.test(type) ? "Foto"
              : /video/i.test(type) ? "Vídeo"
              : /audio|ptt/i.test(type) ? "Áudio"
              : /sticker/i.test(type) ? "Figurinha"
              : "Mídia";
            return {
              id: serializeMessageKey(message?.id || message),
              body: encodedMedia ? mediaLabel : rawBody.slice(0, 1000),
              fromMe: Boolean(messageFromMe(message)),
              timestamp: messageTimestampMs(message),
              type
            };
          });
        const lastMessage = recentMessages[recentMessages.length - 1];
        const labels = [...new Set([
          ...contactLabelIds(contact),
          ...contactLabelIds(chat),
          ...(contactLabelsById.get(chatId) || [])
        ])].map(id => labelCatalog.get(id)).filter(Boolean);
        let avatar = String(
          contact?.profilePicThumbObj?.eurl ||
          contact?.profilePicThumbObj?.img ||
          chat?.profilePicThumbObj?.eurl ||
          chat?.profilePicThumbObj?.img ||
          ""
        );
        if (!forBulk && !avatar && typeof wpp?.contact?.getProfilePictureUrl === "function") {
          try {
            const picture = await wpp.contact.getProfilePictureUrl(chatId);
            avatar = String(picture?.eurl || picture?.img || picture?.url || picture || "");
          } catch {}
        }
        return {
          chatId,
          avatar,
          labels,
          name: String(chat?.name || chat?.formattedTitle || contact?.name || contact?.pushname || chatId.split("@")[0]).trim(),
          phone: String(phoneWid || "").split("@")[0].replace(/\D/g, ""),
          isGroup,
          isArchived: Boolean(readBulkChatProperty(chat, ['archive', 'isArchived', 'archived'])),
          isPinned: Boolean(readBulkChatProperty(chat, ['pin', 'isPinned', 'pinned'])),
          isUnread: Number(readBulkChatProperty(chat, ['unreadCount', 'unread']) || 0) !== 0 ||
            Boolean(readBulkChatProperty(chat, ['markedUnread', 'isUnread', 'hasUnread'])),
          isFavorite: readBulkFavorite(chat),
          unreadCount: Number(chat?.unreadCount || chat?.unread || 0),
          timestamp: Number(lastMessage?.timestamp || messageTimestampMs(chat?.lastReceivedKey) || chat?.t || 0),
          lastMessage: String(lastMessage?.body || ""),
          lastMessageFromMe: Boolean(lastMessage?.fromMe),
          messages: recentMessages
        };
      }))).filter(Boolean).sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0));
      emit("COMMAND_RESULT", { requestId, ok: true, result: { chats: forBulk ? result : result.slice(0, 1000) } });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function getKanbanChatLabels(requestId, chatId) {
    try {
      const wpp = getWPP();
      if (!chatId || typeof wpp?.labels?.getAllLabels !== "function") {
        emit("COMMAND_RESULT", { requestId, ok: true, result: { labels: [] } });
        return;
      }
      const [allLabels, contacts] = await Promise.all([
        wpp.labels.getAllLabels(),
        typeof wpp?.contact?.list === "function" ? wpp.contact.list() : []
      ]);
      const target = String(chatId);
      const contact = (Array.isArray(contacts) ? contacts : []).find(item => [
        serializeWid(item?.id),
        serializeWid(item?.wid),
        serializeWid(item?.phoneNumber),
        serializeWid(item?.accountLid)
      ].filter(Boolean).includes(target));
      const nativeChat = getNativeEngine()?.store?.Chat?.get?.(chatId);
      const ids = [...new Set([
        ...contactLabelIds(contact),
        ...contactLabelIds(nativeChat),
        ...contactLabelIds(nativeChat?.contact)
      ])];
      const labels = (Array.isArray(allLabels) ? allLabels : [])
        .filter(label => ids.includes(labelId(label?.id)))
        .map(label => ({
          id: labelId(label?.id),
          name: String(label?.name || "Etiqueta").trim(),
          color: label?.hexColor || label?.colorHex || label?.color || ""
        }));
      emit("COMMAND_RESULT", { requestId, ok: true, result: { labels } });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function listKanbanLabels(requestId) {
    try {
      const wpp = getWPP();
      const allLabels = typeof wpp?.labels?.getAllLabels === "function"
        ? await wpp.labels.getAllLabels()
        : [];
      const labels = (Array.isArray(allLabels) ? allLabels : []).map(label => ({
        id: labelId(label?.id),
        name: String(label?.name || "Etiqueta").trim(),
        color: label?.hexColor || label?.colorHex || label?.color || ""
      })).filter(label => label.id || label.name);
      emit("COMMAND_RESULT", { requestId, ok: true, result: { labels } });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  function isFalseBusinessDetectionError(error) {
    const code = String(error?.code || error?.errorCode || "").toLocaleLowerCase("en-US");
    const message = String(error?.message || error || "");
    return code === "is_not_business" || /not a business version/i.test(message);
  }

  async function mutateKanbanLabelChats(wpp, resolvedId, chatIds, type) {
    let businessDetectionError = null;
    if (typeof wpp?.labels?.addOrRemoveLabels === "function") {
      try {
        const result = await wpp.labels.addOrRemoveLabels(
          chatIds,
          [{ labelId: resolvedId, type }]
        );
        if (result !== false) return result;
      } catch (error) {
        if (!isFalseBusinessDetectionError(error)) throw error;
        businessDetectionError = error;
      }
    }
    const fallbackMethod = type === "add" ? "addChats" : "removeChats";
    if (typeof wpp?.lists?.[fallbackMethod] === "function") {
      return wpp.lists[fallbackMethod](resolvedId, chatIds);
    }
    if (businessDetectionError) throw businessDetectionError;
    throw new Error(`O WhatsApp não disponibilizou a função de ${type === "add" ? "aplicar" : "remover"} etiquetas.`);
  }

  async function renameKanbanLabelNative(wpp, resolvedId, nextName) {
    let businessDetectionError = null;
    if (typeof wpp?.labels?.editLabel === "function") {
      try {
        return await wpp.labels.editLabel(resolvedId, { name: nextName });
      } catch (error) {
        if (!isFalseBusinessDetectionError(error)) throw error;
        businessDetectionError = error;
      }
    }
    if (typeof wpp?.lists?.rename === "function") {
      await wpp.lists.rename(resolvedId, nextName);
      return null;
    }
    if (businessDetectionError) throw businessDetectionError;
    throw new Error("O WhatsApp não disponibilizou a função de editar etiquetas.");
  }

  async function deleteKanbanLabelNative(wpp, resolvedId) {
    let businessDetectionError = null;
    if (typeof wpp?.labels?.deleteLabel === "function") {
      try {
        return await wpp.labels.deleteLabel(resolvedId);
      } catch (error) {
        if (!isFalseBusinessDetectionError(error)) throw error;
        businessDetectionError = error;
      }
    }
    if (typeof wpp?.lists?.remove === "function") {
      await wpp.lists.remove(resolvedId);
      return null;
    }
    if (businessDetectionError) throw businessDetectionError;
    throw new Error("O WhatsApp não disponibilizou a função de excluir etiquetas.");
  }

  async function applyChatLabel(requestId, chatId, requestedLabelId, requestedLabelName) {
    try {
      const deadline = Date.now() + 12000;
      if (!chatId) throw new Error("Conversa inválida para aplicar a etiqueta.");
      const wpp = getWPP();
      const allLabels = typeof wpp?.labels?.getAllLabels === "function"
        ? await withKanbanLabelDeadline(
          () => wpp.labels.getAllLabels(),
          deadline,
          4000,
          "O WhatsApp demorou para carregar as etiquetas."
        )
        : [];
      const wantedId = String(requestedLabelId || "").trim();
      const wantedName = String(requestedLabelName || "").trim().toLocaleLowerCase("pt-BR");
      const labelCatalog = Array.isArray(allLabels) ? allLabels : [];
      let label = wantedId
        ? labelCatalog.find(item => labelId(item?.id) === wantedId)
        : null;
      if (!wantedId && wantedName) {
        const nameMatches = labelCatalog.filter(item =>
          String(item?.name || "").trim().toLocaleLowerCase("pt-BR") === wantedName
        );
        if (nameMatches.length > 1) {
          throw new Error("Há mais de uma etiqueta com esse nome. Sincronize e selecione novamente pelo editor.");
        }
        label = nameMatches[0] || null;
      }
      const resolvedId = labelId(label?.id) || wantedId;
      if (!resolvedId) throw new Error("Etiqueta do WhatsApp não encontrada.");
      const result = await withKanbanLabelDeadline(
        () => mutateKanbanLabelChats(wpp, resolvedId, [chatId], "add"),
        deadline,
        4000,
        "O WhatsApp demorou para aplicar a etiqueta."
      );
      if (result === false) throw new Error("O WhatsApp recusou a aplicação da etiqueta.");
      const verification = await waitForKanbanLabelPresence(wpp, [chatId], resolvedId, deadline);
      if (!verification.confirmedChatIds.includes(String(chatId))) {
        throw new Error("O WhatsApp não confirmou a aplicação da etiqueta.");
      }
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: { labelId: resolvedId, labelName: String(label?.name || requestedLabelName || "Etiqueta") }
      });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function removeChatLabel(requestId, chatId, requestedLabelId, requestedLabelName) {
    try {
      const deadline = Date.now() + 12000;
      if (!chatId) throw new Error("Conversa inválida para remover a etiqueta.");
      const wpp = getWPP();
      const allLabels = typeof wpp?.labels?.getAllLabels === "function"
        ? await withKanbanLabelDeadline(
          () => wpp.labels.getAllLabels(),
          deadline,
          4000,
          "O WhatsApp demorou para carregar as etiquetas."
        )
        : [];
      const wantedId = String(requestedLabelId || "").trim();
      const wantedName = String(requestedLabelName || "").trim().toLocaleLowerCase("pt-BR");
      const labelCatalog = Array.isArray(allLabels) ? allLabels : [];
      let label = wantedId
        ? labelCatalog.find(item => labelId(item?.id) === wantedId)
        : null;
      if (!wantedId && wantedName) {
        const nameMatches = labelCatalog.filter(item =>
          String(item?.name || "").trim().toLocaleLowerCase("pt-BR") === wantedName
        );
        if (nameMatches.length > 1) {
          throw new Error("Há mais de uma etiqueta com esse nome. Sincronize e selecione novamente pelo editor.");
        }
        label = nameMatches[0] || null;
      }
      const resolvedId = labelId(label?.id) || wantedId;
      if (!resolvedId) throw new Error("Etiqueta do WhatsApp não encontrada.");

      let hasLabel = null;
      for (let attempt = 0; attempt < 3 && hasLabel === null && Date.now() < deadline; attempt++) {
        const currentStates = await readKanbanChatLabelStates(wpp, [chatId], resolvedId, deadline);
        hasLabel = currentStates.get(String(chatId));
        if (hasLabel === null && attempt < 2 && Date.now() < deadline) {
          await new Promise(resolve => setTimeout(resolve, Math.min(200, Math.max(0, deadline - Date.now()))));
        }
      }
      if (hasLabel === null || hasLabel === undefined) {
        throw new Error("Não foi possível confirmar as etiquetas desta conversa. Tente novamente após abrir o contato no WhatsApp.");
      }
      if (hasLabel === false) {
        emit("COMMAND_RESULT", {
          requestId,
          ok: true,
          result: {
            labelId: resolvedId,
            labelName: String(label?.name || requestedLabelName || "Etiqueta"),
            removed: false,
            alreadyAbsent: true
          }
        });
        return;
      }

      const result = await withKanbanLabelDeadline(
        () => mutateKanbanLabelChats(wpp, resolvedId, [chatId], "remove"),
        deadline,
        4000,
        "O WhatsApp demorou para remover a etiqueta."
      );
      if (result === false) throw new Error("O WhatsApp recusou a remoção da etiqueta.");
      const verification = await waitForKanbanLabelRemoval(wpp, [chatId], resolvedId, deadline, 20);
      if (!verification.removedChatIds.includes(String(chatId))) {
        throw new Error("O WhatsApp não confirmou a remoção da etiqueta.");
      }
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: {
          labelId: resolvedId,
          labelName: String(label?.name || requestedLabelName || "Etiqueta"),
          removed: true,
          alreadyAbsent: false
        }
      });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  function withKanbanLabelDeadline(factory, deadline, maxMs, message) {
    const remainingMs = Math.min(maxMs, deadline - Date.now());
    if (remainingMs <= 0) {
      const error = new Error(message);
      error.code = "WF_KANBAN_LABEL_DEADLINE";
      throw error;
    }
    return withTimeout(Promise.resolve().then(factory), remainingMs, message);
  }

  async function resolveMutableKanbanLabel(requestedLabelId, deadline = Date.now() + 10000) {
    const wpp = getWPP();
    const wantedId = String(requestedLabelId || "").trim();
    if (!wantedId) throw new Error("Etiqueta sem identificação. Sincronize o Kanban e tente novamente.");
    const allLabels = typeof wpp?.labels?.getAllLabels === "function"
      ? await withKanbanLabelDeadline(
        () => wpp.labels.getAllLabels(),
        deadline,
        10000,
        "O WhatsApp demorou para carregar as etiquetas."
      )
      : [];
    const label = (Array.isArray(allLabels) ? allLabels : []).find(item => labelId(item?.id) === wantedId);
    if (!label) throw new Error("A etiqueta não foi encontrada no WhatsApp. Sincronize o Kanban e tente novamente.");
    return { wpp, label, resolvedId: wantedId, allLabels };
  }

  async function readKanbanChatLabelStates(wpp, chatIds, resolvedLabelId, deadline) {
    let contacts = [];
    if (typeof wpp?.contact?.list === "function") {
      try {
        contacts = await withKanbanLabelDeadline(
          () => wpp.contact.list(),
          deadline,
          5000,
          "O WhatsApp demorou para consultar os contatos."
        );
      } catch {}
    }
    const contactList = Array.isArray(contacts) ? contacts : [];
    const states = new Map();
    chatIds.forEach(chatId => {
      const target = String(chatId);
      const contact = contactList.find(item => [
        serializeWid(item?.id),
        serializeWid(item?.wid),
        serializeWid(item?.phoneNumber),
        serializeWid(item?.accountLid)
      ].filter(Boolean).includes(target));
      const nativeChat = getNativeEngine()?.store?.Chat?.get?.(target);
      const sources = [contact, nativeChat, nativeChat?.contact].filter(Boolean);
      const loadedLabelSources = sources.filter(source => Array.isArray(source?.labels));
      if (!loadedLabelSources.length) {
        states.set(target, null);
        return;
      }
      const ids = new Set(loadedLabelSources.flatMap(source => contactLabelIds(source)));
      states.set(target, ids.has(resolvedLabelId));
    });
    return states;
  }

  async function waitForKanbanLabelRemoval(wpp, chatIds, resolvedLabelId, deadline, maxAttempts = 4) {
    const pending = new Set(chatIds.map(String));
    const removed = new Set();
    const attempts = Math.max(1, Number(maxAttempts) || 4);
    for (let attempt = 0; attempt < attempts && pending.size && Date.now() < deadline; attempt++) {
      const states = await readKanbanChatLabelStates(wpp, [...pending], resolvedLabelId, deadline);
      states.forEach((hasLabel, chatId) => {
        if (hasLabel === false) {
          removed.add(chatId);
          pending.delete(chatId);
        }
      });
      if (pending.size && attempt < attempts - 1 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, Math.min(250, Math.max(0, deadline - Date.now()))));
      }
    }
    return { removedChatIds: [...removed], unresolvedChatIds: [...pending] };
  }

  async function waitForKanbanLabelPresence(wpp, chatIds, resolvedLabelId, deadline) {
    const pending = new Set(chatIds.map(String));
    const confirmed = new Set();
    for (let attempt = 0; attempt < 20 && pending.size && Date.now() < deadline; attempt++) {
      const states = await readKanbanChatLabelStates(wpp, [...pending], resolvedLabelId, deadline);
      states.forEach((hasLabel, currentChatId) => {
        if (hasLabel === true) {
          confirmed.add(currentChatId);
          pending.delete(currentChatId);
        }
      });
      if (pending.size && attempt < 19 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, Math.min(250, Math.max(0, deadline - Date.now()))));
      }
    }
    return { confirmedChatIds: [...confirmed], unresolvedChatIds: [...pending] };
  }

  async function removeKanbanLabelFromChats(requestId, chatIds, requestedLabelId) {
    try {
      const deadline = Date.now() + 105000;
      const uniqueChatIds = [...new Set((Array.isArray(chatIds) ? chatIds : [])
        .filter(chatId => typeof chatId === "string")
        .map(chatId => chatId.trim())
        .filter(chatId => chatId && chatId.includes("@")))];
      if (!uniqueChatIds.length) throw new Error("Nenhum contato válido foi encontrado para limpar a etiqueta.");
      const { wpp, resolvedId } = await resolveMutableKanbanLabel(requestedLabelId, deadline);
      const removedChatIds = new Set();
      let fallbackChatIds = [...uniqueChatIds];
      let lastMutationError = null;
      try {
        const bulkResult = await withKanbanLabelDeadline(
          () => mutateKanbanLabelChats(wpp, resolvedId, uniqueChatIds, "remove"),
          deadline,
          30000,
          "O WhatsApp demorou para remover a etiqueta. Sincronize antes de tentar novamente."
        );
        if (bulkResult === false) throw new Error("O WhatsApp recusou a remoção em lote.");
        const verification = await waitForKanbanLabelRemoval(wpp, uniqueChatIds, resolvedId, deadline);
        verification.removedChatIds.forEach(chatId => removedChatIds.add(chatId));
        fallbackChatIds = verification.unresolvedChatIds;
      } catch (bulkError) {
        if (["WF_SEND_TIMEOUT", "WF_KANBAN_LABEL_DEADLINE"].includes(bulkError?.code)) throw bulkError;
        lastMutationError = bulkError;
        fallbackChatIds = [...uniqueChatIds];
      }
      const batchSize = 20;
      for (let offset = 0; offset < fallbackChatIds.length && Date.now() < deadline; offset += batchSize) {
        const batch = fallbackChatIds.slice(offset, offset + batchSize);
        await Promise.all(batch.map(async chatId => {
          try {
            await withKanbanLabelDeadline(
              () => mutateKanbanLabelChats(wpp, resolvedId, [chatId], "remove"),
              deadline,
              15000,
              "Tempo esgotado ao remover a etiqueta deste contato."
            );
          } catch (error) {
            lastMutationError = error;
          }
        }));
        const verification = await waitForKanbanLabelRemoval(wpp, batch, resolvedId, deadline);
        verification.removedChatIds.forEach(chatId => removedChatIds.add(chatId));
      }
      const removed = [...removedChatIds];
      const failedChatIds = uniqueChatIds.filter(chatId => !removedChatIds.has(chatId));
      if (!removed.length) {
        throw lastMutationError || new Error("O WhatsApp não confirmou a remoção da etiqueta em nenhum contato.");
      }
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: { labelId: resolvedId, removedChatIds: removed, failedChatIds }
      });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function editKanbanLabel(requestId, requestedLabelId, requestedName) {
    try {
      const deadline = Date.now() + 50000;
      const nextName = String(requestedName || "").trim();
      if (!nextName) throw new Error("Digite um nome válido para a etiqueta.");
      const { wpp, resolvedId, allLabels } = await resolveMutableKanbanLabel(requestedLabelId, deadline);
      const comparableName = value => String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("pt-BR");
      const duplicate = allLabels.some(item =>
        labelId(item?.id) !== resolvedId && comparableName(item?.name) === comparableName(nextName)
      );
      if (duplicate) throw new Error("Já existe uma etiqueta com esse nome no WhatsApp.");
      const result = await withKanbanLabelDeadline(
        () => renameKanbanLabelNative(wpp, resolvedId, nextName),
        deadline,
        30000,
        "O WhatsApp demorou para editar a etiqueta."
      );
      let confirmedName = comparableName(result?.name) === comparableName(nextName);
      if (!confirmedName) {
        const refreshed = typeof wpp.labels.getAllLabels === "function"
          ? await withKanbanLabelDeadline(() => wpp.labels.getAllLabels(), deadline, 10000, "O WhatsApp demorou para confirmar a etiqueta.")
          : [];
        const updated = (Array.isArray(refreshed) ? refreshed : []).find(item => labelId(item?.id) === resolvedId);
        confirmedName = comparableName(updated?.name) === comparableName(nextName);
      }
      if (!confirmedName) throw new Error("O WhatsApp não confirmou a alteração da etiqueta.");
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: { labelId: resolvedId, labelName: nextName }
      });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function deleteKanbanLabel(requestId, requestedLabelId) {
    try {
      const deadline = Date.now() + 50000;
      const { wpp, resolvedId } = await resolveMutableKanbanLabel(requestedLabelId, deadline);
      const result = await withKanbanLabelDeadline(
        () => deleteKanbanLabelNative(wpp, resolvedId),
        deadline,
        30000,
        "O WhatsApp demorou para excluir a etiqueta."
      );
      const deleteConfirmed = result === true || result?.deleteLabelResult === true;
      if (!deleteConfirmed) {
        const refreshed = typeof wpp.labels.getAllLabels === "function"
          ? await withKanbanLabelDeadline(() => wpp.labels.getAllLabels(), deadline, 10000, "O WhatsApp demorou para confirmar a exclusão.")
          : [];
        const stillExists = (Array.isArray(refreshed) ? refreshed : []).some(item => labelId(item?.id) === resolvedId);
        if (stillExists) throw new Error("O WhatsApp não confirmou a exclusão da etiqueta.");
      }
      emit("COMMAND_RESULT", {
        requestId,
        ok: true,
        result: { labelId: resolvedId }
      });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function markKanbanChatRead(requestId, chatId) {
    try {
      if (!chatId) throw new Error("Conversa inválida.");
      const wpp = getWPP();
      let marked = false;
      for (const method of [wpp?.chat?.markIsRead, wpp?.chat?.sendSeen]) {
        if (typeof method !== "function") continue;
        try {
          await Promise.resolve(method.call(wpp.chat, chatId));
          marked = true;
          break;
        } catch {}
      }
      const nativeChat = getNativeEngine()?.store?.Chat?.get?.(chatId);
      if (!marked && nativeChat) {
        for (const methodName of ["markIsRead", "sendSeen"]) {
          if (typeof nativeChat?.[methodName] !== "function") continue;
          try {
            await Promise.resolve(nativeChat[methodName]());
            marked = true;
            break;
          } catch {}
        }
      }
      emit("COMMAND_RESULT", { requestId, ok: true, result: { marked } });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function getKanbanChatDetails(requestId, chatId) {
    try {
      if (!chatId) throw new Error("Conversa inválida.");
      const wpp = getWPP();
      const native = getNativeEngine();
      let chat = native?.store?.Chat?.get?.(chatId) || null;
      if (!chat) {
        try {
          const active = await wpp?.chat?.getActiveChat?.();
          if (sameChatId(serializeWid(active?.id || active?.wid), chatId)) chat = active;
        } catch {}
      }
      if (!chat) throw new Error("Conversa não encontrada.");
      const contact = chat?.contact || {};
      const rawMessages = native ? getNativeMessages(native, chat, chatId) : getCollectionModels(chat?.msgs);
      const messages = (rawMessages || [])
        .filter(message => hasUserMessageContent(message))
        .sort((left, right) => messageTimestampMs(right) - messageTimestampMs(left))
        .slice(0, 50)
        .reverse()
        .map(message => {
          const type = String(message?.type || message?.attributes?.type || "chat");
          const rawBody = String(message?.body || message?.caption || message?.attributes?.body || "");
          const encodedMedia = /^(?:data:[^;]+;base64,|\/9j\/|iVBORw0KGgo|R0lGOD)/i.test(rawBody) ||
            (rawBody.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(rawBody));
          const body = encodedMedia ? (/image|photo/i.test(type) ? "Foto" : /video/i.test(type) ? "Vídeo" : /audio|ptt/i.test(type) ? "Áudio" : /sticker/i.test(type) ? "Figurinha" : "Mídia") : rawBody.slice(0, 1000);
          return { id: serializeMessageKey(message?.id || message), body, fromMe: Boolean(messageFromMe(message)), timestamp: messageTimestampMs(message), type };
        });
      const lastMessage = messages[messages.length - 1];
      let avatar = String(contact?.profilePicThumbObj?.eurl || contact?.profilePicThumbObj?.img || chat?.profilePicThumbObj?.eurl || chat?.profilePicThumbObj?.img || "");
      if (!avatar && typeof wpp?.contact?.getProfilePictureUrl === "function") {
        try {
          const picture = await wpp.contact.getProfilePictureUrl(chatId);
          avatar = String(picture?.eurl || picture?.img || picture?.url || picture || "");
        } catch {}
      }
      let labels = [];
      if (typeof wpp?.labels?.getAllLabels === "function") {
        try {
          const allLabels = await wpp.labels.getAllLabels();
          const ids = [...new Set([...contactLabelIds(contact), ...contactLabelIds(chat)])];
          labels = (Array.isArray(allLabels) ? allLabels : []).filter(label => ids.includes(labelId(label?.id))).map(label => ({
            id: labelId(label?.id), name: String(label?.name || "Etiqueta").trim(), color: label?.hexColor || label?.colorHex || label?.color || ""
          }));
        } catch {}
      }
      emit("COMMAND_RESULT", { requestId, ok: true, result: {
        chatId: serializeWid(chat?.id || chat?.wid || chatId),
        avatar,
        labels,
        name: String(chat?.name || chat?.formattedTitle || contact?.name || contact?.pushname || chatId.split("@")[0]).trim(),
        phone: String(serializeWid(contact?.phoneNumber || contact?.__x_phoneNumber || (chatId.endsWith("@c.us") ? chatId : "")) || "").split("@")[0].replace(/\D/g, ""),
        unreadCount: Number(chat?.unreadCount || chat?.unread || 0),
        updatedAt: Number(lastMessage?.timestamp || Date.now()),
        lastMessage: String(lastMessage?.body || ""),
        lastMessageFromMe: Boolean(lastMessage?.fromMe),
        messages
      }});
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  async function openKanbanChat(requestId, chatId, chatName = "", phone = "") {
    try {
      if (!chatId) throw new Error("Conversa inválida.");
      const wpp = getWPP();
      let opened = false;
      let targetChatId = chatId;
      const activeChatId = async () => {
        try {
          const active = await wpp?.chat?.getActiveChat?.();
          return serializeWid(active?.id || active?.wid || active?.contact?.id);
        } catch {
          return "";
        }
      };
      if (sameChatId(await activeChatId(), targetChatId)) {
        emit("COMMAND_RESULT", { requestId, ok: true, result: { chatId: targetChatId, opened: true } });
        return;
      }
      if (typeof wpp?.chat?.openChatBottom === "function") {
        try {
          Promise.resolve(wpp.chat.openChatBottom(targetChatId)).catch(() => {});
        } catch {}
      } else if (typeof wpp?.chat?.openChat === "function") {
        try {
          Promise.resolve(wpp.chat.openChat(targetChatId)).catch(() => {});
        } catch {}
      }
      for (let attempt = 0; attempt < 12 && !opened; attempt++) {
        await sleep(100);
        opened = sameChatId(await activeChatId(), targetChatId);
      }
      if (!opened) {
        const native = getNativeEngine();
        const store = native?.store?.Chat;
        const normalize = value => String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLocaleLowerCase("pt-BR");
        const expectedName = normalize(chatName);
        const expectedPhone = String(phone || "").replace(/\D/g, "").slice(-8);
        let chat = store?.get?.(targetChatId) || null;
        if (!chat) {
          chat = getCollectionModels(store).find(model => {
            const contact = model?.contact || {};
            const candidatePhone = [
              serializeWid(contact?.phoneNumber),
              serializeWid(contact?.id),
              serializeWid(model?.id)
            ].join(" ").replace(/\D/g, "");
            const candidateName = normalize(
              model?.name || model?.formattedTitle || contact?.name || contact?.pushname
            );
            return (expectedPhone && candidatePhone.includes(expectedPhone)) ||
              (expectedName && candidateName && (candidateName === expectedName || candidateName.includes(expectedName) || expectedName.includes(candidateName)));
          }) || null;
        }
        if (!chat) chat = await getNativeChat(native, targetChatId);
        targetChatId = serializeWid(chat?.id || chat?.wid || chat?.contact?.id) || targetChatId;
        const owner = native?.store?.Cmd || native?.store?.Chat;
        const openMethod = owner?.openChatBottom || owner?.openChat;
        if (typeof openMethod === "function" && chat) {
          for (const argument of [{ chat, chatEntryPoint: "newChatFlow" }, chat]) {
            try {
              const opening = Promise.resolve(openMethod.call(owner, argument));
              await Promise.race([
                opening.catch(() => {}),
                new Promise(resolve => setTimeout(resolve, 450))
              ]);
              await sleep(120);
              if (sameChatId(await activeChatId(), targetChatId)) {
                opened = true;
                break;
              }
            } catch {}
          }
        }
      }
      if (!opened) throw new Error("O WhatsApp não disponibilizou a abertura direta desta conversa.");
      emit("COMMAND_RESULT", { requestId, ok: true, result: { chatId: targetChatId, opened: true } });
    } catch (error) {
      emit("COMMAND_RESULT", { requestId, ok: false, error: error?.message || String(error) });
    }
  }

  window.addEventListener("message", event => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "WF_CONTENT") return;

    if (data.type === "SEND_TEXT") {
      sendText(data.requestId, data.chatId, data.text, data.linkPreview, data.dedupeSince);
    }

    if (data.type === "RESOLVE_CHAT") {
      resolveChat(data.requestId, data.chatId);
    }

    if (data.type === "CHECK_MESSAGE_ACKS") {
      checkMessageAcks(data.requestId, data.messageIds || []);
    }

    if (data.type === "CHECK_RECENT_OUTGOING") {
      checkRecentOutgoing(
        data.requestId,
        data.chatId,
        data.texts || [],
        data.since,
        data.timeoutMs
      );
    }

    if (data.type === "CHECK_CAMPAIGN_ACTIVITY") {
      checkCampaignActivity(data.requestId, data.recipients || []);
    }

    if (data.type === "SEND_FILE") {
      sendFile(data.requestId, data.chatId, data.block);
    }

    if (data.type === "SET_TYPING") {
      setTyping(data.requestId, data.chatId, Boolean(data.active));
    }

    if (data.type === "SET_RECORDING") {
      setRecording(data.requestId, data.chatId, Boolean(data.active));
    }

    if (data.type === "GET_ACTIVE_CHAT") {
      getActiveChat(data.requestId);
    }

    if (data.type === "LIST_KANBAN_CHATS") {
      listKanbanChats(data.requestId, { includeGroups: Boolean(data.includeGroups), forBulk: Boolean(data.forBulk) });
    }

    if (data.type === "GET_KANBAN_CHAT_LABELS") {
      getKanbanChatLabels(data.requestId, data.chatId);
    }

    if (data.type === "LIST_KANBAN_LABELS") {
      listKanbanLabels(data.requestId);
    }

    if (data.type === "APPLY_CHAT_LABEL") {
      applyChatLabel(data.requestId, data.chatId, data.labelId, data.labelName);
    }

    if (data.type === "REMOVE_CHAT_LABEL") {
      removeChatLabel(data.requestId, data.chatId, data.labelId, data.labelName);
    }

    if (data.type === "REMOVE_KANBAN_LABEL_FROM_CHATS") {
      removeKanbanLabelFromChats(data.requestId, data.chatIds, data.labelId);
    }

    if (data.type === "EDIT_KANBAN_LABEL") {
      editKanbanLabel(data.requestId, data.labelId, data.newName);
    }

    if (data.type === "DELETE_KANBAN_LABEL") {
      deleteKanbanLabel(data.requestId, data.labelId);
    }

    if (data.type === "MARK_KANBAN_CHAT_READ") {
      markKanbanChatRead(data.requestId, data.chatId);
    }

    if (data.type === "GET_KANBAN_CHAT_DETAILS") {
      getKanbanChatDetails(data.requestId, data.chatId);
    }

    if (data.type === "OPEN_KANBAN_CHAT") {
      openKanbanChat(data.requestId, data.chatId, data.name, data.phone);
    }

    if (data.type === "LIST_EXTRACTION_SOURCES") {
      listExtractionSources(data.requestId, data.sourceType);
    }

    if (data.type === "EXTRACT_CONTACTS") {
      extractContacts(data.requestId, data);
    }

    if (data.type === "CANCEL_EXTRACTION") {
      cancelExtraction(data.requestId);
    }

    if (data.type === "PING") {
      emit("PONG", {
        requestId: data.requestId,
        ready: isOperationalEngine(),
        bridgeVersion: BRIDGE_VERSION,
        capabilities: {
          ...getEngineCapabilities(),
          listenerTransport: bridgeListenerTransport
        },
        loaderState: window.__WF_VENDOR_LOADER__?.state || "unknown",
        loaderError: window.__WF_VENDOR_LOADER__?.error || "",
        ...getConnectionState()
      });
    }
  });

  initialize();
})();
