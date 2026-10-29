const NOTIFICATION_MIN_INTERVAL_MS = 3000;
const INSTAGRAM_APP_ID = "936619743392459";
const CRM_ASSIGNMENTS_KEY = "flowsiKanbanAssignmentsV2";
const CRM_MANUAL_CONTACTS_KEY = "flowsiManualContacts";
let crmMutationQueue = Promise.resolve();

async function getInstagramCookies() {
  const cookies = await chrome.cookies.getAll({ domain: ".instagram.com" });
  const values = {};
  for (const cookie of cookies) values[cookie.name] = cookie.value;
  return values;
}

const normalizeCrmKey = value => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/^@+/, "")
  .replace(/\s+/g, "");

const upsertProfiles = (profiles, profile) => {
  const key = normalizeCrmKey(profile?.username);
  if (!key) return Array.isArray(profiles) ? profiles : [];
  const source = Array.isArray(profiles) ? profiles : [];
  const previous = source.find(item => normalizeCrmKey(item?.username) === key) || {};
  const merged = { ...previous, ...profile };
  return [...source.filter(item => normalizeCrmKey(item?.username) !== key), merged];
};

function ensureLegacyColumns(columns, contacts) {
  const source = Array.isArray(columns) ? columns : [];
  if (!source.length) {
    return [{ id: "all-chats", title: "Todas", profiles: contacts }];
  }
  return source.map((column, index) => ({
    ...column,
    id: index === 0 ? "all-chats" : column.id,
    profiles: Array.isArray(column.profiles) ? column.profiles : []
  }));
}

async function readCrmState() {
  const stored = await chrome.storage.local.get([
    "contactList",
    "kanbanColumns",
    CRM_ASSIGNMENTS_KEY,
    CRM_MANUAL_CONTACTS_KEY
  ]);
  const contacts = Array.isArray(stored.contactList) ? stored.contactList : [];
  const manualContacts = Array.isArray(stored[CRM_MANUAL_CONTACTS_KEY])
    ? stored[CRM_MANUAL_CONTACTS_KEY]
    : [];
  const columns = ensureLegacyColumns(stored.kanbanColumns, contacts);
  const assignments = stored[CRM_ASSIGNMENTS_KEY] && typeof stored[CRM_ASSIGNMENTS_KEY] === "object"
    ? { ...stored[CRM_ASSIGNMENTS_KEY] }
    : {};

  // One-time and incremental migration of legacy custom-column cards. Existing V2
  // assignments win, while old cards that have not been migrated are preserved.
  for (const column of columns.slice(1)) {
    for (const profile of column.profiles) {
      const key = normalizeCrmKey(profile?.username);
      if (!key || assignments[key]) continue;
      assignments[key] = {
        columnId: column.id,
        profile: { ...profile },
        updatedAt: Date.now(),
        source: profile.source || "legacy"
      };
    }
  }
  return { contacts, manualContacts, columns, assignments };
}

async function applyCrmMutation(message) {
  let { contacts, manualContacts, columns, assignments } = await readCrmState();
  const mutation = message?.mutation;
  const profile = message?.profile && typeof message.profile === "object"
    ? { ...message.profile }
    : null;
  const key = normalizeCrmKey(message?.username || profile?.username);
  const removeFromCustomColumns = usernameKey => {
    columns = columns.map((column, index) => index === 0 ? column : {
      ...column,
      profiles: column.profiles.filter(item => normalizeCrmKey(item?.username) !== usernameKey)
    });
  };

  if (mutation === "manualAdd") {
    if (!profile || !key) throw new Error("Informe um @ válido.");
    profile.username = key;
    profile.source = profile.source || "manual";
    manualContacts = upsertProfiles(manualContacts, profile);
    contacts = upsertProfiles(contacts, profile);
    const columnId = String(message.columnId || "all-chats");
    if (columnId !== "all-chats") {
      const targetColumn = columns.find(column => column.id === columnId);
      if (!targetColumn) throw new Error("A coluna selecionada não existe mais.");
      removeFromCustomColumns(key);
      const stableProfile = {
        ...profile,
        username: key,
        id: profile.id || `manual-${key}`
      };
      assignments[key] = {
        columnId,
        profile: stableProfile,
        updatedAt: Date.now(),
        source: "manual"
      };
      targetColumn.profiles = upsertProfiles(targetColumn.profiles, stableProfile);
    } else {
      delete assignments[key];
      removeFromCustomColumns(key);
    }
  } else if (mutation === "toggleAssign" || mutation === "assign" || mutation === "move") {
    if (!profile || !key) throw new Error("Não foi possível identificar o contato.");
    const columnId = String(message.columnId || "all-chats");
    const targetColumn = columns.find(column => column.id === columnId);
    if (columnId !== "all-chats" && !targetColumn) throw new Error("A coluna selecionada não existe mais.");
    const existing = assignments[key];
    const shouldUnassign = columnId === "all-chats" ||
      (mutation === "toggleAssign" && existing?.columnId === columnId);
    removeFromCustomColumns(key);
    if (shouldUnassign) {
      delete assignments[key];
    } else {
      const contact = contacts.find(item => normalizeCrmKey(item?.username) === key) || {};
      const stableProfile = {
        ...contact,
        ...existing?.profile,
        ...profile,
        username: key,
        id: existing?.profile?.id || profile.id || `crm-${key}`
      };
      assignments[key] = {
        columnId,
        profile: stableProfile,
        updatedAt: Date.now(),
        source: profile.source || existing?.source || "crm"
      };
      const nextTarget = columns.find(column => column.id === columnId);
      if (nextTarget) {
        const requestedIndex = Number(message.index);
        const index = Number.isInteger(requestedIndex) && requestedIndex >= 0
          ? Math.min(requestedIndex, nextTarget.profiles.length)
          : nextTarget.profiles.length;
        nextTarget.profiles.splice(index, 0, stableProfile);
      }
      contacts = upsertProfiles(contacts, stableProfile);
    }
  } else if (mutation === "remove") {
    if (!key) throw new Error("Contato inválido.");
    delete assignments[key];
    removeFromCustomColumns(key);
  } else if (mutation === "deleteColumn") {
    const columnId = String(message.columnId || "");
    if (!columnId || columnId === "all-chats") throw new Error("A primeira coluna não pode ser excluída.");
    columns = columns.filter(column => column.id !== columnId);
    for (const [assignmentKey, assignment] of Object.entries(assignments)) {
      if (assignment?.columnId === columnId) delete assignments[assignmentKey];
    }
  } else if (mutation === "updateProfile" || mutation === "updateProfilePhoto") {
    if (!key) return { success: true };
    const profileImage = String(message.profileImage || message.profile_pic_url || "").trim();
    const profileName = String(message.name || message.full_name || "").replace(/\s+/g, " ").trim();
    const usefulName = profileName && normalizeCrmKey(profileName) !== key ? profileName : "";
    const following = Number(message.following);
    const hasFollowing = message.following !== undefined &&
      Number.isFinite(following) && following >= 0;
    const hasFollowsViewer = typeof message.followsViewer === "boolean";
    const profilePatch = {
      ...(profileImage ? { profileImage, profile_pic_url: profileImage } : {}),
      ...(usefulName ? { name: usefulName, full_name: usefulName } : {}),
      ...(hasFollowing ? { edge_follow: { count: following } } : {}),
      ...(hasFollowsViewer ? { follows_viewer: message.followsViewer } : {})
    };
    if (!Object.keys(profilePatch).length) return { success: true };
    const updateProfile = item => normalizeCrmKey(item?.username) === key
      ? { ...item, ...profilePatch }
      : item;
    contacts = contacts.map(updateProfile);
    manualContacts = manualContacts.map(updateProfile);
    columns = columns.map(column => ({ ...column, profiles: column.profiles.map(updateProfile) }));
    if (assignments[key]) {
      assignments[key] = {
        ...assignments[key],
        profile: updateProfile(assignments[key].profile),
        updatedAt: Date.now()
      };
    }
  } else if (mutation !== "migrate") {
    throw new Error("Operação do CRM não reconhecida.");
  }

  // The first column is a view. Keep it synchronized for backward compatibility,
  // but V2 assignments remain the authoritative source for custom columns.
  const assignedKeys = new Set(Object.keys(assignments));
  columns[0] = {
    ...columns[0],
    id: "all-chats",
    profiles: contacts.filter(item => !assignedKeys.has(normalizeCrmKey(item?.username)))
  };
  const revision = Date.now();
  await chrome.storage.local.set({
    contactList: contacts,
    [CRM_MANUAL_CONTACTS_KEY]: manualContacts,
    kanbanColumns: columns,
    [CRM_ASSIGNMENTS_KEY]: assignments,
    flowsiKanbanRevision: revision
  });
  const readback = await chrome.storage.local.get([CRM_ASSIGNMENTS_KEY, "flowsiKanbanRevision"]);
  if (readback.flowsiKanbanRevision !== revision) {
    throw new Error("Não foi possível confirmar a gravação do Kanban.");
  }
  return {
    success: true,
    revision,
    assignment: key ? readback[CRM_ASSIGNMENTS_KEY]?.[key] || null : null
  };
}

