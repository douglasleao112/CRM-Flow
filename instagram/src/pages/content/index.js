const isInvalidatedExtensionContext = value =>
  /Extension context invalidated/i.test(String(value?.message || value || ""));

try {
  document.documentElement.setAttribute(
    "data-flowsi-loaded-manifest-version",
    chrome.runtime.getManifest().version
  );
} catch (_) {}

window.addEventListener("error", event => {
  if (!isInvalidatedExtensionContext(event.error || event.message)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener("unhandledrejection", event => {
  if (!isInvalidatedExtensionContext(event.reason)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

const modulePreload = "modulepreload";
const resolveAsset = source => `/${source}`;
const preloadedAssets = {};

function preload(loader, dependencies) {
  if (!dependencies || dependencies.length === 0) return loader();
  return Promise.all(dependencies.map(source => {
    const href = resolveAsset(source);
    if (href in preloadedAssets) return;
    preloadedAssets[href] = true;

    const isStylesheet = href.endsWith(".css");
    const selector = isStylesheet ? '[rel="stylesheet"]' : "";
    if (document.querySelector(`link[href="${href}"]${selector}`)) return;

    const link = document.createElement("link");
    link.rel = isStylesheet ? "stylesheet" : modulePreload;
    if (!isStylesheet) {
      link.as = "script";
      link.crossOrigin = "";
    }
    link.href = href;
    document.head.appendChild(link);

    if (isStylesheet) {
      return new Promise((resolve, reject) => {
        link.addEventListener("load", resolve);
        link.addEventListener("error", () => reject(new Error(`Unable to preload CSS for ${href}`)));
      });
    }
  })).then(loader);
}

function installManualContactHeaderButton() {
  const styleId = "flowsi-manual-contact-header-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .flowsi-container > button[title="Adicionar pessoa pelo @"] {
        display: none !important;
      }
      .flowsi-add-column-btn,
      #flowsi-manual-contact-header-button,
      .flowsi-kanban-top-refresh-button {
        position: fixed !important;
        top: 5px !important;
        width: 40px !important;
        height: 36px !important;
        min-width: 40px !important;
        min-height: 36px !important;
        margin: 0 !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0 !important;
        border-radius: 5px !important;
        background: var(--secondary) !important;
        color: var(--text) !important;
        box-sizing: border-box !important;
        z-index: 1003 !important;
        box-shadow: none !important;
      }
      .flowsi-add-column-btn {
        left: 90px !important;
      }
      #flowsi-manual-contact-header-button {
        left: 136px !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }
      .flowsi-kanban-top-refresh-button {
        left: 182px !important;
      }
      .flowsi-add-column-btn:hover,
      #flowsi-manual-contact-header-button:hover,
      .flowsi-kanban-top-refresh-button:hover {
        background: var(--primary) !important;
      }
      .flowsi-add-column-btn svg,
      .flowsi-kanban-top-refresh-button svg {
        width: 20px !important;
        height: 20px !important;
      }
      .flowsi-quick-message-button {
        transform: translateY(3px) !important;
      }
      .flowsi-notebook-header h2 {
        font-size: 20px !important;
        line-height: 1.08 !important;
        margin-bottom: 8px !important;
      }
      .flowsi-notebook-header h2 + p {
        margin-top: 0 !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  const syncButton = () => {
    const addColumnButton = document.querySelector(".flowsi-add-column-btn");
    const addTooltipParent = addColumnButton?.querySelector(".flowsi-tooltip-parent-right");
    const addTooltip = addColumnButton?.querySelector(".flowsi-tooltip-child-right");
    if (addTooltipParent) {
      addTooltipParent.classList.replace(
        "flowsi-tooltip-parent-right",
        "flowsi-tooltip-parent-bottom"
      );
    }
    if (addTooltip) {
      addTooltip.classList.replace(
        "flowsi-tooltip-child-right",
        "flowsi-tooltip-child-bottom"
      );
    }
    addColumnButton?.removeAttribute("title");

    const sourceButton = document.querySelector(
      '.flowsi-container > button[title="Adicionar pessoa pelo @"]'
    );
    const firstColumnHeader = document.querySelector(
      ".flowsi-column .flowsi-column-sub-header"
    );
    const refreshButton = firstColumnHeader?.querySelector(
      "button.flowsi-kanban-refresh-trigger"
    );

    if (!sourceButton || !firstColumnHeader || !refreshButton) return;

    let headerButton = document.getElementById("flowsi-manual-contact-header-button");
    if (!headerButton) {
      headerButton = document.createElement("button");
      headerButton.id = "flowsi-manual-contact-header-button";
      headerButton.type = "button";
      headerButton.title = "Adicionar pessoa pelo @";
      headerButton.setAttribute("aria-label", "Adicionar pessoa pelo @");
      headerButton.textContent = "@";
      headerButton.classList.add("flowsi-tooltip-parent-bottom");
      const manualTooltip = document.createElement("span");
      manualTooltip.className = "flowsi-tooltip-child-bottom";
      manualTooltip.textContent = "Adicionar pessoa pelo @";
      headerButton.appendChild(manualTooltip);
      Object.assign(headerButton.style, {
        width: "40px",
        height: "36px",
        minWidth: "40px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        margin: "0",
        border: "0",
        borderRadius: "0",
        background: "transparent",
        color: "#000",
        fontSize: "20px",
        fontWeight: "700",
        lineHeight: "1",
        cursor: "pointer",
        outline: "none",
        boxShadow: "none"
      });
      headerButton.addEventListener("mousedown", event => event.stopPropagation());
      headerButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        headerButton.__flowsiSourceButton?.click();
      });
    }

    headerButton.__flowsiSourceButton = sourceButton;
    headerButton.removeAttribute("title");
    refreshButton.classList.add("flowsi-kanban-top-refresh-button");
    refreshButton.classList.add("flowsi-tooltip-parent-bottom");
    refreshButton.removeAttribute("title");
    let refreshTooltip = refreshButton.querySelector(".flowsi-tooltip-child-bottom");
    if (!refreshTooltip) {
      refreshTooltip = document.createElement("span");
      refreshTooltip.className = "flowsi-tooltip-child-bottom";
      refreshButton.appendChild(refreshTooltip);
    }
    const loadMoreLabel = "Carregar mais mensagens do inbox";
    refreshButton.setAttribute("aria-label", loadMoreLabel);
    if (refreshTooltip.textContent !== loadMoreLabel) {
      refreshTooltip.textContent = loadMoreLabel;
    }
    if (headerButton.nextElementSibling !== refreshButton) {
      refreshButton.insertAdjacentElement("beforebegin", headerButton);
    }
  };

  syncButton();
  window.__flowsiManualHeaderObserver?.disconnect();
  window.__flowsiManualHeaderObserver = new MutationObserver(syncButton);
  window.__flowsiManualHeaderObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function showManualContactMessage(message, type = "success") {
  const toastApi = window.__flowsiToast;
  if (typeof toastApi === "function") {
    const notify = type === "error" ? toastApi.error : toastApi.success;
    notify(message, { duration: 3200 });
    return;
  }
  document.getElementById("flowsi-manual-contact-message")?.remove();
  const toast = document.createElement("div");
  toast.id = "flowsi-manual-contact-message";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    maxWidth: "min(420px, calc(100vw - 32px))",
    padding: "12px 16px",
    borderRadius: "8px",
    background: type === "error" ? "#b91c1c" : "#166534",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.22)",
    zIndex: "2147483647"
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

async function fetchManualInstagramProfile(username) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "*/*",
          "x-ig-app-id": "936619743392459",
          "x-requested-with": "XMLHttpRequest"
        },
        signal: controller.signal
      }
    );
    if (!response.ok) return null;
    const result = await response.json();
    return result?.data?.user || result?.user || null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function installManualContactFormHandler() {
  if (window.__flowsiManualContactFormHandlerInstalled) return;
  window.__flowsiManualContactFormHandlerInstalled = true;

  const findManualDialog = () => {
    const title = [...document.querySelectorAll("h1,h2,h3")]
      .find(item => String(item.textContent || "").trim() === "Adicionar pessoa pelo @");
    let dialog = title?.parentElement || null;
    while (dialog && dialog !== document.body) {
      const hasSubmit = [...dialog.querySelectorAll("button")]
        .some(button => String(button.textContent || "").trim() === "Adicionar ao Kanban");
      if (hasSubmit) return dialog;
      dialog = dialog.parentElement;
    }
    return null;
  };

  const syncColumnSelect = () => {
    const dialog = findManualDialog();
    if (!dialog || dialog.querySelector("#flowsi-manual-contact-column")) return;
    const actions = [...dialog.querySelectorAll("button")]
      .find(button => String(button.textContent || "").trim() === "Adicionar ao Kanban")
      ?.parentElement;
    if (!actions) return;

    const wrapper = document.createElement("label");
    wrapper.htmlFor = "flowsi-manual-contact-column";
    wrapper.textContent = "Adicionar na coluna";
    Object.assign(wrapper.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      margin: "12px 0 14px",
      color: "var(--text)",
      fontSize: "14px",
      fontWeight: "600"
    });
    const select = document.createElement("select");
    select.id = "flowsi-manual-contact-column";
    select.setAttribute("aria-label", "Escolher coluna do Kanban");
    Object.assign(select.style, {
      width: "100%",
      height: "38px",
      padding: "0 10px",
      border: "1px solid var(--primary)",
      borderRadius: "4px",
      background: "var(--background-color-main)",
      color: "var(--text)",
      fontSize: "14px"
    });
    select.appendChild(new Option("Carregando colunas...", "all-chats"));
    wrapper.appendChild(select);
    actions.insertAdjacentElement("beforebegin", wrapper);

    chrome.storage.local.get(["kanbanColumns"], ({ kanbanColumns = [] }) => {
      if (!select.isConnected) return;
      const columns = Array.isArray(kanbanColumns) ? kanbanColumns : [];
      select.replaceChildren();
      if (!columns.length) {
        select.appendChild(new Option("Todas", "all-chats"));
        return;
      }
      columns.forEach((column, index) => {
        select.appendChild(new Option(
          String(column?.title || (index === 0 ? "Todas" : "Coluna sem nome")),
          index === 0 ? "all-chats" : String(column?.id || "")
        ));
      });
    });
  };

  syncColumnSelect();
  window.__flowsiManualColumnObserver?.disconnect();
  window.__flowsiManualColumnObserver = new MutationObserver(syncColumnSelect);
  window.__flowsiManualColumnObserver.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", async event => {
    const submitButton = event.target.closest?.("button");
    if (!submitButton) return;
    const buttonText = String(submitButton.textContent || "").replace(/\s+/g, " ").trim();
    if (buttonText !== "Adicionar ao Kanban") return;

    let dialog = submitButton.parentElement;
    while (dialog && dialog !== document.body) {
      const hasManualTitle = [...dialog.querySelectorAll("h1,h2,h3")].some(title =>
        String(title.textContent || "").trim() === "Adicionar pessoa pelo @"
      );
      if (hasManualTitle) break;
      dialog = dialog.parentElement;
    }
    if (!dialog || dialog === document.body) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const input = dialog.querySelector("input");
    const columnSelect = dialog.querySelector("#flowsi-manual-contact-column");
    const columnId = String(columnSelect?.value || "all-chats");
    const columnTitle = String(columnSelect?.selectedOptions?.[0]?.textContent || "Todas").trim();
    const username = String(input?.value || "")
      .trim()
      .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
      .replace(/[\/?#].*$/, "")
      .replace(/^@+/, "")
      .toLowerCase();

    if (!/^[a-z0-9._]{1,30}$/.test(username)) {
      showManualContactMessage("Digite um @ de Instagram válido.", "error");
      input?.focus();
      return;
    }
    if (submitButton.dataset.flowsiManualSaving === "1") return;

    const originalLabel = submitButton.textContent;
    submitButton.dataset.flowsiManualSaving = "1";
    submitButton.disabled = true;
    submitButton.textContent = "Adicionando...";

    try {
      const details = await fetchManualInstagramProfile(username);
      const numericId = String(details?.id || details?.pk || "");
      const verifiedId = /^\d+$/.test(numericId) ? numericId : "";
      const profile = {
        id: `manual-${username}`,
        threadId: "",
        messageId: String(details?.eimu_id || verifiedId || ""),
        userId: verifiedId,
        pk: verifiedId,
        profileId: verifiedId || username,
        notebookId: verifiedId || username,
        username,
        name: details?.full_name || username,
        full_name: details?.full_name || username,
        profileImage: details?.profile_pic_url || "",
        profile_pic_url: details?.profile_pic_url || "",
        source: "manual",
        addedAt: Date.now()
      };

      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage(
          { action: "flowsiCrmMutate", mutation: "manualAdd", profile, columnId },
          result => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(result);
          }
        );
      });
      if (!response?.success) {
        throw new Error(response?.error || "Não foi possível salvar o contato.");
      }

      const cancelButton = [...dialog.querySelectorAll("button")].find(button =>
        String(button.textContent || "").trim() === "Cancelar"
      );
      cancelButton?.click();
      showManualContactMessage(`@${username} foi adicionado em ${columnTitle}.`);
    } catch (error) {
      showManualContactMessage(
        error?.message || "Não foi possível adicionar esse perfil.",
        "error"
      );
    } finally {
      delete submitButton.dataset.flowsiManualSaving;
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }, true);
}

