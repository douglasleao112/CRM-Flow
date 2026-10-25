const STATUS_COLORS = {
  on: "#10b981",
  work: "#10b981",
  off: "#94a3b8",
  error: "#ef4444"
};

// This watchdog intentionally lives in the service worker instead of the
// content script. Chrome's SIGTRAP/"Ah, nao!" page replaces the renderer and
// kills every timer/listener inside WhatsApp, while the extension worker and
// chrome.tabs API remain available to recover the tab.
const WATCHDOG_ALARM = "wf-whatsapp-renderer-watchdog";
const WATCHDOG_STORAGE_KEY = "wfWhatsAppWatchdog";
const WATCHDOG_PERIOD_MINUTES = 0.5;
const WATCHDOG_PROBE_TIMEOUT_MS = 5000;
const WATCHDOG_STARTUP_GRACE_MS = 120000;
const WATCHDOG_CONFIRMATION_MS = 35000;
const WATCHDOG_RELOAD_WINDOW_MS = 15 * 60 * 1000;
const WATCHDOG_MAX_RELOADS = 2;
let watchdogRunInFlight = null;
let watchdogMemoryState = {};
let watchdogStateMutation = Promise.resolve();

function isWhatsAppUrl(value) {
  return String(value || "").startsWith("https://web.whatsapp.com/");
}

function isRendererErrorUrl(value) {
  return String(value || "").startsWith("chrome-error://");
}

function normalizeWatchdogEntry(value = {}) {
  return {
    firstMissAt: Math.max(0, Number(value.firstMissAt) || 0),
    missCount: Math.max(0, Number(value.missCount) || 0),
    graceUntil: Math.max(0, Number(value.graceUntil) || 0),
    lastHealthyAt: Math.max(0, Number(value.lastHealthyAt) || 0),
    lastReloadAt: Math.max(0, Number(value.lastReloadAt) || 0),
    blockedUntil: Math.max(0, Number(value.blockedUntil) || 0),
    reloads: (Array.isArray(value.reloads) ? value.reloads : [])
      .map(Number)
      .filter(Number.isFinite),
    lastFailure: String(value.lastFailure || "").slice(0, 240)
  };
}

async function readWatchdogState() {
  try {
    if (!chrome.storage?.session) return { ...watchdogMemoryState };
    const stored = await chrome.storage.session.get(WATCHDOG_STORAGE_KEY);
    const value = stored?.[WATCHDOG_STORAGE_KEY];
    return value && typeof value === "object" ? value : {};
  } catch {
    return { ...watchdogMemoryState };
  }
}

async function writeWatchdogState(value) {
  watchdogMemoryState = { ...(value || {}) };
  try {
    if (chrome.storage?.session) {
      await chrome.storage.session.set({ [WATCHDOG_STORAGE_KEY]: watchdogMemoryState });
    }
  } catch (error) {
    console.debug("[WA Flow] Estado do watchdog mantido somente em memoria.", error);
  }
}

function mutateWatchdogState(mutator) {
  const operation = watchdogStateMutation
    .catch(() => {})
    .then(async () => {
      const state = await readWatchdogState();
      await mutator(state);
      await writeWatchdogState(state);
      return state;
    });
  watchdogStateMutation = operation;
  return operation;
}

function probeWhatsAppRenderer(tabId) {
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({
      ok: false,
      error: "O conteúdo da aba não respondeu ao watchdog."
    }), WATCHDOG_PROBE_TIMEOUT_MS);
  });
  const probe = chrome.tabs.sendMessage(tabId, { type: "WF_WATCHDOG_HEALTH" })
    .then(response => ({
      ok: response?.alive === true,
      response,
      error: response?.alive === true ? "" : "Resposta inválida do conteúdo da aba."
    }))
    .catch(error => ({
      ok: false,
      error: error?.message || String(error)
    }));
  return Promise.race([probe, timeout]).finally(() => clearTimeout(timer));
}

async function reloadWhatsAppTab(tab, entry, now, reason) {
  entry.reloads = entry.reloads.filter(timestamp => (
    Number.isFinite(timestamp) && now - timestamp < WATCHDOG_RELOAD_WINDOW_MS
  ));
  if (entry.reloads.length >= WATCHDOG_MAX_RELOADS) {
    entry.blockedUntil = Math.max(
      entry.blockedUntil,
      entry.reloads[0] + WATCHDOG_RELOAD_WINDOW_MS
    );
    entry.lastFailure = `Recarga bloqueada para evitar ciclo: ${reason}`;
    return false;
  }

  entry.reloads.push(now);
  entry.lastReloadAt = now;
  entry.graceUntil = now + WATCHDOG_STARTUP_GRACE_MS;
  entry.firstMissAt = 0;
  entry.missCount = 0;
  entry.blockedUntil = 0;
  entry.lastFailure = String(reason || "renderer sem resposta").slice(0, 240);
  try {
    await chrome.tabs.update(tab.id, { autoDiscardable: false });
    // A recarga normal preserves cookies, IndexedDB, localStorage and the
    // sessão vinculada do WhatsApp. Never use bypassCache or clear browsing data.
    await chrome.tabs.reload(tab.id);
    console.warn("[WA Flow] Aba do WhatsApp recuperada pelo watchdog.", reason);
    return true;
  } catch (error) {
    entry.lastFailure = `Falha ao recarregar: ${error?.message || String(error)}`.slice(0, 240);
    return false;
  }
}

