(() => {
  const loaderVersion = 17;
  const current = window.__WF_VENDOR_LOADER__;
  if (current?.version === loaderVersion &&
      ["loading", "initializing", "ready", "retrying", "waiting"].includes(current.state)) {
    if (current.state === "ready") announceReady();
    return;
  }
  const state = {
    version: loaderVersion,
    state: "loading",
    attempts: 0,
    error: "",
    retryTimer: null
  };
  window.__WF_VENDOR_LOADER__ = state;
  window.WPPConfig = { deviceName: "CRM Flow", disableGoogleAnalytics: true };
  const loaderUrl = document.currentScript?.src || "";

  function announceReady() {
    console.info("[CRM Flow] WA-JS pronto", window.WFWPP?.version);
    window.postMessage({ source: "WF_PAGE", type: "VENDOR_LOADED",
      version: window.WFWPP?.version || "" }, "*");
  }
  function reportWaiting(message, retryDelay = 5000) {
    console.warn("[CRM Flow] Falha de inicialização:", message);
    state.state = "waiting";
    state.error = message;
    window.postMessage({ source: "WF_PAGE", type: "BRIDGE_ERROR", stage: "vendor",
      error: message, attempts: state.attempts }, "*");
    clearTimeout(state.retryTimer);
    state.retryTimer = setTimeout(recover, Math.max(1000, retryDelay));
  }
  function waitUntilReady() {
    const deadline = Date.now() + 90000;
    state.state = "initializing";
    const poll = () => {
      const wpp = window.WFWPP;
      try {
        if (wpp?.isReady === true &&
            typeof wpp?.conn?.isAuthenticated === "function" &&
            wpp.conn.isAuthenticated() === true &&
            typeof wpp?.chat?.sendTextMessage === "function" &&
            typeof wpp?.contact?.queryExists === "function") {
          window.__WF_WPP__ = wpp;
          state.state = "ready";
          state.error = "";
          announceReady();
          return;
        }
      } catch (error) {
        state.error = error?.message || String(error);
      }
      if (Date.now() >= deadline) {
        reportWaiting("WA-JS ainda não concluiu a inicialização. Tentaremos novamente automaticamente. " +
          (state.error || "A sessão ou os módulos do WhatsApp ainda não estão disponíveis."));
        return;
      }
      setTimeout(poll, 500);
    };
    poll();
  }
  function loadVendor() {
    state.attempts += 1;
    state.state = "loading";
    const script = document.createElement("script");
    script.id = "wf-wa-js-vendor";
    script.src = new URL("wppconnect-wa.js", loaderUrl).href;
    script.async = true;
    script.onload = () => {
      script.remove();
      // Never execute the bundle again after an initialization failure.
      // Retrying it installs duplicate listeners and does not repair module mappings.
      if (!window.WFWPP) {
        reportWaiting("O WA-JS carregou sem criar o motor do CRM Flow.", 10000);
        return;
      }
      waitUntilReady();
    };
    script.onerror = () => {
      script.remove();
      if (state.attempts < 3) {
        state.state = "retrying";
        setTimeout(loadVendor, state.attempts * 1000);
      } else reportWaiting("Não foi possível carregar o WA-JS. Tentaremos novamente automaticamente.", 30000);
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function recover() {
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
    if (state.state === "ready") {
      announceReady();
      return;
    }
    if (window.WFWPP) {
      waitUntilReady();
      return;
    }
    loadVendor();
  }

  window.addEventListener("online", recover);
  window.addEventListener("pageshow", recover);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.state === "waiting") recover();
  });

  recover();
})();
