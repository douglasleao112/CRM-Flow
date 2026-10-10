const STATUS_COLORS = {
  on: "#10b981",
  work: "#10b981",
  off: "#94a3b8",
  error: "#ef4444"
};

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

chrome.runtime.onInstalled.addListener(async () => {
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
});

chrome.runtime.onStartup.addListener(syncActionStatus);

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