function installNotebookProfileCardSync() {
  if (window.__flowsiNotebookProfileCardSyncInstalled) return;
  window.__flowsiNotebookProfileCardSyncInstalled = true;
  document.documentElement.setAttribute("data-flowsi-profile-sync-version", "2026.6.174");

  let syncTimer = null;
  let lastConfirmedSignature = "";
  let pendingSignature = "";
  const followingCache = new Map();
  const followingRequests = new Map();
  const followingFetchedAt = new Map();
  const followingRetryTimers = new Map();
  const followsYouCache = new Map();
  const followsYouRequests = new Map();
  const followsYouAttemptedAt = new Map();
  const profileRouteProbeRequests = new Map();

  const parseCompactCount = value => {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) return null;
    const multiplier = normalized.endsWith("K")
      ? 1000
      : normalized.endsWith("M") ? 1000000 : 1;
    const numeric = Number.parseFloat(
      normalized
        .replace(/[^0-9,.]/g, "")
        .replace(multiplier === 1 ? /[.,]/g : /\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".")
    );
    return Number.isFinite(numeric) ? Math.round(numeric * multiplier) : null;
  };

  const formatCompactCount = count => {
    if (count < 1000) return String(count);
    if (count < 1000000) return `${Math.floor(count / 1000)}K`;
    return `${Math.floor(count / 1000000)}M`;
  };

  const wait = delay => new Promise(resolve => setTimeout(resolve, delay));

  const currentInstagramUsername = () => {
    const profileImages = [...document.querySelectorAll('a[href] img[alt]')];
    for (const image of profileImages) {
      const alt = String(image.getAttribute("alt") || "");
      const match = alt.match(/^(?:foto do perfil de|profile picture of)\s+([a-z0-9._]{1,30})/i);
      if (match) return match[1].toLowerCase();
    }
    return "";
  };

  const findFollowingDialog = (input, ownerDocument = document) => {
    const explicitDialog = input?.closest('[role="dialog"], [aria-modal="true"]');
    if (explicitDialog) return explicitDialog;
    let current = input?.parentElement || null;
    while (current && current !== ownerDocument.body) {
      const hasHeading = [...current.querySelectorAll("h1, h2")].some(element =>
        /^(seguindo|following)$/i.test(String(element.textContent || "").trim())
      );
      if (hasHeading) return current;
      current = current.parentElement;
    }
    return null;
  };

  const searchViewerInFollowingDialog = async (followingLink, viewerUsername, ownerDocument = document) => {
    if (!followingLink || !viewerUsername) return null;
    followingLink.click();
    const deadline = Date.now() + 4500;
    let input = null;
    while (Date.now() < deadline && !input) {
      await wait(100);
      input = [...ownerDocument.querySelectorAll('input[type="text"], input:not([type])')]
        .find(element => {
          const label = `${element.getAttribute("placeholder") || ""} ${element.getAttribute("aria-label") || ""}`;
          return /pesquisar|search/i.test(label);
        }) || null;
    }
    if (!input) return null;
    const dialog = findFollowingDialog(input, ownerDocument);
    const frameWindow = ownerDocument.defaultView || window;
    const valueSetter = Object.getOwnPropertyDescriptor(frameWindow.HTMLInputElement.prototype, "value")?.set;
    if (valueSetter) valueSetter.call(input, viewerUsername);
    else input.value = viewerUsername;
    input.dispatchEvent(new frameWindow.Event("input", { bubbles: true }));
    input.dispatchEvent(new frameWindow.Event("change", { bubbles: true }));

    const resultDeadline = Date.now() + 3500;
    let found = null;
    while (Date.now() < resultDeadline) {
      await wait(120);
      const scope = dialog || findFollowingDialog(input, ownerDocument) || ownerDocument.body;
      const matchingLink = [...scope.querySelectorAll("a[href]")].find(link => {
        const path = String(link.getAttribute("href") || "")
          .split("?")[0]
          .replace(/^\/+|\/+$/g, "")
          .toLowerCase();
        return path === viewerUsername;
      });
      if (matchingLink) {
        found = true;
        break;
      }
      const text = String(scope.textContent || "").replace(/\s+/g, " ").toLowerCase();
      if (/nenhum resultado|no results|não encontramos/i.test(text)) {
        found = false;
        break;
      }
    }
    const scope = dialog || findFollowingDialog(input, ownerDocument);
    const closeButton = scope && [...scope.querySelectorAll("button")].find(button =>
      /fechar|close/i.test(`${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`)
    );
    closeButton?.click();
    return found;
  };

  const probeProfileBehindOverlay = username => {
    if (profileRouteProbeRequests.has(username)) {
      return profileRouteProbeRequests.get(username);
    }
    const request = (async () => {
      const profilePath = `/${encodeURIComponent(username)}/`;
      const viewerUsername = currentInstagramUsername();
      let result = { following: null, followsYou: null };
      const diagnostics = { username, viewerUsername, phase: "creating-frame" };
      document.documentElement.setAttribute("data-flowsi-profile-probe", JSON.stringify(diagnostics));
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      Object.assign(frame.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: "1200px",
        height: "900px",
        opacity: "0",
        pointerEvents: "none",
        border: "0"
      });
      try {
        frame.src = profilePath;
        document.body.appendChild(frame);
        diagnostics.phase = "loading-profile";
        document.documentElement.setAttribute("data-flowsi-profile-probe", JSON.stringify(diagnostics));
        const deadline = Date.now() + 12000;
        let followingLink = null;
        let frameDocument = null;
        while (Date.now() < deadline) {
          await wait(150);
          try {
            frameDocument = frame.contentDocument;
          } catch (_) {
            frameDocument = null;
          }
          if (!frameDocument) continue;
          const profileMain = frameDocument.querySelector('main[role="main"]') ||
            frameDocument.querySelector('div[id^="mount_"]');
          if (!profileMain) continue;
          const profileText = String(profileMain.innerText || "").replace(/\s+/g, " ").trim();
          followingLink = [...profileMain.querySelectorAll("a")].find(link =>
            /([0-9.,]+\s*[KM]?)\s+(?:seguindo|following)\b/i.test(
              `${link.textContent || ""} ${link.getAttribute("aria-label") || ""}`
            )
          ) || null;
          const followingText = String(followingLink?.textContent || profileText);
          const followingMatch = followingText.match(
            /([0-9.,]+\s*[KM]?)\s+(?:seguindo|following)\b/i
          );
          const profileLoaded = Boolean(
            followingLink ||
            /\b(?:publicações|posts|seguidores|followers)\b/i.test(profileText)
          );
          if (!profileLoaded) continue;
          if (followingMatch) {
            result.following = parseCompactCount(followingMatch[1]);
          }
          const labels = [...profileMain.querySelectorAll("button, span, div")]
            .map(element => String(element.textContent || "").replace(/\s+/g, " ").trim().toLowerCase())
            .filter(label => label.length > 0 && label.length < 80);
          if (labels.some(label => label === "segue você" || label === "follows you" ||
              label === "seguir de volta" || label === "follow back")) {
            result.followsYou = true;
          }
          if (Number.isFinite(result.following)) {
            diagnostics.phase = "profile-loaded";
            diagnostics.following = result.following;
            document.documentElement.setAttribute("data-flowsi-profile-probe", JSON.stringify(diagnostics));
            break;
          }
        }
        if (result.followsYou !== true && followingLink && viewerUsername && frameDocument) {
          diagnostics.phase = "searching-viewer";
          document.documentElement.setAttribute("data-flowsi-profile-probe", JSON.stringify(diagnostics));
          result.followsYou = await searchViewerInFollowingDialog(
            followingLink,
            viewerUsername,
            frameDocument
          );
        } else if (result.followsYou === null && result.following === 0) {
          result.followsYou = false;
        }
        diagnostics.phase = "complete";
        diagnostics.result = result;
      } catch (error) {
        result = { following: null, followsYou: null };
        diagnostics.phase = "error";
        diagnostics.error = error?.message || String(error);
      } finally {
        diagnostics.result = result;
        document.documentElement.setAttribute("data-flowsi-profile-probe-result", JSON.stringify(diagnostics));
        document.documentElement.removeAttribute("data-flowsi-profile-probe");
        frame.remove();
      }
      return result;
    })().finally(() => profileRouteProbeRequests.delete(username));
    profileRouteProbeRequests.set(username, request);
    return request;
  };

  const applyFollowingToNotebook = (panel, count) => {
    if (!panel || !Number.isFinite(count)) return;
    const label = [...panel.querySelectorAll(".flowsi-notebook strong")].find(element =>
      /^seguindo\s*:/i.test(String(element.textContent || "").trim())
    );
    const row = label?.closest("p");
    if (!label || !row) return;
    const formatted = Math.max(0, Math.trunc(count)).toLocaleString("pt-BR");
    const currentValue = String(row.textContent || "")
      .replace(String(label.textContent || ""), "")
      .trim();
    if (currentValue === formatted) return;
    while (label.nextSibling) label.nextSibling.remove();
    row.appendChild(document.createElement("br"));
    row.appendChild(document.createTextNode(formatted));
  };

  const showFollowingLoadingInNotebook = panel => {
    if (!panel) return;
    const label = [...panel.querySelectorAll(".flowsi-notebook strong")].find(element =>
      /^seguindo\s*:/i.test(String(element.textContent || "").trim())
    );
    const row = label?.closest("p");
    if (!label || !row) return;
    const currentValue = String(row.textContent || "")
      .replace(String(label.textContent || ""), "")
      .trim();
    // A zero coming from the legacy profile fallback means "not loaded", not
    // a confirmed Instagram value. Keep it neutral until a live read finishes.
    if (currentValue !== "0") return;
    while (label.nextSibling) label.nextSibling.remove();
    row.appendChild(document.createElement("br"));
    row.appendChild(document.createTextNode("…"));
  };

  const fetchFollowingCount = async (username, knownProfileId = "") => {
    const csrfToken = document.cookie.split(";")
      .map(value => value.trim().split("="))
      .find(([name]) => name === "csrftoken")?.[1] || "";
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-csrftoken": decodeURIComponent(csrfToken),
      "x-requested-with": "XMLHttpRequest"
    };
    let profileId = /^\d+$/.test(String(knownProfileId || "").trim())
      ? String(knownProfileId).trim()
      : "";
    const readFollowingCount = payload => {
      const user = payload?.data?.user || payload?.user || payload?.data;
      const candidates = [
        user?.edge_follow?.count,
        user?.following_count,
        user?.following
      ];
      for (const candidate of candidates) {
        if (candidate === undefined || candidate === null || typeof candidate === "boolean") continue;
        const count = Number(candidate);
        if (Number.isFinite(count) && count >= 0) return count;
      }
      return null;
    };
    const fetchPayload = async url => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      } finally {
        clearTimeout(timeout);
      }
    };
    const fetchJson = async url => {
      try {
        const payload = await fetchPayload(url);
        const returnedUser = payload?.data?.user || payload?.user || payload?.data;
        const returnedUsername = String(returnedUser?.username || "")
          .trim().replace(/^@+/, "").toLowerCase();
        if (returnedUsername && returnedUsername !== username) {
          throw new Error("O Instagram retornou outro perfil");
        }
        const count = readFollowingCount(payload);
        if (!Number.isFinite(count)) throw new Error("Contagem indisponível");
        return { count, payload };
      } catch (error) {
        throw error;
      }
    };

    const fastUrls = [
      `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
    ];
    if (profileId) {
      fastUrls.unshift(
        `/api/v1/users/${profileId}/info/`,
        `https://i.instagram.com/api/v1/users/${profileId}/info/`
      );
    }
    try {
      const result = await Promise.any(fastUrls.map(fetchJson));
      return result.count;
    } catch (_) {}

    if (!profileId) {
      try {
        const payload = await fetchPayload(
          `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
        );
        const user = payload?.data?.user || payload?.user;
        profileId = String(user?.id || user?.pk || "").trim();
      } catch (_) {}
    }

    if (/^\d+$/.test(profileId)) {
      const infoUrls = [
        `/api/v1/users/${profileId}/info/`,
        `https://i.instagram.com/api/v1/users/${profileId}/info/`
      ];
      try {
        const result = await Promise.any(infoUrls.map(fetchJson));
        return result.count;
      } catch (_) {}
    }

    try {
      const response = await fetch(`/${encodeURIComponent(username)}/`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { accept: "text/html,application/xhtml+xml" }
      });
      if (!response.ok) return null;
      const html = await response.text();
      const documentProfile = new DOMParser().parseFromString(html, "text/html");
      const description = documentProfile.querySelector('meta[property="og:description"]')?.content || "";
      const descriptionMatch = description.match(
        /([0-9.,]+\s*[KM]?)\s+(?:following|seguindo)/i
      );
      const jsonMatch = html.match(
        /"edge_follow"\s*:\s*\{[^{}]*"count"\s*:\s*(\d+)/i
      ) || html.match(/"following_count"\s*:\s*(\d+)/i);
      if (descriptionMatch) return parseCompactCount(descriptionMatch[1]);
      if (jsonMatch) return Number(jsonMatch[1]);
    } catch (_) {}
    return null;
  };

  const fetchFollowsYou = async username => {
    const csrfToken = document.cookie.split(";")
      .map(value => value.trim().split("="))
      .find(([name]) => name === "csrftoken")?.[1] || "";
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-csrftoken": decodeURIComponent(csrfToken),
      "x-requested-with": "XMLHttpRequest"
    };
    let profileId = "";
    let negativeRelationshipFound = false;
    const readRelationship = value => {
      if (!value || typeof value !== "object") return null;
      if (value.followed_by === true || value.follows_viewer === true) return true;
      if (value.followed_by === false || value.follows_viewer === false) return false;
      return null;
    };
    const requestJson = async url => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      } finally {
        clearTimeout(timeout);
      }
    };
    try {
      const payload = await requestJson(
        `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
      );
      const user = payload?.data?.user || payload?.user;
      profileId = String(user?.id || user?.pk || "").trim();
      const profileRelationships = [
        user?.friendship_status,
        payload?.friendship_status,
        user
      ];
      for (const relationship of profileRelationships) {
        const result = readRelationship(relationship);
        if (result === true) return true;
        if (result === false) negativeRelationshipFound = true;
      }
    } catch (_) {}

    if (!/^\d+$/.test(profileId)) return negativeRelationshipFound ? false : null;
    const urls = [
      `/api/v1/friendships/show/${profileId}/`,
      `https://i.instagram.com/api/v1/friendships/show/${profileId}/`
    ];
    for (const url of urls) {
      try {
        const payload = await requestJson(url);
        const relationships = [
          payload?.friendship_status,
          payload?.data?.friendship_status,
          payload?.data?.user?.friendship_status,
          payload?.data,
          payload
        ];
        for (const relationship of relationships) {
          const result = readRelationship(relationship);
          if (result === true) return true;
          if (result === false) negativeRelationshipFound = true;
        }
      } catch (_) {}
    }
    return negativeRelationshipFound ? false : null;
  };

  const applyFollowsYouToNotebook = (panel, followsYou) => {
    if (!panel || typeof followsYou !== "boolean") return;
    const row = [...panel.querySelectorAll("p")].find(element =>
      /^segue você\s*:/i.test(String(element.textContent || "").trim())
    );
    if (!row) return;
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
      fontSize: "13px",
      lineHeight: "1"
    });
    if (followsYou) {
      if (indicator.dataset.flowsiFollowsYou === "true" && indicator.textContent === "✔️") return;
      indicator.dataset.flowsiFollowsYou = "true";
      indicator.replaceChildren(document.createTextNode("✔️"));
      indicator.style.color = "#16a34a";
      return;
    }
    if (indicator.dataset.flowsiFollowsYou === "false" && indicator.textContent === "🚫") return;
    indicator.dataset.flowsiFollowsYou = "false";
    indicator.replaceChildren(document.createTextNode("🚫"));
    indicator.style.color = "#dc2626";
  };

  const hideFollowsYouInNotebook = panel => {
    if (!panel) return;
    const row = [...panel.querySelectorAll("p")].find(element =>
      /^segue você\s*:/i.test(String(element.textContent || "").trim())
    );
    if (row) row.style.display = "none";
  };

  const fetchFollowsYouFromPageWorld = (username, profileId) => new Promise(resolve => {
    const requestId = `flowsi-relationship-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener("message", onResponse);
      resolve(null);
    }, 5000);
    const onResponse = event => {
      if (event.source !== window ||
          event.data?.source !== "flowsi-profile-relationship-response" ||
          event.data?.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener("message", onResponse);
      resolve(typeof event.data.followsYou === "boolean" ? event.data.followsYou : null);
    };
    window.addEventListener("message", onResponse);
    window.postMessage({
      source: "flowsi-profile-relationship-request",
      requestId,
      username,
      profileId: String(profileId || "")
    }, "*");
  });

  const fetchFollowingCountFromPageWorld = (username, profileId) => new Promise(resolve => {
    const requestId = `flowsi-following-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      window.removeEventListener("message", onResponse);
      resolve(null);
    }, 5000);
    const onResponse = event => {
      if (event.source !== window ||
          event.data?.source !== "flowsi-profile-following-response" ||
          event.data?.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener("message", onResponse);
      const count = Number(event.data.following);
      resolve(Number.isFinite(count) && count >= 0 ? count : null);
    };
    window.addEventListener("message", onResponse);
    window.postMessage({
      source: "flowsi-profile-following-request",
      requestId,
      username,
      profileId: String(profileId || "")
    }, "*");
  });

  const syncFollowsYou = (username, panel) => {
    if (followsYouCache.has(username)) {
      applyFollowsYouToNotebook(panel, followsYouCache.get(username));
      return;
    }
    hideFollowsYouInNotebook(panel);
    if (followsYouRequests.has(username)) return;
    if (Date.now() - Number(followsYouAttemptedAt.get(username) || 0) < 60000) return;
    followsYouAttemptedAt.set(username, Date.now());
    const openProfile = window.flowsiOpenNotebookProfile || {};
    const knownProfileId = openProfile.userId || openProfile.pk || openProfile.id || "";
    const backgroundRelationship = new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: "flowsiFetchRelationship",
        username,
        profileId: String(knownProfileId || "")
      }, response => {
        if (chrome.runtime.lastError || typeof response?.followsYou !== "boolean") {
          resolve(null);
          return;
        }
        resolve({
          value: response.followsYou,
          definitive: Boolean(response.definitive),
          source: response.source || "background",
          diagnostics: response.diagnostics || []
        });
      });
    });
    const directProfileRelationship = fetchManualInstagramProfile(username)
      .then(profile => typeof profile?.follows_viewer === "boolean"
        ? { value: profile.follows_viewer, definitive: true, source: "web-profile-direct" }
        : null)
      .catch(() => null);
    const request = Promise.allSettled([
      backgroundRelationship,
      fetchFollowsYouFromPageWorld(username, knownProfileId),
      fetchFollowsYou(username),
      directProfileRelationship
    ])
      .then(async results => {
        const background = results[0]?.status === "fulfilled" ? results[0].value : null;
        const pageWorld = results[1]?.status === "fulfilled" ? results[1].value : null;
        const isolated = results[2]?.status === "fulfilled" ? results[2].value : null;
        const direct = results[3]?.status === "fulfilled" ? results[3].value : null;
        const values = [background?.value, pageWorld, isolated, direct?.value];
        let followsYou = values.includes(true) ? true : null;
        let source = values.includes(true) ? "positive-api" : "";
        if (followsYou === null && background?.definitive && typeof background.value === "boolean") {
          followsYou = background.value;
          source = background.source;
        }
        if (followsYou === null && direct?.definitive && typeof direct.value === "boolean") {
          followsYou = direct.value;
          source = direct.source;
        }
        if (followsYou === null) {
          const routeResult = await probeProfileBehindOverlay(username);
          if (typeof routeResult?.followsYou === "boolean") {
            followsYou = routeResult.followsYou;
            source = "profile-probe";
          }
        }
        document.documentElement.setAttribute("data-flowsi-follows-you-diagnostics", JSON.stringify({
          username,
          followsYou,
          source,
          background,
          pageWorld,
          isolated,
          direct
        }));
        return followsYou;
      })
      .then(followsYou => {
        if (typeof followsYou !== "boolean") {
          document.documentElement.setAttribute("data-flowsi-follows-you-status", "unavailable");
          hideFollowsYouInNotebook(panel);
          return;
        }
        document.documentElement.setAttribute("data-flowsi-follows-you-status", "complete");
        const visibleUsername = String(
          panel?.querySelector(".flowsi-notebook-header p")?.textContent || ""
        ).trim().replace(/^@+/, "").toLowerCase();
        if (visibleUsername && visibleUsername !== username) return;
        followsYouCache.set(username, followsYou);
        applyFollowsYouToNotebook(panel, followsYou);
        window.flowsiOpenNotebookProfile = {
          ...(window.flowsiOpenNotebookProfile || {}),
          username,
          follows_viewer: followsYou
        };
        chrome.storage.local.set({ openNotebookProfile: window.flowsiOpenNotebookProfile });
        chrome.runtime.sendMessage({
          action: "flowsiCrmMutate",
          mutation: "updateProfile",
          username,
          followsViewer: followsYou
        });
      })
      .finally(() => followsYouRequests.delete(username));
    followsYouRequests.set(username, request);
  };

  const syncFollowingCount = (username, panel) => {
    if (followingCache.has(username)) {
      applyFollowingToNotebook(panel, followingCache.get(username));
    } else {
      showFollowingLoadingInNotebook(panel);
    }
    if (Date.now() - Number(followingFetchedAt.get(username) || 0) < 60000) return;
    if (followingRequests.has(username)) return;
    const openProfile = window.flowsiOpenNotebookProfile || {};
    const immediateCandidates = [
      openProfile?.edge_follow?.count,
      openProfile?.following_count,
      openProfile?.following
    ];
    const immediateCount = immediateCandidates
      .map(Number)
      .find(value => Number.isFinite(value) && value > 0);
    if (Number.isFinite(immediateCount)) {
      followingCache.set(username, immediateCount);
      applyFollowingToNotebook(panel, immediateCount);
    }
    const knownProfileId = openProfile.userId || openProfile.pk || openProfile.profileId || openProfile.id || "";
    const request = new Promise(resolve => {
      chrome.storage.local.get(["flowsiProfileFollowingCounts"], stored => {
        const saved = Number(stored.flowsiProfileFollowingCounts?.[username]);
        // Legacy versions persisted 0 when Instagram had not returned a
        // count. Do not reuse that placeholder as a real value.
        resolve(Number.isFinite(saved) && saved > 0 ? saved : null);
      });
    })
      .then(async savedCount => {
        // Show the last confirmed value immediately while Instagram refreshes it.
        // This avoids leaving the notebook at "..." when one API is slow.
        if (Number.isFinite(savedCount)) {
          followingCache.set(username, savedCount);
          applyFollowingToNotebook(panel, savedCount);
        }
        const requireCount = promise => promise.then(count => {
          // Instagram sometimes returns 0 in partial profile payloads even
          // when the visible profile has a positive count. Treat it as
          // unavailable so the behind-the-panel profile reader can win.
          if (!Number.isFinite(count) || count <= 0) throw new Error("Contagem indisponível");
          return count;
        });
        try {
          const refreshedCount = await Promise.any([
            requireCount(fetchManualInstagramProfile(username).then(profile =>
              Number(profile?.edge_follow?.count ?? profile?.following_count)
            )),
            requireCount(new Promise(resolve => {
              chrome.runtime.sendMessage({
                action: "flowsiFetchFollowing",
                username,
                profileId: String(knownProfileId || "")
              }, response => {
                if (chrome.runtime.lastError || !response?.success) {
                  resolve(null);
                  return;
                }
                resolve(Number(response.following));
              });
            })),
            requireCount(fetchFollowingCountFromPageWorld(username, knownProfileId)),
            requireCount(fetchFollowingCount(username, knownProfileId)),
            // Use the same behind-the-panel profile read that validates
            // "Segue você". Starting it now prevents a stalled API from
            // blocking the count indefinitely.
            requireCount(probeProfileBehindOverlay(username).then(result => result.following))
          ]);
          // Some Instagram endpoints temporarily answer with edge_follow.count = 0
          // while the profile payload is still incomplete. Never let that
          // placeholder replace a positive count already confirmed from the
          // visible profile or local cache.
          const confirmedCount = [
            followingCache.get(username),
            savedCount,
            immediateCount
          ].map(Number).find(value => Number.isFinite(value) && value > 0);
          if (refreshedCount === 0 && Number.isFinite(confirmedCount)) {
            return confirmedCount;
          }
          return refreshedCount;
        } catch (_) {
          const confirmedCount = [
            followingCache.get(username),
            savedCount,
            immediateCount
          ].map(Number).find(value => Number.isFinite(value) && value > 0);
          return Number.isFinite(confirmedCount) ? confirmedCount : null;
        }
      })
      .then(count => {
        followingFetchedAt.set(username, Date.now());
        if (!Number.isFinite(count)) {
          // A transient Instagram response must not leave the panel at "…"
          // forever. Retry in the background while this same profile remains
          // open, without requiring a manual profile visit.
          followingFetchedAt.delete(username);
          if (!followingRetryTimers.has(username)) {
            const timer = setTimeout(() => {
              followingRetryTimers.delete(username);
              const visiblePanel = document.querySelector(".flowsi-side-overlay-container");
              const visibleUsername = String(
                visiblePanel?.querySelector(".flowsi-notebook-header p")?.textContent || ""
              ).trim().replace(/^@+/, "").toLowerCase();
              if (visiblePanel && visibleUsername === username) {
                syncFollowingCount(username, visiblePanel);
              }
            }, 12000);
            followingRetryTimers.set(username, timer);
          }
          document.documentElement.setAttribute("data-flowsi-following-diagnostics", JSON.stringify({
            username,
            following: null,
            status: "unavailable"
          }));
          return;
        }
        const visibleUsername = String(
          panel?.querySelector(".flowsi-notebook-header p")?.textContent || ""
        ).trim().replace(/^@+/, "").toLowerCase();
        if (visibleUsername && visibleUsername !== username) return;
        const pendingRetry = followingRetryTimers.get(username);
        if (pendingRetry) clearTimeout(pendingRetry);
        followingRetryTimers.delete(username);
        document.documentElement.setAttribute("data-flowsi-following-diagnostics", JSON.stringify({
          username,
          following: count,
          status: "complete"
        }));
        followingCache.set(username, count);
        applyFollowingToNotebook(panel, count);
        const profile = window.flowsiOpenNotebookProfile || {};
        window.flowsiOpenNotebookProfile = {
          ...profile,
          username,
          edge_follow: { count }
        };
        chrome.storage.local.get(["flowsiProfileFollowingCounts"], stored => {
          chrome.storage.local.set({
            openNotebookProfile: window.flowsiOpenNotebookProfile,
            flowsiProfileFollowingCounts: {
              ...(stored.flowsiProfileFollowingCounts || {}),
              [username]: count
            }
          });
        });
        chrome.runtime.sendMessage({
          action: "flowsiCrmMutate",
          mutation: "updateProfile",
          username,
          following: count
        });
      })
      .finally(() => followingRequests.delete(username));
    followingRequests.set(username, request);
  };

  const applyPhotoToVisibleCards = (username, profileImage) => {
    if (!username || !profileImage) return;
    document.querySelectorAll(".flowsi-profile").forEach(card => {
      const cardUsername = String(
        card.querySelector(".flowsi-profile-username")?.textContent || ""
      ).trim().replace(/^@+/, "").toLowerCase();
      if (cardUsername !== username) return;
      const cardImage = card.querySelector("img.flowsi-profile-image");
      if (!cardImage || cardImage.src === profileImage) return;
      cardImage.src = profileImage;
    });
  };

  const syncProfile = storedProfile => {
    const panel = document.querySelector(".flowsi-side-overlay-container");
    const header = panel?.querySelector(".flowsi-notebook-header");
    if (!header) return;

    const visibleUsername = [...header.querySelectorAll("p")]
      .map(element => String(element.textContent || "").trim())
      .find(value => /^@[a-z0-9._]{1,30}$/i.test(value))
      ?.replace(/^@+/, "")
      .toLowerCase() || "";
    const username = String(
      visibleUsername || window.flowsiOpenNotebookProfile?.username || storedProfile?.username || ""
    ).trim().replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(username)) return;
    syncFollowingCount(username, panel);
    syncFollowsYou(username, panel);

    const rawName = String(header.querySelector("h2")?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    const name = rawName && rawName.replace(/^@+/, "").toLowerCase() !== username
      ? rawName
      : "";
    const imageElement = header.querySelector("img");
    const rawImage = String(imageElement?.currentSrc || imageElement?.src || "").trim();
    const imageProxyPrefix = "https://cdn.getwebooster.workers.dev/";
    const originalImage = rawImage.startsWith(imageProxyPrefix)
      ? rawImage.slice(imageProxyPrefix.length)
      : rawImage;
    const imageLoaded = Boolean(imageElement?.complete && imageElement?.naturalWidth > 0);
    const profileImage = imageLoaded && originalImage && !/ig-logo\.png(?:$|\?)/i.test(originalImage)
      ? originalImage
      : "";
    if (!name && !profileImage) return;

    const signature = `${username}|${name}|${profileImage}`;
    if (signature === lastConfirmedSignature || signature === pendingSignature) return;
    pendingSignature = signature;

    chrome.runtime.sendMessage({
      action: "flowsiCrmMutate",
      mutation: "updateProfile",
      username,
      name,
      full_name: name,
      profileImage,
      profile_pic_url: profileImage
    }, result => {
      pendingSignature = "";
      if (chrome.runtime.lastError || !result?.success) return;
      lastConfirmedSignature = signature;
      if (profileImage) {
        window.dispatchEvent(new CustomEvent("flowsi-profile-photo-updated-20261028", {
          detail: { username, profileImage }
        }));
        setTimeout(() => applyPhotoToVisibleCards(username, profileImage), 80);
        setTimeout(() => applyPhotoToVisibleCards(username, profileImage), 350);
      }
      window.flowsiOpenNotebookProfile = {
        ...(window.flowsiOpenNotebookProfile || storedProfile || {}),
        username,
        ...(name ? { name, full_name: name } : {}),
        ...(profileImage ? { profileImage, profile_pic_url: profileImage } : {})
      };
      chrome.storage.local.set({
        openNotebookProfile: window.flowsiOpenNotebookProfile
      });
    });
  };

  const scheduleSync = () => {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = null;
      if (window.flowsiOpenNotebookProfile?.username) {
        syncProfile(window.flowsiOpenNotebookProfile);
        return;
      }
      chrome.storage.local.get(["openNotebookProfile"], stored => {
        syncProfile(stored.openNotebookProfile || {});
      });
    }, 120);
  };

  window.__flowsiNotebookProfileCardObserver?.disconnect();
  window.__flowsiNotebookProfileCardObserver = new MutationObserver(scheduleSync);
  window.__flowsiNotebookProfileCardObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["src"]
  });
  scheduleSync();
}

