(() => {
  const BRIDGE_VERSION = "2026.10.29.1";
  if (window.__crmFlowContactLoaderVersion === BRIDGE_VERSION) return;
  window.__crmFlowContactLoaderVersion = BRIDGE_VERSION;

  const REQUEST_SOURCE = "flowsi-contact-loader";
  const RESPONSE_SOURCE = "flowsi-contact-scraper";
  const CHATBOT_INBOX_REQUEST_SOURCE = "flowsi-chatbot-inbox-request";
  const CHATBOT_INBOX_RESPONSE_SOURCE = "flowsi-chatbot-inbox-response";
  const CHATBOT_SEND_REQUEST_SOURCE = "flowsi-chatbot-send-request";
  const CHATBOT_SEND_RESPONSE_SOURCE = "flowsi-chatbot-send-response";

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

  async function readUnreadMessagesFromConversation(row, profile, expectedCount) {
    const username = normalizeVisibleText(profile?.username).replace(/^@+/, "");
    if (!username || !expectedCount) return null;
    row.click();

    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      await waitForVisibleInbox(200);
      const inbound = [...document.querySelectorAll(
        '[role="article"][aria-roledescription="message"]'
      )].map((article, index) => {
        const text = String(article.innerText || article.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        if (!text) return null;
        const container = article.parentElement;
        const actionLabels = [...(container?.querySelectorAll("[aria-label]") || [])]
          .map(element => normalizeVisibleText(element.getAttribute("aria-label")))
          .filter(Boolean);
        const belongsToContact = actionLabels.some(label =>
          label.includes(`mensagem de ${username}`) ||
          label.includes(`message from ${username}`) ||
          label.includes(`message by ${username}`)
        );
        if (!belongsToContact) return null;
        return { text, index };
      }).filter(Boolean).slice(-expectedCount);

      if (!inbound.length) continue;
      const senderId = String(profile.userId || profile.pk || profile.profileId || username);
      const threadId = String(profile.threadId || `dom-${username}`);
      return {
        thread_id: threadId,
        users: [{
          pk: senderId,
          id: senderId,
          username,
          full_name: profile.full_name || profile.name || username
        }],
        items: inbound.map(({ text, index }, offset) => ({
          item_id: `dom-open-${username}-${stableMessageHash(`${index}|${text}`)}`,
          user_id: senderId,
          text,
          timestamp: (Date.now() - (inbound.length - offset - 1) * 1000) * 1000
        }))
      };
    }
    return null;
  }

  async function readVisibleChatbotInbox() {
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
      if (!profile) continue;
      const matchedName = profile.normalizedNames.find(name =>
        rowText === name || rowText.startsWith(`${name} `)
      ) || "";
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
      const groupedUnreadCount = unreadMessageCount(preview);
      if (groupedUnreadCount) {
        const expandedThread = await readUnreadMessagesFromConversation(
          row,
          profile,
          groupedUnreadCount
        );
        if (expandedThread) {
          threads.push(expandedThread);
          const username = normalizeVisibleText(profile.username).replace(/^@+/, "");
          const signature = expandedThread.items.map(item => item.item_id).join("|");
          nextState[username] = {
            signature,
            eventId: expandedThread.items.at(-1)?.item_id || "",
            observedAt: Date.now()
          };
        }
        continue;
      }
      if (!preview || /^(voce|you)(:| enviou| sent)/i.test(normalizeVisibleText(preview))) continue;
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

  function sendChatbotDirect(username, message, threadId = "") {
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-chatbot-send-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        else reject(new Error(event.data.error || "O Instagram não confirmou o envio do chatbot."));
      }

      window.addEventListener("message", onResponse);
      window.postMessage({
        source: CHATBOT_SEND_REQUEST_SOURCE,
        requestId,
        username,
        message,
        threadId: String(threadId || "")
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.action === "flowsiChatbotReadVisibleInbox") {
      readVisibleChatbotInbox()
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ success: false, error: error?.message }));
      return true;
    }
    if (message?.action === "flowsiChatbotSendMessageMain") {
      sendChatbotDirect(message.username, message.message, message.threadId)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error?.message }));
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