function enqueueCrmMutation(message) {
  const task = crmMutationQueue.then(() => applyCrmMutation(message));
  crmMutationQueue = task.catch(() => {});
  return task;
}

// Installing or reloading CRM Flow must not open, activate or refresh Instagram.
// Navigation to Instagram is initiated only by an explicit user action in the popup.

async function updateThreadList(cursor = null, preferredTabId = null, apiOnly = false) {
  try {
    const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/direct/*" });
    const tab = tabs.find(item => item.id === preferredTabId) ||
      tabs.find(item => item.active) ||
      tabs[0];
    if (!tab?.id) {
      throw new Error("Abra as mensagens do Instagram e tente novamente.");
    }

    const {
      contactList = [],
      flowsiManualContacts = [],
      flowsiKanbanAssignmentsV2 = {},
      flowsiInstagramUsername = "",
      flowsiInstagramUserId = "",
      flowsiInboxCursors = {},
      flowsiInboxPendingContacts = [],
      kanbanColumns = []
    } = await chrome.storage.local.get([
      "contactList",
      CRM_MANUAL_CONTACTS_KEY,
      CRM_ASSIGNMENTS_KEY,
      "flowsiInstagramUsername",
      "flowsiInstagramUserId",
      "flowsiInboxCursors",
      "flowsiInboxPendingContacts",
      "kanbanColumns"
    ]);
    const selfCookie = await new Promise(resolve => {
      chrome.cookies.get({ url: "https://www.instagram.com", name: "ds_user_id" }, cookie => resolve(cookie || null));
    });
    const normalizeUsername = value => String(value || "").trim().toLowerCase().replace(/^@+/, "");
    const assignedProfiles = Object.values(flowsiKanbanAssignmentsV2 || {})
      .map(assignment => assignment?.profile)
      .filter(Boolean);
    const columnProfiles = (Array.isArray(kanbanColumns) ? kanbanColumns : [])
      .flatMap(column => Array.isArray(column?.profiles) ? column.profiles : []);
    const knownProfiles = [
      ...contactList,
      ...flowsiManualContacts,
      ...assignedProfiles,
      ...columnProfiles
    ];
    const knownKeys = new Set(knownProfiles
      .map(contact => normalizeUsername(contact?.username))
      .filter(Boolean));
    const pendingContacts = [...new Map((Array.isArray(flowsiInboxPendingContacts)
      ? flowsiInboxPendingContacts
      : [])
      .filter(contact => {
        const key = normalizeUsername(contact?.username);
        return key && !knownKeys.has(key);
      })
      .map(contact => [normalizeUsername(contact.username), contact])).values()];

    let pageResult = {
      success: true,
      contacts: [],
      nextCursors: flowsiInboxCursors,
      hasMore: Object.values(flowsiInboxCursors || {}).some(Boolean),
      accountUsername: flowsiInstagramUsername,
      visibleRows: 0,
      skippedRows: 0
    };
    const fetchedContacts = [];
    let workingCursors = cursor ? flowsiInboxCursors : {};
    let rounds = 0;
    const countNewCandidates = () => new Set([
      ...pendingContacts,
      ...fetchedContacts
    ].map(contact => normalizeUsername(contact?.username))
      .filter(key => key && !knownKeys.has(key))).size;

    // Um clique sempre entrega até 20 contatos realmente novos. Se a página
    // atual só trouxer duplicados, avance os cursores até completar o lote.
    while (!cursor || countNewCandidates() < 20) {
      rounds += 1;
      try {
        pageResult = await chrome.tabs.sendMessage(tab.id, {
          action: "flowsiScrapeContacts",
          loadMore: Boolean(cursor),
          apiOnly: Boolean(apiOnly),
          knownContacts: [...knownProfiles, ...pendingContacts, ...fetchedContacts],
          cursors: cursor ? workingCursors : {}
        });
      } catch (error) {
        throw new Error("Atualize a aba do Instagram para ativar o novo carregador de contatos.");
      }
      if (!pageResult?.success) {
        throw new Error(pageResult?.error || "Não foi possível ler as conversas da página.");
      }
      fetchedContacts.push(...(Array.isArray(pageResult.contacts) ? pageResult.contacts : []));
      workingCursors = pageResult.nextCursors || {};
      if (!cursor || !pageResult.hasMore || rounds >= 6) break;
    }
    if (pageResult.cancelled) {
      return {
        success: true,
        cancelled: true,
        count: 0,
        total: contactList.length,
        hasMore: false
      };
    }

    const uniqueCandidates = [...new Map([...pendingContacts, ...fetchedContacts]
      .filter(contact => {
        const key = normalizeUsername(contact?.username);
        return key && !knownKeys.has(key);
      })
      .map(contact => [normalizeUsername(contact.username), contact])).values()];
    const newContacts = cursor ? uniqueCandidates.slice(0, 20) : uniqueCandidates;
    const remainingContacts = cursor ? uniqueCandidates.slice(20) : [];
    if (!newContacts.length && pageResult.visibleRows > 0 && !contactList.length) {
      throw new Error(
        `Encontrei ${pageResult.visibleRows} conversas, mas não consegui identificar os usuários. Atualize a página e tente novamente.`
      );
    }
    // A primeira sincronização começa no topo. Cada clique seguinte acrescenta o
    // próximo lote de Primary e General sem apagar os lotes anteriores.
    // Synchronization is always additive. Never replace the saved inbox with
    // only the latest response: cards already loaded or assigned to columns
    // must survive every refresh, while genuinely new usernames are appended.
    const source = [
      ...contactList,
      ...newContacts,
      ...flowsiManualContacts,
      ...assignedProfiles
    ];
    const accountUsername = pageResult.accountUsername || flowsiInstagramUsername || "";
    const accountUserId = String(selfCookie?.value || flowsiInstagramUserId || "").trim();
    const isOwnAccount = contact =>
      Boolean(accountUsername && normalizeUsername(contact.username) === normalizeUsername(accountUsername)) ||
      Boolean(accountUserId && [contact.messageId, contact.id, contact.userId, contact.pk]
        .some(value => String(value || "").trim() === accountUserId));
    const merged = [...new Map(source
      .filter(contact => normalizeUsername(contact.username))
      .map(contact => [normalizeUsername(contact.username), contact])).values()]
      .filter(contact => !isOwnAccount(contact));
    const nextCursor = remainingContacts.length || pageResult.hasMore ? "flowsi-dom-more" : null;

    await chrome.storage.local.set({
      contactList: merged,
      flowsiInstagramUsername: accountUsername,
      flowsiInstagramUserId: accountUserId,
      flowsiInboxCursors: workingCursors,
      flowsiInboxPendingContacts: remainingContacts,
      oldest_cursor: nextCursor,
      flowsiContactsLastError: null,
      flowsiContactsLastSync: new Date().toISOString(),
      flowsiContactsDiagnostics: {
        visibleRows: pageResult.visibleRows || 0,
        skippedRows: pageResult.skippedRows || 0,
        loadedContacts: newContacts.length
      }
    });
    // Ensure legacy cards are migrated even when the user only refreshes the inbox.
    await enqueueCrmMutation({ mutation: "migrate" });
    return {
      success: true,
      count: newContacts.length,
      total: merged.length,
      hasMore: Boolean(nextCursor)
    };
  } catch (error) {
    const message = error?.message || "Falha desconhecida ao carregar contatos.";
    console.warn("[Flowsi] Falha ao atualizar contatos:", message);
    await chrome.storage.local.set({
      flowsiContactsLastError: message,
      flowsiContactsLastSync: new Date().toISOString()
    });
    return { success: false, error: message };
  }
}

function findInstagramTab(callback) {
  chrome.tabs.query({}, tabs => {
    const tab = tabs.find(item => item.url?.includes("instagram.com"));
    if (tab?.id) callback(tab.id);
  });
}

async function sendMessageToInstagram(username, message, preferredTabId = null, threadId = "") {
  const normalizedUsername = normalizeCrmKey(username);
  const text = String(message || "").trim();
  if (!normalizedUsername || !text) {
    throw new Error("Usuário ou mensagem do chatbot inválidos.");
  }
  let tabId = preferredTabId;
  if (!tabId) tabId = await getInstagramTabId();
  if (!tabId) throw new Error("Nenhuma aba do Instagram está aberta.");
  let response = null;
  let mainError = "";
  try {
    response = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotSendMessageMain",
      username: normalizedUsername,
      message: text,
      threadId: String(threadId || "")
    });
  } catch (error) {
    mainError = error?.message || String(error);
  }
  if (!response || response.success !== true || response.status !== "sent") {
    let fallback = null;
    try {
      fallback = await chrome.tabs.sendMessage(tabId, {
        action: "flowsiChatbotSendMessage",
        username: normalizedUsername,
        message: text
      });
    } catch (error) {
      mainError = [mainError, error?.message || String(error)].filter(Boolean).join("; ");
    }
    if (!fallback || fallback.success !== true || fallback.status === "queued") {
      throw new Error(
        response?.error || fallback?.error || mainError ||
        "O Instagram não confirmou o envio do Direct."
      );
    }
    return fallback;
  }
  return response;
}

async function fetchFollowingInBackground(username, knownProfileId = "") {
  const normalizedUsername = normalizeCrmKey(username);
  if (!/^[a-z0-9._]{1,30}$/.test(normalizedUsername)) {
    throw new Error("Perfil inválido.");
  }
  const cookies = await getInstagramCookies().catch(() => ({}));
  const headers = {
    accept: "*/*",
    "x-ig-app-id": "936619743392459",
    "x-asbd-id": "129477",
    "x-csrftoken": cookies?.csrftoken || "",
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
  const requestJson = async url => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers,
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return { payload, count: readCount(payload), url };
    } finally {
      clearTimeout(timeout);
    }
  };

  const findExactUser = payload => {
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
      if (normalizeCrmKey(candidate?.username) === normalizedUsername) return candidate;
      if (Array.isArray(current)) {
        queue.push(...current);
      } else {
        queue.push(...Object.values(current).filter(value => value && typeof value === "object"));
      }
    }
    return null;
  };

  const resolveProfileIdBySearch = async () => {
    const encoded = encodeURIComponent(normalizedUsername);
    const searchResults = await Promise.allSettled([
      requestJson(`https://www.instagram.com/api/v1/web/search/topsearch/?context=blended&query=${encoded}&include_reel=true`),
      requestJson(`https://www.instagram.com/web/search/topsearch/?query=${encoded}`)
    ]);
    for (const result of searchResults) {
      if (result.status !== "fulfilled") continue;
      const user = findExactUser(result.value.payload);
      const id = String(user?.pk || user?.id || "");
      if (/^\d+$/.test(id)) return id;
    }
    return "";
  };

  const urls = [
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(normalizedUsername)}`,
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(normalizedUsername)}`
  ];
  if (profileId) {
    urls.unshift(
      `https://www.instagram.com/api/v1/users/${profileId}/info/`,
      `https://i.instagram.com/api/v1/users/${profileId}/info/`
    );
  }
  const results = await Promise.allSettled(urls.map(requestJson));
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const user = result.value.payload?.data?.user || result.value.payload?.user;
    const returnedUsername = normalizeCrmKey(user?.username);
    if (Number.isFinite(result.value.count) && result.value.count > 0 &&
        (!returnedUsername || returnedUsername === normalizedUsername)) {
      return result.value.count;
    }
    if (!profileId) profileId = String(user?.id || user?.pk || "");
  }

  if (!/^\d+$/.test(profileId)) {
    profileId = await resolveProfileIdBySearch();
  }

  if (/^\d+$/.test(profileId)) {
    const infoResults = await Promise.allSettled([
      requestJson(`https://www.instagram.com/api/v1/users/${profileId}/info/`),
      requestJson(`https://i.instagram.com/api/v1/users/${profileId}/info/`)
    ]);
    for (const result of infoResults) {
      const user = result.status === "fulfilled"
        ? result.value.payload?.data?.user || result.value.payload?.user
        : null;
      const returnedUsername = normalizeCrmKey(user?.username);
      if (result.status === "fulfilled" && Number.isFinite(result.value.count) && result.value.count > 0 &&
          (!returnedUsername || returnedUsername === normalizedUsername)) {
        return result.value.count;
      }
    }
  }

  const pageResponse = await fetch(`https://www.instagram.com/${encodeURIComponent(normalizedUsername)}/`, {
    credentials: "include",
    cache: "no-store",
    headers: { accept: "text/html,application/xhtml+xml" }
  });
  if (!pageResponse.ok) return null;
  const html = await pageResponse.text();
  const match = html.match(/"edge_follow"\s*:\s*\{[^{}]*"count"\s*:\s*(\d+)/i) ||
    html.match(/"following_count"\s*:\s*(\d+)/i) ||
    html.match(/([0-9.,]+\s*[KM]?)\s+(?:following|seguindo)/i);
  if (!match) return null;
  const normalized = String(match[1]).trim().toUpperCase();
  const multiplier = normalized.endsWith("K") ? 1000 : normalized.endsWith("M") ? 1000000 : 1;
  const numericText = normalized.replace(/[^0-9,.]/g, "");
  const numeric = Number.parseFloat(
    multiplier === 1 ? numericText.replace(/[.,]/g, "") : numericText.replace(",", ".")
  );
  const count = Number.isFinite(numeric) ? Math.round(numeric * multiplier) : null;
  return Number.isFinite(count) && count > 0 ? count : null;
}

