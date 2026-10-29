(() => {
  const VERSION = "2026.10.29.1";
  const previous = window.__crmFlowFollowsYouRecovery;
  if (previous?.version === VERSION && previous?.contextAlive) return;
  previous?.observer?.disconnect?.();
  if (previous) previous.contextAlive = false;

  const state = {
    version: VERSION,
    contextAlive: true,
    observer: null,
    timer: null,
    activeUsername: "",
    requestSequence: 0,
    cache: new Map()
  };
  window.__crmFlowFollowsYouRecovery = state;

  const normalizeUsername = value => String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();

  const findNotebook = () => {
    const panel = document.querySelector(".flowsi-side-overlay-container");
    const header = panel?.querySelector(".flowsi-notebook-header");
    if (!panel || !header) return null;
    const username = [...header.querySelectorAll("p")]
      .map(element => String(element.textContent || "").trim())
      .find(value => /^@[a-z0-9._]{1,30}$/i.test(value));
    const normalized = normalizeUsername(username);
    return /^[a-z0-9._]{1,30}$/.test(normalized)
      ? { panel, header, username: normalized }
      : null;
  };

  const findBadge = header => [...header.querySelectorAll("p")].find(element =>
    /^segue você\s*:/i.test(String(element.textContent || "").trim())
  );

  const hideBadge = header => {
    const row = findBadge(header);
    if (row) row.style.display = "none";
  };

  const renderBadge = (header, followsYou) => {
    const row = findBadge(header);
    if (!row || typeof followsYou !== "boolean") return;
    let indicator = row.querySelector("span");
    if (!indicator) {
      indicator = document.createElement("span");
      row.appendChild(indicator);
    }
    row.classList.add("flowsi-follows-you-badge");
    Object.assign(row.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "5px",
      width: "max-content",
      margin: "0",
      padding: "4px 8px",
      border: `1px solid ${followsYou ? "rgba(22, 163, 74, .28)" : "rgba(220, 38, 38, .24)"}`,
      borderRadius: "999px",
      background: followsYou ? "rgba(22, 163, 74, .06)" : "rgba(220, 38, 38, .05)",
      color: "#333333",
      fontSize: "11px",
      fontWeight: "500",
      lineHeight: "1"
    });
    Object.assign(indicator.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "14px",
      height: "14px",
      color: followsYou ? "#16a34a" : "#dc2626",
      fontSize: "13px",
      lineHeight: "1"
    });
    indicator.dataset.flowsiFollowsYou = String(followsYou);
    indicator.textContent = followsYou ? "✔️" : "🚫";
  };

  const persistRelationship = (username, followsYou) => {
    window.flowsiOpenNotebookProfile = {
      ...(window.flowsiOpenNotebookProfile || {}),
      username,
      follows_viewer: followsYou
    };
    chrome.storage.local.set({
      openNotebookProfile: window.flowsiOpenNotebookProfile
    });
    chrome.runtime.sendMessage({
      action: "flowsiCrmMutate",
      mutation: "updateProfile",
      username,
      followsViewer: followsYou
    }, () => void chrome.runtime.lastError);
  };

  const sync = () => {
    if (!state.contextAlive) return;
    const notebook = findNotebook();
    if (!notebook) {
      state.activeUsername = "";
      return;
    }
    const { header, username } = notebook;
    if (state.cache.has(username)) {
      renderBadge(header, state.cache.get(username));
      return;
    }
    if (state.activeUsername === username) return;
    state.activeUsername = username;
    hideBadge(header);
    const sequence = ++state.requestSequence;
    const profile = window.flowsiOpenNotebookProfile || {};
    const profileId = profile.userId || profile.pk || profile.id || "";
    chrome.runtime.sendMessage({
      action: "flowsiFetchRelationship",
      username,
      profileId: String(profileId || "")
    }, response => {
      if (sequence !== state.requestSequence || !state.contextAlive) return;
      state.activeUsername = "";
      const current = findNotebook();
      if (!current || current.username !== username) return;
      if (chrome.runtime.lastError || typeof response?.followsYou !== "boolean") {
        document.documentElement.setAttribute("data-flowsi-follows-you-status", "unavailable");
        hideBadge(current.header);
        return;
      }
      state.cache.set(username, response.followsYou);
      document.documentElement.setAttribute("data-flowsi-follows-you-status", "complete");
      document.documentElement.setAttribute("data-flowsi-follows-you-diagnostics", JSON.stringify({
        username,
        followsYou: response.followsYou,
        source: response.source || "background-recovery",
        definitive: Boolean(response.definitive),
        diagnostics: response.diagnostics || []
      }));
      renderBadge(current.header, response.followsYou);
      persistRelationship(username, response.followsYou);
    });
  };

  const schedule = () => {
    clearTimeout(state.timer);
    state.timer = setTimeout(sync, 100);
  };
  state.observer = new MutationObserver(schedule);
  state.observer.observe(document.body, { childList: true, subtree: true });
  schedule();
})();