function installVisibleProfileFollowingCapture() {
  if (window.__flowsiVisibleProfileFollowingCaptureInstalled) return;
  window.__flowsiVisibleProfileFollowingCaptureInstalled = true;

  const reservedPaths = new Set([
    "direct", "explore", "reels", "accounts", "stories", "p"
  ]);
  const scan = () => {
    const match = location.pathname.match(/^\/([a-z0-9._]{1,30})\/?$/i);
    const username = String(match?.[1] || "").toLowerCase();
    if (!username || reservedPaths.has(username)) return;

    const bodyText = String(document.body?.innerText || "");
    const followingMatch = bodyText.match(/([0-9.,]+\s*[KM]?)\s+seguindo\b/i) ||
      bodyText.match(/([0-9.,]+\s*[KM]?)\s+following\b/i);
    if (!followingMatch) return;
    const count = parseVisibleFollowingCount(followingMatch[1]);
    if (!Number.isFinite(count)) return;
    const buttonLabels = [...document.querySelectorAll("button")]
      .map(button => String(button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase());
    const followsYou = buttonLabels.includes("seguir de volta") ||
      buttonLabels.includes("follow back")
      ? true
      : null;
    const signature = `${username}:${count}:${followsYou}`;
    if (window.__flowsiVisibleFollowingSignature === signature) return;
    window.__flowsiVisibleFollowingSignature = signature;

    chrome.storage.local.get(["flowsiProfileFollowingCounts"], stored => {
      chrome.storage.local.set({
        flowsiProfileFollowingCounts: {
          ...(stored.flowsiProfileFollowingCounts || {}),
          [username]: count
        }
      });
    });
  };

  const parseVisibleFollowingCount = value => {
    const normalized = String(value || "").trim().toUpperCase();
    const multiplier = normalized.endsWith("K")
      ? 1000
      : normalized.endsWith("M") ? 1000000 : 1;
    const numeric = Number.parseFloat(
      normalized
        .replace(/[^0-9,.]/g, "")
        .replace(multiplier === 1 ? /[.,]/g : /\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".")
    );
    return Number.isFinite(numeric) ? Math.round(numeric * multiplier) : null;
  };

  window.__flowsiVisibleProfileFollowingObserver?.disconnect();
  window.__flowsiVisibleProfileFollowingObserver = new MutationObserver(scan);
  window.__flowsiVisibleProfileFollowingObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  scan();
}

function installNotebookProfileNavigation() {
  if (window.__flowsiNotebookProfileNavigationInstalled) return;
  window.__flowsiNotebookProfileNavigationInstalled = true;

  document.addEventListener("click", event => {
    const profileLink = event.target.closest?.(
      ".flowsi-side-overlay-container .flowsi-notebook-header [role='link']"
    );
    if (!profileLink) return;

    const username = String(
      window.flowsiOpenNotebookProfile?.username ||
      profileLink.querySelector("p")?.textContent || ""
    ).trim().replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9._]{1,30}$/.test(username)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    document.querySelector(".flowsi-side-overlay-container .flowsi-close")?.click();
    const activeToolButton = document.querySelector(".flowsi-sidebar button.flowsi-active");
    activeToolButton?.click();

    document.querySelectorAll(
      ".flowsi-side-overlay-fill, .flowsi-overlay, .modal-overlay, .chatbox-overlay"
    ).forEach(element => {
      element.style.setProperty("display", "none", "important");
    });

    window.location.assign(`https://www.instagram.com/${encodeURIComponent(username)}/`);
  }, true);
}

