const NOTIFICATION_MIN_INTERVAL_MS = 3000;
const INSTAGRAM_APP_ID = "936619743392459";
const CRM_ASSIGNMENTS_KEY = "flowsiKanbanAssignmentsV2";
const CRM_MANUAL_CONTACTS_KEY = "flowsiManualContacts";
let crmMutationQueue = Promise.resolve();
let chatbotNotificationCheckInFlight = null;
let chatbotDirectProcessingQueue = Promise.resolve();
let chatbotCompletedActionsMutationQueue = Promise.resolve();

const CHATBOT_COMPLETED_ACTIONS_KEY = "flowsiChatbotCompletedActions";
const CHATBOT_COMPLETED_ACTIONS_LIMIT = 1000;
const CHATBOT_DIRECT_STATE_BY_VIEWER_KEY = "flowsiChatbotDirectStateByViewer";
const CHATBOT_DIRECT_ACTIVE_VIEWER_KEY = "flowsiChatbotDirectActiveViewerId";

// Comment notifications and Direct realtime events may finish at nearly the
// same time. A read/modify/write performed from each flow independently can
// make the last writer erase the other acknowledgement. Keep every mutation
// in one worker-local queue and always union it with the latest persisted
// value before writing.
function persistCompletedActionsUnion(actions) {
  const additions = [...new Set(
    [...(actions || [])].map(String).filter(Boolean)
  )];
  const run = chatbotCompletedActionsMutationQueue
    .catch(() => null)
    .then(async () => {
      const stored = await chrome.storage.local.get(CHATBOT_COMPLETED_ACTIONS_KEY);
      const merged = new Set(
        (Array.isArray(stored?.[CHATBOT_COMPLETED_ACTIONS_KEY])
          ? stored[CHATBOT_COMPLETED_ACTIONS_KEY]
          : []).map(String)
      );
      for (const action of additions) merged.add(action);
      const value = [...merged].slice(-CHATBOT_COMPLETED_ACTIONS_LIMIT);
      await chrome.storage.local.set({ [CHATBOT_COMPLETED_ACTIONS_KEY]: value });
      return value;
    });
  chatbotCompletedActionsMutationQueue = run.catch(() => null);
  return run;
}

async function getInstagramCookies() {
  const cookies = await chrome.cookies.getAll({ domain: ".instagram.com" });
  const values = {};
  for (const cookie of cookies) values[cookie.name] = cookie.value;
  return values;
}

function viewerIdFromRurCookieValue(rawValue) {
  let value = String(rawValue || "");
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
  return value.match(/^[^,]+,(\d{5,}),/)?.[1] || "";
}

const normalizeInstagramViewerId = value => {
  const normalized = String(value || "").trim();
  return /^\d+$/.test(normalized) ? normalized : "";
};