async function inspectWhatsAppTab(tab, state, now = Date.now()) {
  if (
    !Number.isInteger(tab?.id) ||
    (!isWhatsAppUrl(tab.url) && !isWhatsAppUrl(tab.pendingUrl) && !isRendererErrorUrl(tab.url))
  ) return;
  const key = String(tab.id);
  const entry = normalizeWatchdogEntry(state[key]);
  state[key] = entry;
  entry.reloads = entry.reloads.filter(timestamp => now - timestamp < WATCHDOG_RELOAD_WINDOW_MS);
  if (entry.blockedUntil && now >= entry.blockedUntil) entry.blockedUntil = 0;

  try {
    if (tab.autoDiscardable !== false) {
      await chrome.tabs.update(tab.id, { autoDiscardable: false });
    }
  } catch {}

  // document_idle may not have installed the content listener yet. Loading
  // and a recent watchdog reload both receive a generous, explicit grace.
  if (tab.status === "loading") {
    entry.graceUntil = Math.max(entry.graceUntil, now + WATCHDOG_STARTUP_GRACE_MS);
    entry.firstMissAt = 0;
    entry.missCount = 0;
    return;
  }

  const probe = await probeWhatsAppRenderer(tab.id);
  if (probe.ok) {
    entry.firstMissAt = 0;
    entry.missCount = 0;
    entry.lastHealthyAt = now;
    entry.lastFailure = "";
    // login/loading/session are all healthy renderer states. In particular,
    // never reload the QR screen merely because the account is logged out.
    return;
  }

  if (now < entry.graceUntil) {
    entry.firstMissAt = 0;
    entry.missCount = 0;
    entry.lastFailure = String(probe.error || "Aguardando inicialização").slice(0, 240);
    return;
  }

  if (!entry.firstMissAt) entry.firstMissAt = now;
  entry.missCount += 1;
  entry.lastFailure = String(probe.error || "Renderer sem resposta").slice(0, 240);
  const confirmed = entry.missCount >= 2 && now - entry.firstMissAt >= WATCHDOG_CONFIRMATION_MS;
  if (!confirmed || (entry.blockedUntil && now < entry.blockedUntil)) return;
  await reloadWhatsAppTab(tab, entry, now, entry.lastFailure);
}

async function runWhatsAppWatchdog(reason = "alarm") {
  if (watchdogRunInFlight) return watchdogRunInFlight;
  watchdogRunInFlight = (async () => {
    try {
      const now = Date.now();
      await mutateWatchdogState(async state => {
        // Query all tabs so a known WhatsApp tab remains recoverable even if
        // Chromium temporarily exposes its internal chrome-error:// URL.
        const allTabs = await chrome.tabs.query({});
        const tabs = allTabs.filter(tab => (
          isWhatsAppUrl(tab.url) ||
          isWhatsAppUrl(tab.pendingUrl) ||
          (isRendererErrorUrl(tab.url) && state[String(tab.id)])
        ));
        const existingKeys = new Set(allTabs
          .filter(tab => Number.isInteger(tab.id))
          .map(tab => String(tab.id)));
        Object.keys(state).forEach(key => {
          if (!existingKeys.has(key)) delete state[key];
        });
        for (const tab of tabs) {
          await inspectWhatsAppTab(tab, state, now);
        }
      });
    } catch (error) {
      console.warn(`[WA Flow] Watchdog (${reason}) não concluiu a verificação:`, error);
    }
  })().finally(() => {
    watchdogRunInFlight = null;
  });
  return watchdogRunInFlight;
}

async function ensureWatchdogAlarm() {
  try {
    const alarm = await chrome.alarms.get(WATCHDOG_ALARM);
    if (!alarm || Number(alarm.periodInMinutes) !== WATCHDOG_PERIOD_MINUTES) {
      await chrome.alarms.create(WATCHDOG_ALARM, {
        delayInMinutes: WATCHDOG_PERIOD_MINUTES,
        periodInMinutes: WATCHDOG_PERIOD_MINUTES
      });
    }
  } catch (error) {
    console.warn("[WA Flow] Não foi possível iniciar o watchdog:", error);
  }
}

async function markWhatsAppLoading(tabId) {
  if (!Number.isInteger(tabId)) return;
  await mutateWatchdogState(async state => {
    const entry = normalizeWatchdogEntry(state[String(tabId)]);
    entry.graceUntil = Date.now() + WATCHDOG_STARTUP_GRACE_MS;
    entry.firstMissAt = 0;
    entry.missCount = 0;
    state[String(tabId)] = entry;
  });
}