async function fetchRelationshipInBackground(username, knownProfileId = "") {
  const normalizedUsername = normalizeCrmKey(username);
  if (!/^[a-z0-9._]{1,30}$/.test(normalizedUsername)) {
    throw new Error("Perfil inválido.");
  }
  const cookies = await getInstagramCookies().catch(() => ({}));
  const headers = {
    accept: "*/*",
    "x-ig-app-id": "936619743392459",
    "x-asbd-id": "129477",
    "x-csrftoken": cookies?.csrftoken || "",
    "x-requested-with": "XMLHttpRequest"
  };
  let profileId = /^\d+$/.test(String(knownProfileId || ""))
    ? String(knownProfileId)
    : "";
  const viewerId = String(cookies?.ds_user_id || "").trim();
  const diagnostics = [];
  const inspectRelationship = payload => {
    const candidates = [
      payload?.friendship_status,
      payload?.data?.friendship_status,
      payload?.data?.user?.friendship_status,
      payload?.data?.user,
      payload?.data,
      payload?.user?.friendship_status,
      payload?.user,
      payload
    ];
    let explicitFalse = false;
    for (const value of candidates) {
      if (!value || typeof value !== "object") continue;
      if (value.followed_by === true || value.follows_viewer === true) return true;
      if (value.followed_by === false || value.follows_viewer === false) explicitFalse = true;
    }
    return explicitFalse ? false : null;
  };
  const requestJson = async url => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers,
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const user = payload?.data?.user || payload?.user;
      return {
        payload,
        profileId: String(user?.id || user?.pk || ""),
        followsYou: inspectRelationship(payload)
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  // This is the authoritative direction for "Segue você": search the target
  // username in the logged-in account's own followers. It avoids confusing
  // Instagram's `following` (viewer -> target) with `followed_by`
  // (target -> viewer), and does not navigate or open another tab.
  if (/^\d+$/.test(viewerId)) {
    const followerQuery = new URLSearchParams({
      count: "24",
      query: normalizedUsername,
      search_surface: "follow_list_page"
    }).toString();
    for (const host of ["https://i.instagram.com", "https://www.instagram.com"]) {
      const url = `${host}/api/v1/friendships/${viewerId}/followers/?${followerQuery}`;
      try {
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers
        });
        diagnostics.push({ source: "viewer-followers", host, status: response.status });
        if (!response.ok) continue;
        const payload = await response.json();
        const users = Array.isArray(payload?.users) ? payload.users : [];
        const followsYou = users.some(user =>
          normalizeCrmKey(user?.username) === normalizedUsername
        );
        return { followsYou, definitive: true, source: "viewer-followers", diagnostics };
      } catch (error) {
        diagnostics.push({
          source: "viewer-followers",
          host,
          error: error?.message || String(error)
        });
      }
    }
  }

  if (!profileId) {
    const profileResults = await Promise.allSettled([
      requestJson(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(normalizedUsername)}`),
      requestJson(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(normalizedUsername)}`)
    ]);
    let explicitFalse = false;
    for (const result of profileResults) {
      if (result.status !== "fulfilled") continue;
      if (!profileId && /^\d+$/.test(result.value.profileId)) profileId = result.value.profileId;
      if (result.value.followsYou === true) {
        return { followsYou: true, definitive: true, source: "web-profile", diagnostics };
      }
      if (result.value.followsYou === false) explicitFalse = true;
    }
    if (!profileId) {
      return {
        followsYou: explicitFalse ? false : null,
        definitive: explicitFalse,
        source: "web-profile",
        diagnostics
      };
    }
  }

  const relationshipResults = await Promise.allSettled([
    requestJson(`https://www.instagram.com/api/v1/friendships/show/${profileId}/`),
    requestJson(`https://i.instagram.com/api/v1/friendships/show/${profileId}/`)
  ]);
  let explicitFalse = false;
  for (const result of relationshipResults) {
    if (result.status !== "fulfilled") continue;
    if (result.value.followsYou === true) {
      return { followsYou: true, definitive: true, source: "friendship-show", diagnostics };
    }
    if (result.value.followsYou === false) explicitFalse = true;
  }
  return {
    followsYou: explicitFalse ? false : null,
    definitive: explicitFalse,
    source: "friendship-show",
    diagnostics
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "flowsiCrmMutate") {
    enqueueCrmMutation(message)
      .then(sendResponse)
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao salvar o Kanban."
      }));
    return true;
  }
  if (message?.action === "updateThreadList") {
    updateThreadList(
      message.cursor || null,
      sender.tab?.id || null,
      Boolean(message.apiOnly)
    ).then(sendResponse);
    return true;
  }
  if (message?.action === "flowsiFetchFollowing") {
    fetchFollowingInBackground(message.username, message.profileId)
      .then(following => sendResponse({
        success: Number.isFinite(following),
        following
      }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao consultar Seguindo."
      }));
    return true;
  }
  if (message?.action === "flowsiFetchRelationship") {
    fetchRelationshipInBackground(message.username, message.profileId)
      .then(result => sendResponse({
        success: typeof result?.followsYou === "boolean",
        followsYou: result?.followsYou,
        definitive: Boolean(result?.definitive),
        source: result?.source || "",
        diagnostics: result?.diagnostics || []
      }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao consultar o relacionamento."
      }));
    return true;
  }
  if (message?.action === "sendMessageToInstagram") {
    sendMessageToInstagram(message.username, message.message, sender.tab?.id || null)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao enviar a mensagem do chatbot."
      }));
    return true;
  }
  if (message?.action === "checkNotifications") {
    checkNotifications()
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao verificar os gatilhos."
      }));
    return true;
  }
  return false;
});