async function resolveChatbotViewerId(viewerIdHint = "", cookiesHint = null) {
  const hinted = normalizeInstagramViewerId(viewerIdHint);
  if (hinted) return hinted;
  const cookies = cookiesHint && typeof cookiesHint === "object"
    ? cookiesHint
    : await getInstagramCookies().catch(() => ({}));
  const fromCookies = normalizeInstagramViewerId(cookies?.ds_user_id) ||
    normalizeInstagramViewerId(viewerIdFromRurCookieValue(cookies?.rur));
  if (fromCookies) return fromCookies;
  const stored = await chrome.storage.local.get(CHATBOT_DIRECT_ACTIVE_VIEWER_KEY);
  return normalizeInstagramViewerId(stored?.[CHATBOT_DIRECT_ACTIVE_VIEWER_KEY]);
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
        const requestedOrder = Array.isArray(message.order)
          ? message.order.map(normalizeCrmKey).filter(Boolean)
          : [];
        if (requestedOrder.length) {
          const profilesByKey = new Map(
            nextTarget.profiles.map(item => [normalizeCrmKey(item?.username), item])
          );
          const orderedProfiles = [];
          for (const orderedKey of requestedOrder) {
            const orderedProfile = profilesByKey.get(orderedKey);
            if (!orderedProfile) continue;
            orderedProfiles.push(orderedProfile);
            profilesByKey.delete(orderedKey);
          }
          nextTarget.profiles = [...orderedProfiles, ...profilesByKey.values()];
        }
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

async function sendMessageToInstagram(
  username,
  message,
  preferredTabId = null,
  threadId = "",
  viewerIdHint = "",
  trustedThreadIdHint = ""
) {
  const normalizedUsername = normalizeCrmKey(username);
  const text = String(message || "").trim();
  if (!normalizedUsername || !text) {
    throw new Error("Usuário ou mensagem do chatbot inválidos.");
  }
  let tabId = preferredTabId;
  if (!tabId) tabId = await getInstagramTabId();
  if (!tabId) throw new Error("Nenhuma aba do Instagram está aberta.");
  // The inbox payload is the freshest source for the viewer ID. Cookies are
  // only a fallback because `rur` can lag behind account switches and may be
  // HttpOnly. Never pass the raw cookie to the page bridge.
  const instagramCookies = await getInstagramCookies().catch(() => ({}));
  const hintedViewerId = String(viewerIdHint || "").trim();
  const viewerId = /^\d+$/.test(hintedViewerId)
    ? hintedViewerId
    : String(instagramCookies?.ds_user_id || "").trim() ||
      viewerIdFromRurCookieValue(instagramCookies?.rur);
  const normalizedThreadId = String(threadId || "").trim();
  const normalizedTrustedThreadId = String(trustedThreadIdHint || "").trim();
  // Numeric IDs from /direct/t/<key>, CRM profiles and user search results are
  // not necessarily the thread_id accepted by Instagram's send endpoint. Only
  // an ID explicitly marked by an authenticated inbox/React event is trusted.
  const trustedThreadId = /^\d+$/.test(normalizedTrustedThreadId) &&
    normalizedTrustedThreadId === normalizedThreadId
    ? normalizedTrustedThreadId
    : "";
  const deliveryId = `flowsi-delivery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Capture the visible conversation before sending. The versioned sender
  // waits for Instagram's /ig_send_message_response acknowledgement; when the
  // destination is open we additionally require a brand-new outgoing bubble.
  let deliverySnapshot = null;
  try {
    deliverySnapshot = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotSnapshotOutgoingMessage",
      username: normalizedUsername,
      message: text,
      threadId: String(threadId || ""),
      trustedThreadId
    });
  } catch (_) {}
  const confirmVisibleDelivery = async result => {
    if (deliverySnapshot?.success !== true || deliverySnapshot.activeConversation !== true) {
      return result;
    }
    const confirmation = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotConfirmOutgoingMessage",
      username: normalizedUsername,
      message: text,
      snapshot: deliverySnapshot
    }).catch(error => ({
      success: false,
      status: "unconfirmed",
      error: error?.message || String(error)
    }));
    if (confirmation?.success !== true || confirmation.status !== "sent") {
      throw new Error(
        confirmation?.error || "O Instagram não confirmou a nova mensagem no Direct."
      );
    }
    return {
      ...result,
      confirmation: "instagram-ack+outgoing-bubble",
      messageToken: confirmation.messageToken || ""
    };
  };
  let response = null;
  let mainError = "";
  try {
    response = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotSendMessageMain",
      username: normalizedUsername,
      message: text,
      threadId: String(threadId || ""),
      viewerId,
      trustedThreadId,
      deliveryId
    });
  } catch (error) {
    mainError = error?.message || String(error);
  }
  if (!response || response.success !== true || response.status !== "sent") {
    if (response?.deliveryAttempted === true) {
      throw new Error(
        response.error ||
        "A tentativa de envio já foi publicada; o fallback foi bloqueado para evitar duplicidade."
      );
    }
    let fallback = null;
    try {
      fallback = await chrome.tabs.sendMessage(tabId, {
        action: "flowsiChatbotSendMessage",
        username: normalizedUsername,
        message: text,
        threadId: String(threadId || ""),
        viewerId,
        trustedThreadId,
        deliveryId
      });
    } catch (error) {
      mainError = [mainError, error?.message || String(error)].filter(Boolean).join("; ");
    }
    if (!fallback || fallback.success !== true || fallback.status !== "sent") {
      throw new Error(
        response?.error || fallback?.error || mainError ||
        "O Instagram não confirmou o envio do Direct."
      );
    }
    return confirmVisibleDelivery(fallback);
  }
  return confirmVisibleDelivery(response);
}

const flowsiBulkSendInFlight = new Map();
const flowsiBulkSendCompleted = new Map();
const FLOWSI_BULK_DEDUPE_TTL_MS = 6 * 60 * 60 * 1000;

async function sendBulkMessageOnce(message, tabId) {
  const campaignId = String(message?.campaignId || "").trim();
  const recipientKey = normalizeCrmKey(message?.recipientKey || message?.username);
  if (!campaignId || !recipientKey) {
    return sendMessageToInstagram(
      message?.username,
      message?.message,
      tabId,
      message?.threadId || ""
    );
  }
  const now = Date.now();
  for (const [key, entry] of flowsiBulkSendCompleted.entries()) {
    if (now - Number(entry?.at || 0) > FLOWSI_BULK_DEDUPE_TTL_MS) {
      flowsiBulkSendCompleted.delete(key);
    }
  }
  const key = `${campaignId}:${recipientKey}`;
  const completed = flowsiBulkSendCompleted.get(key);
  if (completed) return { ...completed.result, deduplicated: true };
  if (flowsiBulkSendInFlight.has(key)) return flowsiBulkSendInFlight.get(key);

  const task = sendMessageToInstagram(
    message.username,
    message.message,
    tabId,
    message.threadId || ""
  )
    .then(result => {
      flowsiBulkSendCompleted.set(key, { at: Date.now(), result });
      return result;
    })
    .finally(() => flowsiBulkSendInFlight.delete(key));
  flowsiBulkSendInFlight.set(key, task);
  return task;
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
    sendMessageToInstagram(
      message.username,
      message.message,
      sender.tab?.id || null,
      message.threadId || "",
      message.viewerId || "",
      message.trustedThreadId || ""
    )
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao enviar a mensagem do chatbot."
      }));
    return true;
  }
  if (message?.action === "flowsiBulkSendMessage") {
    sendBulkMessageOnce(message, sender.tab?.id || null)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao enviar a mensagem em massa."
      }));
    return true;
  }
  if (message?.action === "flowsiChatbotRealtimeEvent") {
    processChatbotRealtimeEvent(message, sender.tab?.id || null)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao processar o evento do Direct."
      }));
    return true;
  }
  if (message?.action === "checkNotifications") {
    checkNotifications({
      force: message?.force === true,
      // A realtime event belongs to the exact Instagram page that observed
      // the floating Direct bubble. Query that tab instead of preferring a
      // different /direct/ tab whose in-memory event map cannot contain it.
      preferredTabId: sender.tab?.id || null
    })
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({
        success: false,
        error: error?.message || "Falha ao verificar os gatilhos."
      }));
    return true;
  }
  return false;
});

const isUsableInstagramTab = tab => {
  if (!Number.isInteger(tab?.id) || tab?.discarded === true) return false;
  // Instagram performs long SPA navigations and Chrome can keep `status` as
  // "loading" while the already-injected content bridge is operational. Do
  // not drop that tab silently; sendMessage/bridge readiness is the source of
  // truth and the next alarm retries if the document really is not ready yet.
  return /^https:\/\/www\.instagram\.com\//i.test(String(
    tab.url || tab.pendingUrl || ""
  ));
};

const instagramTabPriority = tab => {
  const url = String(tab?.url || "");
  const isDirect = /\/direct(?:\/|$)/i.test(url);
  // A loaded Direct tab can also provide the visible-inbox fallback. Prefer
  // it over a generic Instagram page. A complete document wins when one is
  // available, but a loading SPA tab remains usable as the final fallback.
  return (isDirect ? 100 : 0) + (tab?.status === "complete" ? 50 : 0) +
    (tab?.active ? 20 : 0) +
    (tab?.currentWindow ? 5 : 0) + Number(tab?.lastAccessed || 0) / 1e15;
};

async function getInstagramTabId(preferredTabId = null) {
  const tabs = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  const preferred = tabs.find(tab => tab.id === preferredTabId && isUsableInstagramTab(tab));
  if (preferred?.id) return preferred.id;
  const selected = tabs
    .filter(isUsableInstagramTab)
    .sort((left, right) => instagramTabPriority(right) - instagramTabPriority(left))[0];
  return selected?.id || null;
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
  if (source === "triggerNewFollowers") return false;
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
  const sanitizedBots = bots.map(bot => bot?.triggerNewFollowers === true
    ? { ...bot, triggerNewFollowers: false, newFollowersEnabledAt: null }
    : bot);
  if (sanitizedBots.some((bot, index) => bot !== bots[index])) {
    await chrome.storage.local.set({ bots: sanitizedBots });
  }
  return sanitizedBots.filter(bot => bot?.start === true && bot?.type === "comment");
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

const normalizeChatbotContactName = value => String(value || "")
  .replace(/\s+/g, " ")
  .trim();

const createChatbotContact = (username, ...nameCandidates) => {
  const normalizedUsername = normalizeCrmKey(username);
  const name = nameCandidates
    .map(normalizeChatbotContactName)
    .find(Boolean) || "";
  return { username: normalizedUsername, name };
};

async function applyChatbotLabelForBot(
  bot,
  contact,
  actionKey,
  completedActions,
  persistCompletedActions
) {
  if (bot?.addLabel !== true) return null;

  const columnId = String(bot?.labelColumnId || "").trim();
  if (!columnId || columnId === "all-chats") {
    throw new Error("A etiqueta configurada no chatbot não é válida.");
  }
  if (completedActions.has(actionKey)) {
    return { status: "already-completed", columnId };
  }

  const username = normalizeCrmKey(contact?.username);
  if (!username) {
    throw new Error("Não foi possível identificar o contato para adicionar a etiqueta.");
  }
  const name = normalizeChatbotContactName(
    contact?.name || contact?.fullName || contact?.full_name || contact?.displayName
  );
  const result = await enqueueCrmMutation({
    mutation: "assign",
    columnId,
    username,
    profile: {
      username,
      name: name || username,
      full_name: name || username,
      id: `chatbot-${username}`,
      source: "chatbot"
    }
  });
  completedActions.add(actionKey);
  await persistCompletedActions();
  return { ...result, status: "assigned", columnId };
}

const personalizeChatbotMessage = (template, contact = {}) => {
  const username = normalizeCrmKey(contact?.username);
  const explicitName = normalizeChatbotContactName(
    contact?.name || contact?.fullName || contact?.full_name || contact?.displayName
  );
  // Quick-message templates expose the complete name through <name>/<nome>
  // and its first word through <primeironome>. Inbox payloads normally include
  // a full_name; notification payloads do not always do so, therefore the
  // username (without @) is the deterministic fallback. Replacement callbacks
  // keep values containing "$" literal and never leak a known placeholder.
  const name = explicitName || username || "";
  const firstName = explicitName
    ? explicitName.split(/\s+/)[0]
    : username;
  return String(template || "")
    .replace(/<\s*(?:name|nome)\s*>/gi, () => name)
    .replace(/<\s*primeironome\s*>/gi, () => firstName)
    .replace(/<\s*username\s*>/gi, () => username)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+(?=\r?\n|$)/g, "")
    .trim();
};

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
      const data = await readInstagramJson(response);
      return collectInstagramNotifications(data);
    } catch (error) {
      failures.push(`${attempt.method} ${new URL(attempt.url).host}: ${error?.message || error}`);
    }
  }
  throw new Error(`Falha ao ler notificações: ${failures.join("; ")}`);
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
      `${notificationType(notification) || "notification"}:${notificationUsername(notification) || index}:${args?.timestamp || ""}`
    );
    return [key, notification];
  })).values()];
}

const notificationType = notification => String(
  notification?.notif_name || notification?.notification_type || notification?.type ||
  notification?.args?.notif_name || notification?.args?.type || ""
).trim().toLowerCase().replace(/[\s-]+/g, "_");

const notificationUsername = notification => normalizeCrmKey(
  notification?.args?.profile_name || notification?.args?.username ||
  notification?.args?.user?.username || notification?.args?.actor?.username ||
  notification?.args?.profile?.username || notification?.user?.username ||
  notification?.actor?.username || notification?.profile?.username
);

const notificationText = notification => normalizeTriggerText(
  notification?.args?.text || notification?.args?.message || notification?.text ||
  notification?.message || notification?.title
);

const isFollowerNotification = notification => {
  const type = notificationType(notification);
  if (["follow", "new_follower", "follower", "user_followed"].includes(type)) return true;
  const text = notificationText(notification);
  return /(?:comecou a seguir voce|started following you|followed you|te seguiu)/i.test(text);
};

const followerNotificationId = notification => {
  const args = notification?.args || {};
  const username = notificationUsername(notification);
  return String(
    notification?.pk || notification?.id || args.profile_id || args.user_id || args.id ||
    `${username}:${args.timestamp || notification?.timestamp || ""}`
  );
};

async function fetchNotificationsFromInstagramTab(tabId, csrfToken) {
  const failures = [];
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotReadNotifications"
    });
    if (response?.success && Array.isArray(response.notifications)) {
      return {
        notifications: collectInstagramNotifications(response.notifications),
        transport: response.transport || "instagram-page-notifications"
      };
    }
    failures.push(response?.error || "a ponte da página não respondeu");
  } catch (error) {
    failures.push(error?.message || String(error));
  }
  try {
    return {
      notifications: await fetchNotifications(csrfToken),
      transport: "extension-background-notifications"
    };
  } catch (error) {
    failures.push(error?.message || String(error));
  }
  throw new Error(`Falha ao ler notificações: ${failures.join("; ")}`);
}

const instagramCommentContext = notification => {
  const args = notification?.args || {};
  // `/news/inbox/` currently returns `args.media` as an array. Older payloads
  // used an object or a top-level media id, so keep every shape accepted.
  const media = Array.isArray(args.media) ? args.media[0] : args.media;
  const notificationMedia = Array.isArray(notification?.media)
    ? notification.media[0]
    : notification?.media;
  const commentId = String(
    args.comment_id || args.comment_pk || args.comment?.pk || args.comment?.id ||
    args.comment_ids?.[0] || args.pk ||
    notification?.comment?.pk || notification?.comment?.id || ""
  ).trim();
  const mediaId = String(
    args.media_id || args.media_pk || media?.id || media?.pk || media?.media_id ||
    args.destination?.id || args.destination?.pk || args.target_id ||
    notificationMedia?.id || notificationMedia?.pk || notificationMedia?.media_id || ""
  ).trim();
  const text = String(
    args.comment_text || args.comment?.text || args.text ||
    notification?.comment?.text || notification?.text || ""
  ).trim();
  const shortcode = String(
    args.code || args.shortcode || media?.code || media?.shortcode ||
    notificationMedia?.code || notificationMedia?.shortcode || ""
  ).trim();
  const productType = String(
    args.product_type || args.productType || media?.product_type || media?.productType ||
    notificationMedia?.product_type || notificationMedia?.productType || ""
  ).trim();
  const mediaType = String(
    args.media_type || args.mediaType || media?.media_type || media?.mediaType ||
    notificationMedia?.media_type || notificationMedia?.mediaType || ""
  ).trim();
  const permalink = String(
    args.permalink || media?.permalink || notificationMedia?.permalink || ""
  ).trim();
  return { commentId, mediaId, text, shortcode, productType, mediaType, permalink };
};

async function waitForInstagramChatbotBridge(tabId, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotBridgeReady"
    }).catch(() => null);
    if (response?.success === true) return response;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("A ponte do chatbot não ficou pronta na postagem temporária.");
}

const instagramCommentReplyUrls = notification => {
  const context = instagramCommentContext(notification);
  const commentId = context.commentId;
  const mediaPk = String(context.mediaId || "").split("_")[0];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let numericId;
  try { numericId = BigInt(mediaPk); } catch { numericId = -1n; }
  let calculatedShortcode = "";
  while (numericId >= 0n) {
    calculatedShortcode = alphabet[Number(numericId % 64n)] + calculatedShortcode;
    numericId /= 64n;
    if (numericId === 0n) break;
  }
  const shortcode = context.shortcode || calculatedShortcode;
  if (!shortcode || !commentId) return [];

  const urls = [];
  const appendCommentPermalink = value => {
    if (!value) return;
    try {
      const url = new URL(value, "https://www.instagram.com/");
      if (url.hostname !== "www.instagram.com") return;
      const cleanPath = url.pathname.replace(/\/+$/, "");
      if (!/(?:^|\/)(?:p|reel|tv)\/[A-Za-z0-9_-]+$/i.test(cleanPath)) return;
      url.pathname = `${cleanPath}/c/${commentId}/`;
      url.search = "";
      url.hash = "";
      urls.push(url.href);
    } catch {}
  };
  appendCommentPermalink(context.permalink);

  const isReel = /(?:clip|reel)/i.test(context.productType) || context.mediaType === "2";
  const routes = isReel ? ["reel", "p"] : ["p", "reel"];
  for (const route of routes) {
    urls.push(`https://www.instagram.com/${route}/${shortcode}/c/${commentId}/`);
  }
  return [...new Set(urls)];
};