async function forgetWhatsAppTab(tabId) {
  await mutateWatchdogState(async state => {
    delete state[String(tabId)];
  });
}

async function setActionStatus(mode = "off", detail = "") {
  const normalizedMode = STATUS_COLORS[mode] ? mode : "off";
  const labels = {
    on: "Automações ligadas",
    work: "Automações em execução",
    off: "Automações desligadas",
    error: "Automação inválida ou com erro"
  };

  await chrome.action.setBadgeText({ text: "" });

  const imageData = {};
  for (const size of [16, 32]) {
    const response = await fetch(chrome.runtime.getURL(`icons/icon-${size}.png`));
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, size, size);
    context.beginPath();
    context.arc(size * 0.76, size * 0.76, Math.max(3, size * 0.18), 0, Math.PI * 2);
    context.fillStyle = STATUS_COLORS[normalizedMode];
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = size === 16 ? 1 : 1.5;
    context.stroke();
    imageData[size] = context.getImageData(0, 0, size, size);
  }
  await chrome.action.setIcon({ imageData });
  await chrome.action.setTitle({
    title: detail ? `${labels[normalizedMode]}: ${detail}` : labels[normalizedMode]
  });
}

async function syncActionStatus() {
  const { wfSettings = {} } = await chrome.storage.local.get("wfSettings");
  await setActionStatus(wfSettings.enabled ? "on" : "off");
}

async function protectWhatsAppTabs({ reload = false } = {}) {
  try {
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
    await Promise.allSettled(tabs.map(async tab => {
      if (!Number.isInteger(tab.id)) return;
      await chrome.tabs.update(tab.id, { autoDiscardable: false });
      if (reload) await chrome.tabs.reload(tab.id);
    }));
  } catch (error) {
    console.warn("[WA Flow] Não foi possível proteger a aba do WhatsApp:", error);
  }
}

chrome.runtime.onInstalled.addListener(async details => {
  const current = await chrome.storage.local.get(["wfSettings", "wfFlows"]);
  if (!current.wfSettings) {
    await chrome.storage.local.set({
      wfSettings: {
        enabled: false,
        defaultDelayMs: 1500,
        humanPauseMinutes: 720,
        ignoreGroups: true
      }
    });
  }
  if (!current.wfFlows) {
    await chrome.storage.local.set({ wfFlows: [] });
  }
  await syncActionStatus();
  await ensureWatchdogAlarm();
  await protectWhatsAppTabs({ reload: details?.reason === "update" });
  await runWhatsAppWatchdog("installed");
});

chrome.runtime.onStartup.addListener(() => {
  syncActionStatus();
  protectWhatsAppTabs();
  ensureWatchdogAlarm();
  runWhatsAppWatchdog("startup");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = String(changeInfo.url || tab?.url || "");
  if (!isWhatsAppUrl(url)) {
    if (isRendererErrorUrl(url)) {
      setTimeout(() => runWhatsAppWatchdog("renderer-error"), 1000);
    } else if (changeInfo.url) {
      // The user intentionally left WhatsApp; never make the watchdog pull
      // an unrelated page back to WhatsApp.
      forgetWhatsAppTab(tabId).catch(() => {});
    }
    return;
  }
  chrome.tabs.update(tabId, { autoDiscardable: false }).catch(() => {});
  if (changeInfo.status === "loading") {
    markWhatsAppLoading(tabId).catch(() => {});
    return;
  }
  if (changeInfo.status === "complete" || changeInfo.discarded === true) {
    // document_idle installs the lightweight health responder. Give it a few
    // seconds before an event-driven probe; the periodic alarm remains the
    // authoritative retry mechanism if the worker is suspended meanwhile.
    setTimeout(() => runWhatsAppWatchdog("tab-updated"), 5000);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  forgetWhatsAppTab(tabId).catch(() => {});
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId)
    .then(tab => {
      if (isWhatsAppUrl(tab?.url)) return runWhatsAppWatchdog("tab-activated");
    })
    .catch(() => {});
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm?.name === WATCHDOG_ALARM) runWhatsAppWatchdog("alarm");
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.wfSettings) syncActionStatus();
});


chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "WF_OPEN_POPUP") {
    const fallbackToEditor = () => chrome.runtime.openOptionsPage();
    if (typeof chrome.action?.openPopup === "function") {
      chrome.action.openPopup().catch(fallbackToEditor);
    } else {
      fallbackToEditor();
    }
  }

  if (message?.type === "WF_OPEN_EDITOR") {
    chrome.runtime.openOptionsPage();
  }

  if (message?.type === "WF_STATUS") {
    setActionStatus(message.mode, message.detail);
  }
});

syncActionStatus();
ensureWatchdogAlarm();
runWhatsAppWatchdog("service-worker");