async function getInstagramTabId() {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  return tabs[0]?.id || null;
}

const CHATBOT_SEEN_LIMIT = 500;
const DIRECT_BASELINE_RECENT_WINDOW_MS = 5 * 60 * 1000;

const normalizeTriggerText = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, " ");

const botUsesExplicitSources = bot => [
  "triggerDirect",
  "triggerPostComments",
  "triggerNewFollowers"
].some(key => typeof bot?.[key] === "boolean");

const botSourceEnabled = (bot, source) => {
  if (botUsesExplicitSources(bot)) return bot?.[source] === true;
  // Bots created before the source checkboxes were introduced keep their
  // original comment behavior and also gain the Direct/Story trigger that the
  // old interface promised to the user.
  return source === "triggerDirect" || source === "triggerPostComments";
};

const botMatchesText = (bot, text) => {
  const normalizedText = normalizeTriggerText(text);
  if (!normalizedText) return false;
  return (Array.isArray(bot?.keywords) ? bot.keywords : []).some(keyword => {
    const normalizedKeyword = normalizeTriggerText(keyword);
    if (!normalizedKeyword) return false;
    if (normalizedText === normalizedKeyword) return true;
    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i").test(normalizedText);
  });
};

async function getActiveChatbots() {
  const { bots = [] } = await chrome.storage.local.get("bots");
  return bots.filter(bot => bot?.start === true && bot?.type === "comment");
}