function installKanbanMenuToggle() {
  if (window.__flowsiKanbanMenuToggleInstalled) return;
  window.__flowsiKanbanMenuToggleInstalled = true;
  // The React sidebar owns this toggle. When the active Kanban icon is clicked
  // again it closes the overlay and restores /direct/inbox/ underneath, without
  // an extra document-level click interception.
}

function extendKanbanSyncTimeout() {
  if (window.__flowsiKanbanSyncTimeoutExtended) return;
  window.__flowsiKanbanSyncTimeoutExtended = true;
  const nativeSetTimeout = window.setTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) => {
    const isKanbanSyncTimeout = delay === 30000 &&
      typeof callback === "function" &&
      String(callback).includes("A atualização demorou mais que o esperado");
    return nativeSetTimeout(callback, isKanbanSyncTimeout ? 600000 : delay, ...args);
  };
}

function installLockedDefaultKanbanColumn() {
  if (window.__flowsiLockedDefaultKanbanColumnInstalled) return;
  window.__flowsiLockedDefaultKanbanColumnInstalled = true;

  const defaultColumnHeader = target => {
    const header = target?.closest?.(".flowsi-column-header");
    if (!header) return null;
    const column = header.closest(".flowsi-column");
    const board = column?.closest(".flowsi-board");
    return board?.querySelector(":scope > div .flowsi-column") === column ? header : null;
  };

  const blockColumnDrag = event => {
    const header = defaultColumnHeader(event.target);
    if (!header || event.target.closest?.("button, a, input, select, textarea")) return;
    if (event.type === "keydown" && ![" ", "Enter"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  ["pointerdown", "mousedown", "touchstart", "keydown"].forEach(type => {
    document.addEventListener(type, blockColumnDrag, true);
  });

  const markDefaultColumn = () => {
    const firstColumn = document.querySelector(".flowsi-board > div .flowsi-column");
    const header = firstColumn?.querySelector(":scope > .flowsi-column-header");
    if (!header) return;
    header.setAttribute("aria-disabled", "true");
    header.style.setProperty("cursor", "default", "important");
  };
  const observer = new MutationObserver(markDefaultColumn);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  markDefaultColumn();
}

function installKanbanOpenInboxSync() {
  if (window.__flowsiKanbanOpenInboxSyncInstalled) return;
  window.__flowsiKanbanOpenInboxSyncInstalled = true;
  let syncInProgress = false;

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#flowsi-nav-bar .flowsi-sidebar button");
    if (!button || window.location.pathname !== "/direct/inbox/") return;
    const label = String(button.textContent || "").replace(/\s+/g, " ").trim();
    if (!/^kanban crm$/i.test(label)) return;
    const wasOpen = Boolean(document.querySelector(".flowsi-overlay, .flowsi-board"));
    if (wasOpen) return;
    if (syncInProgress) return;
    // Let React mount the board first. Contact synchronization is deliberately
    // API-only here so opening the Kanban never scrolls, clicks, or blocks the
    // Instagram inbox behind the overlay.
    setTimeout(() => {
      if (!document.querySelector(".flowsi-overlay, .flowsi-board")) return;
      syncInProgress = true;
      document.documentElement.setAttribute("data-flowsi-kanban-inbox-sync", "loading");
      chrome.runtime.sendMessage({
        action: "updateThreadList",
        cursor: null,
        apiOnly: true
      }, response => {
        syncInProgress = false;
        if (chrome.runtime.lastError || !response?.success) {
          document.documentElement.setAttribute(
            "data-flowsi-kanban-inbox-sync",
            `error:${chrome.runtime.lastError?.message || response?.error || "unknown"}`
          );
          document.getElementById("flowsi-kanban-sync-placeholder")?.remove();
          return;
        }
        document.documentElement.setAttribute("data-flowsi-kanban-inbox-sync", "complete");
        document.getElementById("flowsi-kanban-sync-placeholder")?.remove();
      });
    }, 250);
  }, true);
}

function installGlobalSidebarNavigation() {
  if (window.__flowsiGlobalSidebarNavigationInstalled) return;
  window.__flowsiGlobalSidebarNavigationInstalled = true;

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#flowsi-nav-bar .flowsi-sidebar button");
    if (!button) return;
    const label = String(button.textContent || "").replace(/\s+/g, " ").trim();

    if (/^instagram$/i.test(label)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.assign("https://www.instagram.com/");
      return;
    }

    if (!/^kanban crm$/i.test(label) || window.location.pathname === "/direct/inbox/") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    sessionStorage.setItem("flowsiOpenKanbanAfterInbox", String(Date.now()));
    chrome.storage.local.set({ flowsiOpenKanbanAfterInbox: Date.now() });
    window.location.assign("https://www.instagram.com/direct/inbox/");
  }, true);
}

