(() => {
  const BRIDGE_VERSION = "2026.10.29.21";
  if (window.__crmFlowContactLoaderVersion === BRIDGE_VERSION) return;
  window.__crmFlowContactLoaderVersion = BRIDGE_VERSION;

  const REQUEST_SOURCE = "flowsi-contact-loader";
  const RESPONSE_SOURCE = "flowsi-contact-scraper";
  const CHATBOT_INBOX_REQUEST_SOURCE = "flowsi-chatbot-inbox-request-v2";
  const CHATBOT_INBOX_RESPONSE_SOURCE = "flowsi-chatbot-inbox-response-v2";
  const CHATBOT_NOTIFICATIONS_REQUEST_SOURCE = "flowsi-chatbot-notifications-request-v1";
  const CHATBOT_NOTIFICATIONS_RESPONSE_SOURCE = "flowsi-chatbot-notifications-response-v1";
  const CHATBOT_COMMENT_REPLY_REQUEST_SOURCE = "flowsi-chatbot-comment-reply-request-v5";
  const CHATBOT_COMMENT_REPLY_RESPONSE_SOURCE = "flowsi-chatbot-comment-reply-response-v5";
  const CHATBOT_SEND_REQUEST_SOURCE = "flowsi-chatbot-send-request-v8";
  const CHATBOT_SEND_RESPONSE_SOURCE = "flowsi-chatbot-send-response-v8";
  const CHATBOT_MEDIA_SEND_REQUEST_SOURCE = "flowsi-chatbot-media-send-request-v1";
  const CHATBOT_MEDIA_SEND_RESPONSE_SOURCE = "flowsi-chatbot-media-send-response-v1";
  const CHATBOT_REALTIME_EVENT_SOURCE = "flowsi-chatbot-realtime-event-v2";

  const normalizeVisibleText = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const recentInboxMinutes = value => {
    const normalized = normalizeVisibleText(value);
    if (/\b(agora|now|alguns segundos|few seconds)\b/.test(normalized)) return 0;
    const match = normalized.match(/(?:^|\s)(\d+)\s*(?:min|minuto|minutos|m)(?:\s|$)/);
    if (!match) return null;
    const minutes = Number(match[1]);
    return Number.isFinite(minutes) && minutes <= 5 ? minutes : null;
  };

  function visibleConversationRows() {
    const root = document.querySelector(
      '[aria-label="Lista de tópicos"], [aria-label="Threads list"], [aria-label="Conversation list"]'
    );
    if (!root) return [];
    return [...root.querySelectorAll('button, [role="button"]')].filter(row => {
      const rect = row.getBoundingClientRect();
      return row.querySelector("img") && rect.width > 120 && rect.height > 36 && rect.height < 180;
    });
  }

  const waitForVisibleInbox = milliseconds => new Promise(resolve =>
    window.setTimeout(resolve, milliseconds)
  );

  const unreadMessageCount = value => {
    const normalized = normalizeVisibleText(value);
    const match = normalized.match(/^(\d+)\s+(?:new messages?|novas mensagens?|mensagens novas?)$/i);
    return match ? Math.max(1, Math.min(Number(match[1]) || 1, 20)) : 0;
  };

  const stableMessageHash = value => {
    let hash = 2166136261;
    for (const character of String(value || "")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  const usernameFromMessageLabel = value => {
    const normalized = normalizeVisibleText(value);
    const match = normalized.match(
      /(?:mensagem de|message from|message by)\s+@?([a-z0-9._]{1,30})(?:\b|$)/i
    );
    return match?.[1] || "";
  };

  const articleSenderUsername = article => {
    const labels = [...(article?.parentElement?.querySelectorAll?.("[aria-label]") || [])]
      .map(element => element.getAttribute?.("aria-label") || "")
      .filter(Boolean);
    for (const label of labels) {
      const username = usernameFromMessageLabel(label);
      if (username) return username;
    }
    return "";
  };

  const usernameFromProfileHref = value => {
    try {
      const pathname = new URL(value, location.origin).pathname;
      const match = pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      if (!match || ["direct", "explore", "reels", "accounts"].includes(match[1])) return "";
      return match[1].toLowerCase();
    } catch {
      return "";
    }
  };

  function openedConversationIdentity(profile = {}, row = null) {
    const knownUsername = normalizeVisibleText(profile?.username).replace(/^@+/, "");
    const articles = [...document.querySelectorAll(
      '[role="article"][aria-roledescription="message"]'
    )];
    const messageUsername = articles
      .map(articleSenderUsername)
      .find(Boolean) || "";

    const root = document.querySelector('main[role="main"], main') || document;
    const profileLinks = [...(root.querySelectorAll?.("a[href]") || [])]
      .map(anchor => ({
        anchor,
        username: usernameFromProfileHref(anchor.getAttribute?.("href") || anchor.href || "")
      }))
      .filter(candidate => candidate.username)
      .sort((left, right) => {
        const leftRect = left.anchor.getBoundingClientRect?.() || { top: 0, left: 0 };
        const rightRect = right.anchor.getBoundingClientRect?.() || { top: 0, left: 0 };
        const leftHeader = leftRect.top >= 0 && leftRect.top < 180 ? 1 : 0;
        const rightHeader = rightRect.top >= 0 && rightRect.top < 180 ? 1 : 0;
        return rightHeader - leftHeader || rightRect.left - leftRect.left;
      });
    const username = knownUsername || messageUsername || profileLinks[0]?.username || "";
    const rowName = String(row?.innerText || row?.textContent || "")
      .split(/\r?\n/)
      .map(value => value.trim())
      .find(Boolean) || "";
    return {
      ...profile,
      username,
      name: profile?.full_name || profile?.name || rowName || username
    };
  }

  const directThreadKey = () =>
    location.pathname.match(/^\/direct\/t\/([^/]+)/)?.[1] || "";

  function matchingVisibleMessageTokens(message, username, outgoingOnly = false) {
    const wantedText = normalizeVisibleText(message);
    const wantedUsername = normalizeVisibleText(username).replace(/^@+/, "");
    if (!wantedText) return [];

    return [...document.querySelectorAll('[role="article"][aria-roledescription="message"]')]
      .map((article, index) => {
        const text = normalizeVisibleText(article.innerText || article.textContent || "");
        if (text !== wantedText) return null;

        // Instagram exposes the sender in the controls that belong to an
        // incoming bubble. A matching bubble without the contact as sender is
        // the account's own outgoing message.
        const actionLabels = [...(article.parentElement?.querySelectorAll("[aria-label]") || [])]
          .map(element => normalizeVisibleText(element.getAttribute("aria-label")))
          .filter(Boolean);
        const isIncoming = Boolean(wantedUsername) && actionLabels.some(label =>
          label.includes(`mensagem de ${wantedUsername}`) ||
          label.includes(`message from ${wantedUsername}`) ||
          label.includes(`message by ${wantedUsername}`)
        );
        if (outgoingOnly && isIncoming) return null;

        const domMessageId = article.getAttribute("aria-labelledby") || article.id || "";
        return domMessageId || stableMessageHash(
          `${directThreadKey()}|${index}|${text}|${article.getBoundingClientRect().top}`
        );
      })
      .filter(Boolean);
  }

  async function captureOutgoingMessageSnapshot(message, username, threadId = "") {
    const currentThreadId = directThreadKey();
    const stored = await chrome.storage.local.get("flowsiActiveChatProfile");
    const activeProfile = stored.flowsiActiveChatProfile || {};
    const activeUsername = normalizeVisibleText(activeProfile.username).replace(/^@+/, "");
    const wantedUsername = normalizeVisibleText(username).replace(/^@+/, "");
    const activeThreadId = String(activeProfile.threadId || activeProfile.id || "");
    const hintedThreadId = String(threadId || "");
    const activeConversation = Boolean(currentThreadId) && (
      (wantedUsername && activeUsername === wantedUsername) ||
      (hintedThreadId && currentThreadId === hintedThreadId) ||
      (activeThreadId && currentThreadId === activeThreadId)
    );
    return {
      success: true,
      activeConversation,
      threadId: currentThreadId,
      route: location.pathname,
      tokens: matchingVisibleMessageTokens(message, username)
    };
  }

  async function confirmOutgoingMessage(message, username, snapshot) {
    const baseline = new Set(Array.isArray(snapshot?.tokens) ? snapshot.tokens : []);
    const expectedRoute = String(snapshot?.route || location.pathname);
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (location.pathname !== expectedRoute) {
        return {
          success: false,
          status: "unconfirmed",
          error: "A conversa mudou antes da confirmação do envio."
        };
      }
      const confirmedToken = matchingVisibleMessageTokens(message, username, true)
        .find(token => !baseline.has(token));
      if (confirmedToken) {
        return {
          success: true,
          status: "sent",
          threadId: directThreadKey(),
          transport: "reference-bundle-mqtt-dom-verified",
          confirmation: "outgoing-bubble",
          messageToken: confirmedToken
        };
      }
      await waitForVisibleInbox(200);
    }
    return {
      success: false,
      status: "unconfirmed",
      error: "A nova mensagem não apareceu como bolha de saída no Direct."
    };
  }

  async function readUnreadMessagesFromConversation(row, profile = {}, expectedCount) {
    if (!expectedCount) return null;
    row.click();

    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      await waitForVisibleInbox(200);
      const openedThreadId = location.pathname.match(/^\/direct\/t\/([^/]+)/)?.[1] || "";
      if (!openedThreadId) continue;
      const identity = openedConversationIdentity(profile, row);
      const username = normalizeVisibleText(identity.username).replace(/^@+/, "");
      if (!username) continue;
      const inbound = [...document.querySelectorAll(
        '[role="article"][aria-roledescription="message"]'
      )].map((article, index) => {
        const text = String(article.innerText || article.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        if (!text) return null;
        const belongsToContact = articleSenderUsername(article) === username;
        if (!belongsToContact) return null;
        const domMessageId = article.getAttribute("aria-labelledby") || article.id || `position-${index}`;
        return { text, index, domMessageId };
      }).filter(Boolean).slice(-expectedCount);

      if (!inbound.length) continue;
      const senderId = String(
        identity.userId || identity.pk || identity.profileId || username
      );
      const threadId = openedThreadId;
      return {
        thread_id: threadId,
        users: [{
          pk: senderId,
          id: senderId,
          username,
          full_name: identity.full_name || identity.name || username
        }],
        items: inbound.map(({ text, index, domMessageId }, offset) => ({
          // Instagram virtualizes the conversation and reuses the last visual
          // position. Its aria-labelledby value belongs to the actual bubble,
          // so two consecutive messages with the same text remain distinct.
          item_id: `dom-open-${username}-${stableMessageHash(`${domMessageId || index}|${text}`)}`,
          user_id: senderId,
          text,
          timestamp: (Date.now() - (inbound.length - offset - 1) * 1000) * 1000
        }))
      };
    }
    return null;
  }

  async function readVisibleChatbotInbox() {
    const originalDirectPath = location.pathname;
    const stored = await chrome.storage.local.get([
      "contactList",
      "kanbanColumns",
      "flowsiManualContacts",
      "flowsiKanbanAssignmentsV2",
      "flowsiChatbotDomInboxState"
    ]);
    const profiles = [
      ...(Array.isArray(stored.contactList) ? stored.contactList : []),
      ...(Array.isArray(stored.flowsiManualContacts) ? stored.flowsiManualContacts : []),
      ...(Array.isArray(stored.kanbanColumns)
        ? stored.kanbanColumns.flatMap(column => Array.isArray(column?.profiles) ? column.profiles : [])
        : []),
      ...Object.values(stored.flowsiKanbanAssignmentsV2 || {})
        .map(assignment => assignment?.profile)
        .filter(Boolean)
    ];
    const uniqueProfiles = [...new Map(profiles
      .filter(profile => profile?.username)
      .map(profile => [normalizeVisibleText(profile.username).replace(/^@+/, ""), profile])).values()]
      .map(profile => ({
        ...profile,
        normalizedNames: [...new Set([
          profile.name,
          profile.full_name,
          profile.username
        ].map(normalizeVisibleText).filter(Boolean))].sort((left, right) => right.length - left.length)
      }));
    const previousState = stored.flowsiChatbotDomInboxState &&
      typeof stored.flowsiChatbotDomInboxState === "object"
      ? stored.flowsiChatbotDomInboxState
      : {};
    const nextState = { ...previousState };
    const threads = [];

    for (const row of visibleConversationRows()) {
      const lines = String(row.innerText || row.textContent || "")
        .split(/\r?\n/)
        .map(value => value.trim())
        .filter(Boolean);
      const rowText = normalizeVisibleText(lines.join(" "));
      const profile = uniqueProfiles.find(candidate =>
        candidate.normalizedNames.some(name =>
          rowText === name || rowText.startsWith(`${name} `)
        )
      );
      const matchedName = profile?.normalizedNames.find(name =>
        rowText === name || rowText.startsWith(`${name} `)
      ) || normalizeVisibleText(lines[0] || "");
      const timeLine = [...lines].reverse().find(line => recentInboxMinutes(line) !== null) || "";
      const minutes = recentInboxMinutes(timeLine || rowText);
      if (minutes === null) continue;
      const messageLines = lines.filter((line, index) =>
        index > 0 && line !== timeLine && !/^(verificado|verified)$/i.test(line)
      );
      let preview = messageLines.join(" ").trim();
      if (!preview) {
        preview = rowText.slice(matchedName.length).trim()
          .replace(/\b(ha )?(alguns segundos|few seconds|agora|now)\b.*$/i, "")
          .replace(/\b(ha )?\d+\s*(min|minuto|minutos|m)\b.*$/i, "")
          .trim();
      }
      if (!preview || /^(voce|you)(:| enviou| sent)/i.test(normalizeVisibleText(preview))) continue;
      const groupedUnreadCount = unreadMessageCount(preview);
      // The inbox preview is not authoritative: Instagram replaces it with
      // counters ("2 new messages") and can collapse repeated equal texts.
      // Open every recent inbound row, read the real message articles and
      // capture the numeric thread_id from the resulting Direct URL.
      {
        const expandedThread = await readUnreadMessagesFromConversation(
          row,
          profile || { name: lines[0] || "" },
          groupedUnreadCount || 1
        );
        if (expandedThread) {
          threads.push(expandedThread);
          const username = normalizeVisibleText(
            expandedThread.users?.[0]?.username
          ).replace(/^@+/, "");
          const signature = expandedThread.items.map(item => item.item_id).join("|");
          nextState[username] = {
            signature,
            eventId: expandedThread.items.at(-1)?.item_id || "",
            observedAt: Date.now()
          };
          continue;
        }
      }
      // A row without a CRM profile can still be opened and identified from
      // Instagram's message sender labels. If that failed, there is no safe
      // username for the preview-only fallback, so leave it for the next poll.
      if (!profile) continue;
      const username = normalizeVisibleText(profile.username).replace(/^@+/, "");
      // Include the visible time/unread state so two consecutive messages
      // with the same keyword do not collapse into the same event forever.
      const unreadState = `${row.getAttribute("aria-label") || ""} ${rowText}`
        .match(/nao lida|não lida|unread|nova mensagem|new message/i)?.[0] || "";
      const signature = normalizeVisibleText(`${preview}|${timeLine}|${unreadState}`);
      const previous = nextState[username];
      const eventId = previous?.signature === signature
        ? previous.eventId
        : `dom-${username}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      nextState[username] = { signature, eventId, observedAt: Date.now() };
      const senderId = String(profile.userId || profile.pk || profile.profileId || username);
      threads.push({
        thread_id: String(profile.threadId || `dom-${username}`),
        users: [{
          pk: senderId,
          id: senderId,
          username,
          full_name: profile.full_name || profile.name || username
        }],
        items: [{
          item_id: eventId,
          user_id: senderId,
          text: preview,
          timestamp: (Date.now() - minutes * 60 * 1000) * 1000
        }]
      });
    }
    if (
      originalDirectPath === "/direct/inbox/" &&
      location.pathname !== originalDirectPath
    ) {
      const inboxLink = document.querySelector('a[href="/direct/inbox/"]');
      inboxLink?.click?.();
      await waitForVisibleInbox(100);
    }
    await chrome.storage.local.set({ flowsiChatbotDomInboxState: nextState });
    return { threads, source: "visible-inbox-dom" };
  }

  function readChatbotInbox() {
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-chatbot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onResponse);
        reject(new Error("O Instagram demorou para entregar as mensagens do Direct."));
      }, 30000);

      function onResponse(event) {
        if (
          event.source !== window ||
          event.data?.source !== CHATBOT_INBOX_RESPONSE_SOURCE ||
          event.data?.requestId !== requestId
        ) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onResponse);
        if (event.data.success) resolve(event.data.result);
        else reject(new Error(event.data.error || "Não foi possível ler o inbox do chatbot."));
      }

      window.addEventListener("message", onResponse);
      window.postMessage({ source: CHATBOT_INBOX_REQUEST_SOURCE, requestId }, "*");
    });
  }

  function readChatbotNotifications() {
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-chatbot-notifications-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onResponse);
        reject(new Error("O Instagram demorou para entregar as notificações."));
      }, 30000);

      function onResponse(event) {
        if (
          event.source !== window ||
          event.data?.source !== CHATBOT_NOTIFICATIONS_RESPONSE_SOURCE ||
          event.data?.requestId !== requestId
        ) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onResponse);
        if (event.data.success) resolve(event.data.result);
        else reject(new Error(event.data.error || "Não foi possível ler as notificações."));
      }

      window.addEventListener("message", onResponse);
      window.postMessage({ source: CHATBOT_NOTIFICATIONS_REQUEST_SOURCE, requestId }, "*");
    });
  }

  function replyChatbotComment(
    mediaId,
    commentId,
    message,
    uiOnly = false,
    actorUsername = "",
    commentText = ""
  ) {
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-chatbot-comment-reply-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onResponse);
        reject(new Error("O Instagram demorou para confirmar a resposta pública."));
      }, 120000);

      function onResponse(event) {
        if (
          event.source !== window ||
          event.data?.source !== CHATBOT_COMMENT_REPLY_RESPONSE_SOURCE ||
          event.data?.requestId !== requestId
        ) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onResponse);
        if (event.data.success) resolve(event.data.result);
        else {
          const error = new Error(event.data.error || "O Instagram recusou a resposta pública.");
          error.deliveryAttempted = Boolean(event.data.deliveryAttempted);
          reject(error);
        }
      }

      window.addEventListener("message", onResponse);
      window.postMessage({
        source: CHATBOT_COMMENT_REPLY_REQUEST_SOURCE,
        requestId,
        mediaId: String(mediaId || ""),
        commentId: String(commentId || ""),
        message: String(message || ""),
        uiOnly: Boolean(uiOnly),
        actorUsername: String(actorUsername || ""),
        commentText: String(commentText || "")
      }, "*");
    });
  }

  function sendChatbotDirect(
    username,
    message,
    threadId = "",
    viewerId = "",
    trustedThreadId = "",
    deliveryId = ""
  ) {
    return new Promise((resolve, reject) => {
      const requestId = String(deliveryId || "").trim() ||
        `flowsi-chatbot-send-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onResponse);
        reject(new Error("O Instagram demorou para confirmar o envio do chatbot."));
      }, 30000);

      function onResponse(event) {
        if (
          event.source !== window ||
          event.data?.source !== CHATBOT_SEND_RESPONSE_SOURCE ||
          event.data?.requestId !== requestId
        ) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onResponse);
        if (event.data.success) resolve(event.data.result);
        else {
          const error = new Error(
            event.data.error || "O Instagram não confirmou o envio do chatbot."
          );
          error.deliveryAttempted = Boolean(event.data.deliveryAttempted);
          reject(error);
        }
      }

      window.addEventListener("message", onResponse);
      window.postMessage({
        source: CHATBOT_SEND_REQUEST_SOURCE,
        requestId,
        username,
        message,
        threadId: String(threadId || ""),
        viewerId: /^\d+$/.test(String(viewerId || "")) ? String(viewerId) : "",
        trustedThreadId: /^\d+$/.test(String(trustedThreadId || ""))
          ? String(trustedThreadId)
          : ""
      }, "*");
    });
  }

  function readSavedQuickMessageVideo(title) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("keyval-store", 1);
      request.onerror = () => reject(
        request.error || new Error("Falha ao abrir o armazenamento de vídeos.")
      );
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("keyval")) {
          request.result.createObjectStore("keyval");
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        let transaction;
        try {
          transaction = database.transaction("keyval", "readonly");
        } catch (error) {
          database.close();
          reject(error);
          return;
        }
        const valueRequest = transaction.objectStore("keyval").get(String(title || ""));
        valueRequest.onerror = () => reject(
          valueRequest.error || new Error("Falha ao ler o vídeo salvo.")
        );
        valueRequest.onsuccess = () => {
          const value = String(valueRequest.result || "");
          if (value) resolve(value);
          else reject(new Error(`O vídeo '${title || ""}' não foi encontrado.`));
        };
        transaction.oncomplete = () => database.close();
        transaction.onabort = () => database.close();
      };
    });
  }

  async function sendChatbotMedia(
    username,
    dataUrl,
    mediaType,
    title,
    caption,
    threadId = "",
    viewerId = "",
    trustedThreadId = ""
  ) {
    let resolvedDataUrl = String(dataUrl || "").trim();
    if (!resolvedDataUrl && String(mediaType || "").toLowerCase() === "video") {
      resolvedDataUrl = await readSavedQuickMessageVideo(title);
    }
    if (!resolvedDataUrl) throw new Error("O arquivo da mensagem pronta não foi encontrado.");
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-chatbot-media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onResponse);
        reject(new Error("O Instagram demorou para confirmar o envio do arquivo."));
      }, 90000);

      function onResponse(event) {
        if (
          event.source !== window ||
          event.data?.source !== CHATBOT_MEDIA_SEND_RESPONSE_SOURCE ||
          event.data?.requestId !== requestId
        ) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onResponse);
        if (event.data.success) resolve(event.data.result);
        else {
          const error = new Error(
            event.data.error || "O Instagram não confirmou o envio do arquivo."
          );
          error.deliveryAttempted = Boolean(event.data.deliveryAttempted);
          reject(error);
        }
      }

      window.addEventListener("message", onResponse);
      window.postMessage({
        source: CHATBOT_MEDIA_SEND_REQUEST_SOURCE,
        requestId,
        username,
        dataUrl: resolvedDataUrl,
        mediaType,
        title,
        caption,
        threadId: String(threadId || ""),
        viewerId: /^\d+$/.test(String(viewerId || "")) ? String(viewerId) : "",
        trustedThreadId: /^\d+$/.test(String(trustedThreadId || ""))
          ? String(trustedThreadId)
          : ""
      }, "*");
    });
  }

  function scrapeContacts(loadMore, knownContacts, cursors, apiOnly) {
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onResponse);
        reject(new Error("A página do Instagram demorou para responder. Atualize a aba e tente novamente."));
      }, 900000);

      function onResponse(event) {
        if (
          event.source !== window ||
          event.data?.source !== RESPONSE_SOURCE ||
          event.data?.requestId !== requestId
        ) return;
        clearTimeout(timeout);
        window.removeEventListener("message", onResponse);
        if (event.data.success) resolve(event.data.result);
        else reject(new Error(event.data.error || "Não foi possível ler as conversas."));
      }

      window.addEventListener("message", onResponse);
      window.postMessage({
        source: REQUEST_SOURCE,
        requestId,
        loadMore: Boolean(loadMore),
        apiOnly: Boolean(apiOnly),
        knownContacts: Array.isArray(knownContacts) ? knownContacts : [],
        cursors: cursors && typeof cursors === "object" ? cursors : {}
      }, "*");
    });
  }

  window.addEventListener("message", event => {
    if (
      event.source !== window ||
      event.data?.source !== CHATBOT_REALTIME_EVENT_SOURCE
    ) return;
    const eventId = String(event.data?.eventId || event.data?.item?.item_id || "");
    const trustedThreadId = /^\d+$/.test(String(event.data?.trustedThreadId || ""))
      ? String(event.data.trustedThreadId)
      : "";
    let fallbackRequested = false;
    const requestFallbackInboxCheck = () => {
      if (fallbackRequested) return;
      fallbackRequested = true;
      try {
        chrome.runtime.sendMessage(
          { action: "checkNotifications", force: true },
          () => void chrome.runtime.lastError
        );
      } catch {}
    };
    try {
      chrome.runtime.sendMessage(
        {
          action: "flowsiChatbotRealtimeEvent",
          eventId,
          capturedAt: Number(event.data?.capturedAt || Date.now()),
          viewerId: /^\d+$/.test(String(event.data?.viewerId || ""))
            ? String(event.data.viewerId)
            : "",
          trustedThreadId,
          thread: event.data?.thread || null,
          item: event.data?.item || event.data?.thread?.items?.[0] || null
        },
        response => {
          const runtimeError = chrome.runtime.lastError?.message || "";
          const backgroundStatus = String(
            response?.result?.status || response?.status || response?.reason || ""
          );
          const dedicatedEventSucceeded = !runtimeError &&
            response?.success === true &&
            (backgroundStatus === "processed" || backgroundStatus === "idle");
          const diagnostic = {
            at: new Date().toISOString(),
            status: dedicatedEventSucceeded ? "forwarded" : "failed",
            eventId,
            trustedThreadId,
            backgroundStatus
          };
          document.documentElement.setAttribute(
            dedicatedEventSucceeded
              ? "data-flowsi-chatbot-realtime-bridge"
              : "data-flowsi-chatbot-realtime-bridge-error",
            JSON.stringify(dedicatedEventSucceeded
              ? diagnostic
              : {
                  ...diagnostic,
                  error: runtimeError || response?.error ||
                    "O evento dedicado não foi confirmado pelo background."
                })
          );
          if (!dedicatedEventSucceeded) requestFallbackInboxCheck();
        }
      );
    } catch (error) {
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-realtime-bridge-error",
        JSON.stringify({
          at: new Date().toISOString(),
          status: "failed",
          eventId,
          error: String(error?.message || error || "Falha ao encaminhar evento realtime.")
        })
      );
      requestFallbackInboxCheck();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.action === "flowsiChatbotBridgeReady") {
      sendResponse({ success: true, version: BRIDGE_VERSION });
      return false;
    }
    if (message?.action === "flowsiChatbotSnapshotOutgoingMessage") {
      captureOutgoingMessageSnapshot(message.message, message.username, message.threadId)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error?.message }));
      return true;
    }
    if (message?.action === "flowsiChatbotConfirmOutgoingMessage") {
      confirmOutgoingMessage(message.message, message.username, message.snapshot)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, status: "unconfirmed", error: error?.message }));
      return true;
    }
    if (message?.action === "flowsiChatbotReadVisibleInbox") {
      readVisibleChatbotInbox()
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error?.message }));
      return true;
    }
    if (message?.action === "flowsiChatbotReadNotifications") {
      readChatbotNotifications()
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error?.message }));
      return true;
    }
    if (message?.action === "flowsiChatbotReplyCommentMain") {
      replyChatbotComment(
        message.mediaId,
        message.commentId,
        message.message,
        Boolean(message.uiOnly),
        message.actorUsername,
        message.commentText
      )
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({
          success: false,
          status: "unconfirmed",
          error: error?.message,
          deliveryAttempted: Boolean(error?.deliveryAttempted)
        }));
      return true;
    }
    if (message?.action === "flowsiChatbotSendMessageMain") {
      sendChatbotDirect(
        message.username,
        message.message,
        message.threadId,
        message.viewerId,
        message.trustedThreadId,
        message.deliveryId
      )
        .then(sendResponse)
        .catch(error => sendResponse({
          success: false,
          error: error?.message,
          deliveryAttempted: Boolean(error?.deliveryAttempted)
        }));
      return true;
    }
    if (message?.action === "flowsiChatbotSendMediaMain") {
      sendChatbotMedia(
        message.username,
        message.dataUrl,
        message.mediaType,
        message.title,
        message.caption,
        message.threadId,
        message.viewerId,
        message.trustedThreadId
      )
        .then(sendResponse)
        .catch(error => sendResponse({
          success: false,
          status: "unconfirmed",
          error: error?.message,
          deliveryAttempted: Boolean(error?.deliveryAttempted)
        }));
      return true;
    }
    if (message?.action === "flowsiChatbotReadInbox") {
      readChatbotInbox()
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error?.message }));
      return true;
    }
    if (message?.action !== "flowsiScrapeContacts") return false;
    scrapeContacts(message.loadMore, message.knownContacts, message.cursors, message.apiOnly)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error?.message }));
    return true;
  });
})();