async function appendChatbotDiagnostic(entry) {
  const { flowsiChatbotDiagnostics = [] } = await chrome.storage.local.get(
    "flowsiChatbotDiagnostics"
  );
  const next = [...flowsiChatbotDiagnostics, {
    at: new Date().toISOString(),
    ...entry
  }].slice(-100);
  await chrome.storage.local.set({ flowsiChatbotDiagnostics: next });
}

const findTemplate = (quickMessages, bot) => {
  const wanted = normalizeTriggerText(bot?.template);
  return quickMessages.find(item =>
    normalizeTriggerText(item?.title) === wanted &&
    (!item?.type || item.type === "text")
  );
};

async function fetchNotifications(csrfToken) {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-CSRFToken": csrfToken,
    "x-requested-with": "XMLHttpRequest",
    "x-instagram-ajax": "1",
    "x-asbd-id": "129477",
    "X-IG-App-ID": INSTAGRAM_APP_ID
  };
  const attempts = [
    { url: "https://i.instagram.com/api/v1/news/inbox/?mark_as_seen=false", method: "GET" },
    { url: "https://www.instagram.com/api/v1/news/inbox/?mark_as_seen=false", method: "GET" },
    { url: "https://i.instagram.com/api/v1/news/inbox/", method: "POST" }
  ];
  const failures = [];
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        credentials: "include",
        cache: "no-store",
        headers
      });
      if (!response.ok) {
        failures.push(`${attempt.method} ${new URL(attempt.url).host}: HTTP ${response.status}`);
        continue;
      }
      const data = await response.json();
      return [
        ...(Array.isArray(data.new_stories) ? data.new_stories : []),
        ...(Array.isArray(data.old_stories) ? data.old_stories : [])
      ];
    } catch (error) {
      failures.push(`${attempt.method} ${new URL(attempt.url).host}: ${error?.message || error}`);
    }
  }
  throw new Error(`Falha ao ler notificações: ${failures.join("; ")}`);
}