function openPendingKanbanOnInbox() {
  if (window.location.pathname !== "/direct/inbox/") return;
  chrome.storage.local.get(["flowsiOpenKanbanAfterInbox"], stored => {
    const sessionRequestedAt = Number(
      sessionStorage.getItem("flowsiOpenKanbanAfterInbox") || 0
    );
    const requestedAt = Math.max(
      sessionRequestedAt,
      Number(stored.flowsiOpenKanbanAfterInbox || 0)
    );
    if (!requestedAt || Date.now() - requestedAt > 120000) {
      if (requestedAt) chrome.storage.local.remove("flowsiOpenKanbanAfterInbox");
      sessionStorage.removeItem("flowsiOpenKanbanAfterInbox");
      return;
    }

    const startedAt = Date.now();
    const openWhenReady = () => {
      const button = [...document.querySelectorAll("#flowsi-nav-bar .flowsi-sidebar button")]
        .find(candidate => /^kanban crm$/i.test(
          String(candidate.textContent || "").replace(/\s+/g, " ").trim()
        ));
      if (!button) {
        if (Date.now() - startedAt < 15000) setTimeout(openWhenReady, 150);
        return;
      }
      sessionStorage.removeItem("flowsiOpenKanbanAfterInbox");
      chrome.storage.local.remove("flowsiOpenKanbanAfterInbox", () => button.click());
    };
    openWhenReady();
  });
}

