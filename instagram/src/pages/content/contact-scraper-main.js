(() => {
  const SCRAPER_VERSION = "2026.10.29.38";
  if (window.__flowsiContactScraperVersion === SCRAPER_VERSION) return;
  window.__flowsiContactScraperVersion = SCRAPER_VERSION;
  window.__flowsiContactScraperInstalled = true;
  document.getElementById("flowsi-contact-scraper-marker")?.remove();
  const scraperMarker = document.createElement("meta");
  scraperMarker.id = "flowsi-contact-scraper-marker";
  scraperMarker.setAttribute("data-version", SCRAPER_VERSION);
  document.documentElement.appendChild(scraperMarker);

  const REQUEST_SOURCE = "flowsi-contact-loader";
  const RESPONSE_SOURCE = "flowsi-contact-scraper";
  const RELATIONSHIP_REQUEST_SOURCE = "flowsi-profile-relationship-request";
  const RELATIONSHIP_RESPONSE_SOURCE = "flowsi-profile-relationship-response";
  const FOLLOWING_REQUEST_SOURCE = "flowsi-profile-following-request";
  const FOLLOWING_RESPONSE_SOURCE = "flowsi-profile-following-response";
  // These page-bridge channels are versioned so a MAIN-world listener left
  // behind by an unpacked-extension reload cannot answer before the new code
  // (or send the same automatic reply a second time).
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
  const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
  const INBOX_CONTACT_LIMIT_PER_FOLDER = 20;
  const CHATBOT_INBOX_FRAME_IDLE_MS = 60 * 1000;
  const CHATBOT_REALTIME_EVENT_TTL_MS = 10 * 60 * 1000;
  const CHATBOT_FLOATING_INBOX_AUTO_OPEN = false;
  const CHATBOT_GRAPHQL_TABS_DOC_ID = "27647971824866335";
  const CHATBOT_GRAPHQL_THREADS_DOC_ID = "28415566141432177";
  const CHATBOT_GRAPHQL_THREAD_DETAIL_DOC_ID = "29432273173041378";
  const CHATBOT_REALTIME_TOAST_ITEM_SIGNATURE_TTL_MS = CHATBOT_REALTIME_EVENT_TTL_MS;
  const CHATBOT_REALTIME_TOAST_FALLBACK_SIGNATURE_TTL_MS = 2 * 1000;
  const chatbotThreadCache = new Map();
  const chatbotRealtimeThreads = new Map();
  const chatbotRealtimeToastSignatures = new Map();
  const capturedChatbotToastElements = new WeakSet();
  let chatbotInboxFrame = null;
  let chatbotInboxFrameCleanupTimer = null;
  let chatbotInboxFrameObserver = null;
  let chatbotInboxFrameObservedDocument = null;
  let chatbotInboxFrameScanTimer = null;
  let chatbotInboxFrameScanInFlight = false;
  let chatbotInboxFrameScanPending = false;
  let chatbotInboxBridgeInstallPromise = null;
  let chatbotGraphqlViewerFbid = "";
  let chatbotGraphqlViewerAccount = "";
  let chatbotGraphqlViewerPromise = null;
  const chatbotGraphqlActivityByThread = new Map();
  const chatbotGraphqlBaselineFolders = new Set();
  const chatbotInboxFrameSeenItems = new Set();
  let chatbotRealtimeObserver = null;
  const chatbotFloatingDomSeenTokens = new Map();
  let chatbotFloatingInboxAutomationTimer = null;
  let chatbotFloatingInboxAutomationInterval = null;
  let chatbotFloatingInboxAutomationInFlight = false;
  let chatbotFloatingInboxAutomationPending = false;
  let chatbotFloatingDomTokenSequence = 0;
  let chatbotFloatingInboxBadgeActive = false;
  let chatbotFloatingInboxBatchSequence = 0;
  const chatbotFloatingInboxConsumedBatches = new Set();

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
      // A floating conversation header uses labels such as "Open the profile
      // page of @contact". It is the contact, not the signed-in account. Keep
      // this fallback restricted to the actual sidebar Profile control.
      return /^(perfil|profile)$/i.test(label.trim());
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

  function parseInstagramJsonText(text) {
    const source = String(text || "");
    let output = "";
    let last = 0;
    let inString = false;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (inString) {
        if (character === "\\") index += 1;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if ((character >= "0" && character <= "9") || character === "-") {
        let end = index + 1;
        while (end < source.length && /[0-9.eE+-]/.test(source[end])) end += 1;
        const number = source.slice(index, end);
        if (/^-?\d{16,}$/.test(number)) {
          output += `${source.slice(last, index)}"${number}"`;
          last = end;
        }
        index = end - 1;
      }
    }
    return JSON.parse(output + source.slice(last));
  }

  async function readInstagramJson(response) {
    if (typeof response?.text === "function") {
      const text = await response.text();
      if (String(text || "").trim()) return parseInstagramJsonText(text);
    }
    return response?.json?.() || {};
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
        const payload = await readInstagramJson(response);
        const inbox = payload?.inbox;
        const validInbox = Boolean(
          inbox &&
          typeof inbox === "object" &&
          !Array.isArray(inbox) &&
          Array.isArray(inbox.threads) &&
          normalize(payload?.status) !== "fail"
        );
        if (!validInbox) {
          failures.push(
            `${new URL(endpoint, location.origin).host}:payload de inbox inválido` +
            (payload?.status ? ` (status ${payload.status})` : "")
          );
          continue;
        }
        return inbox.threads;
      } catch (error) {
        failures.push(`${new URL(endpoint, location.origin).host}:${error?.message || "falha"}`);
      }
    }
    throw new Error(`Falha ao ler Direct ${folder} (${failures.join(", ") || "sem resposta"}).`);
  }

  async function fetchChatbotUnifiedInbox() {
    const query = new URLSearchParams({
      persistentBadging: "true",
      use_unified_inbox: "true",
      thread_message_limit: "20",
      limit: "20"
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
        const payload = await readInstagramJson(response);
        const inbox = payload?.inbox;
        const validInbox = Boolean(
          inbox &&
          typeof inbox === "object" &&
          !Array.isArray(inbox) &&
          Array.isArray(inbox.threads) &&
          normalize(payload?.status) !== "fail"
        );
        if (!validInbox) {
          failures.push(
            `${new URL(endpoint, location.origin).host}:payload de inbox inválido` +
            (payload?.status ? ` (status ${payload.status})` : "")
          );
          continue;
        }
        return inbox.threads;
      } catch (error) {
        failures.push(`${new URL(endpoint, location.origin).host}:${error?.message || "falha"}`);
      }
    }
    throw new Error(`Falha ao ler Direct unificado (${failures.join(", ") || "sem resposta"}).`);
  }

  function collectInstagramNotifications(payload) {
    const notifications = [];
    const visited = new WeakSet();
    const visit = (value, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 8 || notifications.length >= 300) return;
      if (visited.has(value)) return;
      visited.add(value);
      if (Array.isArray(value)) {
        for (const item of value) visit(item, depth + 1);
        return;
      }
      const args = value.args && typeof value.args === "object" ? value.args : null;
      const hasNotificationType = Boolean(
        value.notif_name || value.notification_type || value.type || args?.notif_name || args?.type
      );
      const hasNotificationActor = Boolean(
        args?.profile_name || args?.username || args?.user || value.user || value.actor || value.profile
      );
      if (hasNotificationType && (args || hasNotificationActor)) notifications.push(value);
      for (const nested of Object.values(value)) visit(nested, depth + 1);
    };
    visit(payload);
    return [...new Map(notifications.map((notification, index) => {
      const args = notification?.args || {};
      const key = String(
        notification?.pk || notification?.id || args?.id || args?.profile_id ||
        `${notification?.notif_name || notification?.type || "notification"}:${args?.profile_name || args?.username || index}:${args?.timestamp || ""}`
      );
      return [key, notification];
    })).values()];
  }

  async function fetchChatbotNotifications() {
    const requestOptions = {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "*/*",
        "x-ig-app-id": "936619743392459",
        "x-asbd-id": "129477",
        "x-instagram-ajax": "1",
        "x-csrftoken": csrfToken(),
        "x-requested-with": "XMLHttpRequest"
      }
    };
    const failures = [];
    for (const endpoint of [
      "/api/v1/news/inbox/?mark_as_seen=false",
      "https://i.instagram.com/api/v1/news/inbox/?mark_as_seen=false"
    ]) {
      try {
        const response = await fetch(endpoint, requestOptions);
        if (!response.ok) {
          failures.push(`${new URL(endpoint, location.origin).host}:HTTP ${response.status}`);
          continue;
        }
        const payload = await readInstagramJson(response);
        const notifications = collectInstagramNotifications(payload);
        document.documentElement.setAttribute("data-flowsi-chatbot-notifications", JSON.stringify({
          at: new Date().toISOString(),
          endpoint: new URL(endpoint, location.origin).host,
          total: notifications.length,
          types: [...new Set(notifications.map(item => String(
            item?.notif_name || item?.notification_type || item?.type || item?.args?.type || "unknown"
          ).toLowerCase()))].slice(0, 20)
        }));
        return { notifications, transport: "instagram-page-notifications" };
      } catch (error) {
        failures.push(`${new URL(endpoint, location.origin).host}:${error?.message || "falha"}`);
      }
    }
    throw new Error(`Falha ao ler notificações (${failures.join(", ") || "sem resposta"}).`);
  }

  function instagramMediaPkToShortcode(mediaPkValue) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let value;
    try { value = BigInt(String(mediaPkValue || "")); } catch { return ""; }
    if (value < 0n) return "";
    let shortcode = "";
    do {
      shortcode = alphabet[Number(value % 64n)] + shortcode;
      value /= 64n;
    } while (value > 0n);
    return shortcode;
  }

  const instagramReplyButton = element => /^(responder|reply)$/i.test(String(
    element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || ""
  ).trim());

  const usableInstagramReplyElement = element => {
    if (!element || element.isConnected === false || element.disabled) return false;
    if (typeof element.getBoundingClientRect !== "function") return true;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
    try {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch {
      return true;
    }
  };

  const commentRowLeafTexts = container => [
    ...(container?.children?.length === 0 ? [container] : []),
    ...(container?.querySelectorAll?.("a, span, div, p") || [])
  ].filter(element => element?.children?.length === 0)
    .map(element => normalize(element.innerText || element.textContent || ""))
    .filter(Boolean);

  const commentRowMatches = (container, actorUsername, commentText) => {
    const actor = normalize(String(actorUsername || "").replace(/^@/, ""));
    const text = normalize(commentText);
    if (!actor && !text) return true;
    const leaves = commentRowLeafTexts(container);
    const actorMatches = !actor || leaves.some(value =>
      value.replace(/^@/, "") === actor || value.replace(/^@/, "").split(" ")[0] === actor
    );
    const textMatches = !text || leaves.some(value => value === text);
    return actorMatches && textMatches;
  };

  const commentReplyButton = (
    sourceDocument,
    commentId,
    actorUsername = "",
    commentText = ""
  ) => {
    const escapedId = CSS.escape(String(commentId || ""));
    const permalink = [...sourceDocument.querySelectorAll(
      `a[href*="/c/${escapedId}/"], a[href$="/c/${escapedId}"]`
    )].filter(usableInstagramReplyElement).find(anchor => {
      const href = String(anchor.href || anchor.getAttribute?.("href") || "");
      try {
        return new RegExp(`/c/${escapedId}/?$`, "i").test(new URL(href, location.origin).pathname);
      } catch {
        return new RegExp(`/c/${escapedId}/?$`, "i").test(href);
      }
    }) || null;
    if (permalink) {
      for (let container = permalink.parentElement, depth = 0;
        container && depth < 10;
        depth += 1, container = container.parentElement) {
        const buttons = [...container.querySelectorAll('button, [role="button"]')]
          .filter(button => usableInstagramReplyElement(button) && instagramReplyButton(button));
        if (
          buttons.length === 1 &&
          commentRowMatches(container, actorUsername, commentText)
        ) {
          return { button: buttons[0], container, strategy: "comment-permalink" };
        }
      }
    }

    // Some comment-permalink renders omit the /c/{id} anchor. In that case
    // accept only one row whose own visible content contains both the actor
    // and the triggering comment text. This prevents clicking Responder on a
    // neighbouring comment merely because it happens to be on screen.
    const normalizedActor = normalize(String(actorUsername || "").replace(/^@/, ""));
    const normalizedComment = normalize(commentText);
    if (normalizedActor && normalizedComment) {
      const matches = [];
      const replyButtons = [...sourceDocument.querySelectorAll('button, [role="button"]')]
        .filter(button => usableInstagramReplyElement(button) && instagramReplyButton(button));
      for (const button of replyButtons) {
        for (let container = button.parentElement, depth = 0;
          container && depth < 9;
          depth += 1, container = container.parentElement) {
          const buttons = [...container.querySelectorAll('button, [role="button"]')]
            .filter(candidate => usableInstagramReplyElement(candidate) && instagramReplyButton(candidate));
          if (
            buttons.length === 1 &&
            buttons[0] === button &&
            commentRowMatches(container, normalizedActor, normalizedComment)
          ) {
            matches.push({ button, container, strategy: "unique-actor-comment-row" });
            break;
          }
        }
      }
      const uniqueMatches = matches.filter((match, index) =>
        matches.findIndex(candidate => candidate.button === match.button) === index
      );
      if (uniqueMatches.length === 1) return uniqueMatches[0];
    }
    return null;
  };

  const isExactInstagramCommentPermalink = commentId => {
    const escapedCommentId = String(commentId || "")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return Boolean(escapedCommentId) && new RegExp(
      `/c/${escapedCommentId}/?$`,
      "i"
    ).test(location.pathname);
  };

  const instagramReplyMentionIsOpen = editor => /^\s*@[A-Za-z0-9._]{1,30}\s+/.test(String(
    editor && "value" in editor ? editor.value : editor?.textContent || ""
  ));

  const instagramReplyUsername = editor => String(
    editor && "value" in editor ? editor.value : editor?.textContent || ""
  ).match(/^\s*@([A-Za-z0-9._]{1,30})\s+/)?.[1] || "";

  const instagramCommentComposer = sourceDocument =>
    [...sourceDocument.querySelectorAll(
      'textarea, [contenteditable="true"], [role="textbox"], input[type="text"]'
    )].find(element => {
      const label = [
        element.getAttribute("aria-label"),
        element.getAttribute("placeholder"),
        element.getAttribute("aria-placeholder"),
        element.getAttribute("data-placeholder")
      ].filter(Boolean).join(" ");
      return /coment[aá]rio|comment/i.test(label);
    }) || null;

  const instagramPublishButtonForEditor = editor => {
    const roots = [];
    const form = editor?.closest?.("form");
    if (form) roots.push(form);
    for (let container = editor?.parentElement, depth = 0;
      container && depth < 5;
      depth += 1, container = container.parentElement) {
      if (!roots.includes(container)) roots.push(container);
    }
    for (const root of roots) {
      const composers = [...root.querySelectorAll(
        'textarea, [contenteditable="true"], [role="textbox"], input[type="text"]'
      )];
      if (composers.length && (composers.length !== 1 || composers[0] !== editor)) continue;
      const buttons = [...root.querySelectorAll('button, [role="button"]')].filter(element => {
        const label = String(
          element.innerText || element.textContent || element.getAttribute("aria-label") || ""
        ).trim();
        return /^(postar|publicar|post|publish)$/i.test(label) && !element.disabled;
      });
      if (buttons.length === 1) return buttons[0];
    }
    return null;
  };

  async function replaceInstagramComposerText(editor, text, frameDocument, frameWindow) {
    editor.focus();
    editor.click();
    const existingText = String("value" in editor ? editor.value : editor.textContent || "");
    // Instagram represents a threaded reply with a controlled @mention prefix.
    // Removing that prefix makes React restore it and discard the rest of the
    // synthetic value. Preserve it and append the configured public response.
    const mentionPrefix = existingText.match(/^\s*@[A-Za-z0-9._]{1,30}\s+/)?.[0] || "";
    const desiredText = `${mentionPrefix}${text}`;

    // execCommand is deprecated for general editing, but in Chromium it is
    // still the only DOM editing primitive that makes a browser-originated
    // edit in Instagram's controlled React composer. Assigning `.value` and
    // dispatching a synthetic beforeinput/input pair looks correct for one
    // frame, then React restores the previous @mention-only state. Select only
    // the editable suffix so the controlled reply target remains intact.
    try {
      if ("value" in editor && typeof editor.setSelectionRange === "function") {
        editor.setSelectionRange(mentionPrefix.length, existingText.length);
      } else {
        const selection = frameWindow.getSelection?.();
        const range = frameDocument.createRange?.();
        if (selection && range) {
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      frameDocument.execCommand?.("insertText", false, text);
    } catch {}
    await sleep(500);
    const browserEditedText = String(
      "value" in editor ? editor.value : editor.textContent || ""
    );
    if (normalize(browserEditedText).includes(normalize(text))) {
      return browserEditedText;
    }

    // Fallback for composer variants where execCommand is unavailable. This
    // is the standard React value-tracker sequence; unlike the previous
    // implementation it does not emit a contradictory beforeinput event after
    // the final value has already been installed.
    if ("value" in editor) {
      const prototype = editor instanceof frameWindow.HTMLTextAreaElement
        ? frameWindow.HTMLTextAreaElement.prototype
        : frameWindow.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      const previousValue = editor.value;
      if (setter) setter.call(editor, desiredText);
      else editor.value = desiredText;
      editor._valueTracker?.setValue?.(previousValue);
      editor.dispatchEvent(new frameWindow.Event("input", {
        bubbles: true,
        composed: true
      }));
      editor.dispatchEvent(new frameWindow.Event("change", { bubbles: true }));
      await sleep(500);
      if (!normalize(editor.value).includes(normalize(text))) {
        throw new Error("O Instagram descartou o texto digitado no editor de resposta.");
      }
      return desiredText;
    }
    editor.textContent = desiredText;
    editor.dispatchEvent(new frameWindow.Event("input", {
      bubbles: true,
      composed: true
    }));
    await sleep(500);
    if (!normalize(editor.textContent).includes(normalize(text))) {
      throw new Error("O Instagram descartou o texto digitado no editor de resposta.");
    }
    return desiredText;
  }

  const threadedReplyPermalinks = (sourceDocument, commentId) => {
    const escapedId = CSS.escape(String(commentId || ""));
    return [...sourceDocument.querySelectorAll(
      `a[href*="/c/${escapedId}/r/"]`
    )];
  };

  const threadedReplyLinkContainsText = (link, message, actorUsername = "") => {
    const replyAuthor = normalize(currentAccountUsername());
    const actor = normalize(String(actorUsername || "").replace(/^@/, ""));
    const normalizedMessage = normalize(message);
    const acceptedReplyTexts = new Set([
      normalizedMessage,
      actor ? `@${actor} ${normalizedMessage}` : ""
    ].filter(Boolean));
    for (let container = link?.parentElement, depth = 0;
      container && depth < 8;
      depth += 1, container = container.parentElement) {
      const leaves = commentRowLeafTexts(container);
      const hasExactText = leaves.some(value => acceptedReplyTexts.has(value));
      const hasReplyAuthor = !replyAuthor || leaves.some(value =>
        value.replace(/^@/, "") === replyAuthor ||
        value.replace(/^@/, "").split(" ")[0] === replyAuthor
      );
      if (hasExactText && hasReplyAuthor) {
        return true;
      }
    }
    return false;
  };

  async function instagramChildReplySnapshot(mediaIdValue, commentId) {
    const mediaId = String(mediaIdValue || "").trim();
    const mediaPk = mediaId.split("_")[0];
    const viewerId = String(currentAccountUserId() || "").trim();
    const candidates = [...new Set([
      mediaId,
      mediaPk && viewerId ? `${mediaPk}_${viewerId}` : "",
      mediaPk
    ].filter(Boolean))];
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-csrftoken": csrfToken(),
      "x-requested-with": "XMLHttpRequest"
    };
    for (const candidate of candidates) {
      try {
        const response = await fetch(
          `/api/v1/media/${encodeURIComponent(candidate)}/comments/${encodeURIComponent(commentId)}/child_comments/`,
          { method: "GET", credentials: "include", cache: "no-store", headers }
        );
        if (!response.ok) continue;
        const payload = await readInstagramJson(response).catch(() => ({}));
        const children = [
          ...(Array.isArray(payload?.child_comments) ? payload.child_comments : []),
          ...(Array.isArray(payload?.comments) ? payload.comments : [])
        ];
        const replies = children.map(comment => ({
          id: String(comment?.pk || comment?.id || ""),
          parentId: String(
            comment?.parent_comment_id || comment?.replied_to_comment_id ||
            comment?.parent_comment?.pk || comment?.parent_comment?.id || commentId
          ),
          text: normalize(comment?.text || ""),
          username: normalize(comment?.user?.username || comment?.owner?.username || "")
        })).filter(reply => reply.id && reply.parentId === String(commentId));
        return { available: true, replies, ids: new Set(replies.map(reply => reply.id)) };
      } catch {}
    }
    return { available: false, replies: [], ids: new Set() };
  }

  const childReplyMatches = (reply, message, actorUsername = "") => {
    const actor = normalize(String(actorUsername || "").replace(/^@/, ""));
    const expected = normalize(message);
    const acceptedTexts = new Set([
      expected,
      actor ? `@${actor} ${expected}` : ""
    ].filter(Boolean));
    const ownUsername = normalize(currentAccountUsername());
    return acceptedTexts.has(reply?.text) &&
      (!ownUsername || !reply?.username || reply.username === ownUsername);
  };

  async function replyChatbotCommentThroughUi(mediaPk, commentId, message, context = {}) {
    const shortcode = instagramMediaPkToShortcode(mediaPk);
    if (!shortcode) throw new Error("Não foi possível localizar a postagem pela interface.");
    const escapedShortcode = shortcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const postRoute = new RegExp(
      `^/(?:[A-Za-z0-9._]{1,30}/)?(?:p|reel|tv)/${escapedShortcode}(?:/|$)`,
      "i"
    );
    if (!postRoute.test(location.pathname)) {
      throw new Error(`A resposta pela interface requer a publicação ${shortcode}.`);
    }
    let deliveryAttempted = false;
    try {
      const deadline = Date.now() + 30000;
      const frameDocument = document;
      const frameWindow = window;
      const actorUsername = String(context?.actorUsername || "").replace(/^@/, "").trim();
      const commentText = String(context?.commentText || "").trim();
      let target = null;
      let editor = null;
      while (Date.now() < deadline && !target) {
        editor = instagramCommentComposer(frameDocument);
        target = commentReplyButton(
          frameDocument,
          commentId,
          actorUsername,
          commentText
        );
        if (!target) await sleep(200);
      }
      if (!target?.button) {
        throw new Error("O botão Responder do comentário solicitado não apareceu.");
      }

      // Clicking the row's own Responder control is mandatory even when the
      // /c/{commentId}/ route pre-opened an @mention composer. A pre-opened
      // composer alone can publish an unthreaded top-level comment.
      target.button.click();
      editor = null;

      const composerDeadline = Date.now() + 10000;
      while (Date.now() < composerDeadline && !editor) {
        const candidate = instagramCommentComposer(frameDocument);
        const candidateUsername = instagramReplyUsername(candidate);
        const matchesActor = !actorUsername ||
          normalize(candidateUsername) === normalize(actorUsername);
        editor = instagramReplyMentionIsOpen(candidate) && matchesActor ? candidate : null;
        if (!editor) await sleep(150);
      }
      if (!editor) {
        throw new Error("O editor encadeado correto não abriu após clicar em Responder.");
      }
      const enteredText = await replaceInstagramComposerText(
        editor,
        message,
        frameDocument,
        frameWindow
      );
      document.documentElement.setAttribute("data-flowsi-chatbot-comment-ui", JSON.stringify({
        at: new Date().toISOString(),
        phase: "text-ready",
        commentId,
        mediaPk: String(mediaPk),
        enteredText,
        target: target.strategy || "comment-reply-button",
        replyButtonClicked: true,
        actorUsername: actorUsername || null
      }));

      let publishButton = null;
      const publishDeadline = Date.now() + 5000;
      while (Date.now() < publishDeadline && !publishButton) {
        publishButton = instagramPublishButtonForEditor(editor);
        if (!publishButton) await sleep(100);
      }
      if (!publishButton) {
        throw new Error("O botão Postar do editor encadeado não foi habilitado.");
      }
      // Snapshot both the DOM and Instagram's child IDs immediately before
      // publishing. A previously existing reply that lazy-loads afterwards
      // must never be mistaken for the result of this click.
      const childReplyBaseline = await instagramChildReplySnapshot(
        context?.mediaId || mediaPk,
        commentId
      );
      const existingThreadedReplyLinks = new Set(
        threadedReplyPermalinks(frameDocument, commentId)
          .map(link => String(link.href || link.getAttribute?.("href") || ""))
      );
      publishButton.click();
      deliveryAttempted = true;

      const confirmationDeadline = Date.now() + 20000;
      let nextChildApiCheckAt = 0;
      while (Date.now() < confirmationDeadline) {
        await sleep(250);
        const newReplyLink = threadedReplyPermalinks(frameDocument, commentId).find(link => {
          const href = String(link.href || link.getAttribute?.("href") || "");
          const replyId = href.match(/\/r\/([^/?#]+)/i)?.[1] || "";
          return !existingThreadedReplyLinks.has(href) &&
            (!childReplyBaseline.available || !childReplyBaseline.ids.has(replyId)) &&
            threadedReplyLinkContainsText(link, message, actorUsername);
        });
        let newApiReply = null;
        if (
          !newReplyLink && childReplyBaseline.available &&
          Date.now() >= nextChildApiCheckAt
        ) {
          nextChildApiCheckAt = Date.now() + 1000;
          const currentChildren = await instagramChildReplySnapshot(
            context?.mediaId || mediaPk,
            commentId
          );
          if (currentChildren.available) {
            newApiReply = currentChildren.replies.find(reply =>
              !childReplyBaseline.ids.has(reply.id) &&
              childReplyMatches(reply, message, actorUsername)
            ) || null;
          }
        }
        if (newReplyLink || newApiReply) {
          return {
            success: true,
            status: "sent",
            transport: "instagram-threaded-comment-ui-verified",
            commentId: newReplyLink
              ? String(newReplyLink.href || newReplyLink.getAttribute?.("href") || "")
                .match(/\/r\/([^/?#]+)/i)?.[1] || "ui-confirmed"
              : newApiReply.id,
            parentCommentId: commentId,
            mediaId: String(mediaPk),
            replyButtonClicked: true,
            verification: newReplyLink
              ? "threaded-reply-permalink"
              : "new-child-comment-id"
          };
        }
      }
      throw new Error("A resposta não apareceu vinculada ao comentário após a publicação.");
    } catch (error) {
      if (deliveryAttempted) error.deliveryAttempted = true;
      throw error;
    }
  }

  async function replyChatbotComment(mediaIdValue, commentIdValue, messageValue, options = {}) {
    const mediaId = String(mediaIdValue || "").trim();
    const commentId = String(commentIdValue || "").trim();
    const message = String(messageValue || "").trim();
    if (!mediaId || !commentId || !message) {
      throw new Error("Postagem, comentário ou resposta pública inválidos.");
    }
    const viewerId = String(currentAccountUserId() || "").trim();
    const requestUuid = globalThis.crypto?.randomUUID?.() ||
      `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    const mediaPk = mediaId.split("_")[0];
    if (options?.uiOnly) {
      return replyChatbotCommentThroughUi(mediaPk, commentId, message, {
        ...options,
        mediaId
      });
    }
    const deviceUuid = document.cookie.split(";").map(value => value.trim())
      .find(value => value.startsWith("ig_did="))?.slice("ig_did=".length)
      .replace(/^\"|\"$/g, "") || requestUuid;
    const candidateMediaIds = [];
    // Preserve the complete media id supplied by Instagram. A media id is
    // normally `<media-pk>_<owner-pk>` and rebuilding it too early can target
    // the wrong container (or turn a reply into a top-level comment).
    if (mediaId.includes("_")) candidateMediaIds.push(mediaId);
    if (/^\d+$/.test(mediaPk) && /^\d+$/.test(viewerId)) {
      candidateMediaIds.push(`${mediaPk}_${viewerId}`);
    }
    candidateMediaIds.push(mediaId, mediaPk);
    const csrf = csrfToken();
    const replyBody = new URLSearchParams({
      comment_text: message,
      replied_to_comment_id: commentId,
      parent_comment_id: commentId,
      containermodule: "self_comments_v2",
      idempotence_token: requestUuid,
      _csrftoken: csrf,
      _uid: viewerId,
      _uuid: deviceUuid,
      device_id: deviceUuid,
      radio_type: "wifi-none"
    }).toString();
    const attempts = [...new Set(candidateMediaIds.filter(Boolean))].flatMap(candidateMediaId => [
        {
          endpoint: `/api/v1/media/${encodeURIComponent(candidateMediaId)}/comment/`,
          mediaId: candidateMediaId,
          body: replyBody,
          transport: "instagram-page-threaded-comment-api"
        },
        {
          endpoint: `https://i.instagram.com/api/v1/media/${encodeURIComponent(candidateMediaId)}/comment/`,
          mediaId: candidateMediaId,
          body: replyBody,
          transport: "instagram-private-threaded-comment-api"
        }
      ]);
    const requestHeaders = {
      accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-instagram-ajax": "1",
      "x-ig-www-claim": globalThis.sessionStorage?.getItem?.("www-claim-v2") || "0",
      "x-csrftoken": csrf,
      "x-requested-with": "XMLHttpRequest"
    };
    const replyMatchesParent = comment => {
      const parentId = String(
        comment?.parent_comment_id || comment?.replied_to_comment_id ||
        comment?.parent_comment?.pk || comment?.parent_comment?.id || ""
      ).trim();
      return parentId === commentId;
    };
    const verifyThreadedReply = async (candidateMediaId, replyId) => {
      const endpoint = `/api/v1/media/${encodeURIComponent(candidateMediaId)}/comments/${encodeURIComponent(commentId)}/child_comments/`;
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: requestHeaders
        });
        if (!response.ok) return false;
        const payload = await readInstagramJson(response).catch(() => ({}));
        const children = [
          ...(Array.isArray(payload?.child_comments) ? payload.child_comments : []),
          ...(Array.isArray(payload?.comments) ? payload.comments : [])
        ];
        return children.some(comment => {
          const id = String(comment?.pk || comment?.id || "").trim();
          const text = String(comment?.text || "").trim();
          return (replyId ? id === replyId : text === message) &&
            (!comment?.parent_comment_id || String(comment.parent_comment_id) === commentId);
        });
      } catch {
        return false;
      }
    };
    const failures = [];
    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.endpoint, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: requestHeaders,
          body: attempt.body
        });
        const payload = await readInstagramJson(response).catch(() => ({}));
        const reply = payload?.comment || payload?.reply || null;
        const replyId = String(
          reply?.pk || reply?.id || payload?.pk || payload?.id || ""
        );
        const confirmedThread = response.ok && (
          replyMatchesParent(reply) ||
          (replyId && await verifyThreadedReply(attempt.mediaId, replyId))
        );
        document.documentElement.setAttribute("data-flowsi-chatbot-comment-reply", JSON.stringify({
          at: new Date().toISOString(),
          endpoint: new URL(attempt.endpoint, location.origin).pathname,
          httpStatus: response.status,
          instagramStatus: payload?.status || null,
          replyId: replyId || null,
          parentCommentId: String(
            reply?.parent_comment_id || reply?.replied_to_comment_id || ""
          ) || null,
          confirmedThread
        }));
        if (confirmedThread) {
          return {
            success: true,
            status: "sent",
            transport: attempt.transport,
            commentId: replyId || commentId,
            parentCommentId: commentId,
            mediaId: attempt.mediaId
          };
        }
        // A successful POST without a confirmed parent may already have
        // created a top-level comment. Never retry it on another endpoint,
        // otherwise the automation could post duplicates.
        if (response.ok && (payload?.status === "ok" || replyId)) {
          const unconfirmedError = new Error(
            "O Instagram criou o comentário, mas não confirmou que ele ficou como resposta encadeada."
          );
          unconfirmedError.name = "UnconfirmedThreadError";
          throw unconfirmedError;
        }
        failures.push(
          `${new URL(attempt.endpoint, location.origin).pathname}: ${payload?.message || `HTTP ${response.status}`}`
        );
      } catch (error) {
        if (error?.name === "UnconfirmedThreadError") throw error;
        failures.push(
          `${new URL(attempt.endpoint, location.origin).pathname}: ${error?.message || "falha"}`
        );
      }
    }
    try {
      return await replyChatbotCommentThroughUi(mediaPk, commentId, message, options);
    } catch (uiError) {
      failures.push(`interface encadeada: ${uiError?.message || "falha"}`);
    }
    throw new Error(`O Instagram não confirmou a resposta pública (${failures.join("; ")}).`);
  }

  function chatbotGraphqlHtmlValue(html, marker) {
    const index = String(html || "").indexOf(marker);
    if (index < 0) return "";
    const start = index + marker.length;
    let end = start;
    while (end < html.length && !"'\",}".includes(html[end])) end += 1;
    return html.slice(start, end) || "";
  }

  function chatbotGraphqlSession() {
    const html = document.documentElement?.innerHTML || "";
    const csrf = csrfToken();
    const dsUserId = currentAccountUserId();
    const fbDtsg = chatbotGraphqlHtmlValue(html, '"DTSGInitialData",[],{"token":"');
    const lsd = chatbotGraphqlHtmlValue(html, '"LSD",[],{"token":"');
    const av = [
      '"actorID":"',
      '"ACCOUNT_ID":"',
      '"USER_ID":"'
    ].map(marker => chatbotGraphqlHtmlValue(html, marker))
      .find(value => value && value !== "0" && value !== dsUserId) || "";
    if (!csrf || !dsUserId || !fbDtsg || !lsd || !av) {
      throw new Error(
        `Sessão GraphQL incompleta (csrf:${Boolean(csrf)} usuário:${Boolean(dsUserId)} dtsg:${Boolean(fbDtsg)} lsd:${Boolean(lsd)} av:${Boolean(av)}).`
      );
    }
    let checksum = 0;
    for (const character of fbDtsg) checksum += character.charCodeAt(0);
    return {
      csrf,
      dsUserId,
      av,
      fbDtsg,
      lsd,
      jazoest: `2${checksum}`,
      spinR: chatbotGraphqlHtmlValue(html, '"__spin_r":'),
      spinT: chatbotGraphqlHtmlValue(html, '"__spin_t":'),
      hasteSession: chatbotGraphqlHtmlValue(html, '"haste_session":"')
    };
  }

  async function chatbotGraphqlRequest(session, friendlyName, docId, variables) {
    const form = {
      av: session.av,
      __d: "www",
      __user: "0",
      __a: "1",
      __req: Math.random().toString(36).slice(2, 4),
      __comet_req: "7",
      dpr: String(window.devicePixelRatio || 1),
      fb_dtsg: session.fbDtsg,
      jazoest: session.jazoest,
      lsd: session.lsd,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: friendlyName,
      server_timestamps: "true",
      doc_id: docId,
      variables: JSON.stringify(variables)
    };
    if (session.spinR) {
      form.__rev = session.spinR;
      form.__spin_r = session.spinR;
      form.__spin_b = "trunk";
    }
    if (session.spinT) form.__spin_t = session.spinT;
    if (session.hasteSession) form.__hs = session.hasteSession;
    const response = await fetch("/api/graphql", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": session.csrf,
        "x-fb-lsd": session.lsd,
        "x-ig-app-id": "936619743392459",
        "x-fb-friendly-name": friendlyName
      },
      body: new URLSearchParams(form).toString()
    });
    const payload = await readInstagramJson(response).catch(async () => {
      throw new Error(`${friendlyName} devolveu uma resposta inválida (HTTP ${response.status}).`);
    });
    if (!response.ok || payload?.errors?.length) {
      const message = payload?.errors?.[0]?.message || `HTTP ${response.status}`;
      throw new Error(`${friendlyName}: ${message}`);
    }
    return payload?.data || null;
  }

  function chatbotGraphqlFindViewerFbid(value, dsUserId) {
    const queue = [value];
    const seen = new WeakSet();
    let inspected = 0;
    while (queue.length && inspected < 6000) {
      const current = queue.shift();
      if (!current || typeof current !== "object" || seen.has(current)) continue;
      seen.add(current);
      inspected += 1;
      if (
        current.interop_messaging_user_fbid &&
        [current.id, current.pk].some(id => String(id || "") === String(dsUserId))
      ) {
        return String(current.interop_messaging_user_fbid);
      }
      if (Array.isArray(current)) queue.push(...current);
      else queue.push(...Object.values(current).filter(child => child && typeof child === "object"));
    }
    return "";
  }

  async function chatbotGraphqlResolveViewerFbid(session) {
    if (
      chatbotGraphqlViewerFbid &&
      chatbotGraphqlViewerAccount === session.dsUserId
    ) return chatbotGraphqlViewerFbid;
    if (chatbotGraphqlViewerPromise) return chatbotGraphqlViewerPromise;
    chatbotGraphqlViewerPromise = (async () => {
      const html = document.documentElement?.innerHTML || "";
      let viewerFbid = chatbotGraphqlHtmlValue(html, '"IG_USER_EIMU":"') ||
        chatbotGraphqlHtmlValue(html, `"id":"${session.dsUserId}","interop_messaging_user_fbid":"`);
      if (!viewerFbid) {
        const tabs = await chatbotGraphqlRequest(
          session,
          "IGDChatTabsJewelOffMsysQuery",
          CHATBOT_GRAPHQL_TABS_DOC_ID,
          {
            device_id_for_iris_subscription: globalThis.crypto?.randomUUID?.() ||
              `flowsi-${Date.now()}-${Math.random().toString(36).slice(2)}`
          }
        );
        viewerFbid = chatbotGraphqlFindViewerFbid(tabs, session.dsUserId);
      }
      if (!viewerFbid) {
        throw new Error("O Instagram não informou o identificador do Direct conectado.");
      }
      chatbotGraphqlViewerFbid = viewerFbid;
      chatbotGraphqlViewerAccount = session.dsUserId;
      return viewerFbid;
    })().finally(() => {
      chatbotGraphqlViewerPromise = null;
    });
    return chatbotGraphqlViewerPromise;
  }

  function chatbotGraphqlThreadUnreadCount(thread) {
    const queue = [{ value: thread, depth: 0 }];
    const seen = new WeakSet();
    let unread = 0;
    while (queue.length) {
      const { value, depth } = queue.shift();
      if (!value || typeof value !== "object" || seen.has(value) || depth > 4) continue;
      seen.add(value);
      for (const [key, child] of Object.entries(value)) {
        const normalizedKey = normalize(key).replace(/[^a-z0-9]/g, "");
        if (normalizedKey.includes("unread")) {
          if (child === true) unread = Math.max(unread, 1);
          const numeric = Number(child);
          if (Number.isFinite(numeric) && numeric > 0) unread = Math.max(unread, numeric);
        }
        if (child && typeof child === "object") queue.push({ value: child, depth: depth + 1 });
      }
    }
    return unread;
  }

  function chatbotGraphqlMessageCandidate(thread, users, session, viewerFbid) {
    const contactUsers = users.filter(user =>
      normalize(user?.username) !== normalize(currentAccountUsername()) &&
      ![session.dsUserId, viewerFbid].includes(String(user?.id || user?.pk || ""))
    );
    const contactIds = new Set(contactUsers.flatMap(user => [
      user?.id,
      user?.pk,
      user?.interop_messaging_user_fbid
    ]).filter(Boolean).map(String));
    const queue = [{ value: thread, depth: 0, path: "thread" }];
    const seen = new WeakSet();
    const candidates = [];
    let inspected = 0;
    while (queue.length && inspected < 5000) {
      const current = queue.shift();
      const value = current.value;
      if (!value || typeof value !== "object" || seen.has(value)) continue;
      seen.add(value);
      inspected += 1;
      const text = firstRealtimeText(
        value.text,
        value.message,
        value.snippet,
        value.preview,
        value.body,
        value.reel_share?.text,
        value.story_share?.text
      );
      const sender = value.sender || value.user || value.author || value.snippet_sender ||
        value.last_message_sender || value.message_sender || null;
      const senderId = String(
        value.user_id || value.sender_id || value.author_id || value.participant_id ||
        sender?.interop_messaging_user_fbid || sender?.pk || sender?.id || ""
      );
      const itemId = String(
        value.item_id || value.message_id || value.client_context ||
        value.offline_threading_id || ""
      );
      const timestamp = String(
        value.timestamp || value.sent_at || value.created_at || value.last_activity_at || ""
      );
      const senderUsername = normalize(sender?.username || "");
      const isOwn = value.is_sent_by_viewer === true || value.is_sender_viewer === true ||
        [session.dsUserId, viewerFbid].includes(senderId) ||
        (senderUsername && senderUsername === normalize(currentAccountUsername())) ||
        /^(voce|you)(:| enviou| sent)/i.test(normalize(text));
      const isContact = value.is_sent_by_viewer === false || value.is_sender_viewer === false ||
        contactIds.has(senderId) ||
        contactUsers.some(user => normalize(user?.username) === senderUsername);
      if (text) {
        let score = 0;
        if (/last[_-]?(message|item)|snippet|preview/i.test(current.path)) score += 100;
        if (itemId) score += 50;
        if (timestamp) score += 30;
        if (isContact) score += 40;
        if (isOwn) score -= 200;
        candidates.push({
          text,
          sender,
          senderId,
          itemId,
          timestamp,
          isOwn,
          isContact,
          score,
          path: current.path,
          keys: Object.keys(value).slice(0, 30)
        });
      }
      if (current.depth >= 8) continue;
      for (const [key, child] of Object.entries(value)) {
        if (!child || typeof child !== "object" || key === "users") continue;
        queue.push({ value: child, depth: current.depth + 1, path: `${current.path}.${key}` });
      }
    }
    candidates.sort((left, right) => right.score - left.score);
    return { candidate: candidates.find(item => item.isContact && !item.isOwn) || null, candidates };
  }

  async function fetchChatbotDirectThread(threadIdentifiers) {
    const normalizedThreadIds = [...new Set(
      (Array.isArray(threadIdentifiers) ? threadIdentifiers : [threadIdentifiers])
        .map(value => String(value || "").trim())
        .filter(value => /^\d+$/.test(value))
    )];
    if (!normalizedThreadIds.length) {
      throw new Error("O Instagram informou uma conversa sem identificador valido.");
    }
    const query = new URLSearchParams({
      visual_message_return_type: "unseen",
      direction: "older",
      limit: "20"
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
    for (const normalizedThreadId of normalizedThreadIds) {
      for (const endpoint of [
        `/api/v1/direct_v2/threads/${encodeURIComponent(normalizedThreadId)}/?${query}`,
        `https://i.instagram.com/api/v1/direct_v2/threads/${encodeURIComponent(normalizedThreadId)}/?${query}`
      ]) {
        try {
          const response = await fetch(endpoint, requestOptions);
          if (!response.ok) {
            failures.push(`${normalizedThreadId}:${new URL(endpoint, location.origin).host}:HTTP ${response.status}`);
            continue;
          }
          const payload = await readInstagramJson(response);
          const thread = payload?.thread || payload?.inbox?.thread || null;
          if (!thread || !Array.isArray(thread.items)) {
            failures.push(`${normalizedThreadId}:${new URL(endpoint, location.origin).host}:payload sem thread.items`);
            continue;
          }
          const trustedThreadId = String(thread.thread_id || normalizedThreadId);
          return {
            ...thread,
            thread_id: trustedThreadId,
            _flowsiTrustedThreadId: trustedThreadId
          };
        } catch (error) {
          failures.push(`${normalizedThreadId}:${new URL(endpoint, location.origin).host}:${error?.message || "falha"}`);
        }
      }
    }
    throw new Error(`Falha ao ler a conversa atualizada (${failures.join(", ") || "sem resposta"}).`);
  }

  function chatbotGraphqlDetailMessages(thread, previousActivityTimestamp) {
    const connection = thread?.slide_messages;
    const nodes = Array.isArray(connection)
      ? connection
      : Array.isArray(connection?.edges)
        ? connection.edges.map(edge => edge?.node).filter(Boolean)
        : Array.isArray(connection?.nodes)
          ? connection.nodes
          : [];
    return nodes.map(rawNode => {
      const node = rawNode?.as_ig_direct_message || rawNode?.message || rawNode;
      const rawTimestamp = node?.timestamp_ms || node?.timestamp || node?.sent_at || 0;
      const timestamp = chatbotTimestampMicros(rawTimestamp, 0);
      const timestampMs = Math.floor(timestamp / 1000);
      const sender = node?.sender || node?.author || {};
      return {
        item_id: String(node?.message_id || node?.item_id || node?.id || ""),
        user_id: String(sender?.igid || sender?.pk || sender?.id || node?.sender_id || ""),
        text: firstRealtimeText(
          node?.text_body,
          node?.text,
          node?.content?.text_body,
          node?.content?.text,
          node?.content?.caption
        ),
        timestamp,
        _flowsiTimestampMs: timestampMs
      };
    }).filter(item =>
      item.item_id &&
      item.user_id &&
      item.text &&
      item._flowsiTimestampMs > Number(previousActivityTimestamp || 0)
    ).map(({ _flowsiTimestampMs, ...item }) => item);
  }

  async function fetchChatbotGraphqlThreadDetail(
    session,
    graphqlThread,
    fallbackUsers,
    previousActivityTimestamp
  ) {
    const threadKey = String(graphqlThread?.thread_key || "").trim();
    if (!/^\d+$/.test(threadKey)) {
      throw new Error("A conversa alterada veio sem thread_key do GraphQL.");
    }
    const data = await chatbotGraphqlRequest(
      session,
      "IGDThreadDetailQuery",
      CHATBOT_GRAPHQL_THREAD_DETAIL_DOC_ID,
      {
        min_uq_seq_id: null,
        thread_fbid: threadKey,
        __relay_internal__pv__IGDEnableOffMsysChatThemesQErelayprovider: false,
        __relay_internal__pv__IGDInitialMessagePageCountrelayprovider: 20
      }
    );
    const detail = data?.get_slide_thread_nullable?.as_ig_direct_thread;
    if (!detail) throw new Error("IGDThreadDetailQuery veio sem a conversa.");
    const usersSource = Array.isArray(detail.users) && detail.users.length
      ? detail.users
      : fallbackUsers;
    const users = usersSource.map(user => {
      const igid = String(user?.igid || user?.pk || user?.id || "");
      return {
        ...user,
        id: igid,
        pk: igid,
        username: user?.username,
        full_name: user?.full_name || user?.fullName || user?.username
      };
    });
    const items = chatbotGraphqlDetailMessages(detail, previousActivityTimestamp);
    if (!items.length) {
      throw new Error("IGDThreadDetailQuery ainda não trouxe a nova mensagem de texto.");
    }
    const trustedThreadId = String(
      detail.thread_id || graphqlThread.thread_id || graphqlThread.thread_fbid || ""
    );
    return {
      ...detail,
      thread_id: trustedThreadId,
      thread_fbid: String(detail.thread_fbid || graphqlThread.thread_fbid || ""),
      thread_key: String(detail.thread_key || threadKey),
      users,
      items,
      _flowsiTrustedThreadId: /^\d+$/.test(trustedThreadId) ? trustedThreadId : ""
    };
  }

  async function fetchChatbotGraphqlInbox(folder = "PRIMARY") {
    const session = chatbotGraphqlSession();
    const viewerFbid = await chatbotGraphqlResolveViewerFbid(session);
    const data = await chatbotGraphqlRequest(
      session,
      "IGDThreadListProfessionalOffMsysPaginationQuery",
      CHATBOT_GRAPHQL_THREADS_DOC_ID,
      {
        count: 20,
        cursor: null,
        ig_inbox_folder: folder,
        system_folder: "INBOX",
        id: viewerFbid,
        __relay_internal__pv__IGDPinnedThreadsRenderEnabledGKrelayprovider: true,
        __relay_internal__pv__IGDMaxUnreadMessagesCountrelayprovider: 5,
        __relay_internal__pv__IGDThreadListActionsEnabledGKrelayprovider: true
      }
    );
    const connection = data?.fetch__SlideMailbox
      ?.threads_by_system_folder_and_ig_inbox_folder;
    if (!connection || !Array.isArray(connection.edges)) {
      throw new Error("A lista GraphQL do Direct veio sem conversas.");
    }
    const threads = [];
    const diagnostics = [];
    const folderBaselineReady = chatbotGraphqlBaselineFolders.has(folder);
    for (const edge of connection.edges) {
      const thread = edge?.node?.as_ig_direct_thread;
      if (!thread) continue;
      const threadId = String(thread.thread_id || thread.thread_fbid || thread.id || "");
      const threadIdentifiers = [
        thread.thread_fbid,
        thread.thread_key,
        thread.id,
        thread.thread_id
      ];
      const activityTimestamp = Number(thread.last_activity_timestamp_ms || 0);
      const activityKey = `${folder}:${threadId}`;
      const hadActivity = chatbotGraphqlActivityByThread.has(activityKey);
      const previousActivity = Number(chatbotGraphqlActivityByThread.get(activityKey) || 0);
      const isRecentNewThread = activityTimestamp > 0 &&
        Math.abs(Date.now() - activityTimestamp) <= 2 * 60 * 1000;
      const activityAdvanced = Boolean(
        folderBaselineReady && threadId && activityTimestamp > 0 && (
          hadActivity
            ? activityTimestamp > previousActivity
            : isRecentNewThread
        )
      );
      if (!folderBaselineReady || !hadActivity && !activityAdvanced) {
        chatbotGraphqlActivityByThread.set(activityKey, activityTimestamp);
      }
      const users = (Array.isArray(thread.users) ? thread.users : []).map(user => ({
        ...user,
        id: user?.id !== undefined ? String(user.id) : undefined,
        pk: user?.pk !== undefined ? String(user.pk) : undefined,
        interop_messaging_user_fbid: user?.interop_messaging_user_fbid !== undefined
          ? String(user.interop_messaging_user_fbid)
          : undefined
      }));
      const unread = chatbotGraphqlThreadUnreadCount(thread);
      const { candidate, candidates } = chatbotGraphqlMessageCandidate(
        thread,
        users,
        session,
        viewerFbid
      );
      let refreshedThread = null;
      let refreshError = null;
      if (activityAdvanced) {
        try {
          refreshedThread = await fetchChatbotGraphqlThreadDetail(
            session,
            thread,
            users,
            previousActivity
          );
          chatbotGraphqlActivityByThread.set(activityKey, activityTimestamp);
        } catch (error) {
          const graphqlDetailError = error?.message || String(error);
          try {
            refreshedThread = await fetchChatbotDirectThread(threadIdentifiers);
            chatbotGraphqlActivityByThread.set(activityKey, activityTimestamp);
          } catch (fallbackError) {
            refreshError = `${graphqlDetailError}; ${fallbackError?.message || String(fallbackError)}`;
          }
        }
      }
      diagnostics.push({
        threadId,
        threadFbid: String(thread.thread_fbid || ""),
        threadKey: String(thread.thread_key || ""),
        graphqlId: String(thread.id || ""),
        unread,
        activityTimestamp,
        previousActivity,
        activityAdvanced,
        refreshedItems: Array.isArray(refreshedThread?.items) ? refreshedThread.items.length : 0,
        refreshError,
        threadKeys: Object.keys(thread).slice(0, 40),
        candidate: candidate ? {
          path: candidate.path,
          keys: candidate.keys,
          hasItemId: Boolean(candidate.itemId),
          hasTimestamp: Boolean(candidate.timestamp),
          senderId: candidate.senderId || null,
          textLength: candidate.text.length
        } : null,
        candidateCount: candidates.length
      });
      if (refreshedThread) {
        threads.push(refreshedThread);
        continue;
      }
      if (!threadId || !activityAdvanced || !candidate) continue;
      const contact = users.find(user =>
        normalize(user?.username) !== normalize(currentAccountUsername()) &&
        ![session.dsUserId, viewerFbid].includes(String(
          user?.interop_messaging_user_fbid || user?.pk || user?.id || ""
        ))
      ) || users[0];
      const senderId = String(
        candidate.senderId || contact?.interop_messaging_user_fbid || contact?.pk || contact?.id || ""
      );
      const eventId = candidate.itemId || (candidate.timestamp
        ? `graphql-activity-${stableChatbotRowHash(`${threadId}|${candidate.timestamp}|${candidate.text}|${senderId}`)}`
        : "");
      if (!eventId || !senderId || !contact?.username) continue;
      threads.push({
        _flowsiTrustedThreadId: /^\d+$/.test(threadId) ? threadId : "",
        thread_id: threadId,
        users: [{
          ...contact,
          pk: senderId,
          id: senderId,
          username: contact.username,
          full_name: contact.full_name || contact.fullName || contact.username
        }],
        items: [{
          item_id: eventId,
          user_id: senderId,
          text: candidate.text,
          timestamp: chatbotTimestampMicros(candidate.timestamp, 0)
        }]
      });
    }
    chatbotGraphqlBaselineFolders.add(folder);
    const graphqlDiagnostic = JSON.stringify({
        at: new Date().toISOString(),
        status: "ok",
        folder,
        baselineReady: true,
        edges: connection.edges.length,
        emitted: threads.length,
        diagnostics: diagnostics.slice(0, 8)
      });
    document.documentElement?.setAttribute?.(
      "data-flowsi-chatbot-graphql-inbox",
      graphqlDiagnostic
    );
    document.documentElement?.setAttribute?.(
      `data-flowsi-chatbot-graphql-inbox-${normalize(folder)}`,
      graphqlDiagnostic
    );
    return threads;
  }

  async function readChatbotInbox() {
    // The modern Instagram web inbox is GraphQL/Lightspeed-based. Read its
    // authenticated thread digest directly; never click the visible Messages
    // tray and never navigate the user's tab to /direct/inbox/.
    const [graphqlPrimaryResult, graphqlGeneralResult] = await Promise.allSettled([
      fetchChatbotGraphqlInbox("PRIMARY"),
      fetchChatbotGraphqlInbox("GENERAL")
    ]);
    const graphqlPrimary = graphqlPrimaryResult.status === "fulfilled"
      ? graphqlPrimaryResult.value
      : [];
    const graphqlGeneral = graphqlGeneralResult.status === "fulfilled"
      ? graphqlGeneralResult.value
      : [];
    const graphqlError = [graphqlPrimaryResult, graphqlGeneralResult]
      .filter(result => result.status === "rejected")
      .map(result => result.reason?.message || String(result.reason))
      .join("; ");
    if (graphqlError) {
      document.documentElement?.setAttribute?.(
        "data-flowsi-chatbot-graphql-inbox-error",
        JSON.stringify({ at: new Date().toISOString(), error: graphqlError })
      );
    }
    const [unifiedResult, primaryResult, generalResult] = await Promise.allSettled([
      fetchChatbotUnifiedInbox(),
      fetchChatbotInboxFolder(0),
      fetchChatbotInboxFolder(1)
    ]);
    const unified = unifiedResult.status === "fulfilled" ? unifiedResult.value : [];
    const primary = [
      ...graphqlPrimary,
      ...unified,
      ...(primaryResult.status === "fulfilled" ? primaryResult.value : [])
    ];
    const general = [
      ...graphqlGeneral,
      ...(generalResult.status === "fulfilled" ? generalResult.value : [])
    ];
    const realtimeThreads = readRealtimeChatbotThreads();
    let visibleThreads = [];
    let visibleSource = "none";
    let visibleError = null;

    try {
      if (conversationRows(document).length) {
        visibleThreads = await readVisibleChatbotThreadsFromRows(document);
        visibleSource = "current-document";
      }
    } catch (error) {
      visibleError = error;
    }
    if (
      unifiedResult.status === "rejected" &&
      primaryResult.status === "rejected" &&
      generalResult.status === "rejected" &&
      !visibleThreads.length &&
      !graphqlPrimary.length &&
      !graphqlGeneral.length
    ) {
      throw unifiedResult.reason || primaryResult.reason || generalResult.reason || visibleError;
    }
    return {
      // The API can legitimately answer with an empty/stale inbox. React keeps
      // the rendered row's username and thread metadata, so merge those rows
      // without opening a conversation or depending on the CRM contact list.
      // Realtime toast events are appended last so their immutable message ID
      // wins when the same thread is also present in a stale API/DOM snapshot.
      primary: [...primary, ...visibleThreads, ...realtimeThreads],
      general,
      viewerId: currentAccountUserId(),
      accountUsername: currentAccountUsername(),
      visibleThreads: visibleThreads.length,
      visibleSource,
      unifiedThreads: unified.length,
      realtimeThreads: realtimeThreads.length,
      graphqlPrimaryThreads: graphqlPrimary.length,
      graphqlGeneralThreads: graphqlGeneral.length,
      graphqlError: graphqlError || null
    };
  }

  async function sendChatbotDirect(
    username,
    message,
    existingThreadId = "",
    viewerIdHint = "",
    trustedThreadId = "",
    deliveryId = ""
  ) {
    const normalizedUsername = String(username || "").trim().toLowerCase().replace(/^@+/, "");
    const text = String(message || "").trim();
    if (!isUsername(normalizedUsername) || !text) {
      throw new Error("Destinatário ou mensagem do chatbot inválidos.");
    }
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-instagram-ajax": "1",
      "x-csrftoken": csrfToken(),
      "x-requested-with": "XMLHttpRequest"
    };
    const formHeaders = {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    const destination = await resolveChatbotDestination(
      normalizedUsername,
      String(existingThreadId || ""),
      headers,
      formHeaders,
      viewerIdHint,
      trustedThreadId
    );
    const { threadId, viewerId } = destination;
    const failures = [],
      clientContext = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    // This is the same transport used by the working reference extension.
    // It publishes directly to Instagram's realtime channel and confirms the
    // broker delivery before this function reports success to the background.
    if (viewerId) {
      try {
        const mqttResult = await sendChatbotViaReferenceMqtt(
          threadId,
          text,
          viewerId,
          clientContext,
          deliveryId
        );
        return {
          success: true,
          status: "sent",
          threadId,
          transport: mqttResult?.transport || "instagram-mqtt"
        };
      } catch (error) {
        failures.push(`MQTT: ${error?.message || error}`);
        if (error?.deliveryAttempted) {
          const deliveryError = new Error(
            "O envio MQTT já foi publicado; os canais alternativos foram bloqueados para evitar mensagem duplicada."
          );
          deliveryError.deliveryAttempted = true;
          throw deliveryError;
        }
      }
    } else {
      failures.push("MQTT: o Instagram não informou a conta conectada");
    }

    try {
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
      if (broadcastResponse.ok && broadcastPayload?.status === "ok") {
        return {
          success: true,
          status: "sent",
          threadId,
          transport: "instagram-page-http"
        };
      }
      failures.push(
        `HTTP: ${broadcastPayload?.message || `resposta ${broadcastResponse.status} sem confirmação`}`
      );
    } catch (error) {
      failures.push(`HTTP: ${error?.message || error}`);
    }

    try {
      // UI interaction is deliberately the final fallback. A trusted realtime
      // event already carries Instagram's numeric thread_id, so Home, Explore
      // and profile pages can answer without opening or navigating Direct.
      return await sendChatbotThroughThreadUi(String(existingThreadId || threadId), text);
    } catch (error) {
      failures.push(`interface: ${error?.message || error}`);
    }
    throw new Error(`Nenhum canal confirmou o envio (${failures.join("; ")}).`);
  }

  function namedCookieValue(cookieHeader, name) {
    const expectedName = String(name || "");
    for (const rawEntry of String(cookieHeader || "").split(";")) {
      const entry = rawEntry.trim();
      const separator = entry.indexOf("=");
      if (separator < 0 || entry.slice(0, separator).trim() !== expectedName) continue;
      return entry.slice(separator + 1).trim();
    }
    return "";
  }

  function viewerIdFromRurCookie(cookieHeader = document.cookie) {
    let value = namedCookieValue(cookieHeader, "rur");
    if (!value) return "";
    // Instagram serializes rur as "<shard>\054<viewer fbid>\054<expiry>:<signature>".
    // Depending on the browser build it can additionally be URL-encoded.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const decoded = decodeURIComponent(value);
        if (decoded === value) break;
        value = decoded;
      } catch {
        break;
      }
    }
    value = value
      .replace(/^["']+|["']+$/g, "")
      .replace(/\\u002c/gi, ",")
      .replace(/\\0?54/g, ",")
      .replace(/%2c/gi, ",");
    const structured = value.match(/^[^,]+,(\d{5,}),/);
    return structured?.[1] || "";
  }

  function profileIdFromHtml(html, username) {
    const target = normalize(username);
    if (!target) return "";
    const source = String(html || "")
      .replace(/&quot;|&#0*34;|&#x0*22;/gi, '"')
      .replace(/\\u0022|\\x22/gi, '"')
      .replace(/\\u003a/gi, ":")
      .replace(/\\u002c/gi, ",")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"');
    const profileIds = [];
    const profileIdPattern = /["']profile_id["']\s*:\s*["']?(\d{5,})["']?/gi;
    for (const match of source.matchAll(profileIdPattern)) {
      profileIds.push({ id: match[1], index: match.index || 0 });
    }
    // Older profile HTML used profilePage_<id> rather than profile_id.
    for (const match of source.matchAll(/profilePage_(\d{5,})/g)) {
      profileIds.push({ id: match[1], index: match.index || 0 });
    }
    if (!profileIds.length) return "";
    const usernamePositions = [];
    const usernamePattern = /["']username["']\s*:\s*["']([^"']+)["']/gi;
    for (const match of source.matchAll(usernamePattern)) {
      if (normalize(match[1]) === target) usernamePositions.push(match.index || 0);
    }
    if (!usernamePositions.length) {
      return profileIds.length === 1 ? profileIds[0].id : "";
    }
    const ranked = profileIds.map(candidate => ({
      ...candidate,
      distance: Math.min(...usernamePositions.map(position => Math.abs(position - candidate.index)))
    })).sort((left, right) => left.distance - right.distance);
    // Serialized profile objects keep username and profile_id close together.
    // Refuse an unrelated ID when an authenticated page contains suggestions.
    return ranked[0].distance <= 12000 ? ranked[0].id : "";
  }

  async function profileIdFromAuthenticatedHtml(username, headers, failures) {
    const encoded = encodeURIComponent(username);
    const htmlHeaders = {
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "x-csrftoken": headers?.["x-csrftoken"] || csrfToken()
    };
    for (const url of [
      `https://www.instagram.com/${encoded}/`,
      `https://www.instagram.com/${encoded}/?hl=en`
    ]) {
      try {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: htmlHeaders,
          redirect: "follow"
        });
        if (!response.ok) {
          failures.push(`${new URL(url, location.origin).pathname}: HTML HTTP ${response.status}`);
          continue;
        }
        const profileId = profileIdFromHtml(await response.text(), username);
        if (/^\d+$/.test(profileId)) return profileId;
        failures.push(`${new URL(url, location.origin).pathname}: profile_id ausente no HTML`);
      } catch (error) {
        failures.push(`HTML: ${error?.message || String(error)}`);
      }
    }
    return "";
  }

  async function resolveChatbotDestination(
    username,
    hintedThreadId,
    headers,
    formHeaders,
    viewerIdHint = "",
    trustedThreadId = ""
  ) {
    const cached = chatbotThreadCache.get(username);
    // /direct/t/<number>/ exposes a thread_key, not necessarily the thread_id
    // accepted by /ig_send_message. Never promote the URL hint to MQTT ID.
    void hintedThreadId;
    const safeTrustedThreadId = /^\d+$/.test(String(trustedThreadId || ""))
      ? String(trustedThreadId)
      : "";
    let threadId = String(safeTrustedThreadId || cached?.threadId || "");
    let userId = String(cached?.userId || "");
    const safeViewerIdHint = /^\d+$/.test(String(viewerIdHint || ""))
      ? String(viewerIdHint)
      : "";
    let viewerId = String(cached?.viewerId || safeViewerIdHint || viewerIdFromRurCookie() || "");
    if (safeTrustedThreadId) {
      chatbotThreadCache.set(username, {
        threadId: safeTrustedThreadId,
        userId,
        viewerId,
        at: Date.now()
      });
      return { threadId: safeTrustedThreadId, userId, viewerId, trustedThreadId: true };
    }
    if (
      cached &&
      Date.now() - cached.at < 10 * 60 * 1000 &&
      /^\d+$/.test(threadId)
    ) {
      return { threadId, userId, viewerId };
    }
    const encoded = encodeURIComponent(username);
    const profileUrls = [
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encoded}`,
      `/api/v1/users/web_profile_info/?username=${encoded}`,
      `/api/v1/web/search/topsearch/?context=blended&query=${encoded}&include_reel=true`,
      `/web/search/topsearch/?query=${encoded}`
    ];
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
        userId = String(match?.id || match?.pk || userId || "");
        viewerId = String(
          viewerId || match?.viewer_id || directUser?.viewer_id || payload?.data?.user?.viewer_id || ""
        );
        if (/^\d+$/.test(userId) && /^\d+$/.test(viewerId)) break;
      } catch (error) {
        failures.push(error?.message || String(error));
      }
    }
    if (!/^\d+$/.test(userId)) {
      userId = await profileIdFromAuthenticatedHtml(username, headers, failures);
    }
    if (!/^\d+$/.test(userId)) {
      throw new Error(`Não foi possível resolver o ID real de @${username} (${failures.join("; ")}).`);
    }
    if (!/^\d+$/.test(viewerId)) viewerId = viewerIdFromRurCookie();
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
        threadId = String(payload?.thread_id || payload?.thread?.thread_id || "");
        if (response.ok && /^\d+$/.test(threadId)) {
          chatbotThreadCache.set(username, { threadId, userId, viewerId, at: Date.now() });
          return { threadId, userId, viewerId };
        }
        failures.push(`${new URL(endpoint, location.origin).pathname}: HTTP ${response.status}`);
      } catch (error) {
        failures.push(error?.message || String(error));
      }
    }
    throw new Error(`Não foi possível localizar a conversa real de @${username} (${failures.join("; ")}).`);
  }

  function sendChatbotViaReferenceMqtt(
    threadId,
    text,
    viewerId,
    clientContext,
    deliveryId = ""
  ) {
    return new Promise((resolve, reject) => {
      const requestId = String(deliveryId || "").trim() ||
        `flowsi-chatbot-mqtt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        else {
          const error = new Error(result.error || "O canal MQTT recusou a mensagem.");
          error.deliveryAttempted = Boolean(result.delivery_attempted);
          reject(error);
        }
      }
      window.addEventListener("message", onResult);
      window.postMessage({
        type: "INJECT_DISPATCH_DM_REQUEST_V5",
        request_id: requestId,
        client_context: String(clientContext || ""),
        thread_id: threadId,
        viewer_id: viewerId,
        text,
        debug: false
      }, "*");
    });
  }

  async function sendChatbotThroughThreadUi(threadId, text) {
    const currentThreadId = location.pathname.match(/^\/direct\/t\/(\d+)/)?.[1] || "";
    let frame = null;
    let frameDocument = currentThreadId === String(threadId) ? document : null;
    let frameWindow = frameDocument ? window : null;
    if (!frameDocument) {
      frame = document.createElement("iframe");
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
    }
    try {
      const deadline = Date.now() + 25000;
      let editor = null;
      while (Date.now() < deadline && !editor) {
        if (frame) {
          try {
            frameDocument = frame.contentDocument;
            frameWindow = frame.contentWindow;
          } catch {
            frameDocument = null;
            frameWindow = null;
          }
        }
        if (!frameDocument) {
          await sleep(150);
          continue;
        }
        editor = [...frameDocument.querySelectorAll('[contenteditable="true"], [role="textbox"]')].find(element => {
          const label = [
            element.getAttribute("aria-label"),
            element.getAttribute("aria-placeholder"),
            element.getAttribute("data-placeholder"),
            element.getAttribute("data-lexical-editor"),
            element.getAttribute("role")
          ].filter(Boolean).join(" ");
          const rect = element.getBoundingClientRect();
          return rect.width > 120 && rect.height >= 16 && /mensagem|message|true|textbox/i.test(label);
        }) || null;
        if (!editor) await sleep(150);
      }
      if (!editor || !frameDocument || !frameWindow) {
        throw new Error("A caixa de mensagem do Direct não ficou disponível.");
      }
      const normalizedText = normalize(text);
      const countVisibleMessages = () => [...frameDocument.querySelectorAll("div, span, p")]
        .filter(element => element.children.length === 0 && normalize(element.textContent) === normalizedText)
        .length;
      const beforeCount = countVisibleMessages();
      editor.focus();
      editor.click();
      let inserted = false;
      try {
        inserted = frameDocument.execCommand("insertText", false, text);
      } catch {}
      if (!inserted || normalize(editor.textContent) !== normalizedText) {
        editor.textContent = text;
        editor.dispatchEvent(new frameWindow.InputEvent("input", {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType: "insertText",
          data: text
        }));
      }
      await sleep(100);
      const sendButton = [...frameDocument.querySelectorAll('button, [role="button"]')].find(button => {
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
      if (frame) frame.remove();
    }
  }

  async function sendChatbotMediaThroughThreadUi(threadId, dataUrl, mediaType, title, caption) {
    const currentThreadId = location.pathname.match(/^\/direct\/t\/(\d+)/)?.[1] || "";
    let frame = null;
    let frameDocument = currentThreadId === String(threadId) ? document : null;
    let frameWindow = frameDocument ? window : null;
    if (!frameDocument) {
      frame = document.createElement("iframe");
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
    }
    let deliveryAttempted = false;
    try {
      const deadline = Date.now() + 30000;
      let fileInput = null;
      while (Date.now() < deadline && !fileInput) {
        if (frame) {
          try {
            frameDocument = frame.contentDocument;
            frameWindow = frame.contentWindow;
          } catch {
            frameDocument = null;
            frameWindow = null;
          }
        }
        if (frameDocument) {
          fileInput = [...frameDocument.querySelectorAll('input[type="file"]')]
            .find(input => !input.disabled) || null;
        }
        if (!fileInput) await sleep(150);
      }
      if (!fileInput || !frameDocument || !frameWindow) {
        throw new Error("O anexo do Direct não ficou disponível.");
      }

      const response = await fetch(String(dataUrl || ""));
      if (!response.ok) throw new Error("Não foi possível abrir o arquivo salvo.");
      const blob = await response.blob();
      const subtype = String(blob.type || "application/octet-stream").split("/")[1]
        ?.split(";")[0]
        ?.replace(/[^a-z0-9.+-]/gi, "") || "bin";
      const baseName = String(title || mediaType || "arquivo")
        .replace(/[^a-z0-9._-]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "arquivo";
      const fileName = baseName.includes(".") ? baseName : `${baseName}.${subtype}`;
      const FileConstructor = frameWindow.File || File;
      const DataTransferConstructor = frameWindow.DataTransfer || DataTransfer;
      const file = new FileConstructor([blob], fileName, { type: blob.type });
      const transfer = new DataTransferConstructor();
      transfer.items.add(file);

      const messageArticleSelector =
        '[role="article"][aria-roledescription="message"], [role="article"]';
      const beforeArticleElements = new Set(
        frameDocument.querySelectorAll(messageArticleSelector)
      );
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new frameWindow.Event("input", { bubbles: true }));
      fileInput.dispatchEvent(new frameWindow.Event("change", { bubbles: true }));
      await sleep(900);

      const editor = [...frameDocument.querySelectorAll('[contenteditable="true"], [role="textbox"]')]
        .find(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 120 && rect.height >= 16;
        }) || null;
      const text = String(caption || "").trim();
      if (editor && text) {
        editor.focus();
        editor.click();
        let inserted = false;
        try { inserted = frameDocument.execCommand("insertText", false, text); } catch {}
        if (!inserted || normalize(editor.textContent) !== normalize(text)) {
          editor.textContent = text;
          editor.dispatchEvent(new frameWindow.InputEvent("input", {
            bubbles: true,
            cancelable: true,
            composed: true,
            inputType: "insertText",
            data: text
          }));
        }
      }

      const sendButton = [...frameDocument.querySelectorAll('button, [role="button"]')]
        .filter(button => !button.disabled)
        .reverse()
        .find(button => {
          const label = `${button.textContent || ""} ${button.getAttribute("aria-label") || ""}`.trim();
          return /^(enviar|send)(\s|$)/i.test(label);
        });
      if (sendButton) {
        deliveryAttempted = true;
        sendButton.click();
      } else if (editor) {
        deliveryAttempted = true;
        for (const eventType of ["keydown", "keypress", "keyup"]) {
          editor.dispatchEvent(new frameWindow.KeyboardEvent(eventType, {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }));
        }
      } else {
        throw new Error("O botão de envio do anexo não ficou disponível.");
      }

      const confirmationDeadline = Date.now() + 20000;
      while (Date.now() < confirmationDeadline) {
        await sleep(250);
        const currentArticles = [...frameDocument.querySelectorAll(messageArticleSelector)];
        if (currentArticles.some(article => !beforeArticleElements.has(article))) {
          return {
            success: true,
            status: "sent",
            threadId,
            transport: "instagram-thread-media-ui-verified"
          };
        }
      }
      const error = new Error("O arquivo não apareceu na conversa após o envio.");
      error.deliveryAttempted = deliveryAttempted;
      throw error;
    } catch (error) {
      error.deliveryAttempted = Boolean(error?.deliveryAttempted || deliveryAttempted);
      throw error;
    } finally {
      if (frame) frame.remove();
    }
  }

  async function sendChatbotMedia(
    username,
    dataUrl,
    mediaType,
    title,
    caption,
    existingThreadId = "",
    viewerIdHint = "",
    trustedThreadId = ""
  ) {
    const normalizedUsername = String(username || "").trim().toLowerCase().replace(/^@+/, "");
    if (!isUsername(normalizedUsername) || !String(dataUrl || "").trim()) {
      throw new Error("Destinatário ou arquivo do chatbot inválidos.");
    }
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-instagram-ajax": "1",
      "x-csrftoken": csrfToken(),
      "x-requested-with": "XMLHttpRequest"
    };
    const formHeaders = {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded"
    };
    const destination = await resolveChatbotDestination(
      normalizedUsername,
      String(existingThreadId || ""),
      headers,
      formHeaders,
      viewerIdHint,
      trustedThreadId
    );
    return sendChatbotMediaThroughThreadUi(
      destination.threadId,
      dataUrl,
      mediaType,
      title,
      caption
    );
  }

  function topicListRoot(sourceDocument = document) {
    const roots = [...sourceDocument.querySelectorAll(
      '[aria-label="Lista de tópicos"], [aria-label="Threads list"], [aria-label="Conversation list"]'
    )];
    return roots.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).display !== "none";
    }) || roots[0] || null;
  }

  function conversationRows(sourceDocument = document) {
    const root = topicListRoot(sourceDocument);
    if (!root) return [];
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
    // A miss can be transient while Instagram is still mounting the toast or
    // while one of the search hosts is unavailable. Only positive matches are
    // reusable; caching `null` would make every later notification from the
    // same person impossible to resolve until the whole page was reloaded.
    if (match) hiddenSearchCache.set(cacheKey, match);
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
    const queue = reactRoots(row).map(value => ({
      value,
      depth: 0,
      threadId: "",
      lastItemId: "",
      lastActivityAt: ""
    }));
    const seen = new WeakSet();
    const candidates = [];
    let visited = 0;

    while (queue.length && visited < 3000) {
      const current = queue.shift();
      const value = current.value;
      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      // DOM nodes from the hidden same-origin inbox live in another realm, so
      // `instanceof Node` alone is false for them. Skip them by nodeType too;
      // otherwise the React traversal can waste its visit budget walking the
      // iframe DOM before reaching the thread/message metadata.
      if (value instanceof Node || Number.isInteger(value?.nodeType) || seen.has(value)) continue;
      seen.add(value);
      visited += 1;

      const localThreadId = String(
        value.thread_id || value.threadId || value.thread?.thread_id || current.threadId || ""
      );
      const localLastItemId = String(
        value.last_permanent_item?.item_id ||
        value.last_item?.item_id ||
        value.last_message?.item_id ||
        value.item_id ||
        value.client_context ||
        current.lastItemId ||
        ""
      );
      const localLastActivityAt = String(
        value.last_activity_at ||
        value.lastActivityAt ||
        value.thread?.last_activity_at ||
        value.thread?.lastActivityAt ||
        current.lastActivityAt ||
        ""
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
          lastItemId: localLastItemId,
          lastActivityAt: localLastActivityAt,
          score
        });
      }

      if (current.depth >= 9) continue;
      let entries = [];
      try { entries = Object.entries(value); } catch { continue; }
      for (const [key, child] of entries) {
        if (key === "stateNode" || key === "_owner" || key === "return") continue;
        if (!child || (typeof child !== "object" && typeof child !== "function")) continue;
        queue.push({
          value: child,
          depth: current.depth + 1,
          threadId: localThreadId,
          lastItemId: localLastItemId,
          lastActivityAt: localLastActivityAt
        });
      }

      if (value.return && current.depth < 5) {
        queue.push({
          value: value.return,
          depth: current.depth + 1,
          threadId: localThreadId,
          lastItemId: localLastItemId,
          lastActivityAt: localLastActivityAt
        });
      }
      if (value.memoizedProps) queue.push({
        value: value.memoizedProps,
        depth: current.depth + 1,
        threadId: localThreadId,
        lastItemId: localLastItemId,
        lastActivityAt: localLastActivityAt
      });
      if (value.pendingProps) queue.push({
        value: value.pendingProps,
        depth: current.depth + 1,
        threadId: localThreadId,
        lastItemId: localLastItemId,
        lastActivityAt: localLastActivityAt
      });
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
      // A CRM/profile `id` is a user PK, not a Direct thread_id. Only React's
      // thread metadata or an explicitly stored threadId may be trusted here.
      // When neither exists, keep the destination unresolved so the sender
      // resolves the conversation safely by username instead of broadcasting
      // to a numeric profile ID.
      threadId: reactData?.threadId || knownContact?.threadId || "",
      name: displayName || reactData?.fullName || knownContact?.name || searchUser?.full_name || username,
      profileImage: reactData?.profileImage || knownContact?.profileImage ||
        searchUser?.profile_pic_url || profileImage,
      username,
      messageId,
      lastItemId: reactData?.lastItemId || "",
      lastActivityAt: reactData?.lastActivityAt || ""
    };
  }

  function recentChatbotRowMinutes(value) {
    const normalized = normalize(value);
    if (/\b(agora|now|alguns segundos|few seconds)\b/.test(normalized)) return 0;
    const match = normalized.match(/(?:^|\s)(\d+)\s*(?:min|minuto|minutos|m)(?:\s|$)/);
    if (!match) return null;
    const minutes = Number(match[1]);
    return Number.isFinite(minutes) && minutes <= 5 ? minutes : null;
  }

  function stableChatbotRowHash(value) {
    let hash = 2166136261;
    for (const character of String(value || "")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function chatbotTimestampMicros(value, fallbackMinutes) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      if (numeric >= 1e15) return Math.trunc(numeric);
      if (numeric >= 1e12) return Math.trunc(numeric * 1000);
      if (numeric >= 1e9) return Math.trunc(numeric * 1000000);
    }
    return (Date.now() - fallbackMinutes * 60 * 1000) * 1000;
  }

  function removeChatbotInboxFrame() {
    if (chatbotInboxFrameCleanupTimer) {
      clearTimeout(chatbotInboxFrameCleanupTimer);
      chatbotInboxFrameCleanupTimer = null;
    }
    if (chatbotInboxFrame) {
      try { chatbotInboxFrame.remove(); } catch {}
      chatbotInboxFrame = null;
    }
    chatbotInboxFrameObserver?.disconnect?.();
    chatbotInboxFrameObserver = null;
    chatbotInboxFrameObservedDocument = null;
    if (chatbotInboxFrameScanTimer) clearTimeout(chatbotInboxFrameScanTimer);
    chatbotInboxFrameScanTimer = null;
    chatbotInboxFrameScanInFlight = false;
    chatbotInboxFrameScanPending = false;
    chatbotInboxFrameSeenItems.clear();
  }

  function scheduleChatbotInboxFrameCleanup() {
    if (chatbotInboxFrameCleanupTimer) clearTimeout(chatbotInboxFrameCleanupTimer);
    chatbotInboxFrameCleanupTimer = setTimeout(
      removeChatbotInboxFrame,
      CHATBOT_INBOX_FRAME_IDLE_MS
    );
    chatbotInboxFrameCleanupTimer?.unref?.();
  }

  async function hiddenChatbotInboxDocument() {
    if (location.pathname === "/direct/inbox/") return document;
    if (chatbotInboxFrame?.isConnected === false) chatbotInboxFrame = null;
    if (!chatbotInboxFrame) {
      const frame = document.createElement("iframe");
      frame.id = "flowsi-chatbot-hidden-inbox-frame";
      frame.setAttribute("data-flowsi-chatbot-hidden-inbox-frame", "true");
      frame.setAttribute("aria-hidden", "true");
      frame.setAttribute("title", "");
      frame.tabIndex = -1;
      Object.assign(frame.style, {
        position: "fixed",
        left: "-20000px",
        top: "-20000px",
        width: "1280px",
        height: "900px",
        opacity: "0",
        pointerEvents: "none",
        border: "0"
      });
      frame.src = "/direct/inbox/";
      (document.body || document.documentElement).appendChild(frame);
      chatbotInboxFrame = frame;
    }

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      let frameDocument = null;
      try { frameDocument = chatbotInboxFrame?.contentDocument || null; } catch {}
      if (frameDocument && conversationRows(frameDocument).length) {
        return frameDocument;
      }
      await sleep(200);
    }
    removeChatbotInboxFrame();
    return null;
  }

  async function readVisibleChatbotThreadsFromRows(sourceDocument = document) {
    const rows = conversationRows(sourceDocument);
    if (!rows.length) return [];
    const threads = [];
    const isActive = () => true;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rawText = String(row.innerText || row.textContent || "");
      const lines = rawText.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      const timeLine = [...lines].reverse()
        .find(line => recentChatbotRowMinutes(line) !== null) || "";
      const minutes = recentChatbotRowMinutes(timeLine || rawText);
      if (minutes === null) continue;

      const contact = await rowToContact(row, index, [], isActive).catch(() => null);
      if (!contact?.username) continue;
      const displayName = normalize(contact.name);
      const username = normalize(contact.username).replace(/^@+/, "");
      const previewParts = leafTexts(row).filter((value, partIndex) => {
        const normalized = normalize(value).replace(/^@+/, "");
        if (partIndex === 0 && normalized === displayName) return false;
        if (normalized === username) return false;
        return value !== timeLine;
      });
      const preview = previewParts.join(" ").trim();
      if (
        !preview ||
        /^(voce|you)(:| enviou| sent)/i.test(normalize(preview)) ||
        /^\d+\s+(new messages?|novas mensagens?|mensagens novas?)$/i.test(normalize(preview))
      ) continue;

      const threadId = String(contact.threadId || `dom-${username}`);
      const senderId = String(contact.messageId || contact.userId || contact.pk || username);
      const rowSignature = [
        threadId,
        username,
        preview,
        row.getAttribute?.("aria-label") || ""
      ].join("|");
      const itemId = contact.lastItemId
        ? String(contact.lastItemId)
        : contact.lastActivityAt
          ? `activity-${stableChatbotRowHash(`${threadId}|${contact.lastActivityAt}`)}`
          : `dom-row-${username}-${stableChatbotRowHash(rowSignature)}`;
      threads.push({
        _flowsiRealtimeIdentity: contact.lastItemId
          ? "item-id"
          : contact.lastActivityAt
            ? "activity"
            : "dom-fallback",
        thread_id: threadId,
        users: [{
          pk: senderId,
          id: senderId,
          username,
          full_name: contact.name || contact.full_name || username
        }],
        items: [{
          item_id: itemId,
          user_id: senderId,
          text: preview,
          timestamp: chatbotTimestampMicros(contact.lastActivityAt, minutes)
        }]
      });
    }
    return threads;
  }

  function hiddenChatbotInboxItemId(thread) {
    return String(thread?.items?.[0]?.item_id || thread?.items?.[0]?.client_context || "").trim();
  }

  function serializeRealtimeBranch(value, depth = 0, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;
    if (["string", "number", "boolean"].includes(typeof value)) return value;
    if (typeof value === "bigint") return String(value);
    if (typeof value !== "object" || depth > 6) return undefined;
    if (typeof Node !== "undefined" && value instanceof Node) return undefined;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.slice(0, 50)
        .map(item => serializeRealtimeBranch(item, depth + 1, seen))
        .filter(item => item !== undefined);
    }
    const result = {};
    let entries = [];
    try { entries = Object.entries(value).slice(0, 100); } catch { return undefined; }
    for (const [key, child] of entries) {
      if (
        key === "stateNode" || key === "_owner" || key === "return" ||
        key.startsWith("__react") || typeof child === "function"
      ) continue;
      const serialized = serializeRealtimeBranch(child, depth + 1, seen);
      if (serialized !== undefined) result[key] = serialized;
    }
    return result;
  }

  function firstRealtimeText(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  function realtimeChatbotItemText(value) {
    return firstRealtimeText(
      value?.text,
      value?.message?.text,
      value?.item?.text,
      value?.reel_share?.text,
      value?.story_share?.text,
      value?.item?.reel_share?.text,
      value?.item?.story_share?.text,
      value?.message?.reel_share?.text,
      value?.message?.story_share?.text,
      value?.reel_share?.reel?.caption?.text,
      value?.story_share?.story?.caption?.text,
      value?.item?.reel_share?.reel?.caption?.text,
      value?.item?.story_share?.story?.caption?.text,
      value?.link?.text,
      value?.item?.link?.text,
      value?.placeholder?.title,
      value?.item?.placeholder?.title
    );
  }

  function serializeRealtimeChatbotItem(value, fallback) {
    const sources = [value, value?.item, value?.message].filter(Boolean);
    const item = {
      item_id: String(fallback?.itemId || ""),
      user_id: String(fallback?.senderId || ""),
      text: String(fallback?.text || ""),
      timestamp: String(fallback?.timestamp || "")
    };
    for (const key of [
      "client_context",
      "item_type",
      "message_id",
      "sender_id",
      "thread_id",
      "reel_share",
      "story_share",
      "link",
      "media_share",
      "visual_media",
      "raven_media",
      "voice_media",
      "clip",
      "xma_media_share",
      "placeholder"
    ]) {
      const source = sources.find(candidate => candidate?.[key] !== undefined);
      if (!source) continue;
      const serialized = serializeRealtimeBranch(source[key]);
      if (serialized !== undefined) item[key] = serialized;
    }
    return item;
  }

  function publishRealtimeChatbotThread(thread, diagnosticAttribute) {
    const serializedThread = serializeRealtimeBranch(thread);
    const item = serializedThread?.items?.[0];
    const eventId = String(item?.item_id || item?.client_context || "").trim();
    if (!eventId) {
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-realtime-error",
        JSON.stringify({ at: new Date().toISOString(), stage: "publish", error: "item_id ausente" })
      );
      return false;
    }
    if (chatbotRealtimeThreads.has(eventId)) return true;
    const capturedAt = Date.now();
    chatbotRealtimeThreads.set(eventId, { thread: serializedThread, capturedAt });
    pruneRealtimeChatbotThreads(capturedAt);
    const username = String(serializedThread?.users?.[0]?.username || "");
    const text = String(item?.text || realtimeChatbotItemText(item) || "");
    const threadId = String(serializedThread?.thread_id || item?.thread_id || "");
    const diagnostic = JSON.stringify({
      at: new Date(capturedAt).toISOString(),
      status: "published",
      username,
      threadId,
      eventId,
      text: text.slice(0, 120)
    });
    document.documentElement.setAttribute(diagnosticAttribute, diagnostic);
    document.documentElement.setAttribute("data-flowsi-chatbot-realtime-publish", diagnostic);
    try {
      window.postMessage({
        source: CHATBOT_REALTIME_EVENT_SOURCE,
        eventId,
        capturedAt,
        viewerId: String(currentAccountUserId() || ""),
        trustedThreadId: /^\d+$/.test(threadId) ? threadId : "",
        thread: serializedThread,
        item
      }, "*");
      return true;
    } catch (error) {
      chatbotRealtimeThreads.delete(eventId);
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-realtime-error",
        JSON.stringify({
          at: new Date().toISOString(),
          stage: "post-message",
          eventId,
          error: String(error?.message || error || "Falha ao serializar o evento realtime.")
        })
      );
      return false;
    }
  }

  function rememberHiddenChatbotInboxThreads(threads) {
    for (const thread of Array.isArray(threads) ? threads : []) {
      const itemId = hiddenChatbotInboxItemId(thread);
      if (itemId) chatbotInboxFrameSeenItems.add(itemId);
    }
    while (chatbotInboxFrameSeenItems.size > 500) {
      chatbotInboxFrameSeenItems.delete(chatbotInboxFrameSeenItems.values().next().value);
    }
  }

  function publishHiddenChatbotInboxThread(thread) {
    const eventId = hiddenChatbotInboxItemId(thread);
    // A text/ARIA-derived row signature is not immutable and could either
    // replay after a React remount or suppress a later identical message.
    // Require Instagram's item ID or its precise last-activity watermark for
    // automatic replies from the invisible inbox.
    if (
      !eventId ||
      thread?._flowsiRealtimeIdentity === "dom-fallback" ||
      chatbotRealtimeThreads.has(eventId)
    ) return false;
    return publishRealtimeChatbotThread(thread, "data-flowsi-chatbot-hidden-inbox-event");
  }

  async function scanHiddenChatbotInboxForNewMessages() {
    if (chatbotInboxFrameScanInFlight) {
      chatbotInboxFrameScanPending = true;
      return;
    }
    chatbotInboxFrameScanInFlight = true;
    try {
      do {
        chatbotInboxFrameScanPending = false;
        const sourceDocument = chatbotInboxFrameObservedDocument;
        const activeDocument = location.pathname === "/direct/inbox/"
          ? document
          : chatbotInboxFrame?.contentDocument;
        if (!sourceDocument || sourceDocument !== activeDocument) return;
        const threads = await readVisibleChatbotThreadsFromRows(sourceDocument);
        let published = 0;
        let ignoredUnstable = 0;
        for (const thread of threads) {
          const itemId = hiddenChatbotInboxItemId(thread);
          if (!itemId || chatbotInboxFrameSeenItems.has(itemId)) continue;
          chatbotInboxFrameSeenItems.add(itemId);
          if (thread?._flowsiRealtimeIdentity === "dom-fallback") {
            ignoredUnstable += 1;
            continue;
          }
          if (publishHiddenChatbotInboxThread(thread)) published += 1;
        }
        rememberHiddenChatbotInboxThreads(threads);
        document.documentElement.setAttribute(
          "data-flowsi-chatbot-hidden-inbox-scan",
          JSON.stringify({
            at: new Date().toISOString(),
            status: "scanned",
            threads: threads.length,
            published,
            ignoredUnstable
          })
        );
      } while (chatbotInboxFrameScanPending);
    } catch (error) {
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-hidden-inbox-error",
        String(error?.message || error || "Falha ao acompanhar o inbox invisível.")
      );
    } finally {
      chatbotInboxFrameScanInFlight = false;
    }
  }

  function scheduleHiddenChatbotInboxScan() {
    chatbotInboxFrameScanPending = true;
    if (chatbotInboxFrameScanTimer) return;
    chatbotInboxFrameScanTimer = setTimeout(() => {
      chatbotInboxFrameScanTimer = null;
      void scanHiddenChatbotInboxForNewMessages();
    }, 180);
  }

  function installHiddenChatbotInboxRealtimeBridge(sourceDocument, baselineThreads = []) {
    if (!sourceDocument) return;
    if (chatbotInboxFrameObservedDocument === sourceDocument && chatbotInboxFrameObserver) {
      rememberHiddenChatbotInboxThreads(baselineThreads);
      return;
    }
    chatbotInboxFrameObserver?.disconnect?.();
    chatbotInboxFrameObservedDocument = sourceDocument;
    chatbotInboxFrameSeenItems.clear();
    rememberHiddenChatbotInboxThreads(baselineThreads);
    // Observe the document root so a React replacement of the thread list does
    // not silently detach the realtime bridge.
    const root = sourceDocument.documentElement || sourceDocument.body || topicListRoot(sourceDocument);
    if (!root || typeof MutationObserver !== "function") return;
    chatbotInboxFrameObserver = new MutationObserver(() => scheduleHiddenChatbotInboxScan());
    chatbotInboxFrameObserver.observe(root, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true
    });
    document.documentElement.setAttribute(
      "data-flowsi-chatbot-hidden-inbox",
      JSON.stringify({
        at: new Date().toISOString(),
        status: "watching",
        baselineItems: chatbotInboxFrameSeenItems.size
      })
    );
  }

  async function ensureHiddenChatbotInboxRealtimeBridge() {
    const activeDocument = location.pathname === "/direct/inbox/"
      ? document
      : chatbotInboxFrame?.contentDocument;
    if (
      chatbotInboxFrameObserver &&
      chatbotInboxFrameObservedDocument &&
      chatbotInboxFrameObservedDocument === activeDocument
    ) {
      return {
        ready: true,
        baselineThreads: chatbotInboxFrameSeenItems.size,
        reused: true
      };
    }
    if (chatbotInboxBridgeInstallPromise) return chatbotInboxBridgeInstallPromise;

    chatbotInboxBridgeInstallPromise = (async () => {
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-hidden-inbox",
        JSON.stringify({ at: new Date().toISOString(), status: "loading" })
      );
      const sourceDocument = await hiddenChatbotInboxDocument();
      if (!sourceDocument) {
        throw new Error("O Instagram não carregou o inbox invisível.");
      }
      const baselineThreads = await readVisibleChatbotThreadsFromRows(sourceDocument);
      installHiddenChatbotInboxRealtimeBridge(sourceDocument, baselineThreads);
      return {
        ready: Boolean(chatbotInboxFrameObserver),
        baselineThreads: baselineThreads.length,
        reused: false
      };
    })().catch(error => {
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-hidden-inbox",
        JSON.stringify({
          at: new Date().toISOString(),
          status: "error",
          error: String(error?.message || error || "Falha ao iniciar o inbox invisível.")
        })
      );
      throw error;
    }).finally(() => {
      chatbotInboxBridgeInstallPromise = null;
    });
    return chatbotInboxBridgeInstallPromise;
  }

  function pruneRealtimeChatbotThreads(now = Date.now()) {
    for (const [eventId, entry] of chatbotRealtimeThreads) {
      if (now - Number(entry?.capturedAt || 0) > CHATBOT_REALTIME_EVENT_TTL_MS) {
        chatbotRealtimeThreads.delete(eventId);
      }
    }
    while (chatbotRealtimeThreads.size > 50) {
      chatbotRealtimeThreads.delete(chatbotRealtimeThreads.keys().next().value);
    }
  }

  function pruneRealtimeChatbotToastSignatures(now = Date.now()) {
    for (const [signature, capturedAt] of chatbotRealtimeToastSignatures) {
      const signatureTtl = String(signature || "").startsWith("item-")
        ? CHATBOT_REALTIME_TOAST_ITEM_SIGNATURE_TTL_MS
        : CHATBOT_REALTIME_TOAST_FALLBACK_SIGNATURE_TTL_MS;
      if (now - Number(capturedAt || 0) > signatureTtl) {
        chatbotRealtimeToastSignatures.delete(signature);
      }
    }
    while (chatbotRealtimeToastSignatures.size > 30) {
      chatbotRealtimeToastSignatures.delete(chatbotRealtimeToastSignatures.keys().next().value);
    }
  }

  function readRealtimeChatbotThreads() {
    pruneRealtimeChatbotThreads();
    return [...chatbotRealtimeThreads.values()].map(entry => entry.thread);
  }

  function realtimeReactRoots(element) {
    const roots = [];
    for (let current = element, level = 0; current && level < 10; level += 1, current = current.parentElement) {
      for (const key of Reflect.ownKeys(current)) {
        if (typeof key === "string" && (key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"))) {
          roots.push({ value: current[key], level });
        }
      }
    }
    return roots;
  }

  function inspectRealtimeChatbotMessage(element) {
    const viewerId = String(currentAccountUserId() || "");
    const visibleText = normalize(element?.innerText || element?.textContent || "");
    const queue = realtimeReactRoots(element).map(root => ({
      value: root.value,
      depth: 0,
      rootLevel: root.level,
      threadId: ""
    }));
    const seen = new WeakSet();
    const usersById = new Map();
    const candidates = [];
    let visited = 0;

    while (queue.length && visited < 5000) {
      const current = queue.shift();
      const value = current.value;
      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (value instanceof Node || Number.isInteger(value?.nodeType) || seen.has(value)) continue;
      seen.add(value);
      visited += 1;

      const threadId = String(
        value.thread_id || value.threadId || value.thread?.thread_id ||
        value.item?.thread_id || value.message?.thread_id || current.threadId || ""
      );
      const username = String(value.username || value.user_name || value.userName || "");
      if (isUsername(username)) {
        const userIds = [
          value.pk,
          value.id,
          value.user_id,
          value.interop_messaging_user_fbid,
          value.eimu_id
        ].map(item => String(item || "")).filter(Boolean);
        for (const userId of userIds) usersById.set(userId, value);
      }

      const itemId = String(
        value.item_id || value.itemId || value.message_id || value.messageId ||
        value.item?.item_id || value.item?.itemId ||
        value.message?.item_id || value.message?.itemId || ""
      ).trim();
      const senderId = String(
        value.user_id || value.userId || value.sender_id || value.senderId ||
        value.sender?.pk || value.sender?.id ||
        value.item?.user_id || value.item?.userId || value.item?.sender_id || value.item?.senderId ||
        value.message?.user_id || value.message?.userId || value.message?.sender_id ||
        value.message?.senderId || ""
      );
      const text = realtimeChatbotItemText(value);
      if (itemId && senderId && text) {
        const normalizedText = normalize(text);
        let score = 120 - current.rootLevel * 14 - current.depth * 2;
        if (visibleText === normalizedText) score += 80;
        else if (visibleText && visibleText.includes(normalizedText)) score += 35;
        if (viewerId && senderId !== viewerId) score += 25;
        if (viewerId && senderId === viewerId) score -= 200;
        if (normalize(value.item_type || value.itemType || value.item?.item_type) === "text") score += 10;
        const timestamp = String(
          value.timestamp || value.timestamp_ms || value.created_at ||
          value.item?.timestamp || value.item?.timestamp_ms ||
          value.message?.timestamp || value.message?.timestamp_ms || ""
        );
        candidates.push({
          itemId,
          senderId,
          text,
          timestamp,
          threadId,
          score,
          item: serializeRealtimeChatbotItem(value, { itemId, senderId, text, timestamp })
        });
      }

      if (current.depth >= 10) continue;
      let entries = [];
      try { entries = Object.entries(value); } catch { continue; }
      for (const [key, child] of entries) {
        if (key === "stateNode" || key === "_owner" || key === "return") continue;
        if (!child || (typeof child !== "object" && typeof child !== "function")) continue;
        queue.push({
          value: child,
          depth: current.depth + 1,
          rootLevel: current.rootLevel,
          threadId
        });
      }
      if (value.return && current.depth < 5) queue.push({
        value: value.return,
        depth: current.depth + 1,
        rootLevel: current.rootLevel,
        threadId
      });
    }

    candidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Number(right.timestamp || 0) - Number(left.timestamp || 0);
    });
    const message = candidates[0];
    if (!message) return null;
    return { ...message, sender: usersById.get(message.senderId) || null };
  }

  function floatingRealtimeChatDetails(element) {
    if (!element || element.nodeType !== 1 || capturedChatbotToastElements.has(element)) return null;
    const viewportWidth = Number(window.innerWidth || document.documentElement?.clientWidth || 0);
    const viewportHeight = Number(window.innerHeight || document.documentElement?.clientHeight || 0);
    const candidates = [];
    for (let panel = element, depth = 0; panel && depth < 18; depth += 1, panel = panel.parentElement) {
      const rect = panel.getBoundingClientRect?.();
      if (
        !rect || rect.width < 240 || rect.width > 540 ||
        rect.height < 180 || rect.height > 760 ||
        (viewportWidth && rect.left < viewportWidth * 0.45) ||
        (viewportWidth && rect.right < viewportWidth - 90) ||
        (viewportHeight && rect.bottom < viewportHeight - 90)
      ) continue;
      const composer = panel.querySelector?.(
        '[role="textbox"], [contenteditable="true"], textarea, input[placeholder*="ensagem" i], input[placeholder*="essage" i]'
      );
      if (!composer) continue;
      const panelAnchors = [...panel.querySelectorAll?.("a[href]") || []];
      const headerAnchor = panelAnchors.find(anchor => {
        const anchorRect = anchor.getBoundingClientRect?.();
        if (!anchorRect || anchorRect.width <= 0 || anchorRect.height <= 0) return false;
        if (anchorRect.top > rect.top + 120) return false;
        try {
          return /^\/[A-Za-z0-9._]{1,30}\/?$/.test(new URL(anchor.href, location.origin).pathname);
        } catch {
          return false;
        }
      });
      const images = [...panel.querySelectorAll?.("img") || []];
      const image = images.find(candidate => {
        const imageRect = candidate.getBoundingClientRect?.();
        return imageRect && imageRect.width > 0 && imageRect.height > 0 && imageRect.top < rect.top + 120;
      }) || images[0] || panel.querySelector?.("img") || null;
      if (!image) continue;
      const lines = String(panel.innerText || panel.textContent || "")
        .split(/\r?\n/)
        .map(value => value.trim())
        .filter(Boolean);
      if (lines.length < 2) continue;
      // The composer is mounted inside an inner 360x464 body that does not
      // contain the conversation header. Prefer the taller ancestor that has
      // the profile link/accessible title; otherwise username resolution on
      // Instagram Home would fail even though the messages are visible.
      const score = (headerAnchor ? 10000 : 0) +
        (panel.getAttribute?.("aria-label") ? 1000 : 0) + rect.height + depth;
      candidates.push({ panel, rect, image, lines, headerAnchor, score });
    }
    candidates.sort((left, right) => right.score - left.score);
    return candidates[0] || null;
  }

  function floatingDomMessageArticle(element) {
    if (!element || element.nodeType !== 1) return null;
    if (element.matches?.('[role="article"][aria-roledescription="message"]')) return element;
    return element.closest?.('[role="article"][aria-roledescription="message"]') || null;
  }

  function floatingDomArticleRawToken(article) {
    if (!article) return "";
    const labelledBy = String(article.getAttribute?.("aria-labelledby") || "").trim();
    const articleId = String(article.id || "").trim();
    const labelledIds = labelledBy.split(/\s+/).filter(Boolean);
    const descendantId = [...article.querySelectorAll?.("[id]") || []]
      .map(element => String(element.id || "").trim())
      .find(Boolean) || "";
    const stableToken = [labelledBy, articleId, descendantId, ...labelledIds].filter(Boolean).join("|");
    if (stableToken) return stableToken;
    if (!article.__flowsiFloatingDomToken) {
      chatbotFloatingDomTokenSequence += 1;
      try {
        Object.defineProperty(article, "__flowsiFloatingDomToken", {
          value: `anonymous-${chatbotFloatingDomTokenSequence}`,
          configurable: true
        });
      } catch {
        article.__flowsiFloatingDomToken = `anonymous-${chatbotFloatingDomTokenSequence}`;
      }
    }
    return String(article.__flowsiFloatingDomToken || "");
  }

  function floatingDomArticleToken(article) {
    const rawToken = floatingDomArticleRawToken(article);
    if (!rawToken) return "";
    return `${currentAccountUserId() || currentAccountUsername() || "viewer"}|${rawToken}`;
  }

  function rememberFloatingDomArticle(article, capturedAt = Date.now()) {
    const token = floatingDomArticleToken(article);
    if (!token) return "";
    chatbotFloatingDomSeenTokens.set(token, capturedAt);
    while (chatbotFloatingDomSeenTokens.size > 1000) {
      chatbotFloatingDomSeenTokens.delete(chatbotFloatingDomSeenTokens.keys().next().value);
    }
    return token;
  }

  function floatingDomSenderUsername(article) {
    const accountUsername = normalize(currentAccountUsername()).replace(/^@+/, "");
    for (
      let current = article, depth = 0;
      current && current !== document.body && depth < 4;
      current = current.parentElement, depth += 1
    ) {
      const labelled = [current, ...current.querySelectorAll?.("[aria-label]") || []];
      for (const element of labelled) {
        const label = String(element.getAttribute?.("aria-label") || "");
        const match = label.match(/(?:mensagem\s+de|message\s+from)\s+@?([A-Za-z0-9._]{1,30})/i);
        if (match && isUsername(match[1])) {
          return {
            username: match[1],
            inbound: accountUsername ? normalize(match[1]) !== accountUsername : null
          };
        }
      }
    }
    return { username: "", inbound: null };
  }

  function floatingPanelHeaderUsername(details) {
    const panel = details?.panel;
    if (!panel) return "";
    const accountUsername = normalize(currentAccountUsername()).replace(/^@+/, "");
    const rect = details.rect || panel.getBoundingClientRect?.();
    const anchors = details.headerAnchor
      ? [details.headerAnchor, ...panel.querySelectorAll?.("a[href]") || []]
      : [...panel.querySelectorAll?.("a[href]") || []];
    for (const anchor of anchors) {
      const anchorRect = anchor.getBoundingClientRect?.();
      if (rect && anchorRect && anchorRect.top > rect.top + 120) continue;
      let username = "";
      try {
        username = new URL(anchor.href, location.origin).pathname
          .match(/^\/([A-Za-z0-9._]{1,30})\/?$/)?.[1] || "";
      } catch {}
      if (isUsername(username) && normalize(username) !== accountUsername) return username;
    }
    return "";
  }

  function floatingDomArticleIsInbound(article, details, message = null) {
    const labelledSender = floatingDomSenderUsername(article);
    if (labelledSender.inbound !== null) return labelledSender.inbound;
    if (labelledSender.username) {
      const headerUsername = floatingPanelHeaderUsername(details);
      if (headerUsername) {
        return normalize(labelledSender.username) === normalize(headerUsername);
      }
    }
    const viewerId = String(currentAccountUserId() || "");
    if (message?.senderId && viewerId) return String(message.senderId) !== viewerId;
    const articleRect = article?.getBoundingClientRect?.();
    const panelRect = details?.rect || details?.panel?.getBoundingClientRect?.();
    if (!articleRect || !panelRect) return null;
    const leftGap = Math.max(0, articleRect.left - panelRect.left);
    const rightGap = Math.max(0, panelRect.right - articleRect.right);
    // Instagram aligns inbound message articles to the left and outbound ones
    // to the right. Comparing both gaps remains stable for short and long text.
    return leftGap < rightGap;
  }

  function floatingDomArticleText(article, rowContext = null, message = null) {
    const inspectedText = String(message?.text || realtimeChatbotItemText(message?.item) || "").trim();
    if (inspectedText) return inspectedText;
    const lines = String(article?.innerText || article?.textContent || "")
      .split(/\r?\n/)
      .map(value => value.replace(/\s+/g, " ").trim())
      .filter(value => value && value.length <= 2000)
      .filter(value => !/^(responder|reply|curtir|like|mais|more|visto|seen)$/i.test(normalize(value)))
      .filter(value => !/^(respondeu ao seu story|replied to your story)$/i.test(normalize(value)))
      .filter(value => !/^(agora|now|\d+\s*(s|min|m|h|d|sem))$/i.test(normalize(value)));
    const directText = lines[lines.length - 1] || "";
    if (directText) return directText;
    const preview = String(rowContext?.preview || "").trim();
    return /(?:new messages?|novas? mensagens?|mensagens? novas?|unread|nao lid)/i.test(normalize(preview))
      ? ""
      : preview;
  }

  function floatingPanelDisplayName(details, rowContext = null) {
    const ariaName = String(details?.panel?.getAttribute?.("aria-label") || "").trim();
    if (ariaName && !/^(mensagens?|messages?)$/i.test(normalize(ariaName))) return ariaName;
    const headerText = details?.headerAnchor?.innerText || details?.headerAnchor?.textContent || "";
    return String(headerText || rowContext?.displayName || details?.lines?.[0] || "").trim();
  }

  async function resolveFloatingDomContact(details, article, rowContext = null, message = null) {
    const displayName = floatingPanelDisplayName(details, rowContext);
    const profileImage = rowContext?.profileImage || details?.image?.currentSrc || details?.image?.src || "";
    const labelledUsername = floatingDomSenderUsername(article).username;
    const headerUsername = floatingPanelHeaderUsername(details);
    const reactContact = message?.sender?.username
      ? {
          username: message.sender.username,
          fullName: message.sender.full_name || message.sender.fullName || displayName,
          profileImage: message.sender.profile_pic_url || message.sender.profilePicUrl || profileImage,
          messageId: message.sender.pk || message.sender.id || message.senderId,
          threadId: message.threadId
        }
      : inspectReactData(details?.panel, displayName, profileImage);
    const directUsername = [
      rowContext?.username,
      labelledUsername,
      headerUsername,
      reactContact?.username
    ].find(username => isUsername(username) && normalize(username) !== normalize(currentAccountUsername()));
    if (directUsername) {
      const reactMatches = normalize(reactContact?.username) === normalize(directUsername);
      return {
        username: directUsername,
        fullName: rowContext?.displayName || (reactMatches && reactContact?.fullName) || displayName || directUsername,
        profileImage: rowContext?.profileImage || (reactMatches && reactContact?.profileImage) || profileImage,
        messageId: (reactMatches && reactContact?.messageId) || message?.senderId || directUsername,
        threadId: message?.threadId || (reactMatches && reactContact?.threadId) || ""
      };
    }
    const resolved = await resolveUserSilently(displayName, profileImage, () => article?.isConnected !== false)
      .catch(() => null);
    if (!isUsername(resolved?.username)) return null;
    return {
      username: resolved.username,
      fullName: resolved.full_name || displayName || resolved.username,
      profileImage: resolved.profile_pic_url || profileImage,
      messageId: resolved.interop_messaging_user_fbid || resolved.eimu_id || resolved.pk || resolved.id,
      threadId: ""
    };
  }

  async function processFloatingDomMessageArticle(article, options = {}) {
    if (!article?.isConnected) return false;
    const token = floatingDomArticleToken(article);
    if (!token) return false;
    // React may reuse aria-labelledby IDs after a floating chat is closed and
    // reopened. An explicit unread batch authorizes its tail even when that
    // raw DOM token was part of an older mount. The batch ID is folded into
    // the fallback event ID, preserving exactly-once inside this batch.
    const authorizedBatchId = String(options.authorizedBatchId || "");
    if (!authorizedBatchId && !options.reserved && chatbotFloatingDomSeenTokens.has(token)) return true;
    if (!options.reserved) chatbotFloatingDomSeenTokens.set(token, Date.now());
    const details = floatingRealtimeChatDetails(article);
    if (!details) {
      chatbotFloatingDomSeenTokens.delete(token);
      return false;
    }
    const message = inspectRealtimeChatbotMessage(article);
    const inbound = floatingDomArticleIsInbound(article, details, message);
    if (!options.forceInbound && inbound !== true) {
      if (inbound === false) rememberFloatingDomArticle(article);
      else chatbotFloatingDomSeenTokens.delete(token);
      return inbound === false;
    }
    // An unread-row batch is authoritative, but never override an explicit
    // sender label/React user that says this is our own outgoing message.
    if (options.forceInbound && inbound === false) {
      rememberFloatingDomArticle(article);
      return true;
    }
    const trustedMessage = authorizedBatchId ? null : message;
    const text = floatingDomArticleText(article, options.rowContext, trustedMessage);
    if (!text) {
      chatbotFloatingDomSeenTokens.delete(token);
      return false;
    }
    const contact = await resolveFloatingDomContact(details, article, options.rowContext, trustedMessage);
    if (!contact?.username) {
      chatbotFloatingDomSeenTokens.delete(token);
      return false;
    }
    const username = normalize(contact.username).replace(/^@+/, "");
    if (!isUsername(username) || username === normalize(currentAccountUsername())) {
      rememberFloatingDomArticle(article);
      return true;
    }
    const senderId = String(trustedMessage?.senderId || contact.messageId || username);
    const threadId = String(trustedMessage?.threadId || contact.threadId || `floating-dom-${username}`);
    const eventId = String(
      (!authorizedBatchId && trustedMessage?.itemId) ||
      `floating-dom-${stableChatbotRowHash(
        `${currentAccountUserId()}|${username}|${floatingDomArticleRawToken(article)}|${authorizedBatchId}`
      )}`
    );
    const thread = {
      thread_id: threadId,
      users: [{
        pk: senderId,
        id: senderId,
        username,
        full_name: contact.fullName || username,
        profile_pic_url: contact.profileImage || ""
      }],
      items: [{
        ...(trustedMessage?.item || {}),
        item_id: eventId,
        user_id: senderId,
        text,
        timestamp: chatbotTimestampMicros(trustedMessage?.timestamp, 0)
      }]
    };
    const published = publishRealtimeChatbotThread(thread, "data-flowsi-chatbot-floating-dom-event");
    if (published) rememberFloatingDomArticle(article);
    else chatbotFloatingDomSeenTokens.delete(token);
    return published;
  }

  function captureFloatingRealtimeChatMessage(element) {
    const domArticle = floatingDomMessageArticle(element);
    if (domArticle) {
      if (chatbotFloatingInboxAutomationInFlight) return true;
      const domToken = floatingDomArticleToken(domArticle);
      if (domToken && chatbotFloatingDomSeenTokens.has(domToken)) return true;
      if (domToken) chatbotFloatingDomSeenTokens.set(domToken, Date.now());
      void processFloatingDomMessageArticle(domArticle, { reserved: true })
        .then(handled => {
          if (!handled && domToken) chatbotFloatingDomSeenTokens.delete(domToken);
        })
        .catch(error => {
          if (domToken) chatbotFloatingDomSeenTokens.delete(domToken);
          document.documentElement.setAttribute(
            "data-flowsi-chatbot-floating-dom-error",
            JSON.stringify({
              at: new Date().toISOString(),
              stage: "open-chat-message",
              error: String(error?.message || error || "Falha ao capturar a mensagem do chat flutuante.")
            })
          );
        });
      return true;
    }
    const details = floatingRealtimeChatDetails(element);
    if (!details) return false;
    const message = inspectRealtimeChatbotMessage(element);
    if (!message) return false;

    capturedChatbotToastElements.add(element);
    Promise.resolve().then(() => capturedChatbotToastElements.delete(element));
    const viewerId = String(currentAccountUserId() || "");
    // A new blue/outgoing bubble also mutates the floating chat. Treat it as
    // handled, but never turn it into a chatbot event (which would loop).
    if (viewerId && message.senderId === viewerId) return true;

    const displayName = details.lines[0] || "";
    const profileImage = details.image.currentSrc || details.image.src || "";
    const sender = message.sender || {};
    const contact = isUsername(sender.username)
      ? {
          username: sender.username,
          fullName: sender.full_name || sender.fullName || displayName,
          profileImage: sender.profile_pic_url || sender.profilePicUrl || profileImage,
          messageId: sender.pk || sender.id || message.senderId,
          threadId: message.threadId
        }
      : inspectReactData(details.panel, displayName, profileImage);
    if (!contact?.username) return true;
    const username = normalize(contact.username).replace(/^@+/, "");
    if (!isUsername(username) || username === normalize(currentAccountUsername())) return true;

    const threadId = String(message.threadId || contact.threadId || `floating-${username}`);
    const senderId = String(message.senderId || contact.messageId || username);
    const eventId = String(message.itemId || "");
    // The observer sees several React mutations for one bubble. An immutable
    // Direct item ID makes the delivery exactly-once across all of them.
    if (chatbotRealtimeThreads.has(eventId)) return true;

    const thread = {
      thread_id: threadId,
      users: [{
        pk: senderId,
        id: senderId,
        username,
        full_name: contact.fullName || displayName || username,
        profile_pic_url: contact.profileImage || profileImage
      }],
      items: [{
        ...(message.item || {}),
        item_id: eventId,
        user_id: senderId,
        text: message.text,
        timestamp: chatbotTimestampMicros(message.timestamp, 0)
      }]
    };
    return publishRealtimeChatbotThread(thread, "data-flowsi-chatbot-floating-event");
  }

  function floatingInboxElementVisible(element) {
    const rect = element?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0;
  }

  function floatingInboxUnreadCount(value, fallback = 1) {
    const text = normalize(value);
    const match = text.match(
      /(?:^|\s)(\d+)\s+(?:new messages?|unread messages?|novas? mensagens?|mensagens? novas?|mensagens? nao lidas?|novas? notific(?:acao|acoes)|new notifications?)(?:\s|$)/i
    );
    if (match) {
      const count = Number(match[1]);
      if (Number.isFinite(count) && count > 0) return Math.min(20, count);
    }
    return Math.max(1, Number(fallback) || 1);
  }

  function floatingInboxHasUnreadMarker(value) {
    return /(?:\bunread\b|nao lid[ao]s?|new messages?|novas? mensagens?|mensagens? novas?|novas? notific(?:acao|acoes)|new notifications?)/i
      .test(normalize(value));
  }

  function floatingInboxBadgeButton() {
    const viewportWidth = Number(window.innerWidth || document.documentElement?.clientWidth || 0);
    const viewportHeight = Number(window.innerHeight || document.documentElement?.clientHeight || 0);
    const candidates = [];
    const labelledElements = [...document.querySelectorAll("[aria-label]")];
    for (const labelled of labelledElements) {
      const label = String(labelled.getAttribute("aria-label") || "");
      if (!/(mensagens?|messages?)/i.test(normalize(label)) || !floatingInboxHasUnreadMarker(label)) continue;
      const button = labelled.closest?.('button, [role="button"]') || labelled;
      if (!floatingInboxElementVisible(button)) continue;
      const rect = button.getBoundingClientRect();
      if (
        (viewportWidth && rect.right < viewportWidth - 440) ||
        (viewportHeight && rect.bottom < viewportHeight - 240)
      ) continue;
      candidates.push({ button, rect, count: floatingInboxUnreadCount(label, 1) });
    }
    candidates.sort((left, right) => {
      const leftDistance = (viewportWidth - left.rect.right) + (viewportHeight - left.rect.bottom);
      const rightDistance = (viewportWidth - right.rect.right) + (viewportHeight - right.rect.bottom);
      return leftDistance - rightDistance;
    });
    return candidates[0] || null;
  }

  function floatingInboxUnreadRows() {
    const viewportWidth = Number(window.innerWidth || document.documentElement?.clientWidth || 0);
    const candidates = [];
    for (const row of document.querySelectorAll('button, [role="button"], a[role="button"], [tabindex="0"]')) {
      if (!floatingInboxElementVisible(row) || !row.querySelector?.("img")) continue;
      const text = String(row.innerText || row.textContent || "").trim();
      if (!text || !floatingInboxHasUnreadMarker(text)) continue;
      const rect = row.getBoundingClientRect();
      if (
        rect.width < 180 || rect.width > 540 ||
        rect.height < 38 || rect.height > 190 ||
        (viewportWidth && rect.left < viewportWidth * 0.52)
      ) continue;
      candidates.push({ row, rect, text });
    }
    candidates.sort((left, right) => {
      const areaDifference = left.rect.width * left.rect.height - right.rect.width * right.rect.height;
      return areaDifference || left.rect.top - right.rect.top;
    });
    const seen = new Set();
    return candidates.filter(candidate => {
      const signature = `${normalize(candidate.text)}|${Math.round(candidate.rect.top)}|${Math.round(candidate.rect.left)}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    }).map(candidate => candidate.row);
  }

  function floatingInboxRowContext(row, batchSequence = chatbotFloatingInboxBatchSequence) {
    const rawText = String(row?.innerText || row?.textContent || "").trim();
    const lines = rawText.split(/\r?\n/).map(value => value.replace(/\s+/g, " ").trim()).filter(Boolean);
    const displayName = lines.find(value => !floatingInboxHasUnreadMarker(value) && !/^(agora|now|\d+\s*(s|min|m|h|d|sem))$/i.test(normalize(value))) || lines[0] || "";
    const image = [...row?.querySelectorAll?.("img") || []][0] || null;
    const profileImage = image?.currentSrc || image?.src || "";
    const reactContact = inspectReactData(row, displayName, profileImage);
    const username = [profileAnchorUsername(row), reactContact?.username]
      .find(value => isUsername(value) && normalize(value) !== normalize(currentAccountUsername())) || "";
    const preview = [...lines].reverse().find(value => {
      const normalized = normalize(value);
      if (!normalized || normalized === normalize(displayName)) return false;
      if (floatingInboxHasUnreadMarker(value)) return false;
      if (/^(agora|now|\d+\s*(s|min|m|h|d|sem))$/i.test(normalized)) return false;
      return !/^(unread|nao lida|nao lido)$/i.test(normalized);
    }) || "";
    // The global badge may count conversations/notifications rather than
    // messages in this row. Without an explicit row count, process exactly one
    // tail item so an `Unread` marker can never replay older history.
    const expectedUnread = floatingInboxUnreadCount(rawText, 1);
    const signature = `${normalize(username || displayName)}|${normalize(rawText)}`;
    const authorizationId = reactContact?.lastItemId
      ? `item-${reactContact.lastItemId}`
      : `batch-${batchSequence}-${stableChatbotRowHash(signature)}`;
    return {
      row,
      rawText,
      displayName,
      profileImage,
      username,
      preview,
      expectedUnread,
      signature,
      authorizationId
    };
  }

  function floatingChatPanels() {
    const panels = [];
    const composers = document.querySelectorAll(
      '[role="textbox"], [contenteditable="true"], textarea, input[placeholder*="ensagem" i], input[placeholder*="essage" i]'
    );
    for (const composer of composers) {
      const details = floatingRealtimeChatDetails(composer);
      if (details?.panel && !panels.some(candidate => candidate.panel === details.panel)) panels.push(details);
    }
    return panels;
  }

  function floatingPanelForRowContext(rowContext, previousPanels = new Set()) {
    const wantedUsername = normalize(rowContext?.username).replace(/^@+/, "");
    const wantedName = normalize(rowContext?.displayName);
    const candidates = floatingChatPanels().map(details => {
      const username = normalize(floatingPanelHeaderUsername(details)).replace(/^@+/, "");
      const name = normalize(floatingPanelDisplayName(details, rowContext));
      let score = 0;
      if (wantedUsername && username === wantedUsername) score += 1000;
      if (wantedName && name === wantedName) score += 500;
      else if (wantedName && normalize(details.panel.innerText).includes(wantedName)) score += 200;
      if (!previousPanels.has(details.panel)) score += 100;
      score += Number(details.rect?.height || 0) / 100;
      return { details, score };
    });
    candidates.sort((left, right) => right.score - left.score);
    return candidates[0]?.details || null;
  }

  function floatingPanelNewMessagesSeparator(details) {
    const panel = details?.panel;
    if (!panel) return null;
    const candidates = [...panel.querySelectorAll?.('div, span, [role="separator"]') || []]
      .filter(element => {
        const text = normalize(element.innerText || element.textContent || element.getAttribute?.("aria-label") || "");
        return /^(new messages?|novas? mensagens?|mensagens? novas?)$/.test(text) &&
          floatingInboxElementVisible(element);
      })
      .map(element => ({ element, rect: element.getBoundingClientRect() }));
    // Prefer the lowest, most specific matching element. Parent wrappers can
    // repeat the same text but span a much larger area.
    candidates.sort((left, right) => {
      if (right.rect.top !== left.rect.top) return right.rect.top - left.rect.top;
      return left.rect.width * left.rect.height - right.rect.width * right.rect.height;
    });
    return candidates[0] || null;
  }

  function floatingArticlesBelowNewMessagesSeparator(details, articles) {
    const separator = floatingPanelNewMessagesSeparator(details);
    if (!separator) return [];
    return articles.filter(article => {
      const rect = article.getBoundingClientRect?.();
      return rect && rect.top >= separator.rect.bottom - 4;
    });
  }

  async function waitForFloatingUnreadRows() {
    let rows = floatingInboxUnreadRows();
    for (const delay of [50, 250, 750]) {
      if (rows.length) break;
      await sleep(delay);
      rows = floatingInboxUnreadRows();
    }
    return rows;
  }

  async function waitForFloatingPanel(rowContext, previousPanels) {
    let details = floatingPanelForRowContext(rowContext, previousPanels);
    for (const delay of [50, 250, 750]) {
      if (details?.panel?.querySelector?.('[role="article"][aria-roledescription="message"]')) break;
      await sleep(delay);
      details = floatingPanelForRowContext(rowContext, previousPanels);
    }
    return details;
  }

  async function processFloatingUnreadRow(rowContext) {
    let row = rowContext.row;
    if (!row?.isConnected || !floatingInboxElementVisible(row)) {
      const badge = floatingInboxBadgeButton();
      badge?.button?.click?.();
      const freshRows = await waitForFloatingUnreadRows();
      row = freshRows.find(candidate => {
        const text = normalize(candidate.innerText || candidate.textContent || "");
        return rowContext.username
          ? text.includes(normalize(rowContext.username))
          : text.includes(normalize(rowContext.displayName));
      }) || freshRows[0] || null;
    }
    if (!row) return { published: 0, error: "unread-row-missing" };

    const previousPanels = new Set(floatingChatPanels().map(details => details.panel));
    row.click();
    const details = await waitForFloatingPanel(rowContext, previousPanels);
    if (!details?.panel) return { published: 0, error: "floating-panel-missing" };

    let articles = [...details.panel.querySelectorAll('[role="article"][aria-roledescription="message"]')]
      .filter(floatingInboxElementVisible);
    for (const delay of [50, 250, 750]) {
      const inboundArticles = articles.filter(article => floatingDomArticleIsInbound(
        article,
        details,
        inspectRealtimeChatbotMessage(article)
      ) !== false);
      const separator = floatingPanelNewMessagesSeparator(details);
      const candidateCount = separator
        ? floatingArticlesBelowNewMessagesSeparator(details, inboundArticles).length
        : inboundArticles.length;
      // The separator is a stronger boundary than the row count (Instagram
      // can report two notifications while only one new message article is
      // mounted). Never wait for or backfill the difference from history.
      if (separator ? candidateCount > 0 : candidateCount >= rowContext.expectedUnread) break;
      await sleep(delay);
      articles = [...details.panel.querySelectorAll('[role="article"][aria-roledescription="message"]')]
        .filter(floatingInboxElementVisible);
    }

    const inboundArticles = articles.filter(article => floatingDomArticleIsInbound(
      article,
      details,
      inspectRealtimeChatbotMessage(article)
    ) !== false);
    const separator = floatingPanelNewMessagesSeparator(details);
    const belowSeparator = floatingArticlesBelowNewMessagesSeparator(details, inboundArticles);
    const authorizedTail = separator ? belowSeparator : inboundArticles;
    const selectedArticles = authorizedTail.slice(-rowContext.expectedUnread);
    const selectedSet = new Set(selectedArticles);
    // Everything outside the unread tail is history. Baseline it before the
    // automation guard is released so later React mutations cannot replay it.
    for (const article of articles) {
      if (!selectedSet.has(article)) rememberFloatingDomArticle(article);
    }

    let published = 0;
    for (const article of selectedArticles) {
      let handled = false;
      for (const delay of [0, 50, 250, 750]) {
        if (delay) await sleep(delay);
        handled = await processFloatingDomMessageArticle(article, {
          forceInbound: true,
          rowContext,
          authorizedBatchId: rowContext.authorizationId
        }).catch(() => false);
        if (handled) break;
      }
      if (handled) published += 1;
    }
    return {
      published,
      expected: rowContext.expectedUnread,
      selected: selectedArticles.length,
      belowSeparator: belowSeparator.length,
      username: rowContext.username || floatingPanelHeaderUsername(details)
    };
  }

  async function runFloatingInboxAutomation() {
    if (!CHATBOT_FLOATING_INBOX_AUTO_OPEN) return;
    if (chatbotFloatingInboxAutomationInFlight) {
      chatbotFloatingInboxAutomationPending = true;
      return;
    }
    chatbotFloatingInboxAutomationInFlight = true;
    let results = [];
    try {
      let rows = floatingInboxUnreadRows();
      const badge = floatingInboxBadgeButton();
      if (!rows.length && !badge) {
        chatbotFloatingInboxBadgeActive = false;
        return;
      }
      if (!chatbotFloatingInboxBadgeActive) {
        chatbotFloatingInboxBadgeActive = true;
        chatbotFloatingInboxBatchSequence += 1;
      }
      if (!rows.length && badge) {
        badge.button.click();
        rows = await waitForFloatingUnreadRows();
      }
      if (!rows.length) {
        document.documentElement.setAttribute(
          "data-flowsi-chatbot-floating-inbox",
          JSON.stringify({ at: new Date().toISOString(), status: "badge-without-unread-row" })
        );
        return;
      }

      // Snapshot the complete unread batch before the first click. Clicking a
      // row immediately marks it read and can replace the tray DOM.
      const batch = rows.map(row => floatingInboxRowContext(row, chatbotFloatingInboxBatchSequence));
      const uniqueBatch = [...new Map(batch.map(context => [context.signature, context])).values()];
      for (const rowContext of uniqueBatch.slice(0, 8)) {
        if (chatbotFloatingInboxConsumedBatches.has(rowContext.authorizationId)) continue;
        const result = await processFloatingUnreadRow(rowContext);
        results.push(result);
        if (result?.selected > 0 && result.published >= result.selected) {
          chatbotFloatingInboxConsumedBatches.add(rowContext.authorizationId);
          while (chatbotFloatingInboxConsumedBatches.size > 500) {
            chatbotFloatingInboxConsumedBatches.delete(chatbotFloatingInboxConsumedBatches.values().next().value);
          }
        }
      }
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-floating-inbox",
        JSON.stringify({
          at: new Date().toISOString(),
          status: "processed",
          conversations: results.length,
          published: results.reduce((sum, result) => sum + Number(result?.published || 0), 0),
          results
        })
      );
      if (!floatingInboxBadgeButton() && !floatingInboxUnreadRows().length) {
        chatbotFloatingInboxBadgeActive = false;
      }
    } catch (error) {
      document.documentElement.setAttribute(
        "data-flowsi-chatbot-floating-dom-error",
        JSON.stringify({
          at: new Date().toISOString(),
          stage: "floating-inbox-automation",
          error: String(error?.message || error || "Falha ao abrir novas mensagens no chat flutuante.")
        })
      );
    } finally {
      chatbotFloatingInboxAutomationInFlight = false;
      if (chatbotFloatingInboxAutomationPending) {
        chatbotFloatingInboxAutomationPending = false;
        scheduleFloatingInboxAutomation(250);
      }
    }
  }

  function scheduleFloatingInboxAutomation(delay = 160) {
    if (!CHATBOT_FLOATING_INBOX_AUTO_OPEN) return;
    if (chatbotFloatingInboxAutomationInFlight) {
      chatbotFloatingInboxAutomationPending = true;
      return;
    }
    if (chatbotFloatingInboxAutomationTimer) return;
    chatbotFloatingInboxAutomationTimer = setTimeout(() => {
      chatbotFloatingInboxAutomationTimer = null;
      void runFloatingInboxAutomation();
    }, delay);
  }

  function compactRealtimeToastDetails(element) {
    if (!element || element.nodeType !== 1 || capturedChatbotToastElements.has(element)) return null;
    const rect = element.getBoundingClientRect?.();
    const viewportWidth = Number(window.innerWidth || document.documentElement?.clientWidth || 0);
    const viewportHeight = Number(window.innerHeight || document.documentElement?.clientHeight || 0);
    if (
      !rect || rect.width < 180 || rect.width > 520 ||
      rect.height < 38 || rect.height > 180 ||
      (viewportWidth && rect.left < viewportWidth * 0.42) ||
      (viewportHeight && rect.top < viewportHeight * 0.42)
    ) return null;
    const image = element.querySelector?.("img");
    if (!image) return null;
    const lines = String(element.innerText || element.textContent || "")
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean);
    if (lines.length < 2 || lines.length > 8) return null;
    return { rect, image, lines };
  }

  function realtimeChatbotToastPreview(element, displayName, username = "") {
    const normalizedDisplayName = normalize(displayName);
    const normalizedUsername = normalize(username).replace(/^@+/, "");
    const previewParts = leafTexts(element).filter(value => {
      const normalized = normalize(value).replace(/^@+/, "");
      return normalized && normalized !== normalizedDisplayName && normalized !== normalizedUsername;
    });
    return previewParts.join(" ").trim();
  }

  async function processRealtimeChatbotToast(
    element,
    details,
    initialPreview,
    toastSignature,
    inspectedMessage = null
  ) {
    const displayName = details.lines[0] || "";
    const profileImage = details.image.currentSrc || details.image.src || "";
    const message = inspectedMessage || inspectRealtimeChatbotMessage(element);
    const viewerId = String(currentAccountUserId() || "");
    if (viewerId && message?.senderId === viewerId) return true;

    const sender = message?.sender || {};
    const reactContact = isUsername(sender.username)
      ? {
          username: sender.username,
          fullName: sender.full_name || sender.fullName || displayName,
          profileImage: sender.profile_pic_url || sender.profilePicUrl || profileImage,
          messageId: sender.pk || sender.id || message.senderId,
          threadId: message.threadId,
          lastItemId: message.itemId,
          lastActivityAt: message.timestamp
        }
      : inspectReactData(element, displayName, profileImage);
    const resolvedContact = reactContact?.username
      ? null
      : await resolveUserSilently(displayName, profileImage, () => element?.isConnected !== false)
        .catch(() => null);
    const contact = reactContact?.username ? reactContact : resolvedContact;
    if (!contact?.username) return false;
    const username = normalize(contact.username).replace(/^@+/, "");
    if (!isUsername(username) || username === normalize(currentAccountUsername())) return true;
    const preview = String(message?.text || realtimeChatbotToastPreview(element, displayName, username) || initialPreview).trim();
    if (
      !preview ||
      /^(voce|you)(:| enviou| sent)/i.test(normalize(preview)) ||
      /^(mensagens?|messages?)$/i.test(normalize(preview))
    ) return true;

    // `resolveUserSilently()` returns a profile/user ID in `contact.id`. It is
    // not a Direct thread_id and must never be promoted to a trusted numeric
    // destination. A non-numeric fallback deliberately forces the sender to
    // resolve the real conversation before broadcasting the reply.
    const threadId = String(message?.threadId || contact.threadId || `toast-${username}`);
    const senderId = String(message?.senderId || contact.messageId || contact.pk || contact.id || username);
    const eventId = message?.itemId
      ? String(message.itemId)
      : contact.lastItemId
        ? String(contact.lastItemId)
        : contact.lastActivityAt
        ? `activity-${stableChatbotRowHash(`${threadId}|${contact.lastActivityAt}`)}`
        : `toast-${stableChatbotRowHash(`${username}|${toastSignature}`)}-${Date.now()}`;
    if (chatbotRealtimeThreads.has(eventId)) return true;
    const thread = {
      thread_id: threadId,
      users: [{
        pk: senderId,
        id: senderId,
        username,
        full_name: contact.fullName || contact.full_name || displayName || username,
        profile_pic_url: contact.profileImage || contact.profile_pic_url || profileImage
      }],
      items: [{
        ...(message?.item || {}),
        item_id: eventId,
        user_id: senderId,
        text: preview,
        timestamp: chatbotTimestampMicros(message?.timestamp || contact.lastActivityAt, 0)
      }]
    };
    return publishRealtimeChatbotThread(thread, "data-flowsi-chatbot-realtime-event");
  }

  function captureRealtimeChatbotToast(element) {
    const details = compactRealtimeToastDetails(element);
    if (!details) return false;
    const displayName = details.lines[0] || "";
    const profileImage = details.image.currentSrc || details.image.src || "";
    const preview = realtimeChatbotToastPreview(element, displayName);
    if (
      !preview ||
      /^(voce|you)(:| enviou| sent)/i.test(normalize(preview)) ||
      /^(mensagens?|messages?)$/i.test(normalize(preview))
    ) return false;

    const capturedAt = Date.now();
    const inspectedMessage = inspectRealtimeChatbotMessage(element);
    const inspectedContact = inspectedMessage?.itemId
      ? null
      : inspectReactData(element, displayName, profileImage);
    const signatureItemId = String(
      inspectedMessage?.itemId || inspectedContact?.lastItemId || ""
    );
    pruneRealtimeChatbotToastSignatures(capturedAt);
    const signature = signatureItemId
      ? `item-${signatureItemId}`
      : stableChatbotRowHash(
        `${normalize(displayName)}|${comparableImagePath(profileImage)}|${normalize(preview)}`
      );
    if (chatbotRealtimeToastSignatures.has(signature)) {
      capturedChatbotToastElements.add(element);
      Promise.resolve().then(() => capturedChatbotToastElements.delete(element));
      return true;
    }

    // Mark before resolving the profile. React mutates the same toast several
    // times while it enters and each mutation must not create another reply.
    capturedChatbotToastElements.add(element);
    chatbotRealtimeToastSignatures.set(signature, capturedAt);
    void processRealtimeChatbotToast(element, details, preview, signature, inspectedMessage)
      .then(handled => {
        if (!handled) chatbotRealtimeToastSignatures.delete(signature);
      })
      .catch(error => {
        chatbotRealtimeToastSignatures.delete(signature);
        document.documentElement.setAttribute(
          "data-flowsi-chatbot-realtime-error",
          JSON.stringify({
            at: new Date().toISOString(),
            stage: "toast",
            error: String(error?.message || error || "Falha ao capturar a notificação do Direct.")
          })
        );
      })
      .finally(() => {
        capturedChatbotToastElements.delete(element);
      });
    return true;
  }

  function scanRealtimeChatbotToastNode(node, allowFloating = true) {
    let element = node?.nodeType === 1 ? node : node?.parentElement;
    if (!element) return;
    const candidates = [];
    const addCandidate = candidate => {
      if (candidate?.nodeType === 1 && !candidates.includes(candidate)) candidates.push(candidate);
    };
    for (let current = element, depth = 0; current && depth < 14; depth += 1, current = current.parentElement) {
      addCandidate(current);
    }
    for (const candidate of [...element.querySelectorAll?.('[role="button"], button, a') || []].slice(0, 80)) {
      addCandidate(candidate);
      let parent = candidate.parentElement;
      for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
        addCandidate(parent);
      }
    }
    candidates.sort((left, right) => {
      const leftRect = left.getBoundingClientRect?.();
      const rightRect = right.getBoundingClientRect?.();
      return (leftRect?.width * leftRect?.height || Infinity) -
        (rightRect?.width * rightRect?.height || Infinity);
    });
    for (const candidate of candidates) {
      if (allowFloating && captureFloatingRealtimeChatMessage(candidate)) break;
      if (captureRealtimeChatbotToast(candidate)) break;
    }
  }

  function installRealtimeChatbotToastObserver() {
    if (chatbotRealtimeObserver || typeof MutationObserver !== "function") return;
    const root = document.body || document.documentElement;
    if (!root) return;
    for (const article of document.querySelectorAll('[role="article"][aria-roledescription="message"]')) {
      // Chats that were already expanded when the extension loaded are a
      // baseline. Only later articles (or the explicit unread tail) are new.
      rememberFloatingDomArticle(article);
    }
    chatbotRealtimeObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) scanRealtimeChatbotToastNode(node);
        if (mutation.type === "characterData") scanRealtimeChatbotToastNode(mutation.target);
      }
    });
    chatbotRealtimeObserver.observe(root, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label"],
      subtree: true
    });
    for (const candidate of [...document.querySelectorAll('[role="button"], button, a')].slice(-120)) {
      // Existing expanded chats are a baseline, not a new inbound message.
      // Keep the old compact-toast recovery, but do not replay the mini-chat.
      scanRealtimeChatbotToastNode(candidate, false);
    }
    // Never click Instagram's floating Messages badge or unread rows. Direct
    // monitoring is provided by the off-screen same-origin inbox bridge.
    document.documentElement.setAttribute(
      "data-flowsi-chatbot-floating-inbox-autoclick",
      "disabled"
    );
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

  window.addEventListener("pagehide", () => {
    removeChatbotInboxFrame();
    chatbotRealtimeObserver?.disconnect?.();
    chatbotRealtimeObserver = null;
    if (chatbotFloatingInboxAutomationTimer) clearTimeout(chatbotFloatingInboxAutomationTimer);
    chatbotFloatingInboxAutomationTimer = null;
    if (chatbotFloatingInboxAutomationInterval && typeof clearInterval === "function") {
      clearInterval(chatbotFloatingInboxAutomationInterval);
    }
    chatbotFloatingInboxAutomationInterval = null;
    chatbotFloatingInboxAutomationPending = false;
    chatbotFloatingInboxBadgeActive = false;
    chatbotFloatingInboxConsumedBatches.clear();
    chatbotFloatingDomSeenTokens.clear();
  }, { once: true });
  installRealtimeChatbotToastObserver();

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
    if (event.data?.source === CHATBOT_NOTIFICATIONS_REQUEST_SOURCE) {
      const { requestId } = event.data;
      fetchChatbotNotifications()
        .then(result => window.postMessage({
          source: CHATBOT_NOTIFICATIONS_RESPONSE_SOURCE,
          requestId,
          success: true,
          result
        }, "*"))
        .catch(error => window.postMessage({
          source: CHATBOT_NOTIFICATIONS_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao ler as notificações do Instagram."
        }, "*"));
      return;
    }
    if (event.data?.source === CHATBOT_COMMENT_REPLY_REQUEST_SOURCE) {
      const {
        requestId,
        mediaId,
        commentId,
        message,
        uiOnly,
        actorUsername,
        commentText
      } = event.data;
      replyChatbotComment(mediaId, commentId, message, {
        uiOnly: Boolean(uiOnly),
        actorUsername: String(actorUsername || ""),
        commentText: String(commentText || "")
      })
        .then(result => window.postMessage({
          source: CHATBOT_COMMENT_REPLY_RESPONSE_SOURCE,
          requestId,
          success: true,
          result
        }, "*"))
        .catch(error => window.postMessage({
          source: CHATBOT_COMMENT_REPLY_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao responder o comentário.",
          deliveryAttempted: Boolean(error?.deliveryAttempted)
        }, "*"));
      return;
    }
    if (event.data?.source === CHATBOT_SEND_REQUEST_SOURCE) {
      const { requestId, username, message, threadId, viewerId, trustedThreadId } = event.data;
      sendChatbotDirect(
        username,
        message,
        threadId,
        viewerId,
        trustedThreadId,
        requestId
      )
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
          error: error?.message || "Falha ao enviar a mensagem do chatbot.",
          deliveryAttempted: Boolean(error?.deliveryAttempted)
        }, "*"));
      return;
    }
    if (event.data?.source === CHATBOT_MEDIA_SEND_REQUEST_SOURCE) {
      const {
        requestId,
        username,
        dataUrl,
        mediaType,
        title,
        caption,
        threadId,
        viewerId,
        trustedThreadId
      } = event.data;
      sendChatbotMedia(
        username,
        dataUrl,
        mediaType,
        title,
        caption,
        threadId,
        viewerId,
        trustedThreadId
      )
        .then(result => window.postMessage({
          source: CHATBOT_MEDIA_SEND_RESPONSE_SOURCE,
          requestId,
          success: true,
          result
        }, "*"))
        .catch(error => window.postMessage({
          source: CHATBOT_MEDIA_SEND_RESPONSE_SOURCE,
          requestId,
          success: false,
          error: error?.message || "Falha ao enviar o arquivo do chatbot.",
          deliveryAttempted: Boolean(error?.deliveryAttempted)
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