async function replyToInstagramComment(notification, replyText, csrfToken) {
  const args = notification?.args || {};
  const commentId = String(args.comment_id || args.comment_pk || args.pk || "").trim();
  const mediaId = String(
    args.media_id || args.media_pk || args.media?.id || args.media?.pk || ""
  ).trim();
  if (!commentId || !mediaId) {
    throw new Error("A notificação não trouxe o ID da postagem necessário para responder.");
  }
  const body = new URLSearchParams({
    comment_text: String(replyText || "").trim(),
    replied_to_comment_id: commentId
  }).toString();
  const response = await fetch(
    `https://i.instagram.com/api/v1/media/${encodeURIComponent(mediaId)}/comment/`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
        "x-requested-with": "XMLHttpRequest",
        "x-instagram-ajax": "1",
        "x-asbd-id": "129477",
        "X-IG-App-ID": INSTAGRAM_APP_ID
      },
      body
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status !== "ok") {
    throw new Error(payload?.message || `Falha ao responder comentário (HTTP ${response.status}).`);
  }
  return payload;
}

async function processInstagramNotifications(tabId, notifications, bots, csrfToken) {
  const stored = await chrome.storage.local.get([
    "flowsiChatbotSeenComments",
    "flowsiChatbotSeenFollowers",
    "flowsiChatbotNotificationBaselineReady",
    "flowsiChatbotCompletedActions",
    "seenComment",
    "quickMessages"
  ]);
  const quickMessages = Array.isArray(stored.quickMessages) ? stored.quickMessages : [];
  const seenComments = new Set([
    ...(Array.isArray(stored.flowsiChatbotSeenComments) ? stored.flowsiChatbotSeenComments : []),
    ...(Array.isArray(stored.seenComment) ? stored.seenComment : [])
  ].map(String));
  const seenFollowers = new Set(
    (Array.isArray(stored.flowsiChatbotSeenFollowers)
      ? stored.flowsiChatbotSeenFollowers
      : []).map(String)
  );
  const completedActions = new Set(
    (Array.isArray(stored.flowsiChatbotCompletedActions)
      ? stored.flowsiChatbotCompletedActions
      : []).map(String)
  );

  if (!stored.flowsiChatbotNotificationBaselineReady) {
    for (const notification of notifications) {
      const args = notification?.args || {};
      const type = String(notification?.notif_name || "").toLowerCase();
      if (type === "comment") {
        const id = String(args.comment_id || args.comment_pk || args.pk || "").trim();
        if (id) seenComments.add(id);
      }
      if (type === "follow" || type === "new_follower") {
        const username = normalizeCrmKey(args.profile_name || args.username || args.user?.username);
        const id = String(
          notification?.pk || args.profile_id || args.user_id || args.id || `${username}:${args.timestamp || ""}`
        );
        if (id) seenFollowers.add(id);
      }
    }
    await chrome.storage.local.set({
      flowsiChatbotNotificationBaselineReady: true,
      flowsiChatbotSeenComments: [...seenComments].slice(-CHATBOT_SEEN_LIMIT),
      flowsiChatbotSeenFollowers: [...seenFollowers].slice(-CHATBOT_SEEN_LIMIT)
    });
    return;
  }

  for (const notification of notifications) {
    const args = notification?.args || {};
    const notificationType = String(notification?.notif_name || "").toLowerCase();
    const username = normalizeCrmKey(
      args.profile_name || args.username || args.user?.username
    );

    if (notificationType === "comment") {
      const commentId = String(args.comment_id || args.comment_pk || args.pk || "").trim();
      const commentText = String(args.comment_text || args.text || "").trim();
      if (!commentId || seenComments.has(commentId)) continue;
      const matchingBots = bots.filter(bot =>
        botSourceEnabled(bot, "triggerPostComments") && botMatchesText(bot, commentText)
      );
      if (!matchingBots.length) {
        seenComments.add(commentId);
        continue;
      }

      let allSucceeded = true;
      for (const bot of matchingBots) {
        const template = findTemplate(quickMessages, bot);
        const botKey = String(bot?.id || bot?.template || "bot");
        const dmActionKey = `${commentId}:${botKey}:dm`;
        const replyActionKey = `${commentId}:${botKey}:public-reply`;
        try {
          let sendResult = null;
          if (!username) throw new Error("A notificação não informou o @ do autor.");
          if (!template?.content) throw new Error(`Modelo '${bot.template || ""}' não encontrado.`);
          if (!completedActions.has(dmActionKey)) {
            sendResult = await sendMessageToInstagram(username, template.content, tabId);
            completedActions.add(dmActionKey);
          }
          if (
            String(bot.publicCommentReply || "").trim() &&
            !completedActions.has(replyActionKey)
          ) {
            await replyToInstagramComment(notification, bot.publicCommentReply, csrfToken);
            completedActions.add(replyActionKey);
          }
          await appendChatbotDiagnostic({
            status: "sent",
            source: "post-comment",
            eventId: commentId,
            username,
            template: bot.template,
            transport: sendResult?.transport || "already-completed",
            publicReply: Boolean(String(bot.publicCommentReply || "").trim())
          });
        } catch (error) {
          allSucceeded = false;
          await appendChatbotDiagnostic({
            status: "error",
            source: "post-comment",
            eventId: commentId,
            username,
            template: bot.template,
            error: error?.message || String(error)
          });
        }
      }
      if (allSucceeded) seenComments.add(commentId);
      continue;
    }

    if (notificationType === "follow" || notificationType === "new_follower") {
      const followerId = String(
        notification?.pk || args.profile_id || args.user_id || args.id || `${username}:${args.timestamp || ""}`
      );
      if (!username || seenFollowers.has(followerId)) continue;
      const followerBots = bots.filter(bot => botSourceEnabled(bot, "triggerNewFollowers"));
      if (!followerBots.length) {
        seenFollowers.add(followerId);
        continue;
      }
      let allSucceeded = true;
      for (const bot of followerBots) {
        const template = findTemplate(quickMessages, bot);
        const botKey = String(bot?.id || bot?.template || "bot");
        const dmActionKey = `${followerId}:${botKey}:follower-dm`;
        try {
          let sendResult = null;
          if (!template?.content) throw new Error(`Modelo '${bot.template || ""}' não encontrado.`);
          if (!completedActions.has(dmActionKey)) {
            sendResult = await sendMessageToInstagram(username, template.content, tabId);
            completedActions.add(dmActionKey);
          }
          await appendChatbotDiagnostic({
            status: "sent",
            source: "new-follower",
            eventId: followerId,
            username,
            template: bot.template,
            transport: sendResult?.transport || "already-completed"
          });
        } catch (error) {
          allSucceeded = false;
          await appendChatbotDiagnostic({
            status: "error",
            source: "new-follower",
            eventId: followerId,
            username,
            template: bot.template,
            error: error?.message || String(error)
          });
        }
      }
      if (allSucceeded) seenFollowers.add(followerId);
    }
  }

  await chrome.storage.local.set({
    flowsiChatbotSeenComments: [...seenComments].slice(-CHATBOT_SEEN_LIMIT),
    flowsiChatbotSeenFollowers: [...seenFollowers].slice(-CHATBOT_SEEN_LIMIT),
    flowsiChatbotCompletedActions: [...completedActions].slice(-1000)
  });
}