async function replyToInstagramComment(notification, replyText, tabId) {
  const { commentId, mediaId, text: commentText } = instagramCommentContext(notification);
  const actorUsername = notificationUsername(notification);
  if (!commentId || !mediaId) {
    throw new Error("A notificação não trouxe os IDs da postagem e do comentário.");
  }
  const request = {
    action: "flowsiChatbotReplyCommentMain",
    mediaId,
    commentId,
    message: String(replyText || "").trim(),
    actorUsername,
    commentText,
    // Public replies must be created by clicking Responder on the triggering
    // comment. The API path can silently create a top-level @mention instead.
    uiOnly: true
  };
  let response = await chrome.tabs.sendMessage(tabId, request).catch(error => ({
    success: false,
    status: "unconfirmed",
    error: error?.message || String(error)
  }));
  if (response?.deliveryAttempted) {
    const attemptedError = new Error(
      response?.error || "O Instagram não confirmou a resposta pública já enviada."
    );
    attemptedError.deliveryAttempted = true;
    throw attemptedError;
  }
  if (response?.success !== true || response?.status !== "sent") {
    const replyUrls = instagramCommentReplyUrls(notification);
    if (replyUrls.length && chrome.tabs?.create) {
      let lastResponse = response;
      for (const url of replyUrls) {
        let replyTab = null;
        let replyDispatched = false;
        try {
          replyTab = await chrome.tabs.create({
            url,
            active: false
          });
          const replyTabId = Number(replyTab?.id);
          if (Number.isFinite(replyTabId)) {
            const loadDeadline = Date.now() + 20000;
            while (Date.now() < loadDeadline) {
              const currentTab = await chrome.tabs.get(replyTabId).catch(() => null);
              if (currentTab?.status === "complete") break;
              await new Promise(resolve => setTimeout(resolve, 250));
            }
            await waitForInstagramChatbotBridge(replyTabId);
            // From this point the request can already have reached MAIN. A
            // lost message port is therefore ambiguous and must never cause a
            // second public reply attempt.
            replyDispatched = true;
            lastResponse = await chrome.tabs.sendMessage(replyTabId, {
              ...request,
              uiOnly: true
            }).catch(error => ({
              success: false,
              status: "unconfirmed",
              error: error?.message || String(error),
              deliveryAttempted: replyDispatched
            }));
          }
        } catch (error) {
          lastResponse = {
            success: false,
            status: "unconfirmed",
            error: error?.message || String(error),
            deliveryAttempted: replyDispatched
          };
        } finally {
          if (Number.isFinite(Number(replyTab?.id))) {
            await chrome.tabs.remove(Number(replyTab.id)).catch(() => {});
          }
        }
        response = lastResponse;
        if (
          lastResponse?.success === true && lastResponse?.status === "sent" ||
          lastResponse?.deliveryAttempted
        ) break;
      }
    }
  }
  if (response?.success !== true || response?.status !== "sent") {
    const replyError = new Error(
      response?.error || "O Instagram não confirmou a resposta pública."
    );
    replyError.deliveryAttempted = Boolean(response?.deliveryAttempted);
    throw replyError;
  }
  return response;
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
  const persistCompletedActions = () => persistCompletedActionsUnion(completedActions);

  if (!stored.flowsiChatbotNotificationBaselineReady) {
    for (const notification of notifications) {
      const args = notification?.args || {};
      const type = notificationType(notification);
      if (type === "comment") {
        const id = instagramCommentContext(notification).commentId;
        if (id) seenComments.add(id);
      }
      if (isFollowerNotification(notification)) {
        const id = followerNotificationId(notification);
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
    const currentNotificationType = notificationType(notification);
    const username = notificationUsername(notification);
    const contact = createChatbotContact(
      username,
      args.full_name,
      args.fullName,
      args.profile_full_name,
      args.profile?.full_name,
      args.profile?.fullName,
      args.user?.full_name,
      args.user?.fullName,
      args.actor?.full_name,
      args.actor?.fullName,
      args.profile?.full_name,
      args.profile?.fullName,
      notification?.user?.full_name,
      notification?.user?.fullName,
      notification?.actor?.full_name,
      notification?.actor?.fullName,
      notification?.profile?.full_name,
      notification?.profile?.fullName,
      notification?.full_name
    );

    if (currentNotificationType === "comment") {
      const { commentId, text: commentText } = instagramCommentContext(notification);
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
        const labelActionKey = `${commentId}:${botKey}:label:${String(bot?.labelColumnId || "")}`;
        try {
          let sendResult = null;
          let publicReplyResult = null;
          let labelResult = null;
          if (!username) throw new Error("A notificação não informou o @ do autor.");
          if (!template?.content) throw new Error(`Modelo '${bot.template || ""}' não encontrado.`);
          const directMessage = personalizeChatbotMessage(template.content, contact);
          const publicReply = personalizeChatbotMessage(bot.publicCommentReply, contact);
          if (!completedActions.has(dmActionKey)) {
            sendResult = await sendMessageToInstagram(username, directMessage, tabId);
            completedActions.add(dmActionKey);
            // Persist the Direct independently from the public reply. If the
            // temporary Instagram tab reloads or the worker restarts while
            // replying to the comment, the already delivered DM must not be
            // sent again on the next poll.
            await persistCompletedActions();
          }
          labelResult = await applyChatbotLabelForBot(
            bot,
            contact,
            labelActionKey,
            completedActions,
            persistCompletedActions
          );
          if (
            publicReply &&
            !completedActions.has(replyActionKey)
          ) {
            publicReplyResult = await replyToInstagramComment(
              notification,
              publicReply,
              tabId
            );
            completedActions.add(replyActionKey);
            await persistCompletedActions();
          }
          await appendChatbotDiagnostic({
            status: "sent",
            source: "post-comment",
            eventId: commentId,
            username,
            template: bot.template,
            transport: sendResult?.transport || "already-completed",
            publicReply: Boolean(String(bot.publicCommentReply || "").trim()),
            publicReplyTransport: publicReply
              ? publicReplyResult?.transport || "already-completed"
              : null,
            publicReplyId: publicReplyResult?.commentId || null,
            parentCommentId: publicReplyResult?.parentCommentId || null,
            labelColumnId: labelResult?.columnId || null
          });
        } catch (error) {
          allSucceeded = false;
          if (error?.deliveryAttempted && !completedActions.has(replyActionKey)) {
            // Postar was clicked. Even if the DOM confirmation timed out, a
            // retry could publish the same public reply twice. Persist the
            // ambiguous attempt and leave its diagnostic for manual review.
            completedActions.add(replyActionKey);
            await persistCompletedActions();
          }
          const context = instagramCommentContext(notification);
          await appendChatbotDiagnostic({
            status: "error",
            source: "post-comment",
            eventId: commentId,
            username,
            template: bot.template,
            mediaId: context.mediaId || null,
            parentCommentId: context.commentId || null,
            error: error?.message || String(error)
          });
        }
      }
      if (allSucceeded) seenComments.add(commentId);
      continue;
    }

    if (isFollowerNotification(notification)) {
      const followerId = followerNotificationId(notification);
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
          const directMessage = personalizeChatbotMessage(template.content, contact);
          if (!completedActions.has(dmActionKey)) {
            sendResult = await sendMessageToInstagram(username, directMessage, tabId);
            completedActions.add(dmActionKey);
            await persistCompletedActions();
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
    flowsiChatbotSeenFollowers: [...seenFollowers].slice(-CHATBOT_SEEN_LIMIT)
  });
  await persistCompletedActions();
}

const directThreadKey = (thread, fallbackIndex = 0) => {
  const threadId = String(thread?.thread_id || thread?.threadId || "").trim();
  if (threadId) return `thread:${threadId}`;
  const participants = (Array.isArray(thread?.users) ? thread.users : [])
    .map(user => normalizeCrmKey(user?.username) || String(user?.pk || user?.id || "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
  return participants ? `users:${participants}` : `anonymous:${fallbackIndex}`;
};

const directItemKey = (item, fallbackIndex = 0) => {
  const itemId = String(item?.item_id || item?.client_context || item?.itemId || "").trim();
  if (itemId) return `item:${itemId}`;
  const timestamp = String(item?.timestamp || item?.sent_at || item?.created_at || "").trim();
  const senderId = String(item?.user_id || item?.sender_id || "").trim();
  const text = readDirectItemText(item);
  return timestamp || senderId || text
    ? `fallback:${timestamp}:${senderId}:${String(item?.item_type || "")}:${text}`
    : `anonymous:${fallbackIndex}`;
};

const mergeDirectObjectWithoutErasing = (preferred, supplemental) => {
  const merged = { ...(preferred || {}) };
  for (const [key, value] of Object.entries(supplemental || {})) {
    const current = merged[key];
    const currentIsEmpty = current === undefined || current === null || current === "" ||
      (Array.isArray(current) && current.length === 0);
    if (currentIsEmpty && value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
};

function mergeDirectThreadCollections(...collections) {
  const threadsByKey = new Map();
  let anonymousThreadIndex = 0;
  for (const collection of collections) {
    for (const incomingThread of Array.isArray(collection) ? collection : []) {
      if (!incomingThread || typeof incomingThread !== "object") continue;
      const key = directThreadKey(incomingThread, anonymousThreadIndex++);
      const existing = threadsByKey.get(key);
      if (!existing) {
        threadsByKey.set(key, {
          ...incomingThread,
          users: Array.isArray(incomingThread.users) ? [...incomingThread.users] : [],
          items: Array.isArray(incomingThread.items) ? [...incomingThread.items] : []
        });
        continue;
      }

      const usersByKey = new Map();
      for (const user of [...(existing.users || []), ...(incomingThread.users || [])]) {
        const userKey = String(user?.pk || user?.id || "").trim() ||
          normalizeCrmKey(user?.username);
        if (!userKey) continue;
        // Preserve the first source's values while filling fields it did not
        // contain. A later, shorter payload must never erase an event actor.
        usersByKey.set(
          userKey,
          mergeDirectObjectWithoutErasing(usersByKey.get(userKey), user)
        );
      }

      const itemsByKey = new Map();
      let anonymousItemIndex = 0;
      for (const item of [...(existing.items || []), ...(incomingThread.items || [])]) {
        const itemKey = directItemKey(item, anonymousItemIndex++);
        itemsByKey.set(
          itemKey,
          mergeDirectObjectWithoutErasing(itemsByKey.get(itemKey), item)
        );
      }
      threadsByKey.set(key, {
        ...incomingThread,
        ...existing,
        users: [...usersByKey.values()],
        items: [...itemsByKey.values()].sort((left, right) =>
          readDirectItemTimestamp(right) - readDirectItemTimestamp(left)
        )
      });
    }
  }
  return [...threadsByKey.values()].map(thread => ({
    ...thread,
    items: [...(thread.items || [])].sort((left, right) =>
      readDirectItemTimestamp(right) - readDirectItemTimestamp(left)
    )
  }));
}

const inboxViewerId = payload => String(
  payload?.viewer_id || payload?.viewerId || payload?.viewer?.pk ||
  payload?.viewer?.id || payload?.inbox?.viewer_id || ""
).trim();

const directInboxPayloadError = payload => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "resposta JSON inválida";
  }
  const status = String(payload.status || "").trim().toLowerCase();
  if (status && status !== "ok") {
    return `status ${status}${payload.message ? `: ${payload.message}` : ""}`;
  }
  if (!payload.inbox || typeof payload.inbox !== "object") {
    return "payload sem inbox";
  }
  if (!Array.isArray(payload.inbox.threads)) {
    return "payload sem inbox.threads";
  }
  return "";
};

async function fetchDirectInboxEndpoint(folder, csrfToken) {
  const query = new URLSearchParams({
    persistentBadging: "true",
    use_unified_inbox: "true",
    limit: "20",
    thread_message_limit: "10"
  });
  if (folder !== null && folder !== undefined) query.set("folder", String(folder));
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
  // i.instagram is the authenticated mobile-web API used by the Direct data
  // model. It is less dependent on which SPA route is currently rendered.
  for (const host of ["https://i.instagram.com", "https://www.instagram.com"]) {
    const response = await fetch(
      `${host}/api/v1/direct_v2/inbox/?${query.toString()}`,
      requestOptions
    ).catch(error => {
      failures.push(`${host.replace(/^https?:\/\//, "")}: ${error?.message || error}`);
      return null;
    });
    if (!response) continue;
    if (!response.ok) {
      failures.push(`${host.replace(/^https?:\/\//, "")}: HTTP ${response.status}`);
      continue;
    }
    let payload = null;
    try {
      payload = await readInstagramJson(response);
    } catch (error) {
      failures.push(
        `${host.replace(/^https?:\/\//, "")}: JSON inválido (${error?.message || error})`
      );
      continue;
    }
    const payloadError = directInboxPayloadError(payload);
    if (payloadError) {
      failures.push(`${host.replace(/^https?:\/\//, "")}: ${payloadError}`);
      continue;
    }
    const threads = (Array.isArray(payload?.inbox?.threads) ? payload.inbox.threads : [])
      .map(thread => {
        const threadId = String(thread?.thread_id || "").trim();
        return {
          ...thread,
          _flowsiTrustedThreadId: /^\d+$/.test(threadId) ? threadId : ""
        };
      });
    return {
      threads,
      viewerId: inboxViewerId(payload),
      host: host.replace(/^https?:\/\//, ""),
      folder: folder === null || folder === undefined ? "unified" : String(folder)
    };
  }
  throw new Error(
    `Falha ao ler Direct ${folder ?? "unificado"} (${failures.join("; ") || "sem resposta"}).`
  );
}

async function fetchDirectInboxFolder(folder, csrfToken) {
  return fetchDirectInboxEndpoint(folder, csrfToken);
}

async function fetchDirectInboxUnified(csrfToken) {
  return fetchDirectInboxEndpoint(null, csrfToken);
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
  const pagePromise = chrome.tabs.sendMessage(tabId, {
      action: "flowsiChatbotReadInbox"
    }).then(response => {
      if (!response?.success) {
        throw new Error(response?.error || "A página do Instagram não respondeu.");
      }
      return response;
    });
  const [pageResult, visibleThreads, unifiedResult, primaryResult, generalResult] =
    await Promise.all([
      pagePromise.then(value => ({ ok: true, value }), error => ({ ok: false, error })),
      readVisibleInbox(),
      fetchDirectInboxUnified(csrfToken)
        .then(value => ({ ok: true, value }), error => ({ ok: false, error })),
      fetchDirectInboxFolder(0, csrfToken)
        .then(value => ({ ok: true, value }), error => ({ ok: false, error })),
      fetchDirectInboxFolder(1, csrfToken)
        .then(value => ({ ok: true, value }), error => ({ ok: false, error }))
    ]);

  const page = pageResult.ok ? pageResult.value : {};
  const unified = unifiedResult.ok ? unifiedResult.value : {};
  const backgroundPrimary = primaryResult.ok ? primaryResult.value : {};
  const backgroundGeneral = generalResult.ok ? generalResult.value : {};
  const primary = mergeDirectThreadCollections(
    page.primary,
    visibleThreads,
    unified.threads,
    backgroundPrimary.threads
  );
  const general = mergeDirectThreadCollections(page.general, backgroundGeneral.threads);
  const backgroundSucceeded = unifiedResult.ok || primaryResult.ok || generalResult.ok;
  if (!pageResult.ok && !backgroundSucceeded && !visibleThreads.length) {
    throw new Error([
      pageResult.error?.message,
      unifiedResult.error?.message,
      primaryResult.error?.message,
      generalResult.error?.message
    ].filter(Boolean).join("; ") || "Nenhuma fonte do Direct respondeu.");
  }

  const transports = [];
  if (pageResult.ok) transports.push("instagram-page");
  if (visibleThreads.length) transports.push("visible-inbox");
  const backgroundThreadCount = (unified.threads?.length || 0) +
    (backgroundPrimary.threads?.length || 0) +
    (backgroundGeneral.threads?.length || 0);
  if (backgroundThreadCount || !pageResult.ok) transports.push("authenticated-background");
  return {
    primary,
    general,
    viewerId: String(
      page.viewerId || unified.viewerId || backgroundPrimary.viewerId ||
      backgroundGeneral.viewerId || ""
    ),
    transport: transports.join("+") || "failed",
    diagnostics: {
      page: pageResult.ok ? {
        primary: Array.isArray(page.primary) ? page.primary.length : 0,
        general: Array.isArray(page.general) ? page.general.length : 0
      } : { error: pageResult.error?.message || String(pageResult.error) },
      visible: visibleThreads.length,
      unified: unifiedResult.ok
        ? { threads: unified.threads?.length || 0, host: unified.host }
        : { error: unifiedResult.error?.message || String(unifiedResult.error) },
      primary: primaryResult.ok
        ? { threads: backgroundPrimary.threads?.length || 0, host: backgroundPrimary.host }
        : { error: primaryResult.error?.message || String(primaryResult.error) },
      general: generalResult.ok
        ? { threads: backgroundGeneral.threads?.length || 0, host: backgroundGeneral.host }
        : { error: generalResult.error?.message || String(generalResult.error) }
    }
  };
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

async function processDirectInboxNow(tabId, threads, bots, viewerId) {
  const stored = await chrome.storage.local.get([
    "flowsiChatbotSeenDirect",
    "flowsiChatbotDirectBaselineReady",
    CHATBOT_DIRECT_STATE_BY_VIEWER_KEY,
    CHATBOT_DIRECT_ACTIVE_VIEWER_KEY,
    CHATBOT_COMPLETED_ACTIONS_KEY,
    "quickMessages"
  ]);
  const {
    flowsiChatbotSeenDirect = [],
    flowsiChatbotDirectBaselineReady = false,
    flowsiChatbotCompletedActions = [],
    quickMessages = []
  } = stored;
  const activeViewerId = normalizeInstagramViewerId(
    stored?.[CHATBOT_DIRECT_ACTIVE_VIEWER_KEY]
  );
  // A missing realtime viewer ID must not create a second anonymous baseline.
  // The realtime entry point resolves cookies first; this last fallback keeps
  // an already known account stable during a transient cookie read failure.
  const effectiveViewerId = normalizeInstagramViewerId(viewerId) || activeViewerId;
  const viewerStateKey = effectiveViewerId || "__unknown__";
  const stateByViewer = stored?.[CHATBOT_DIRECT_STATE_BY_VIEWER_KEY] &&
    typeof stored[CHATBOT_DIRECT_STATE_BY_VIEWER_KEY] === "object"
    ? { ...stored[CHATBOT_DIRECT_STATE_BY_VIEWER_KEY] }
    : {};
  const storedViewerState = stateByViewer[viewerStateKey];
  const hasStoredViewerState = Boolean(
    storedViewerState && typeof storedViewerState === "object"
  );
  const accountChanged = Boolean(
    effectiveViewerId && activeViewerId && effectiveViewerId !== activeViewerId
  );
  // Keep the legacy aliases usable by older extension builds and by an
  // explicit local reset, but never import account A's watermark into a newly
  // detected account B.
  const legacyResetRequested = hasStoredViewerState &&
    stored.flowsiChatbotDirectBaselineReady === false &&
    Array.isArray(stored.flowsiChatbotSeenDirect) &&
    stored.flowsiChatbotSeenDirect.length === 0;
  const canUseLegacyState = legacyResetRequested || (
    !hasStoredViewerState && (!accountChanged || !activeViewerId)
  );
  const baselineReady = legacyResetRequested
    ? false
    : hasStoredViewerState
      ? storedViewerState.baselineReady === true
      : canUseLegacyState && flowsiChatbotDirectBaselineReady === true;
  const initialSeen = legacyResetRequested || !hasStoredViewerState && canUseLegacyState
    ? flowsiChatbotSeenDirect
    : storedViewerState?.seen;
  const seen = new Set((Array.isArray(initialSeen) ? initialSeen : []).map(String));
  const completedActions = new Set(
    (Array.isArray(flowsiChatbotCompletedActions)
      ? flowsiChatbotCompletedActions
      : []).map(String)
  );
  const persistCompletedActions = () => persistCompletedActionsUnion(completedActions);
  const persistDirectState = async (ready = true) => {
    const seenValues = [...seen].slice(-CHATBOT_SEEN_LIMIT);
    stateByViewer[viewerStateKey] = {
      seen: seenValues,
      baselineReady: ready === true,
      updatedAt: Date.now()
    };
    const values = {
      [CHATBOT_DIRECT_STATE_BY_VIEWER_KEY]: stateByViewer,
      // Compatibility aliases always mirror the currently processed viewer.
      flowsiChatbotSeenDirect: seenValues,
      flowsiChatbotDirectBaselineReady: ready === true
    };
    if (effectiveViewerId) {
      values[CHATBOT_DIRECT_ACTIVE_VIEWER_KEY] = effectiveViewerId;
    }
    await chrome.storage.local.set(values);
  };
  const candidatesById = new Map();
  for (const thread of threads) {
    const items = Array.isArray(thread?.items) ? thread.items.slice(0, 10) : [];
    for (const item of items) {
      const itemId = String(item?.item_id || item?.client_context || "").trim();
      const senderId = String(item?.user_id || item?.sender_id || "").trim();
      if (!itemId || !senderId || senderId === effectiveViewerId) continue;
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
        trustedThreadId: String(thread?._flowsiTrustedThreadId || "") ===
          String(thread?.thread_id || "")
          ? String(thread?._flowsiTrustedThreadId || "")
          : "",
        username,
        contactName: normalizeChatbotContactName(
          sender?.full_name || sender?.fullName || sender?.display_name || sender?.name
        ),
        text,
        timestamp: readDirectItemTimestamp(item)
      });
    }
  }
  const candidates = [...candidatesById.values()];
  const directBots = bots.filter(bot => botSourceEnabled(bot, "triggerDirect"));
  const stats = {
    candidates: candidates.length,
    matched: 0,
    sent: 0,
    errors: 0,
    skippedSeen: 0,
    lastError: null,
    lastAttempt: null,
    lastSuccess: null
  };

  // Establish a watermark without swallowing a trigger that arrived moments
  // before the first poll after the bot was created or the extension reloaded.
  let candidatesToProcess = candidates;
  if (!baselineReady) {
    const cutoff = Date.now() - DIRECT_BASELINE_RECENT_WINDOW_MS;
    const latestMatchingByUser = new Map();
    // On a real account switch the first snapshot is history, even when some
    // items happen to be recent. Baseline it entirely so account B never
    // receives responses for messages collected while account A was active.
    if (!accountChanged || hasStoredViewerState) {
      for (const candidate of candidates) {
        const isRecent = candidate.timestamp > 0 && candidate.timestamp >= cutoff;
        const matches = directBots.some(bot => botMatchesText(bot, candidate.text));
        if (!isRecent || !matches) continue;
        const previous = latestMatchingByUser.get(candidate.username);
        if (!previous || candidate.timestamp > previous.timestamp) {
          latestMatchingByUser.set(candidate.username, candidate);
        }
      }
    }
    candidatesToProcess = [...latestMatchingByUser.values()];
    const recentIds = new Set(candidatesToProcess.map(candidate => candidate.itemId));
    for (const candidate of candidates) {
      if (!recentIds.has(candidate.itemId)) seen.add(candidate.itemId);
    }
    await persistDirectState(true);
  }

  for (const candidate of candidatesToProcess
    .sort((left, right) => left.timestamp - right.timestamp)) {
    if (seen.has(candidate.itemId)) {
      stats.skippedSeen += 1;
      continue;
    }
    const matchingBots = directBots.filter(bot => botMatchesText(bot, candidate.text));
    if (!matchingBots.length) {
      seen.add(candidate.itemId);
      continue;
    }
    stats.matched += 1;
    stats.lastAttempt = {
      username: candidate.username,
      threadId: candidate.threadId,
      text: candidate.text.slice(0, 120)
    };
    let allSucceeded = true;
    for (const bot of matchingBots) {
      const template = findTemplate(quickMessages, bot);
      const botKey = String(bot?.id || bot?.template || "bot");
      const dmActionKey = `${candidate.itemId}:${botKey}:direct-dm`;
      const labelActionKey = `${candidate.itemId}:${botKey}:label:${String(bot?.labelColumnId || "")}`;
      try {
        let sendResult = null;
        let labelResult = null;
        if (!template?.content) throw new Error(`Modelo '${bot.template || ""}' não encontrado.`);
        const candidateContact = createChatbotContact(
          candidate.username,
          candidate.contactName
        );
        const directMessage = personalizeChatbotMessage(
          template.content,
          candidateContact
        );
        if (!completedActions.has(dmActionKey)) {
          sendResult = await sendMessageToInstagram(
            candidate.username,
            directMessage,
            tabId,
            candidate.threadId,
            effectiveViewerId,
            candidate.trustedThreadId
          );
          completedActions.add(dmActionKey);
          // The Instagram acknowledgement is the exactly-once boundary. Save
          // it before diagnostics or the next item so a suspended MV3 worker
          // cannot resend an already acknowledged Direct.
          await persistCompletedActions();
        }
        labelResult = await applyChatbotLabelForBot(
          bot,
          candidateContact,
          labelActionKey,
          completedActions,
          persistCompletedActions
        );
        await appendChatbotDiagnostic({
          status: "sent",
          source: "direct-or-story",
          eventId: candidate.itemId,
          username: candidate.username,
          template: bot.template,
          transport: sendResult?.transport || "already-completed",
          matchedText: candidate.text.slice(0, 120),
          labelColumnId: labelResult?.columnId || null
        });
        stats.lastSuccess = {
          username: candidate.username,
          threadId: candidate.threadId,
          transport: sendResult?.transport || "already-completed",
          labelColumnId: labelResult?.columnId || null
        };
        stats.sent += 1;
      } catch (error) {
        allSucceeded = false;
        stats.errors += 1;
        stats.lastError = error?.message || String(error);
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
  await persistDirectState(true);
  await persistCompletedActions();
  return stats;
}

function processDirectInbox(tabId, threads, bots, viewerId) {
  const run = chatbotDirectProcessingQueue
    .catch(() => null)
    .then(() => processDirectInboxNow(tabId, threads, bots, viewerId));
  chatbotDirectProcessingQueue = run.catch(() => null);
  return run;
}

const parseRealtimeValue = value => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

function realtimeThreadsFromMessage(message) {
  const candidates = [
    parseRealtimeValue(message?.thread),
    parseRealtimeValue(message?.event),
    parseRealtimeValue(message?.payload),
    parseRealtimeValue(message?.serializedEvent)
  ].filter(value => value && typeof value === "object");
  const explicitThreads = Array.isArray(message?.threads)
    ? message.threads.map(parseRealtimeValue).filter(Boolean)
    : [];
  const result = [];
  for (const candidate of [...explicitThreads, ...candidates]) {
    const thread = candidate?.thread && typeof candidate.thread === "object"
      ? candidate.thread
      : candidate;
    if (Array.isArray(thread?.items) && (thread?.thread_id || thread?.threadId)) {
      result.push(thread);
      continue;
    }
    const eventId = String(
      candidate?.eventId || candidate?.event_id || candidate?.item_id || message?.eventId || ""
    ).trim();
    const username = normalizeCrmKey(
      candidate?.username || candidate?.user?.username || candidate?.sender?.username
    );
    const text = String(
      candidate?.text || candidate?.message || candidate?.preview || candidate?.item?.text || ""
    ).trim();
    if (!eventId || !username || !text) continue;
    const senderId = String(
      candidate?.userId || candidate?.user_id || candidate?.senderId ||
      candidate?.sender_id || candidate?.user?.pk || candidate?.sender?.pk || username
    ).trim();
    result.push({
      thread_id: String(
        candidate?.threadId || candidate?.thread_id || message?.threadId || `realtime:${username}`
      ),
      users: [{
        pk: senderId,
        username,
        full_name: String(
          candidate?.fullName || candidate?.full_name || candidate?.user?.full_name ||
          candidate?.sender?.full_name || ""
        ).trim()
      }],
      items: [{
        item_id: eventId,
        user_id: senderId,
        text,
        timestamp: candidate?.timestamp || candidate?.capturedAt || Date.now()
      }]
    });
  }
  return mergeDirectThreadCollections(result);
}

async function processChatbotRealtimeEvent(message, tabId) {
  if (!Number.isInteger(tabId)) {
    throw new Error("O evento em tempo real não informou a aba do Instagram.");
  }
  const threads = realtimeThreadsFromMessage(message);
  if (!threads.length) {
    // Older content scripts only emitted an eventId. Keep that installation
    // operational by forcing the authenticated inbox read on the exact tab.
    return checkNotifications({ force: true, preferredTabId: tabId });
  }
  const trustedThreadId = /^\d+$/.test(String(message?.trustedThreadId || "").trim())
    ? String(message.trustedThreadId).trim()
    : "";
  const trustedThreads = threads.map(thread => ({
    ...thread,
    _flowsiTrustedThreadId: trustedThreadId &&
      String(thread?.thread_id || "") === trustedThreadId
      ? trustedThreadId
      : String(thread?._flowsiTrustedThreadId || "")
  }));
  const bots = await getActiveChatbots();
  if (!bots.length) return { status: "idle", threads: trustedThreads.length };
  // Home-page toast events do not always carry the current account. Resolve
  // the authenticated cookie identity before direction filtering and before
  // choosing the per-account seen/baseline state.
  const viewerId = await resolveChatbotViewerId(
    message?.viewerId || message?.viewer_id || ""
  );
  const stats = await processDirectInbox(tabId, trustedThreads, bots, viewerId);
  await appendChatbotDiagnostic({
    status: stats.errors ? "error" : "processed",
    source: "direct-realtime-event",
    eventId: String(message?.eventId || ""),
    threads: trustedThreads.length,
    candidates: stats.candidates,
    matched: stats.matched,
    sent: stats.sent,
    skippedSeen: stats.skippedSeen,
    error: stats.lastError || null
  });
  return {
    status: stats.errors ? "error" : "processed",
    threads: trustedThreads.length,
    direct: stats
  };
}

async function checkNotifications({ force = false, preferredTabId = null } = {}) {
  if (chatbotNotificationCheckInFlight) {
    if (!Number.isInteger(preferredTabId)) return chatbotNotificationCheckInFlight;
    // Do not lose an event that arrives during the periodic polling run. Once
    // that run releases the lock, immediately read the tab that emitted it.
    const activeRun = chatbotNotificationCheckInFlight;
    return activeRun.catch(() => null).then(() => checkNotifications({
      force: true,
      preferredTabId
    }));
  }
  const currentRun = (async () => {
    const now = Date.now();
    const { lastRunTime = 0 } = await chrome.storage.local.get("lastRunTime");
    if (!force && now - lastRunTime < NOTIFICATION_MIN_INTERVAL_MS) return;
    await chrome.storage.local.set({ lastRunTime: now });

    const tabId = await getInstagramTabId(preferredTabId);
    const bots = await getActiveChatbots();
    if (!tabId || !bots.length) {
      await chrome.storage.local.set({
        flowsiChatbotLastNotificationCheck: {
          at: new Date().toISOString(),
          status: "idle",
          transport: "not-started",
          total: 0,
          followers: 0,
          types: [],
          error: !tabId
            ? "Nenhuma aba do Instagram ficou disponível para o chatbot."
            : "Nenhum chatbot ativo foi encontrado."
        }
      });
      return;
    }

    const cookies = await getInstagramCookies().catch(() => ({}));
    try {
      const [notificationResult, directInbox] = await Promise.all([
      fetchNotificationsFromInstagramTab(tabId, cookies.csrftoken || "").catch(error => {
        appendChatbotDiagnostic({
          status: "error",
          source: "notifications-read",
          error: error?.message || String(error)
        });
        return { notifications: [], transport: "failed", error: error?.message || String(error) };
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
      const notifications = Array.isArray(notificationResult?.notifications)
        ? notificationResult.notifications
        : [];
      await chrome.storage.local.set({
        flowsiChatbotLastNotificationCheck: {
          at: new Date().toISOString(),
          status: notificationResult?.error ? "error" : "ok",
          transport: notificationResult?.transport || "unknown",
          total: notifications.length,
          followers: notifications.filter(isFollowerNotification).length,
          types: [...new Set(notifications.map(notificationType).filter(Boolean))].slice(0, 20),
          error: notificationResult?.error || null
        }
      });
      if (notifications.length) {
        await processInstagramNotifications(tabId, notifications, bots, cookies.csrftoken || "");
      }
      const uniqueThreads = mergeDirectThreadCollections(
        directInbox.primary,
        directInbox.general
      );
      await chrome.storage.local.set({
        flowsiChatbotLastInboxCheck: {
          at: new Date().toISOString(),
          status: directInbox.error ? "error" : "ok",
          transport: directInbox.transport,
          primaryThreads: directInbox.primary.length,
          generalThreads: directInbox.general.length,
          totalThreads: uniqueThreads.length,
          error: directInbox.error || null,
          diagnostics: directInbox.diagnostics || null
        }
      });
      const directViewerId = await resolveChatbotViewerId(
        directInbox.viewerId,
        cookies
      );
      const direct = await processDirectInbox(
        tabId,
        uniqueThreads,
        bots,
        directViewerId
      );
      return {
        notifications: notifications.length,
        notificationTransport: notificationResult?.transport || "unknown",
        followerNotifications: notifications.filter(isFollowerNotification).length,
        notificationTypes: [...new Set(notifications.map(notificationType).filter(Boolean))].slice(0, 20),
        directThreads: uniqueThreads.length,
        direct
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
  })();
  chatbotNotificationCheckInFlight = currentRun;
  try {
    return await currentRun;
  } finally {
    if (chatbotNotificationCheckInFlight === currentRun) {
      chatbotNotificationCheckInFlight = null;
    }
  }
}

const CHATBOT_ALARM_NAME = "checkNotif";
const CHATBOT_ALARM_PERIOD_MINUTES = 1;

async function ensureChatbotAlarm() {
  if (typeof chrome.alarms?.get !== "function") {
    chrome.alarms?.create?.(CHATBOT_ALARM_NAME, {
      periodInMinutes: CHATBOT_ALARM_PERIOD_MINUTES
    });
    return;
  }
  const existing = await chrome.alarms.get(CHATBOT_ALARM_NAME);
  if (existing?.periodInMinutes === CHATBOT_ALARM_PERIOD_MINUTES) return;
  await Promise.resolve(chrome.alarms.create(CHATBOT_ALARM_NAME, {
    periodInMinutes: CHATBOT_ALARM_PERIOD_MINUTES
  }));
}

const logChatbotWakeError = (reason, error) => {
  console.error(`Chatbot check failed (${reason}):`, error);
};

const requestChatbotCheck = (reason, options = {}) => checkNotifications(options)
  .catch(error => {
    logChatbotWakeError(reason, error);
    return null;
  });

ensureChatbotAlarm().catch(error => logChatbotWakeError("alarm-setup", error));

chrome.alarms?.onAlarm?.addListener(alarm => {
  if (alarm?.name !== CHATBOT_ALARM_NAME) return;
  checkNotifications().catch(error => logChatbotWakeError("alarm", error));
});

chrome.runtime?.onStartup?.addListener(() => {
  ensureChatbotAlarm().catch(error => logChatbotWakeError("startup-alarm", error));
  requestChatbotCheck("startup", { force: true });
});

chrome.runtime?.onInstalled?.addListener(() => {
  ensureChatbotAlarm().catch(error => logChatbotWakeError("installed-alarm", error));
  requestChatbotCheck("installed", { force: true });
});

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "local" || !Object.prototype.hasOwnProperty.call(changes || {}, "bots")) {
    return;
  }
  requestChatbotCheck("bots-changed", { force: true });
});

chrome.tabs?.onUpdated?.addListener((_tabId, changeInfo, tab) => {
  const url = String(changeInfo?.url || tab?.url || "");
  const becameReady = changeInfo?.status === "complete" ||
    (typeof changeInfo?.url === "string" && (!tab?.status || tab.status === "complete"));
  if (!becameReady || !isUsableInstagramTab({ ...tab, url })) return;
  requestChatbotCheck("instagram-tab-ready", { force: true });
});

chrome.tabs?.onActivated?.addListener(activeInfo => {
  if (!Number.isInteger(activeInfo?.tabId) || typeof chrome.tabs?.get !== "function") return;
  chrome.tabs.get(activeInfo.tabId)
    .then(tab => {
      if (isUsableInstagramTab(tab)) {
        return requestChatbotCheck("instagram-tab-activated", { force: true });
      }
      return null;
    })
    .catch(error => logChatbotWakeError("instagram-tab-activated", error));
});

console.log("Flowsi background loaded at", new Date().toISOString());
