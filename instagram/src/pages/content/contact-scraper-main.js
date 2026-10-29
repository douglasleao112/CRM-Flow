(() => {
  if (window.__flowsiContactScraperInstalled) return;
  window.__flowsiContactScraperInstalled = true;
  const scraperMarker = document.createElement("meta");
  scraperMarker.id = "flowsi-contact-scraper-marker";
  scraperMarker.setAttribute("data-version", "2026.6.174");
  document.documentElement.appendChild(scraperMarker);

  const REQUEST_SOURCE = "flowsi-contact-loader";
  const RESPONSE_SOURCE = "flowsi-contact-scraper";
  const RELATIONSHIP_REQUEST_SOURCE = "flowsi-profile-relationship-request";
  const RELATIONSHIP_RESPONSE_SOURCE = "flowsi-profile-relationship-response";
  const FOLLOWING_REQUEST_SOURCE = "flowsi-profile-following-request";
  const FOLLOWING_RESPONSE_SOURCE = "flowsi-profile-following-response";
  const CHATBOT_INBOX_REQUEST_SOURCE = "flowsi-chatbot-inbox-request";
  const CHATBOT_INBOX_RESPONSE_SOURCE = "flowsi-chatbot-inbox-response";
  const CHATBOT_SEND_REQUEST_SOURCE = "flowsi-chatbot-send-request";
  const CHATBOT_SEND_RESPONSE_SOURCE = "flowsi-chatbot-send-response";
  const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
  const INBOX_CONTACT_LIMIT_PER_FOLDER = 20;
  const chatbotThreadCache = new Map();

  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isUsername(value) {
    return USERNAME_PATTERN.test(String(value || ""));
  }

  function currentAccountUsername() {
    const icon = document.querySelector('a[href] svg[aria-label="Perfil"], a[href] svg[aria-label="Profile"]');
    const labelledLink = icon?.closest("a[href]") || [...document.querySelectorAll("a[href]")].find(anchor => {
      if (anchor.closest('[aria-label="Lista de tópicos"]')) return false;
      const label = [anchor.getAttribute("aria-label"), anchor.getAttribute("title"),
        ...[...anchor.querySelectorAll("[aria-label]")].map(item => item.getAttribute("aria-label"))]
        .filter(Boolean).join(" ");
      return /(^|\s)(perfil|profile)(\s|$)/i.test(label);
    });
    if (!labelledLink) return "";
    try {
      const match = new URL(labelledLink.href, location.origin).pathname
        .match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      return match?.[1] || "";
    } catch {
      return "";
    }
  }

  function currentAccountUserId() {
    return document.cookie.split(";").map(value => value.trim())
      .find(value => value.startsWith("ds_user_id="))?.slice("ds_user_id=".length) || "";
  }

  function csrfToken() {
    return document.cookie.split(";").map(value => value.trim())
      .find(value => value.startsWith("csrftoken="))?.slice("csrftoken=".length) || "";
  }

  function threadToContacts(thread, accountUserId) {
    const users = Array.isArray(thread?.users) ? thread.users : [];
    const recipients = Array.isArray(thread?.recipients) ? thread.recipients : [];
    const candidates = [...users, ...recipients, thread?.inviter].filter(Boolean);
    const otherUsers = candidates.filter(user => {
      const ids = [user?.pk, user?.id, user?.interop_messaging_user_fbid]
        .map(value => String(value || ""));
      return !accountUserId || !ids.includes(String(accountUserId));
    });
    const uniqueUsers = [...new Map(otherUsers
      .filter(user => isUsername(user?.username))
      .map(user => [normalize(user.username), user])).values()];
    return uniqueUsers.map(user => ({
      id: String(thread.thread_id || user.pk || user.id || `api-${user.username}`),
      threadId: String(thread.thread_id || ""),
      userId: String(user.pk || user.id || ""),
      pk: String(user.pk || user.id || ""),
      name: user.full_name || thread.thread_title || user.username,
      full_name: user.full_name || thread.thread_title || user.username,
      profileImage: user.profile_pic_url || "",
      profile_pic_url: user.profile_pic_url || "",
      username: user.username,
      messageId: String(user.interop_messaging_user_fbid || user.eimu_id || user.pk || user.id || thread.thread_id || ""),
      source: "inbox-api"
    }));
  }

  async function fetchInboxCollection(pathname, folder, cursor, isActive) {
    const contacts = new Map();
    const accountUserId = currentAccountUserId();
    let pageCount = 0;
    let succeeded = false;
    while (isActive() && pageCount < 1) {
      const query = new URLSearchParams({
        persistentBadging: "true",
        use_unified_inbox: "true",
        visual_message_return_type: "unseen",
        thread_message_limit: "10",
        limit: String(INBOX_CONTACT_LIMIT_PER_FOLDER)
      });
      if (folder !== null && folder !== undefined) query.set("folder", String(folder));
      if (cursor) query.set("cursor", String(cursor));
      const requestOptions = {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          accept: "*/*",
          "x-ig-app-id": "936619743392459",
          "x-asbd-id": "129477",
          "x-csrftoken": csrfToken(),
          "x-requested-with": "XMLHttpRequest"
        }
      };
      const endpoints = [
        `${pathname}?${query}`,
        `https://i.instagram.com${pathname}?${query}`
      ];
      let response = null;
      const failures = [];
      for (const endpoint of endpoints) {
        try {
          const candidate = await fetch(endpoint, requestOptions);
          if (candidate.ok) {
            response = candidate;
            break;
          }
          failures.push(`${new URL(endpoint, location.origin).host}:HTTP ${candidate.status}`);
        } catch (error) {
          failures.push(`${new URL(endpoint, location.origin).host}:${error?.message || "falha"}`);
        }
      }
      if (!response) throw new Error(`Instagram recusou a caixa (${failures.join(", ")})`);
      succeeded = true;
      const payload = await response.json();
      const inbox = payload?.inbox || payload?.pending_inbox || payload;
      const threads = Array.isArray(inbox?.threads) ? inbox.threads : [];
      for (const thread of threads) {
        for (const contact of threadToContacts(thread, accountUserId)) {
          contacts.set(normalize(contact.username), contact);
          if (contacts.size >= INBOX_CONTACT_LIMIT_PER_FOLDER) break;
        }
        if (contacts.size >= INBOX_CONTACT_LIMIT_PER_FOLDER) break;
      }
      pageCount += 1;
      return {
        contacts: [...contacts.values()].slice(0, INBOX_CONTACT_LIMIT_PER_FOLDER),
        succeeded,
        pageCount,
        nextCursor: String(inbox?.oldest_cursor || ""),
        hasMore: Boolean(inbox?.oldest_cursor)
      };
    }
    return {
      contacts: [...contacts.values()].slice(0, INBOX_CONTACT_LIMIT_PER_FOLDER),
      succeeded,
      pageCount,
      nextCursor: "",
      hasMore: false
    };
  }

  async function scrapeInboxApi(isActive, cursors = {}, loadMore = false) {
    const contacts = new Map();
    const diagnostics = [];
    const hasSavedCursor = ["primary", "general"].some(name => Boolean(cursors?.[name]));
    const sources = [
      { pathname: "/api/v1/direct_v2/inbox/", folder: 0, name: "primary" },
      { pathname: "/api/v1/direct_v2/inbox/", folder: 1, name: "general" }
    ].filter(source =>
      !loadMore || !hasSavedCursor || Boolean(cursors?.[source.name])
    );
    const sourceResults = await Promise.all(sources.map(async source => {
      if (!isActive()) return { source, cancelled: true };
      try {
        const result = await fetchInboxCollection(
          source.pathname,
          source.folder,
          loadMore ? (cursors?.[source.name] || "") : "",
          isActive
        );
        return { source, result };
      } catch (error) {
        return { source, error: error?.message || String(error) };
      }
    }));

    let successfulSources = 0;
    const nextCursors = { primary: "", general: "" };
    for (const entry of sourceResults) {
      if (entry.cancelled) continue;
      if (entry.error) {
        diagnostics.push({ source: entry.source.name, error: entry.error });
        continue;
      }
      const { source, result } = entry;
      if (result.succeeded) successfulSources += 1;
      nextCursors[source.name] = result.nextCursor || "";
      diagnostics.push({
        source: source.name,
        pages: result.pageCount,
        count: result.contacts.length,
        hasMore: result.hasMore
      });
      for (const contact of result.contacts) {
        contacts.set(normalize(contact.username), {
          ...contact,
          inboxFolder: source.name
        });
      }
    }
    return {
      contacts: [...contacts.values()],
      successfulSources,
      diagnostics,
      nextCursors,
      hasMore: Object.values(nextCursors).some(Boolean)
    };
  }

  async function fetchChatbotInboxFolder(folder) {
    const query = new URLSearchParams({
      persistentBadging: "true",
      use_unified_inbox: "true",
      visual_message_return_type: "unseen",
      thread_message_limit: "20",
      limit: "20",
      folder: String(folder)
    });
    const requestOptions = {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "*/*",
        "x-ig-app-id": "936619743392459",
        "x-asbd-id": "129477",
        "x-csrftoken": csrfToken(),
        "x-requested-with": "XMLHttpRequest"
      }
    };
    const failures = [];
    for (const endpoint of [
      `/api/v1/direct_v2/inbox/?${query}`,
      `https://i.instagram.com/api/v1/direct_v2/inbox/?${query}`
    ]) {
      try {
        const response = await fetch(endpoint, requestOptions);
        if (!response.ok) {
          failures.push(`${new URL(endpoint, location.origin).host}:HTTP ${response.status}`);
          continue;
        }
        const payload = await response.json();
        return Array.isArray(payload?.inbox?.threads) ? payload.inbox.threads : [];
      } catch (error) {
        failures.push(`${new URL(endpoint, location.origin).host}:${error?.message || "falha"}`);
      }
    }
    throw new Error(`Falha ao ler Direct ${folder} (${failures.join(", ") || "sem resposta"}).`);
  }

  async function readChatbotInbox() {
    const [primary, general] = await Promise.all([
      fetchChatbotInboxFolder(0),
      fetchChatbotInboxFolder(1)
    ]);
    return {
      primary,
      general,
      viewerId: currentAccountUserId(),
      accountUsername: currentAccountUsername()
    };
  }

  async function sendChatbotDirect(username, message, existingThreadId = "") {
    const normalizedUsername = String(username || "").trim().toLowerCase().replace(/^@+/, "");
    const text = String(message || "").trim();
    if (!isUsername(normalizedUsername) || !text) {
      throw new Error("Destinatário ou mensagem do chatbot inválidos.");
    }
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-csrftoken": csrfToken(),
      "x-requested-with": "XMLHttpRequest"
    };
    const formHeaders = {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    // The legacy extension that successfully sends messages never assumes
    // that a card/message ID is a Direct thread ID. Resolve the real user and
    // ask Instagram to create/locate the one-to-one thread first.
    const threadId = await resolveChatbotThread(
      normalizedUsername,
      String(existingThreadId || ""),
      headers,
      formHeaders
    );

    const clientContext = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
    const broadcastResponse = await fetch("/api/v1/direct_v2/threads/broadcast/text/", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: formHeaders,
      body: new URLSearchParams({
        action: "send_item",
        send_attribution: "direct_thread",
        client_context: clientContext,
        mutation_token: clientContext,
        offline_threading_id: clientContext,
        thread_ids: `["${threadId}"]`,
        text
      }).toString()
    });
    const broadcastPayload = await broadcastResponse.json().catch(() => ({}));
    if (!broadcastResponse.ok || broadcastPayload?.status !== "ok") {
      const viewerId = currentAccountUserId();
      if (!viewerId) {
        throw new Error(
          broadcastPayload?.message || `O Instagram não confirmou o envio (HTTP ${broadcastResponse.status}).`
        );
      }
      return sendChatbotThroughThreadUi(threadId, text, viewerId);
    }
    return {
      success: true,
      status: "sent",
      threadId,
      transport: "instagram-page-http"
    };
  }

  async function resolveChatbotThread(username, hintedThreadId, headers, formHeaders) {
    const cached = chatbotThreadCache.get(username);
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.threadId;
    const encoded = encodeURIComponent(username);
    const profileUrls = [
      `/api/v1/web/search/topsearch/?context=blended&query=${encoded}&include_reel=true`,
      `/web/search/topsearch/?query=${encoded}`,
      `/api/v1/users/web_profile_info/?username=${encoded}`,
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encoded}`
    ];
    let userId = "";
    const failures = [];
    for (const url of profileUrls) {
      try {
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers
        });
        if (!response.ok) {
          failures.push(`${new URL(url, location.origin).pathname}: HTTP ${response.status}`);
          continue;
        }
        const payload = await response.json();
        const directUser = payload?.data?.user || payload?.user;
        const candidates = [directUser, ...searchUsers(payload)].filter(Boolean);
        const match = candidates.find(user => normalize(user?.username) === normalize(username));
        userId = String(match?.id || match?.pk || "");
        if (/^\d+$/.test(userId)) break;
      } catch (error) {
        failures.push(error?.message || String(error));
      }
    }
    if (!/^\d+$/.test(userId)) {
      throw new Error(`Não foi possível resolver o ID real de @${username} (${failures.join("; ")}).`);
    }
    for (const endpoint of [
      "/api/v1/direct_v2/create_group_thread/",
      "https://i.instagram.com/api/v1/direct_v2/create_group_thread/"
    ]) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: formHeaders,
          body: new URLSearchParams({ recipient_users: `["${userId}"]` }).toString()
        });
        const payload = await response.json().catch(() => ({}));
        const threadId = String(payload?.thread_id || payload?.thread?.thread_id || "");
        if (response.ok && /^\d+$/.test(threadId)) {
          chatbotThreadCache.set(username, { threadId, userId, at: Date.now() });
          return threadId;
        }
        failures.push(`${new URL(endpoint, location.origin).pathname}: HTTP ${response.status}`);
      } catch (error) {
        failures.push(error?.message || String(error));
      }
    }
    if (/^\d+$/.test(hintedThreadId)) {
      failures.push(`ID antigo rejeitado: ${hintedThreadId}`);
    }
    throw new Error(`Não foi possível localizar a conversa real de @${username} (${failures.join("; ")}).`);
  }

  function sendChatbotViaReferenceMqtt(threadId, text, viewerId) {
    return new Promise((resolve, reject) => {
      const requestId = `flowsi-chatbot-mqtt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = window.setTimeout(() => {
        window.removeEventListener("message", onResult);
        reject(new Error("O canal MQTT não confirmou a publicação."));
      }, 12000);
      function onResult(event) {
        if (event.source !== window) return;
        const result = event.data || {};
        if (result.type !== "FLOWSI_DISPATCH_DM_RESULT" || result.request_id !== requestId) return;
        window.clearTimeout(timeout);
        window.removeEventListener("message", onResult);
        if (result.success) resolve(result);
        else reject(new Error(result.error || "O canal MQTT recusou a mensagem."));
      }
      window.addEventListener("message", onResult);
      window.postMessage({
        type: "INJECT_DISPATCH_DM_REQUEST",
        request_id: requestId,
        thread_id: threadId,
        viewer_id: viewerId,
        text,
        debug: false
      }, "*");
    });
  }

  async function sendChatbotThroughThreadUi(threadId, text, viewerId = "") {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    Object.assign(frame.style, {
      position: "fixed",
      left: "-12000px",
      top: "0",
      width: "1280px",
      height: "900px",
      opacity: "0",
      pointerEvents: "none",
      border: "0"
    });
    frame.src = `/direct/t/${encodeURIComponent(threadId)}/`;
    document.body.appendChild(frame);
    try {
      const deadline = Date.now() + 25000;
      let editor = null;
      let frameDocument = null;
      while (Date.now() < deadline && !editor) {
        await sleep(150);
        try { frameDocument = frame.contentDocument; } catch { frameDocument = null; }
        if (!frameDocument) continue;
        editor = [...frameDocument.querySelectorAll('[contenteditable="true"]')].find(element => {
          const label = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("data-lexical-editor") || ""}`;
          const rect = element.getBoundingClientRect();
          return rect.width > 120 && rect.height > 20 && /mensagem|message|true/i.test(label);
        }) || null;
      }
      if (!editor || !frameDocument) {
        throw new Error("A caixa de mensagem do Direct não ficou disponível.");
      }
      const frameWindow = frame.contentWindow;
      const normalizedText = normalize(text);
      const countVisibleMessages = () => [...frameDocument.querySelectorAll("div, span, p")]
        .filter(element => element.children.length === 0 && normalize(element.textContent) === normalizedText)
        .length;
      const beforeCount = countVisibleMessages();
      // Reuse the proven transport from the reference extension, now with the
      // real thread_id. The DOM is the authoritative delivery confirmation.
      if (viewerId) {
        try {
          await sendChatbotViaReferenceMqtt(threadId, text, viewerId);
          const mqttDeadline = Date.now() + 12000;
          while (Date.now() < mqttDeadline) {
            await sleep(200);
            if (countVisibleMessages() > beforeCount) {
              return {
                success: true,
                status: "sent",
                threadId,
                transport: "reference-mqtt-ui-verified"
              };
            }
          }
        } catch {}
      }
      editor.focus();
      let inserted = false;
      try {
        inserted = frameDocument.execCommand("insertText", false, text);
      } catch {}
      if (!inserted || normalize(editor.textContent) !== normalizedText) {
        editor.textContent = text;
        editor.dispatchEvent(new frameWindow.InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data: text
        }));
      }
      await sleep(100);
      const sendButton = [...frameDocument.querySelectorAll("button")].find(button => {
        const label = `${button.textContent || ""} ${button.getAttribute("aria-label") || ""}`.trim();
        return /^(enviar|send)$/i.test(label) && !button.disabled;
      });
      if (sendButton) sendButton.click();
      else {
        for (const type of ["keydown", "keypress", "keyup"]) {
          editor.dispatchEvent(new frameWindow.KeyboardEvent(type, {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }));
        }
      }
      const confirmationDeadline = Date.now() + 15000;
      while (Date.now() < confirmationDeadline) {
        await sleep(200);
        if (countVisibleMessages() > beforeCount && !normalize(editor.textContent)) {
          return {
            success: true,
            status: "sent",
            threadId,
            transport: "instagram-thread-ui-verified"
          };
        }
      }
      throw new Error("A mensagem não apareceu na conversa após o envio.");
    } finally {
      frame.remove();
    }
  }

  function topicListRoot() {
    const roots = [...document.querySelectorAll(
      '[aria-label="Lista de tópicos"], [aria-label="Threads list"], [aria-label="Conversation list"]'
    )];
    return roots.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).display !== "none";
    }) || roots[0] || document;
  }

  function conversationRows() {
    const root = topicListRoot();
    return [...root.querySelectorAll('button, [role="button"]')].filter(element => {
      const images = [...element.querySelectorAll("img")];
      if (!images.length) return false;
      const text = (element.innerText || element.textContent || "").trim();
      const rect = element.getBoundingClientRect();
      return Boolean(text && rect.width > 120 && rect.height > 36 && rect.height < 180);
    });
  }

  function leafTexts(row) {
    const ignored = /^(fixado|verificado|carregando\.\.\.|nova mensagem)$/i;
    const time = /^(agora|\d+\s*(s|min|m|h|d|sem)|há\s+.+)$/i;
    const values = [];
    for (const element of row.querySelectorAll("span, div")) {
      if (element.children.length > 0) continue;
      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 100 || ignored.test(text) || time.test(text)) continue;
      if (!values.includes(text)) values.push(text);
    }
    return values;
  }

  function profileAnchorUsername(row) {
    for (const anchor of row.querySelectorAll('a[href]')) {
      const pathname = (() => {
        try { return new URL(anchor.href, location.origin).pathname; } catch { return ""; }
      })();
      const match = pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      if (match && !["direct", "explore", "reels", "accounts"].includes(match[1])) return match[1];
    }
    return "";
  }

  function comparableImagePath(value) {
    if (!value) return "";
    try {
      const url = new URL(value, location.origin);
      return decodeURIComponent(url.pathname)
        .replace(/\/s\d+x\d+\//g, "/")
        .replace(/\/p\d+x\d+\//g, "/");
    } catch {
      return "";
    }
  }

  async function waitFor(getValue, timeout = 7000) {
    const started = Date.now();
    let value = getValue();
    while (!value && Date.now() - started < timeout) {
      await sleep(150);
      value = getValue();
    }
    return value;
  }

  const hiddenSearchCache = new Map();

  function searchUsers(payload) {
    const users = [];
    const queue = [{ value: payload, depth: 0 }];
    const seen = new WeakSet();
    while (queue.length && users.length < 50) {
      const { value, depth } = queue.shift();
      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (seen.has(value)) continue;
      seen.add(value);
      if (isUsername(value.username)) users.push(value);
      if (depth >= 5) continue;
      if (Array.isArray(value)) {
        for (const child of value) queue.push({ value: child, depth: depth + 1 });
        continue;
      }
      for (const key of ["user", "users", "results", "items", "data"]) {
        if (value[key]) queue.push({ value: value[key], depth: depth + 1 });
      }
    }
    return users;
  }

  function bestUserMatch(users, displayName, profileImage) {
    const wantedName = normalize(displayName);
    const wantedImage = comparableImagePath(profileImage);
    const matches = users.map(user => {
      const image = user.profile_pic_url || user.profile_pic_url_hd || "";
      const imagePath = comparableImagePath(image);
      let score = 0;
      if (wantedImage && imagePath) score += imagePath === wantedImage ? 500 : -250;
      if (wantedName && normalize(user.full_name) === wantedName) score += 180;
      else if (wantedName && normalize(user.full_name).includes(wantedName)) score += 120;
      if (normalize(user.username) === wantedName.replace(/\s+/g, "")) score += 100;
      return { ...user, score };
    }).filter(user => user.score > 0);
    matches.sort((left, right) => right.score - left.score);
    return matches[0]?.score >= 100 ? matches[0] : null;
  }

  function knownContactMatch(knownContacts, displayName, profileImage) {
    const wantedName = normalize(displayName);
    const wantedImage = comparableImagePath(profileImage);
    const matches = (Array.isArray(knownContacts) ? knownContacts : []).map(contact => {
      const imagePath = comparableImagePath(contact.profileImage);
      let score = 0;
      if (wantedImage && imagePath) score += imagePath === wantedImage ? 500 : -250;
      if (wantedName && normalize(contact.name) === wantedName) score += 180;
      if (normalize(contact.username) === wantedName.replace(/\s+/g, "")) score += 100;
      return { ...contact, score };
    }).filter(contact => isUsername(contact.username) && contact.score > 0);
    matches.sort((left, right) => right.score - left.score);
    return matches[0]?.score >= 100 ? matches[0] : null;
  }

  async function resolveUserSilently(displayName, profileImage, isActive) {
    if (!displayName || !isActive()) return null;
    const cacheKey = `${normalize(displayName)}|${comparableImagePath(profileImage)}`;
    if (hiddenSearchCache.has(cacheKey)) return hiddenSearchCache.get(cacheKey);

    const query = encodeURIComponent(displayName);
    const endpoints = [
      `/web/search/topsearch/?query=${query}`,
      `/api/v1/web/search/topsearch/?context=blended&query=${query}&include_reel=true`
    ];
    const csrfToken = document.cookie.split(";").map(value => value.trim())
      .find(value => value.startsWith("csrftoken="))?.slice("csrftoken=".length) || "";
    let match = null;
    for (const endpoint of endpoints) {
      if (!isActive()) break;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(endpoint, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            accept: "*/*",
            "x-ig-app-id": "936619743392459",
            "x-csrftoken": csrfToken,
            "x-requested-with": "XMLHttpRequest"
          }
        });
        if (!response.ok) continue;
        if (!isActive()) return null;
        match = bestUserMatch(searchUsers(await response.json()), displayName, profileImage);
        if (match) break;
      } catch {}
      finally { clearTimeout(timeout); }
    }
    if (!isActive()) return null;
    hiddenSearchCache.set(cacheKey, match);
    return match;
  }

  function reactRoots(row) {
    const roots = [];
    let element = row;
    for (let level = 0; element && level < 6; level += 1, element = element.parentElement) {
      for (const key of Reflect.ownKeys(element)) {
        if (typeof key === "string" && (key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"))) {
          roots.push(element[key]);
        }
      }
    }
    return roots;
  }

  function inspectReactData(row, displayName, profileImage) {
    const queue = reactRoots(row).map(value => ({ value, depth: 0, threadId: "" }));
    const seen = new WeakSet();
    const candidates = [];
    let visited = 0;

    while (queue.length && visited < 3000) {
      const current = queue.shift();
      const value = current.value;
      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (value instanceof Node || seen.has(value)) continue;
      seen.add(value);
      visited += 1;

      const localThreadId = String(
        value.thread_id || value.threadId || value.thread?.thread_id || current.threadId || ""
      );
      const username = value.username || value.user_name || value.userName || "";
      if (isUsername(username)) {
        const fullName = value.full_name || value.fullName || value.name || "";
        const image = value.profile_pic_url || value.profilePicUrl || value.profile_picture?.uri || "";
        const messageId = value.interop_messaging_user_fbid || value.eimu_id || value.pk || value.id || "";
        let score = 1;
        if (fullName && normalize(fullName) === normalize(displayName)) score += 20;
        else if (fullName && normalize(row.innerText).includes(normalize(fullName))) score += 10;
        if (image && profileImage && (image === profileImage || profileImage.includes(image.split("?")[0]))) score += 8;
        if (localThreadId) score += 3;
        candidates.push({
          username: String(username),
          fullName: String(fullName || ""),
          profileImage: String(image || ""),
          messageId: String(messageId || ""),
          threadId: localThreadId,
          score
        });
      }

      if (current.depth >= 9) continue;
      let entries = [];
      try { entries = Object.entries(value); } catch { continue; }
      for (const [key, child] of entries) {
        if (key === "stateNode" || key === "_owner" || key === "return") continue;
        if (!child || (typeof child !== "object" && typeof child !== "function")) continue;
        queue.push({ value: child, depth: current.depth + 1, threadId: localThreadId });
      }

      if (value.return && current.depth < 5) {
        queue.push({ value: value.return, depth: current.depth + 1, threadId: localThreadId });
      }
      if (value.memoizedProps) queue.push({ value: value.memoizedProps, depth: current.depth + 1, threadId: localThreadId });
      if (value.pendingProps) queue.push({ value: value.pendingProps, depth: current.depth + 1, threadId: localThreadId });
    }

    candidates.sort((left, right) => right.score - left.score);
    return candidates[0] || null;
  }

  async function rowToContact(row, index, knownContacts, isActive) {
    const texts = leafTexts(row);
    const displayName = texts[0] || "";
    const images = [...row.querySelectorAll("img")];
    const image = images.find(item =>
      /(user-profile-picture|profile picture|foto do perfil)/i.test(item.alt || "")
    ) || images[0];
    const profileImage = image?.currentSrc || image?.src || "";
    const reactData = inspectReactData(row, displayName, profileImage);
    const anchorUsername = profileAnchorUsername(row);
    const knownContact = reactData?.username || anchorUsername
      ? null
      : knownContactMatch(knownContacts, displayName, profileImage);
    const searchUser = reactData?.username || anchorUsername || knownContact?.username
      ? null
      : await resolveUserSilently(displayName, profileImage, isActive).catch(() => null);
    const username = reactData?.username || anchorUsername || knownContact?.username || searchUser?.username;
    if (!isUsername(username)) return null;

    const messageId = reactData?.messageId || reactData?.threadId ||
      knownContact?.messageId || searchUser?.interop_messaging_user_fbid ||
      searchUser?.eimu_id || searchUser?.pk || `dom-${username}`;
    return {
      id: reactData?.threadId || knownContact?.id || `dom-${username}-${index}`,
      threadId: reactData?.threadId || knownContact?.threadId || (/^\d{10,}$/.test(String(knownContact?.id || "")) ? String(knownContact.id) : ""),
      name: displayName || reactData?.fullName || knownContact?.name || searchUser?.full_name || username,
      profileImage: reactData?.profileImage || knownContact?.profileImage ||
        searchUser?.profile_pic_url || profileImage,
      username,
      messageId
    };
  }

  async function resolveUserFromConversationRow(row, index, isActive) {
    if (!row || !isActive()) return null;
    const texts = leafTexts(row);
    const displayName = texts[0] || "";
    const images = [...row.querySelectorAll("img")];
    const image = images.find(item =>
      /(user-profile-picture|profile picture|foto do perfil)/i.test(item.alt || "")
    ) || images[0];
    const profileImage = image?.currentSrc || image?.src || "";
    const accountUsername = normalize(currentAccountUsername());
    const previousPath = location.pathname;
    row.click();

    const started = Date.now();
    while (isActive() && Date.now() - started < 2500) {
      await sleep(100);
      if (location.pathname === previousPath || !/^\/direct\/t\//.test(location.pathname)) continue;
      const candidates = [...document.querySelectorAll('a[href]')]
        .filter(anchor => !anchor.closest('[aria-label="Lista de tópicos"], [aria-label="Threads list"], [aria-label="Conversation list"]'))
        .map(anchor => {
          let username = "";
          try {
            const match = new URL(anchor.href, location.origin).pathname
              .match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
            username = match?.[1] || "";
          } catch {}
          const rect = anchor.getBoundingClientRect();
          return { anchor, username, rect };
        })
        .filter(candidate =>
          isUsername(candidate.username) &&
          normalize(candidate.username) !== accountUsername &&
          candidate.rect.width > 0 &&
          candidate.rect.height > 0 &&
          candidate.rect.top >= 0 &&
          candidate.rect.top < 140 &&
          candidate.rect.left > 280
        );
      const candidate = candidates[0];
      if (!candidate) continue;
      const threadId = location.pathname.match(/^\/direct\/t\/(\d+)/)?.[1] || "";
      return {
        id: threadId || `dom-${candidate.username}-${index}`,
        threadId,
        name: displayName || candidate.username,
        full_name: displayName || candidate.username,
        profileImage,
        profile_pic_url: profileImage,
        username: candidate.username,
        messageId: `dom-${candidate.username}`,
        source: "inbox-dom-conversation",
        previousPath
      };
    }
    return null;
  }

  function findScroller(rows) {
    if (!rows.length) return null;
    const root = topicListRoot();
    let element = rows[0].parentElement;
    while (element && element !== document.body) {
      const style = getComputedStyle(element);
      if (element.scrollHeight > element.clientHeight + 20 && /(auto|scroll)/.test(style.overflowY)) return element;
      element = element.parentElement;
    }
    return root !== document && root.scrollHeight > root.clientHeight + 20 ? root : null;
  }

  async function waitForRows(timeout = 7000) {
    const started = Date.now();
    let rows = conversationRows();
    while (!rows.length && Date.now() - started < timeout) {
      await sleep(250);
      rows = conversationRows();
    }
    return rows;
  }

  function rowIdentity(row) {
    const images = [...row.querySelectorAll("img")];
    const image = images.find(item =>
      /(user-profile-picture|profile picture|foto do perfil)/i.test(item.alt || "")
    ) || images[0];
    return `${normalize(row.innerText)}|${comparableImagePath(image?.currentSrc || image?.src || "")}`;
  }

  async function resetConversationScroller(rows, isActive) {
    const scroller = findScroller(rows);
    if (!scroller || scroller.scrollTop <= 2 || !isActive()) return;
    scroller.scrollTo({ top: 0, behavior: "auto" });
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    const started = Date.now();
    while (isActive() && Date.now() - started < 4000 && scroller.scrollTop > 2) {
      await sleep(150);
    }
    await sleep(250);
  }

  async function advanceConversationScroller(rows, isActive) {
    const scroller = findScroller(rows);
    if (!scroller || !isActive()) return { moved: false, atEnd: true };

    const beforeTop = scroller.scrollTop;
    const beforeHeight = scroller.scrollHeight;
    const beforeSignature = rowsSignature(rows);
    const beforeAtEnd = beforeTop + scroller.clientHeight >= beforeHeight - 4;
    const step = Math.max(Math.floor(scroller.clientHeight * 0.82), 320);
    const targetTop = Math.min(beforeHeight, beforeTop + step);

    scroller.scrollTo({ top: targetTop, behavior: "auto" });
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));

    const started = Date.now();
    let changed = false;
    const waitLimit = beforeAtEnd ? 9000 : 3500;
    while (isActive() && Date.now() - started < waitLimit) {
      await sleep(200);
      const currentRows = conversationRows();
      const signatureChanged = rowsSignature(currentRows) !== beforeSignature;
      const heightChanged = scroller.scrollHeight > beforeHeight + 2;
      const positionChanged = Math.abs(scroller.scrollTop - beforeTop) > 2;
      changed = signatureChanged || heightChanged || positionChanged;
      if (signatureChanged || heightChanged) {
        await sleep(350);
        break;
      }
    }

    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
    return { moved: changed, atEnd };
  }

  let scrapeGeneration = 0;

  function inboxFolderTabs() {
    const wanted = new Set([
      "principal", "primary", "geral", "general",
      "pedidos", "requests", "solicitacoes", "message requests"
    ]);
    const root = document.querySelector('main[role="main"]') || document;
    const found = new Set();
    return [...root.querySelectorAll('[role="tab"], button, a')].filter(element => {
      const label = normalize(element.textContent);
      if (!wanted.has(label) || found.has(label)) return false;
      found.add(label);
      return true;
    });
  }

  function isFolderTabSelected(tab) {
    if (!tab) return false;
    return tab.getAttribute("aria-selected") === "true" ||
      tab.getAttribute("aria-current") === "page" ||
      tab.getAttribute("data-state") === "active";
  }

  function rowsSignature(rows) {
    return rows.slice(0, 6).map(row => normalize(row.innerText)).join("|");
  }

  async function activateInboxFolder(tab, isActive) {
    if (!tab || !isActive() || isFolderTabSelected(tab)) return;
    const previousSignature = rowsSignature(conversationRows());
    tab.click();
    await sleep(650);
    const started = Date.now();
    while (isActive() && Date.now() - started < 8000) {
      await sleep(200);
      const rows = conversationRows();
      if (rowsSignature(rows) !== previousSignature) {
        await sleep(350);
        return;
      }
    }
    await sleep(350);
  }

  async function scrape(loadMore, knownContacts, cursors, generation, apiOnly = false) {
    const isActive = () => generation === scrapeGeneration;

    // API-first: unlike the virtualized DOM, this follows every oldest_cursor
    // and therefore imports conversations that have never been rendered onscreen.
    const apiResult = await scrapeInboxApi(isActive, cursors, loadMore);
    const apiDiagnostics = {
      count: apiResult.contacts.length,
      successfulSources: apiResult.successfulSources,
      diagnostics: apiResult.diagnostics
    };
    document.documentElement.setAttribute("data-flowsi-inbox-diagnostics", JSON.stringify({
      phase: "api",
      ...apiDiagnostics
    }));
    console.info("[FLOWSI][inbox-api]", JSON.stringify(apiDiagnostics));
    // Opening the Kanban prefers the background API because it does not touch
    // the visible inbox. Instagram may reject one or both folders (currently
    // returning 404 for Primary and General). In that case, do not accept an
    // empty result: continue into the DOM fallback below and read the folders
    // that are already available behind the Kanban.
    if (apiOnly && apiResult.successfulSources >= 2) {
      const folderCounts = new Map();
      const contacts = apiResult.contacts.filter(contact => {
        const folder = contact.inboxFolder || "current";
        const count = folderCounts.get(folder) || 0;
        if (count >= INBOX_CONTACT_LIMIT_PER_FOLDER) return false;
        folderCounts.set(folder, count + 1);
        return true;
      });
      return {
        contacts,
        accountUsername: currentAccountUsername(),
        visibleRows: 0,
        skippedRows: 0,
        hasMore: apiResult.hasMore,
        nextCursors: apiResult.nextCursors,
        cancelled: !isActive(),
        apiOnly: true,
        source: "inbox-api-background",
        diagnostics: apiResult.diagnostics
      };
    }
    const initialFolderTabs = inboxFolderTabs();
    const originalTabLabel = normalize(initialFolderTabs.find(isFolderTabSelected)?.textContent || "");
    const labelToSource = label => {
      if (["principal", "primary"].includes(label)) return "primary";
      if (["geral", "general"].includes(label)) return "general";
      if (["pedidos", "requests", "solicitacoes", "message requests"].includes(label)) return "requests";
      return "";
    };
    const sourcesNeedingDom = new Set(apiResult.diagnostics
      .filter(item => item.error || item.count === 0)
      .map(item => item.source));
    const targetLabels = initialFolderTabs.length
      ? initialFolderTabs
        .map(tab => normalize(tab.textContent))
        .filter(label => label && sourcesNeedingDom.has(labelToSource(label)))
      : sourcesNeedingDom.size ? [""] : [];
    // A resposta de uma caixa não significa que as outras foram carregadas. A API
    // é usada como base e as três abas visíveis complementam o resultado, inclusive
    // quando apenas Primary responde ou quando Pedidos muda para outra rota.
    const contacts = new Map(apiResult.contacts.map(contact => [
      normalize(contact.username),
      contact
    ]));
    const knownForDom = [
      ...(Array.isArray(knownContacts) ? knownContacts : []),
      ...apiResult.contacts
    ];
    const knownDomKeys = new Set(knownForDom
      .map(contact => normalize(contact?.username))
      .filter(Boolean));
    let visibleRows = 0;
    let skippedRows = 0;
    let cancelled = !isActive();
    let hasMore = apiResult.hasMore;

    for (const folderLabel of targetLabels) {
      if (cancelled) break;
      const folderSource = labelToSource(folderLabel) || "current";
      const folderContacts = new Set([...contacts.values()]
        .filter(contact => contact.inboxFolder === folderSource)
        .map(contact => normalize(contact.username)));
      const newFolderContacts = new Set([...folderContacts]
        .filter(key => !knownDomKeys.has(key)));
      const folderTab = folderLabel
        ? inboxFolderTabs().find(tab => normalize(tab.textContent) === folderLabel)
        : null;
      await activateInboxFolder(folderTab, isActive);
      let rows = await waitForRows(12000);
      await resetConversationScroller(rows, isActive);

      const seenRows = new Set();
      let stableEndPasses = 0;
      let pass = 0;
      const maximumPasses = loadMore ? 12 : 3;

      while (
        isActive() &&
        pass < maximumPasses &&
        (loadMore
          ? newFolderContacts.size < INBOX_CONTACT_LIMIT_PER_FOLDER
          : seenRows.size < INBOX_CONTACT_LIMIT_PER_FOLDER)
      ) {
        rows = await waitForRows(3000);
        const batch = [];
        for (let index = 0; index < rows.length && isActive(); index += 1) {
          const identity = rowIdentity(rows[index]);
          if (seenRows.has(identity)) continue;
          seenRows.add(identity);
          visibleRows += 1;
          batch.push({ row: rows[index], index });
          if (!loadMore && seenRows.size >= INBOX_CONTACT_LIMIT_PER_FOLDER) break;
        }
        const newRowsInPass = batch.length;
        const resolvedContacts = await Promise.all(
          batch.map(item => rowToContact(item.row, item.index, knownForDom, isActive)
            .catch(() => null))
        );
        for (let resultIndex = 0; resultIndex < resolvedContacts.length; resultIndex += 1) {
          let contact = resolvedContacts[resultIndex];
          if (!contact && isActive()) {
            const expectedIdentity = rowIdentity(batch[resultIndex].row);
            const freshRow = conversationRows().find(candidate =>
              rowIdentity(candidate) === expectedIdentity
            ) || batch[resultIndex].row;
            contact = await resolveUserFromConversationRow(
              freshRow,
              batch[resultIndex].index,
              isActive
            ).catch(() => null);
          }
          if (contact) {
            const key = normalize(contact.username);
            contacts.set(key, {
              ...(contacts.get(key) || {}),
              ...contact,
              inboxFolder: folderSource,
              source: "inbox-api+dom"
            });
            folderContacts.add(key);
            if (!knownDomKeys.has(key)) newFolderContacts.add(key);
          }
          else skippedRows += 1;
          document.documentElement.setAttribute("data-flowsi-inbox-diagnostics", JSON.stringify({
            phase: "dom-folder",
            folder: folderSource,
            rows: seenRows.size,
            processed: resultIndex + 1,
            contacts: folderContacts.size,
            visibleRows,
            skippedRows
          }));
        }

        cancelled = !isActive();
        if (cancelled) break;
        if (
          loadMore
            ? newFolderContacts.size >= INBOX_CONTACT_LIMIT_PER_FOLDER
            : seenRows.size >= INBOX_CONTACT_LIMIT_PER_FOLDER
        ) break;
        if (pass + 1 >= maximumPasses) break;

        const scrollResult = await advanceConversationScroller(rows, isActive);
        if (scrollResult.atEnd && !scrollResult.moved && newRowsInPass === 0) stableEndPasses += 1;
        else stableEndPasses = 0;

        if (stableEndPasses >= 2) break;
        pass += 1;
      }

      // A leitura visual inicial usa as primeiras 20 linhas. Ao carregar mais,
      // ela avança silenciosamente até encontrar 20 usuários que ainda não
      // existem no Kanban. Ao terminar, devolve a caixa ao topo.
      rows = conversationRows();
      await resetConversationScroller(rows, isActive);
      document.documentElement.setAttribute("data-flowsi-inbox-diagnostics", JSON.stringify({
        phase: "dom-folder",
        folder: folderSource,
        rows: seenRows.size,
        contacts: folderContacts.size,
        visibleRows,
        skippedRows
      }));
    }

    if (originalTabLabel && isActive()) {
      const originalTab = inboxFolderTabs().find(tab => normalize(tab.textContent) === originalTabLabel);
      if (originalTab && !isFolderTabSelected(originalTab)) {
        await activateInboxFolder(originalTab, isActive);
      }
      const originalRows = await waitForRows(5000);
      await resetConversationScroller(originalRows, isActive);
    }
    if (isActive() && location.pathname !== "/direct/inbox/") {
      history.pushState(null, "", "/direct/inbox/");
      dispatchEvent(new PopStateEvent("popstate", { state: null }));
      await sleep(350);
    }

    const folderCounts = new Map();
    const unique = [...contacts.values()].filter(contact => {
      const folder = contact.inboxFolder || "current";
      const count = folderCounts.get(folder) || 0;
      if (count >= INBOX_CONTACT_LIMIT_PER_FOLDER) return false;
      folderCounts.set(folder, count + 1);
      return true;
    });
    const domDiagnostics = {
      count: unique.length,
      visibleRows,
      skippedRows,
      cancelled,
      apiDiagnostics: apiResult.diagnostics
    };
    document.documentElement.setAttribute("data-flowsi-inbox-diagnostics", JSON.stringify({
      phase: "dom",
      ...domDiagnostics
    }));
    console.info("[FLOWSI][inbox-dom]", JSON.stringify(domDiagnostics));
    return {
      contacts: unique,
      accountUsername: currentAccountUsername(),
      visibleRows,
      skippedRows,
      hasMore: cancelled ? false : hasMore,
      nextCursors: apiResult.nextCursors,
      cancelled,
      source: "inbox-api+dom",
      diagnostics: apiResult.diagnostics
    };
  }

  async function readProfileRelationship(username, knownProfileId) {
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-csrftoken": csrfToken(),
      "x-requested-with": "XMLHttpRequest"
    };
    let profileId = /^\d+$/.test(String(knownProfileId || ""))
      ? String(knownProfileId)
      : "";
    let negativeFound = false;
    const inspect = value => {
      if (!value || typeof value !== "object") return null;
      if (value.followed_by === true || value.follows_viewer === true) return true;
      if (value.followed_by === false || value.follows_viewer === false) return false;
      return null;
    };
    const inspectAll = values => {
      for (const value of values) {
        const result = inspect(value);
        if (result === true) return true;
        if (result === false) negativeFound = true;
      }
      return null;
    };

    if (!profileId && USERNAME_PATTERN.test(String(username || ""))) {
      try {
        const response = await fetch(
          `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
          { credentials: "include", cache: "no-store", headers }
        );
        if (response.ok) {
          const payload = await response.json();
          const user = payload?.data?.user || payload?.user;
          profileId = String(user?.id || user?.pk || "");
          const positive = inspectAll([
            user?.friendship_status,
            payload?.friendship_status,
            user
          ]);
          if (positive === true) return true;
        }
      } catch (_) {}
    }

    if (/^\d+$/.test(profileId)) {
      for (const url of [
        `/api/v1/friendships/show/${profileId}/`,
        `https://i.instagram.com/api/v1/friendships/show/${profileId}/`
      ]) {
        try {
          const response = await fetch(url, {
            credentials: "include",
            cache: "no-store",
            headers
          });
          if (!response.ok) continue;
          const payload = await response.json();
          const positive = inspectAll([
            payload?.friendship_status,
            payload?.data?.friendship_status,
            payload?.data?.user?.friendship_status,
            payload?.data,
            payload
          ]);
          if (positive === true) return true;
        } catch (_) {}
      }
    }
    return negativeFound ? false : null;
  }

  async function readProfileFollowing(username, knownProfileId) {
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-csrftoken": csrfToken(),
      "x-requested-with": "XMLHttpRequest"
    };
    let profileId = /^\d+$/.test(String(knownProfileId || ""))
      ? String(knownProfileId)
      : "";
    const readCount = payload => {
      const user = payload?.data?.user || payload?.user || payload?.data;
      for (const candidate of [
        user?.edge_follow?.count,
        user?.following_count,
        user?.following
      ]) {
        if (candidate === undefined || candidate === null || typeof candidate === "boolean") continue;
        const count = Number(candidate);
        if (Number.isFinite(count) && count > 0) return count;
      }
      return null;
    };
    const request = async url => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const returnedUser = payload?.data?.user || payload?.user || payload?.data;
        const returnedUsername = normalize(returnedUser?.username).replace(/^@+/, "");
        if (returnedUsername && returnedUsername !== normalize(username).replace(/^@+/, "")) {
          throw new Error("O Instagram retornou outro perfil");
        }
        const count = readCount(payload);
        return { count, payload };
      } finally {
        clearTimeout(timeout);
      }
    };

    const findExactUser = payload => {
      const target = normalize(username).replace(/^@+/, "");
      const queue = [payload];
      const visited = new Set();
      let inspected = 0;
      while (queue.length && inspected < 5000) {
        const current = queue.shift();
        if (!current || typeof current !== "object" || visited.has(current)) continue;
        visited.add(current);
        inspected += 1;
        const candidate = current.user && typeof current.user === "object"
          ? current.user
          : current;
        if (normalize(candidate?.username).replace(/^@+/, "") === target) return candidate;
        if (Array.isArray(current)) {
          queue.push(...current);
        } else {
          queue.push(...Object.values(current).filter(value => value && typeof value === "object"));
        }
      }
      return null;
    };

    const resolveProfileIdBySearch = async () => {
      const encoded = encodeURIComponent(username);
      const results = await Promise.allSettled([
        request(`/api/v1/web/search/topsearch/?context=blended&query=${encoded}&include_reel=true`),
        request(`/web/search/topsearch/?query=${encoded}`)
      ]);
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const user = findExactUser(result.value.payload);
        const id = String(user?.pk || user?.id || "");
        if (/^\d+$/.test(id)) return id;
      }
      return "";
    };

    const requests = [];
    if (profileId) {
      requests.push(
        request(`/api/v1/users/${profileId}/info/`),
        request(`https://i.instagram.com/api/v1/users/${profileId}/info/`)
      );
    }
    requests.push(
      request(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`)
    );
    const results = await Promise.allSettled(requests);
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      if (Number.isFinite(result.value.count) && result.value.count > 0) return result.value.count;
      const user = result.value.payload?.data?.user || result.value.payload?.user;
      if (!profileId) profileId = String(user?.id || user?.pk || "");
    }


    if (!/^\d+$/.test(profileId)) {
      profileId = await resolveProfileIdBySearch();
    }

    if (/^\d+$/.test(profileId)) {
      const infoResults = await Promise.allSettled([
        request(`/api/v1/users/${profileId}/info/`),
        request(`https://i.instagram.com/api/v1/users/${profileId}/info/`)
      ]);
      for (const result of infoResults) {
        if (result.status === "fulfilled" && Number.isFinite(result.value.count) && result.value.count > 0) {
          return result.value.count;
        }
      }
    }
    return null;
  }

  window.addEventListener("message", event => {
    if (event.source !== window) return;
    if (event.data?.source === CHATBOT_INBOX_REQUEST_SOURCE) {
      const { requestId } = event.data;
      readChatbotInbox()
        .then(result => window.postMessage({
          source: CHATBOT_INBOX_RESPONSE_SOURCE,
          requestId,
          success: true,
          result
        }, "*"))
        .catch(error => window.postMessage({
          source: CHATBOT_INBOX_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao ler o inbox do chatbot."
        }, "*"));
      return;
    }
    if (event.data?.source === CHATBOT_SEND_REQUEST_SOURCE) {
      const { requestId, username, message, threadId } = event.data;
      sendChatbotDirect(username, message, threadId)
        .then(result => window.postMessage({
          source: CHATBOT_SEND_RESPONSE_SOURCE,
          requestId,
          success: true,
          result
        }, "*"))
        .catch(error => window.postMessage({
          source: CHATBOT_SEND_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao enviar a mensagem do chatbot."
        }, "*"));
      return;
    }
    if (event.data?.source === FOLLOWING_REQUEST_SOURCE) {
      const { requestId, username, profileId } = event.data;
      readProfileFollowing(username, profileId)
        .then(following => window.postMessage({
          source: FOLLOWING_RESPONSE_SOURCE,
          requestId,
          success: Number.isFinite(following),
          following
        }, "*"))
        .catch(error => window.postMessage({
          source: FOLLOWING_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao consultar Seguindo."
        }, "*"));
      return;
    }
    if (event.data?.source === RELATIONSHIP_REQUEST_SOURCE) {
      const { requestId, username, profileId } = event.data;
      readProfileRelationship(username, profileId)
        .then(followsYou => window.postMessage({
          source: RELATIONSHIP_RESPONSE_SOURCE,
          requestId,
          success: typeof followsYou === "boolean",
          followsYou
        }, "*"))
        .catch(error => window.postMessage({
          source: RELATIONSHIP_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao consultar o relacionamento."
        }, "*"));
      return;
    }
    if (event.data?.source !== REQUEST_SOURCE) return;
    const { requestId, loadMore, knownContacts, cursors, apiOnly } = event.data;
    const generation = ++scrapeGeneration;
    scrape(Boolean(loadMore), knownContacts, cursors || {}, generation, Boolean(apiOnly))
      .then(result => window.postMessage({ source: RESPONSE_SOURCE, requestId, success: true, result }, "*"))
      .catch(error => window.postMessage({
        source: RESPONSE_SOURCE,
        requestId,
        success: false,
        error: error?.message || "Falha ao ler as conversas da página."
      }, "*"));
  });
})();