async function fetchDirectInboxFolder(folder, csrfToken) {
  const query = new URLSearchParams({
    persistentBadging: "true",
    use_unified_inbox: "true",
    limit: "20",
    thread_message_limit: "10",
    folder: String(folder)
  });
  const requestOptions = {
    credentials: "include",
    cache: "no-store",
    headers: {
      "X-CSRFToken": csrfToken,
      "x-requested-with": "XMLHttpRequest",
      "x-asbd-id": "129477",
      "X-IG-App-ID": INSTAGRAM_APP_ID
    }
  };
  const failures = [];
  for (const host of ["https://www.instagram.com", "https://i.instagram.com"]) {
    const response = await fetch(
      `${host}/api/v1/direct_v2/inbox/?${query.toString()}`,
      requestOptions
    ).catch(error => {
      failures.push(`${new URL(host).host}: ${error?.message || error}`);
      return null;
    });
    if (!response) continue;
    if (!response.ok) {
      failures.push(`${new URL(host).host}: HTTP ${response.status}`);
      continue;
    }
    const payload = await response.json();
    return Array.isArray(payload?.inbox?.threads) ? payload.inbox.threads : [];
  }
  throw new Error(
    `Falha ao ler Direct ${folder} (${failures.join("; ") || "sem resposta"}).`
  );
}

async function fetchDirectInboxFromInstagramTab(tabId, csrfToken) {
  const readVisibleInbox = async () => {
    try {
      const visible = await chrome.tabs.sendMessage(tabId, {
        action: "flowsiChatbotReadVisibleInbox"
      });
      return visible?.success && Array.isArray(visible.threads)
        ? visible.threads
        : [];
    } catch (_) {
      return [];
    }
  };
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotReadInbox"
    });
    if (!response?.success) {
      throw new Error(response?.error || "A página do Instagram não respondeu.");
    }
    const visibleThreads = await readVisibleInbox();
    return {
      // The Instagram API may return HTTP 200 with a stale/incomplete inbox.
      // Keep it as the primary source, but append the recent visible rows so
      // a new keyword cannot be missed merely because the API lagged behind.
      primary: [
        ...(Array.isArray(response.primary) ? response.primary : []),
        ...visibleThreads
      ],
      general: Array.isArray(response.general) ? response.general : [],
      viewerId: String(response.viewerId || ""),
      transport: visibleThreads.length
        ? "instagram-page+visible-inbox"
        : "instagram-page"
    };
  } catch (pageError) {
    try {
      const [primary, general] = await Promise.all([
        fetchDirectInboxFolder(0, csrfToken),
        fetchDirectInboxFolder(1, csrfToken)
      ]);
      return {
        primary,
        general,
        viewerId: "",
        transport: "extension-background-fallback",
        pageError: pageError?.message || String(pageError)
      };
    } catch (backgroundError) {
      const visibleThreads = await readVisibleInbox();
      if (!visibleThreads.length) throw backgroundError;
      return {
        primary: visibleThreads,
        general: [],
        viewerId: "",
        transport: "instagram-visible-inbox",
        pageError: pageError?.message || String(pageError),
        backgroundError: backgroundError?.message || String(backgroundError)
      };
    }
  }
}