function installKanbanInboxLoadingIndicator() {
  if (window.__flowsiKanbanInboxLoadingIndicatorInstalled) return;
  window.__flowsiKanbanInboxLoadingIndicatorInstalled = true;
  let hideTimer = null;

  const render = () => {
    const state = document.documentElement.getAttribute("data-flowsi-kanban-inbox-sync") || "";
    const rawDiagnostics = document.documentElement.getAttribute("data-flowsi-inbox-diagnostics") || "";
    let diagnostics = {};
    try { diagnostics = rawDiagnostics ? JSON.parse(rawDiagnostics) : {}; } catch {}
    const isLoadingMore = state === "loading-more" ||
      String(diagnostics.phase || "").startsWith("loading-more");
    const processed = Number(diagnostics.processed || diagnostics.rows);
    const progress = Number.isFinite(processed)
      ? ` (${Math.min(20, processed)}/20)`
      : "";
    const message = state.startsWith("error:")
      ? "Não foi possível carregar as conversas."
      : isLoadingMore
        ? `Carregando mais contatos do inbox${progress}...`
        : "Carregando mensagens...";
    const toastApi = window.__flowsiToast;
    const toastId = "flowsi-kanban-inbox-sync";

    if (typeof toastApi === "function") {
      document.getElementById("flowsi-kanban-sync-placeholder")?.remove();
      if (!state) {
        toastApi.dismiss(toastId);
      } else if (state === "complete") {
        toastApi.success("Kanban atualizado com sucesso.", {
          id: toastId,
          duration: 4000
        });
      } else if (state.startsWith("error:")) {
        toastApi.error(message, { id: toastId, duration: 4000 });
      } else {
        toastApi.loading(message, { id: toastId });
      }
      return;
    }

    document.querySelectorAll(".flowsi-inbox-loading-indicator").forEach(item => item.remove());
    let globalIndicator = document.getElementById("flowsi-kanban-sync-placeholder");
    if (!state || state === "complete") {
      if (globalIndicator && !hideTimer) {
        hideTimer = setTimeout(() => {
          document.getElementById("flowsi-kanban-sync-placeholder")?.remove();
          hideTimer = null;
        }, 4000);
      }
      return;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (!globalIndicator) {
      globalIndicator = document.createElement("div");
      globalIndicator.id = "flowsi-kanban-sync-placeholder";
      globalIndicator.setAttribute("role", "status");
      globalIndicator.setAttribute("aria-live", "polite");
      Object.assign(globalIndicator.style, {
        position: "fixed",
        top: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        minWidth: "190px",
        maxWidth: "min(420px, calc(100vw - 32px))",
        boxSizing: "border-box",
        padding: "11px 16px",
        border: "1px solid #ededed",
        borderRadius: "8px",
        background: "#ffffff",
        color: "#333333",
        font: "500 12px Arial, sans-serif",
        textAlign: "center",
        boxShadow: "0 3px 12px rgba(0, 0, 0, .14)",
        pointerEvents: "none"
      });
      document.body.appendChild(globalIndicator);
    }
    if (globalIndicator.textContent !== message) globalIndicator.textContent = message;
  };

  const observer = new MutationObserver(render);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-flowsi-kanban-inbox-sync", "data-flowsi-inbox-diagnostics"]
  });
  window.addEventListener("flowsi-toast-ready", render);
  render();
}