const readDirectItemText = item => {
  for (const candidate of [
    item?.text,
    item?.reel_share?.text,
    item?.story_share?.text,
    item?.link?.text,
    item?.media_share?.caption?.text,
    item?.clip?.clip?.caption?.text
  ]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
};

const readDirectItemTimestamp = item => {
  const numeric = Number(item?.timestamp || item?.sent_at || item?.created_at || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  if (numeric >= 1e15) return Math.floor(numeric / 1000);
  if (numeric >= 1e12) return Math.floor(numeric);
  return Math.floor(numeric * 1000);
};

async function processDirectInbox(tabId, threads, bots, viewerId) {
  const {
    flowsiChatbotSeenDirect = [],
    flowsiChatbotDirectBaselineReady = false,
    flowsiChatbotCompletedActions = [],
    quickMessages = []
  } =
    await chrome.storage.local.get([
      "flowsiChatbotSeenDirect",
      "flowsiChatbotDirectBaselineReady",
      "flowsiChatbotCompletedActions",
      "quickMessages"
    ]);
  const seen = new Set((Array.isArray(flowsiChatbotSeenDirect)
    ? flowsiChatbotSeenDirect
    : []).map(String));
  const completedActions = new Set(
    (Array.isArray(flowsiChatbotCompletedActions)
      ? flowsiChatbotCompletedActions
      : []).map(String)
  );
  const candidatesById = new Map();
  for (const thread of threads) {
    const items = Array.isArray(thread?.items) ? thread.items.slice(0, 10) : [];
    for (const item of items) {
      const itemId = String(item?.item_id || item?.client_context || "").trim();
      const senderId = String(item?.user_id || item?.sender_id || "").trim();
      if (!itemId || !senderId || senderId === String(viewerId || "")) continue;
      const text = readDirectItemText(item);
      if (!text) continue;
      const sender = (Array.isArray(thread?.users) ? thread.users : []).find(user =>
        String(user?.pk || user?.id || "") === senderId
      ) || (Array.isArray(thread?.users) ? thread.users[0] : null);
      const username = normalizeCrmKey(sender?.username);
      if (!username) continue;
      candidatesById.set(itemId, {
        itemId,
        threadId: String(thread?.thread_id || ""),
        username,
        text,
        timestamp: readDirectItemTimestamp(item)
      });
    }
  }
  const candidates = [...candidatesById.values()];
  const directBots = bots.filter(bot => botSourceEnabled(bot, "triggerDirect"));

  // Establish a watermark without swallowing a trigger that arrived moments
  // before the first poll after the bot was created or the extension reloaded.
  let candidatesToProcess = candidates;
  if (!flowsiChatbotDirectBaselineReady) {
    const cutoff = Date.now() - DIRECT_BASELINE_RECENT_WINDOW_MS;
    const latestMatchingByUser = new Map();
    for (const candidate of candidates) {
      const isRecent = candidate.timestamp > 0 && candidate.timestamp >= cutoff;
      const matches = directBots.some(bot => botMatchesText(bot, candidate.text));
      if (!isRecent || !matches) continue;
      const previous = latestMatchingByUser.get(candidate.username);
      if (!previous || candidate.timestamp > previous.timestamp) {
        latestMatchingByUser.set(candidate.username, candidate);
      }
    }
    candidatesToProcess = [...latestMatchingByUser.values()];
    const recentIds = new Set(candidatesToProcess.map(candidate => candidate.itemId));
    for (const candidate of candidates) {
      if (!recentIds.has(candidate.itemId)) seen.add(candidate.itemId);
    }
    await chrome.storage.local.set({
      flowsiChatbotDirectBaselineReady: true,
      flowsiChatbotSeenDirect: [...seen].slice(-CHATBOT_SEEN_LIMIT)
    });
  }

  for (const candidate of candidatesToProcess
    .sort((left, right) => left.timestamp - right.timestamp)) {
    if (seen.has(candidate.itemId)) continue;
    const matchingBots = directBots.filter(bot => botMatchesText(bot, candidate.text));
    if (!matchingBots.length) {
      seen.add(candidate.itemId);
      continue;
    }
    let allSucceeded = true;
    for (const bot of matchingBots) {
      const template = findTemplate(quickMessages, bot);
      const botKey = String(bot?.id || bot?.template || "bot");
      const dmActionKey = `${candidate.itemId}:${botKey}:direct-dm`;
      try {
        let sendResult = null;
        if (!template?.content) throw new Error(`Modelo '${bot.template || ""}' não encontrado.`);
        if (!completedActions.has(dmActionKey)) {
          sendResult = await sendMessageToInstagram(
            candidate.username,
            template.content,
            tabId,
            candidate.threadId
          );
          completedActions.add(dmActionKey);
        }
        await appendChatbotDiagnostic({
          status: "sent",
          source: "direct-or-story",
          eventId: candidate.itemId,
          username: candidate.username,
          template: bot.template,
          transport: sendResult?.transport || "already-completed",
          matchedText: candidate.text.slice(0, 120)
        });
      } catch (error) {
        allSucceeded = false;
        await appendChatbotDiagnostic({
          status: "error",
          source: "direct-or-story",
          eventId: candidate.itemId,
          username: candidate.username,
          template: bot.template,
          error: error?.message || String(error)
        });
      }
    }
    if (allSucceeded) seen.add(candidate.itemId);
  }
  await chrome.storage.local.set({
    flowsiChatbotSeenDirect: [...seen].slice(-CHATBOT_SEEN_LIMIT),
    flowsiChatbotCompletedActions: [...completedActions].slice(-1000)
  });
}

async function checkNotifications() {
  const now = Date.now();
  const { lastRunTime = 0 } = await chrome.storage.local.get("lastRunTime");
  if (now - lastRunTime < NOTIFICATION_MIN_INTERVAL_MS) return;
  await chrome.storage.local.set({ lastRunTime: now });

  const tabId = await getInstagramTabId();
  const bots = await getActiveChatbots();
  if (!tabId || !bots.length) return;

  const cookies = await getInstagramCookies().catch(() => ({}));
  try {
    const [notifications, directInbox] = await Promise.all([
      (cookies.csrftoken ? fetchNotifications(cookies.csrftoken) : Promise.resolve([])).catch(error => {
        appendChatbotDiagnostic({
          status: "error",
          source: "notifications-read",
          error: error?.message || String(error)
        });
        return [];
      }),
      fetchDirectInboxFromInstagramTab(tabId, cookies.csrftoken || "").catch(error => {
        appendChatbotDiagnostic({
          status: "error",
          source: "direct-inbox-read",
          error: error?.message || String(error)
        });
        return {
          primary: [],
          general: [],
          viewerId: "",
          transport: "failed",
          error: error?.message || String(error)
        };
      })
    ]);
    if (cookies.csrftoken) {
      await processInstagramNotifications(tabId, notifications, bots, cookies.csrftoken);
    }
    const uniqueThreads = [...new Map(
      [...directInbox.primary, ...directInbox.general]
        .map(thread => [String(thread?.thread_id || ""), thread])
    ).values()];
    await chrome.storage.local.set({
      flowsiChatbotLastInboxCheck: {
        at: new Date().toISOString(),
        status: directInbox.error ? "error" : "ok",
        transport: directInbox.transport,
        primaryThreads: directInbox.primary.length,
        generalThreads: directInbox.general.length,
        totalThreads: uniqueThreads.length,
        error: directInbox.error || null
      }
    });
    await processDirectInbox(
      tabId,
      uniqueThreads,
      bots,
      directInbox.viewerId || cookies.ds_user_id
    );
    return {
      notifications: notifications.length,
      directThreads: uniqueThreads.length
    };
  } catch (error) {
    console.error("Notification check failed:", error);
    await appendChatbotDiagnostic({
      status: "error",
      source: "trigger-check",
      error: error?.message || String(error)
    });
    throw error;
  }
}

chrome.alarms.create("checkNotif", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "checkNotif") checkNotifications();
});

console.log("Flowsi background loaded at", new Date().toISOString());