function installActiveDirectConversationSync() {
  if (window.__flowsiActiveDirectConversationSyncInstalled) return;
  window.__flowsiActiveDirectConversationSyncInstalled = true;
  let lastSignature = "";
  let syncTimer = null;

  const readVisibleProfile = () => {
    const threadId = window.location.pathname.match(/^\/direct\/t\/(\d+)/)?.[1] || "";
    if (!threadId) return null;
    const selfProfileLink = document.querySelector(
      'a[href] svg[aria-label="Perfil"], a[href] svg[aria-label="Profile"]'
    )?.closest("a[href]");
    let selfUsername = "";
    try {
      selfUsername = new URL(selfProfileLink?.href || "", location.origin).pathname
        .replace(/^\/+|\/+$/g, "").toLowerCase();
    } catch {}

    const candidates = [...document.querySelectorAll('a[href]')]
      .filter(anchor => !anchor.closest(
        '[aria-label="Lista de tópicos"], [aria-label="Threads list"], [aria-label="Conversation list"]'
      ))
      .map(anchor => {
        let username = "";
        try {
          const match = new URL(anchor.href, location.origin).pathname
            .match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
          username = match?.[1] || "";
        } catch {}
        return { anchor, username, rect: anchor.getBoundingClientRect() };
      })
      .filter(candidate =>
        /^[a-z0-9._]{1,30}$/i.test(candidate.username) &&
        candidate.username.toLowerCase() !== selfUsername &&
        candidate.rect.width > 0 &&
        candidate.rect.height > 0 &&
        candidate.rect.top >= 0 &&
        candidate.rect.top < 140 &&
        candidate.rect.left > 280
      );
    const selected = candidates[0];
    if (!selected) return null;

    let container = selected.anchor;
    let profileImage = "";
    let name = "";
    for (let depth = 0; container && depth < 5; depth += 1, container = container.parentElement) {
      const image = container.querySelector?.("img");
      if (!profileImage && image) profileImage = image.currentSrc || image.src || "";
      const heading = container.querySelector?.("h1, h2, h3");
      const headingText = String(heading?.textContent || "").replace(/\s+/g, " ").trim();
      if (!name && headingText && headingText.length < 100) name = headingText;
    }
    return {
      id: threadId,
      threadId,
      messageId: threadId,
      notebookId: selected.username,
      username: selected.username.toLowerCase(),
      name: name || selected.username,
      full_name: name || selected.username,
      profileImage,
      profile_pic_url: profileImage,
      source: "active-direct-header"
    };
  };

  const sync = (force = false) => {
    const visibleProfile = readVisibleProfile();
    if (!visibleProfile) return null;
    const signature = `${visibleProfile.threadId}|${visibleProfile.username}`;
    if (!force && signature === lastSignature) return window.flowsiActiveChatProfile_20261028;
    lastSignature = signature;
    window.flowsiActiveChatProfile_20261028 = visibleProfile;
    chrome.storage.local.set({ flowsiActiveChatProfile: visibleProfile });

    chrome.storage.local.get(
      ["contactList", "flowsiManualContacts", "kanbanColumns"],
      stored => {
        const profiles = [
          ...(Array.isArray(stored.contactList) ? stored.contactList : []),
          ...(Array.isArray(stored.flowsiManualContacts) ? stored.flowsiManualContacts : []),
          ...(Array.isArray(stored.kanbanColumns)
            ? stored.kanbanColumns.flatMap(column => Array.isArray(column.profiles) ? column.profiles : [])
            : [])
        ];
        const saved = profiles.find(profile =>
          String(profile?.username || "").toLowerCase().replace(/^@+/, "") === visibleProfile.username ||
          String(profile?.threadId || profile?.id || "") === visibleProfile.threadId
        );
        if (!saved) return;
        const enriched = {
          ...saved,
          ...visibleProfile,
          name: saved.name || saved.full_name || visibleProfile.name,
          full_name: saved.full_name || saved.name || visibleProfile.full_name,
          profileImage: saved.profileImage || saved.profile_pic_url || visibleProfile.profileImage,
          profile_pic_url: saved.profile_pic_url || saved.profileImage || visibleProfile.profile_pic_url,
          notebookId: saved.notebookId || saved.profileId || saved.userId || visibleProfile.username
        };
        window.flowsiActiveChatProfile_20261028 = enriched;
        chrome.storage.local.set({ flowsiActiveChatProfile: enriched });
      }
    );
    return visibleProfile;
  };

  document.addEventListener("click", event => {
    if (event.target.closest?.("#flowsi-chatpage")) sync(true);
  }, true);
  window.addEventListener("popstate", () => setTimeout(() => sync(true), 150));
  const observer = new MutationObserver(() => {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = null;
      sync(false);
    }, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  sync(true);
}

function installReliableChatbotSender() {
  if (window.__flowsiReliableChatbotSenderInstalled) return;
  window.__flowsiReliableChatbotSenderInstalled = true;

  const readCookie = name => document.cookie
    .split(";")
    .map(part => part.trim().split("="))
    .find(([key]) => key === name)?.[1] || "";

  const sendDirect = async (username, message) => {
    const normalizedUsername = String(username || "").trim().toLowerCase().replace(/^@+/, "");
    const text = String(message || "").trim();
    if (!/^[a-z0-9._]{1,30}$/.test(normalizedUsername) || !text) {
      throw new Error("Destinatário ou mensagem inválidos.");
    }
    const headers = {
      accept: "*/*",
      "x-ig-app-id": "936619743392459",
      "x-asbd-id": "129477",
      "x-csrftoken": readCookie("csrftoken"),
      "x-requested-with": "XMLHttpRequest"
    };
    const profileResponse = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(normalizedUsername)}`,
      { credentials: "include", cache: "no-store", headers }
    );
    if (!profileResponse.ok) {
      throw new Error(`Não foi possível consultar @${normalizedUsername} (HTTP ${profileResponse.status}).`);
    }
    const profilePayload = await profileResponse.json();
    const user = profilePayload?.data?.user;
    const userId = String(user?.id || user?.pk || "");
    if (!userId) throw new Error(`O perfil @${normalizedUsername} não foi encontrado.`);

    const threadResponse = await fetch(
      "https://i.instagram.com/api/v1/direct_v2/create_group_thread/",
      {
        method: "POST",
        credentials: "include",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ recipient_users: `["${userId}"]` }).toString()
      }
    );
    const threadPayload = await threadResponse.json().catch(() => ({}));
    const threadId = String(threadPayload?.thread_id || "");
    if (!threadResponse.ok || !threadId) {
      throw new Error(threadPayload?.message || "Não foi possível criar ou localizar a conversa.");
    }
    const clientContext = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
    const broadcastBody = new URLSearchParams({
      action: "send_item",
      send_attribution: "direct_thread",
      client_context: clientContext,
      mutation_token: clientContext,
      offline_threading_id: clientContext,
      thread_ids: `["${threadId}"]`,
      text
    }).toString();
    const broadcastFailures = [];
    for (const host of ["https://i.instagram.com", "https://www.instagram.com"]) {
      try {
        const response = await fetch(`${host}/api/v1/direct_v2/threads/broadcast/text/`, {
          method: "POST",
          credentials: "include",
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: broadcastBody
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.status === "ok") {
          return { success: true, status: "sent", threadId, transport: "http" };
        }
        broadcastFailures.push(`${new URL(host).host}: HTTP ${response.status}`);
      } catch (error) {
        broadcastFailures.push(`${new URL(host).host}: ${error?.message || error}`);
      }
    }

    // Instagram accounts do not all expose the broadcast endpoint. Keep the
    // extension's existing MQTT transport as a compatibility fallback.
    const viewerId = readCookie("ds_user_id");
    if (!viewerId) {
      throw new Error(
        `O Instagram recusou o envio HTTP e não informou a conta conectada (${broadcastFailures.join("; ")}).`
      );
    }
    window.postMessage({
      type: "INJECT_DISPATCH_DM_REQUEST",
      thread_id: threadId,
      viewer_id: viewerId,
      user: {
        id: userId,
        username: normalizedUsername,
        profile_img: user?.profile_pic_url || "",
        type: 2,
        timestamp: Date.now()
      },
      text,
      debug: false
    }, "*");
    return {
      success: true,
      status: "queued",
      threadId,
      transport: "mqtt-fallback",
      broadcastFailures
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action !== "flowsiChatbotSendMessage") return false;
    sendDirect(message.username, message.message)
      .then(sendResponse)
      .catch(error => sendResponse({
        success: false,
        error: error?.message || String(error)
      }));
    return true;
  });
}

function installChatbotSourceControls() {
  if (window.__flowsiChatbotSourceControlsInstalled) return;
  window.__flowsiChatbotSourceControlsInstalled = true;
  let pendingBotOptions = null;
  let patchingBotOptions = false;

  const style = document.createElement("style");
  style.id = "flowsi-chatbot-source-controls-style";
  style.textContent = `
    .flowsi-chatbot-source-controls {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--primary);
      border-radius: 8px;
      color: var(--text);
      background: var(--background-color-main);
    }
    .flowsi-chatbot-source-controls > strong { margin-bottom: 2px; }
    .flowsi-chatbot-source-option {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      cursor: pointer;
      line-height: 1.3;
    }
    .flowsi-chatbot-source-option input {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      margin: 1px 0 0;
      accent-color: #3e00b1;
    }
    .flowsi-chatbot-public-reply {
      width: 100%;
      min-height: 78px;
      box-sizing: border-box;
      padding: 10px;
      border: 1px solid var(--primary);
      border-radius: 5px;
      resize: vertical;
      background: var(--background-color-main);
      color: var(--text);
    }
    .flowsi-chatbot-public-reply-wrap[hidden] { display: none !important; }
    .flowsi-chatbot-sources-summary {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid currentColor;
      font-size: 12px;
      line-height: 1.4;
    }
    .flowsi-chatbot-edit-inline-container {
      width: 100%;
      box-sizing: border-box;
      margin-top: 14px;
    }
    .flowsi-chatbot-edit-dialog {
      width: 100%;
      box-sizing: border-box;
      padding: 16px;
      border: 1px solid var(--primary);
      border-radius: 8px;
      background: var(--background-color-main);
      color: var(--text);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
    .flowsi-chatbot-edit-dialog h3 { margin: 0 0 18px; }
    .flowsi-chatbot-edit-dialog label { color: var(--text); }
    .flowsi-chatbot-edit-field { display: grid; gap: 6px; margin-bottom: 14px; }
    .flowsi-chatbot-edit-field textarea,
    .flowsi-chatbot-edit-field select {
      width: 100%;
      box-sizing: border-box;
      padding: 10px;
      border: 1px solid var(--primary);
      border-radius: 5px;
      background: var(--background-color-main);
      color: var(--text);
    }
    .flowsi-chatbot-edit-actions {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 18px;
    }
    .flowsi-chatbot-edit-actions button {
      padding: 9px 16px;
      border-radius: 5px;
      background: var(--text);
      color: var(--background-color-main);
    }
    .flowsi-chatbot-edit-actions .flowsi-chatbot-edit-cancel {
      background: var(--modal-cancel-btn);
      color: white;
    }
  `;
  document.documentElement.appendChild(style);

  const sourceLabel = bot => {
    const explicit = ["triggerDirect", "triggerPostComments", "triggerNewFollowers"]
      .some(key => typeof bot?.[key] === "boolean");
    const sources = [];
    if (explicit ? bot.triggerDirect : true) sources.push("Direct e Story");
    if (explicit ? bot.triggerPostComments : true) sources.push("Comentários em post");
    if (explicit && bot.triggerNewFollowers) sources.push("Novos seguidores");
    return sources.length ? sources.join(" • ") : "Nenhuma origem selecionada";
  };

  const openBotEditor = botIndex => {
    chrome.storage.local.get(["bots", "quickMessages"], ({ bots = [], quickMessages = [] }) => {
      const bot = bots[botIndex];
      if (!bot) return;
      const section = document.querySelector(".flowsi-chatbot-section");
      if (!section) return;
      section.querySelector(".flowsi-chatbot-edit-inline-container")?.remove();
      section.querySelectorAll('[data-flowsi-hidden-by-editor="true"]').forEach(item => {
        item.hidden = false;
        item.style.removeProperty("display");
        delete item.dataset.flowsiHiddenByEditor;
      });
      const explicit = ["triggerDirect", "triggerPostComments", "triggerNewFollowers"]
        .some(key => typeof bot?.[key] === "boolean");
      const editorContainer = document.createElement("div");
      editorContainer.className = "flowsi-chatbot-edit-inline-container flowsi-chatbot-form-container";
      const dialog = document.createElement("form");
      dialog.className = "flowsi-chatbot-edit-dialog";
      const textTemplates = quickMessages.filter(item => item?.type === "text");
      let editKeywords = [...new Set(
        (Array.isArray(bot.keywords) ? bot.keywords : [])
          .map(value => String(value || "").trim())
          .filter(Boolean)
      )];
      dialog.innerHTML = `
        <h3>Editar ChatBot</h3>
        <div class="flowsi-chatbot-edit-field">
          <label for="flowsi-edit-keyword-input"><strong>Palavras-chave</strong></label>
          <div id="flowsi-edit-keyword-list" class="flowsi-keyword-list"></div>
          <div style="display:flex; gap:5px">
            <input id="flowsi-edit-keyword-input" class="flowsi-chatbot-input" type="text" placeholder="Digite uma palavra-chave" style="width:95%; padding:10px">
            <button id="flowsi-edit-keyword-add" class="flowsi-chatbot-add-btn" type="button" aria-label="Adicionar palavra-chave">+</button>
          </div>
        </div>
        <div class="flowsi-chatbot-edit-field">
          <label for="flowsi-edit-template"><strong>Modelo da mensagem no Direct</strong></label>
          <select id="flowsi-edit-template" required>
            <option value="">Selecione um modelo</option>
          </select>
        </div>
        <div class="flowsi-chatbot-source-controls">
          <strong>Disparar esta mensagem quando:</strong>
          <label class="flowsi-chatbot-source-option">
            <input id="flowsi-edit-trigger-direct" type="checkbox">
            <span>Receber a palavra do gatilho no Direct ou em resposta de Story</span>
          </label>
          <label class="flowsi-chatbot-source-option">
            <input id="flowsi-edit-trigger-post-comments" type="checkbox">
            <span>Alguém comentar a palavra do gatilho em uma postagem</span>
          </label>
          <div class="flowsi-chatbot-public-reply-wrap">
            <label for="flowsi-edit-public-reply"><strong>Resposta pública ao comentário</strong></label>
            <textarea id="flowsi-edit-public-reply" class="flowsi-chatbot-public-reply" placeholder="Mensagem que aparecerá como resposta ao comentário"></textarea>
          </div>
          <label class="flowsi-chatbot-source-option">
            <input id="flowsi-edit-trigger-followers" type="checkbox">
            <span>Uma nova pessoa começar a seguir o perfil</span>
          </label>
        </div>
        <div class="flowsi-chatbot-edit-actions">
          <button type="button" class="flowsi-chatbot-edit-cancel">Cancelar</button>
          <button type="submit">Salvar alterações</button>
        </div>
      `;
      editorContainer.appendChild(dialog);
      const originalForm = section.querySelector(
        ".flowsi-chatbot-form-container:not(.flowsi-chatbot-edit-inline-container)"
      );
      if (originalForm) {
        originalForm.hidden = true;
        originalForm.style.setProperty("display", "none", "important");
        originalForm.dataset.flowsiHiddenByEditor = "true";
      }
      const header = section.querySelector(".flowsi-chatbot-header");
      if (header) header.insertAdjacentElement("afterend", editorContainer);
      else section.prepend(editorContainer);
      requestAnimationFrame(() => {
        editorContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        dialog.querySelector("#flowsi-edit-keyword-input")?.focus();
      });

      const keywordList = dialog.querySelector("#flowsi-edit-keyword-list");
      const keywordInput = dialog.querySelector("#flowsi-edit-keyword-input");
      const renderEditKeywords = () => {
        keywordList.replaceChildren();
        if (!editKeywords.length) {
          const empty = document.createElement("p");
          empty.textContent = "Nenhuma palavra-chave adicionada.";
          keywordList.appendChild(empty);
          return;
        }
        editKeywords.forEach((keyword, keywordIndex) => {
          const tag = document.createElement("span");
          tag.className = "flowsi-chatbot-keyword-tag";
          tag.appendChild(document.createTextNode(keyword));
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "×";
          remove.setAttribute("aria-label", `Remover ${keyword}`);
          remove.addEventListener("click", () => {
            editKeywords = editKeywords.filter((_, index) => index !== keywordIndex);
            renderEditKeywords();
          });
          tag.appendChild(remove);
          keywordList.appendChild(tag);
        });
      };
      const addEditKeywords = rawValue => {
        const additions = String(rawValue || "")
          .split(/[,\n]/)
          .map(value => value.trim())
          .filter(Boolean);
        if (!additions.length) return;
        editKeywords = [...new Set([...editKeywords, ...additions])];
        keywordInput.value = "";
        renderEditKeywords();
      };
      dialog.querySelector("#flowsi-edit-keyword-add").addEventListener("click", () => {
        addEditKeywords(keywordInput.value);
        keywordInput.focus();
      });
      keywordInput.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== ",") return;
        event.preventDefault();
        addEditKeywords(keywordInput.value);
      });
      renderEditKeywords();
      const templateSelect = dialog.querySelector("#flowsi-edit-template");
      for (const template of textTemplates) {
        const option = document.createElement("option");
        option.value = template.title;
        option.textContent = template.title;
        option.selected = template.title === bot.template;
        templateSelect.appendChild(option);
      }
      if (bot.template && !textTemplates.some(template => template.title === bot.template)) {
        const missingOption = document.createElement("option");
        missingOption.value = bot.template;
        missingOption.textContent = `${bot.template} (modelo não encontrado)`;
        missingOption.selected = true;
        templateSelect.appendChild(missingOption);
      }

      const direct = dialog.querySelector("#flowsi-edit-trigger-direct");
      const comments = dialog.querySelector("#flowsi-edit-trigger-post-comments");
      const followers = dialog.querySelector("#flowsi-edit-trigger-followers");
      const replyWrap = dialog.querySelector(".flowsi-chatbot-public-reply-wrap");
      const reply = dialog.querySelector("#flowsi-edit-public-reply");
      direct.checked = explicit ? bot.triggerDirect === true : true;
      comments.checked = explicit ? bot.triggerPostComments === true : true;
      followers.checked = explicit ? bot.triggerNewFollowers === true : false;
      reply.value = String(bot.publicCommentReply || "");
      const syncReplyVisibility = () => {
        replyWrap.hidden = !comments.checked;
        reply.required = comments.checked;
      };
      comments.addEventListener("change", syncReplyVisibility);
      syncReplyVisibility();

      const close = () => {
        editorContainer.remove();
        if (originalForm?.isConnected) {
          originalForm.hidden = false;
          originalForm.style.removeProperty("display");
          delete originalForm.dataset.flowsiHiddenByEditor;
        }
      };
      dialog.querySelector(".flowsi-chatbot-edit-cancel").addEventListener("click", close);
      dialog.addEventListener("submit", event => {
        event.preventDefault();
        addEditKeywords(keywordInput.value);
        const keywords = [...editKeywords];
        if (!direct.checked && !comments.checked && !followers.checked) {
          window.alert("Selecione pelo menos uma origem para o gatilho.");
          return;
        }
        if ((direct.checked || comments.checked) && !keywords.length) {
          window.alert("Informe pelo menos uma palavra-chave para Direct, Story ou comentário.");
          return;
        }
        if (comments.checked && !reply.value.trim()) {
          reply.reportValidity();
          return;
        }
        const updatedBots = [...bots];
        updatedBots[botIndex] = {
          ...bot,
          keywords,
          template: templateSelect.value,
          triggerDirect: direct.checked,
          triggerPostComments: comments.checked,
          triggerNewFollowers: followers.checked,
          publicCommentReply: comments.checked ? reply.value.trim() : ""
        };
        chrome.storage.local.set({ bots: updatedBots }, () => {
          close();
          decorateCards();
        });
      });
    });
  };

  const decorateCards = () => {
    const cards = [...document.querySelectorAll(".flowsi-chatbot-card")];
    if (!cards.length) return;
    chrome.storage.local.get("bots", ({ bots = [] }) => {
      const reversed = [...bots].reverse();
      cards.forEach((card, index) => {
        const botIndex = bots.length - 1 - index;
        const bot = reversed[index];
        const cardTitle = card.querySelector("h4");
        if (cardTitle?.textContent.trim() === "Comment Bot") {
          cardTitle.textContent = "ChatBot";
        }
        card.querySelectorAll("p strong").forEach(label => {
          const text = label.textContent.trim();
          if (text === "Keywords:" || text === "Gatilho:") {
            label.textContent = "Gatilho:";
            if (bot) {
              const value = (Array.isArray(bot.keywords) ? bot.keywords : []).join(", ");
              const row = label.parentElement;
              if (row && row.textContent.trim() !== `Gatilho: ${value}`.trim()) {
                row.replaceChildren(label, document.createTextNode(` ${value}`));
              }
            }
          }
          if (text === "Template:" || text === "Mensagem:") {
            label.textContent = "Mensagem:";
            if (bot) {
              const value = String(bot.template || "");
              const row = label.parentElement;
              if (row && row.textContent.trim() !== `Mensagem: ${value}`.trim()) {
                row.replaceChildren(label, document.createTextNode(` ${value}`));
              }
            }
          }
        });
        const controls = card.querySelector(".flowsi-chatbot-card-controls");
        let editButton = controls?.querySelector(".flowsi-chatbot-edit-btn");
        if (controls && !editButton) {
          editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "flowsi-chatbot-btn flowsi-chatbot-edit-btn";
          editButton.title = "Editar chatbot";
          editButton.setAttribute("aria-label", "Editar chatbot");
          editButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>`;
          controls.prepend(editButton);
        }
        if (editButton) {
          editButton.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            openBotEditor(botIndex);
          };
        }
        let summary = card.querySelector(".flowsi-chatbot-sources-summary");
        if (!summary) {
          summary = document.createElement("p");
          summary.className = "flowsi-chatbot-sources-summary";
          card.querySelector(".flowsi-chatbot-card-controls")?.before(summary);
        }
        const text = bot ? `Dispara em: ${sourceLabel(bot)}` : "";
        if (summary.textContent !== text) summary.textContent = text;
      });
    });
  };

  const enhanceForm = form => {
    if (form.dataset.flowsiSourcesReady === "true") return;
    form.dataset.flowsiSourcesReady = "true";
    const controls = document.createElement("div");
    controls.className = "flowsi-chatbot-source-controls";
    controls.innerHTML = `
      <strong>Disparar esta mensagem quando:</strong>
      <label class="flowsi-chatbot-source-option">
        <input id="flowsi-trigger-direct" type="checkbox" checked>
        <span>Receber a palavra do gatilho no Direct ou em resposta de Story</span>
      </label>
      <label class="flowsi-chatbot-source-option">
        <input id="flowsi-trigger-post-comments" type="checkbox">
        <span>Alguém comentar a palavra do gatilho em uma postagem</span>
      </label>
      <div class="flowsi-chatbot-public-reply-wrap" hidden>
        <label for="flowsi-public-comment-reply"><strong>Resposta pública ao comentário</strong></label>
        <textarea id="flowsi-public-comment-reply" class="flowsi-chatbot-public-reply" placeholder="Mensagem que aparecerá como resposta ao comentário"></textarea>
      </div>
      <label class="flowsi-chatbot-source-option">
        <input id="flowsi-trigger-new-followers" type="checkbox">
        <span>Uma nova pessoa começar a seguir o perfil</span>
      </label>
    `;
    const buttons = form.querySelector(".flowsi-chatbot-buttons");
    buttons?.before(controls);
    const postCheckbox = controls.querySelector("#flowsi-trigger-post-comments");
    const replyWrap = controls.querySelector(".flowsi-chatbot-public-reply-wrap");
    const replyField = controls.querySelector("#flowsi-public-comment-reply");
    postCheckbox.addEventListener("change", () => {
      replyWrap.hidden = !postCheckbox.checked;
      replyField.required = postCheckbox.checked;
      if (postCheckbox.checked) replyField.focus();
    });

    form.addEventListener("submit", event => {
      const options = {
        triggerDirect: controls.querySelector("#flowsi-trigger-direct").checked,
        triggerPostComments: postCheckbox.checked,
        triggerNewFollowers: controls.querySelector("#flowsi-trigger-new-followers").checked,
        publicCommentReply: replyField.value.trim()
      };
      if (!options.triggerDirect && !options.triggerPostComments && !options.triggerNewFollowers) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.alert("Selecione pelo menos uma origem para o gatilho.");
        return;
      }
      if (options.triggerPostComments && !options.publicCommentReply) {
        event.preventDefault();
        event.stopImmediatePropagation();
        replyField.reportValidity();
        return;
      }

      pendingBotOptions = { options, expiresAt: Date.now() + 5000 };
    }, true);
  };

  const render = () => {
    document.querySelectorAll(".flowsi-chatbot-form").forEach(enhanceForm);
    decorateCards();
  };
  const observer = new MutationObserver(render);
  observer.observe(document.body, { childList: true, subtree: true });
  chrome.storage.onChanged.addListener(changes => {
    if (!changes.bots) return;
    const bots = changes.bots.newValue;
    if (
      pendingBotOptions &&
      pendingBotOptions.expiresAt >= Date.now() &&
      !patchingBotOptions &&
      Array.isArray(bots)
    ) {
      const index = [...bots].map((bot, botIndex) => ({ bot, botIndex })).reverse()
        .find(entry => typeof entry.bot?.triggerDirect !== "boolean")?.botIndex;
      if (Number.isInteger(index)) {
        patchingBotOptions = true;
        const patched = [...bots];
        patched[index] = {
          ...patched[index],
          id: patched[index]?.id || `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...pendingBotOptions.options
        };
        pendingBotOptions = null;
        chrome.storage.local.set({ bots: patched }, () => {
          patchingBotOptions = false;
          decorateCards();
        });
        return;
      }
    }
    setTimeout(decorateCards, 0);
  });
  render();
}

function installChatbotTriggerPolling() {
  if (window.__flowsiChatbotTriggerPollingInstalled) return;
  window.__flowsiChatbotTriggerPollingInstalled = true;
  let checking = false;
  const check = () => {
    if (checking) return;
    chrome.storage.local.get("bots", ({ bots = [] }) => {
      if (!bots.some(bot => bot?.start === true && bot?.type === "comment")) return;
      checking = true;
      chrome.runtime.sendMessage({ action: "checkNotifications" }, () => {
        checking = false;
        void chrome.runtime.lastError;
      });
    });
  };
  setInterval(check, 15000);
  setTimeout(check, 1500);
}

preload(() => import("../../../assets/js/index.e4b3aa7a.js"), [])
  .then(() => {
    installManualContactHeaderButton();
    installManualContactFormHandler();
    installNotebookProfileCardSync();
    installNotebookProfileNavigation();
    installVisibleProfileFollowingCapture();
    installLockedDefaultKanbanColumn();
    installKanbanMenuToggle();
    installGlobalSidebarNavigation();
    installKanbanOpenInboxSync();
    installKanbanInboxLoadingIndicator();
    installActiveDirectConversationSync();
    installReliableChatbotSender();
    installChatbotSourceControls();
    installChatbotTriggerPolling();
    openPendingKanbanOnInbox();
  })
  .catch(error => {
    if (!isInvalidatedExtensionContext(error)) throw error;
  });
