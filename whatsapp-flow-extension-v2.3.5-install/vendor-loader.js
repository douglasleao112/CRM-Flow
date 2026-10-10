(() => {
  const loaderVersion = 14;
  const currentLoader = window.__WF_VENDOR_LOADER__;
  if (
    currentLoader?.version === loaderVersion &&
    ["loading", "ready"].includes(currentLoader.state)
  ) {
    if (currentLoader.state === "ready") {
      window.postMessage({
        source: "WF_PAGE",
        type: "VENDOR_LOADED",
        version: window.WFWPP?.version || ""
      }, "*");
    }
    return;
  }

  const loaderState = {
    version: loaderVersion,
    state: "loading",
    attempts: 0,
    error: ""
  };
  window.__WF_VENDOR_LOADER__ = loaderState;

  window.WPPConfig = {
    deviceName: "WhatsApp Flow Builder",
    disableGoogleAnalytics: true
  };

  const loaderUrl = document.currentScript?.src || "";

  function retryOrFail(message) {
    loaderState.error = message;
    if (loaderState.attempts < 3) {
      loaderState.state = "retrying";
      setTimeout(loadVendor, loaderState.attempts * 1000);
      return;
    }
    loaderState.state = "error";
    window.postMessage({
      source: "WF_PAGE",
      type: "BRIDGE_ERROR",
      error: message,
      stage: "vendor",
      attempts: loaderState.attempts
    }, "*");
  }

  function loadVendor() {
    loaderState.attempts += 1;
    loaderState.state = "loading";
    loaderState.error = "";

    document.querySelector("#wf-wa-js-vendor")?.remove();
    const script = document.createElement("script");
    script.id = "wf-wa-js-vendor";
    script.src = new URL("wppconnect-wa.js", loaderUrl).href;
    script.async = true;
    script.onload = () => {
      script.remove();
      if (!window.WFWPP) {
        retryOrFail("O WA-JS carregou sem criar o motor do WhatsFlow.");
        return;
      }
      loaderState.state = "ready";
      loaderState.error = "";
      window.__WF_WPP__ = window.WFWPP;
      window.postMessage({
        source: "WF_PAGE",
        type: "VENDOR_LOADED",
        version: window.WFWPP?.version || ""
      }, "*");
    };
    script.onerror = () => {
      script.remove();
      retryOrFail("Não foi possível carregar o WA-JS.");
    };
    (document.head || document.documentElement).appendChild(script);
  }

  loadVendor();
})();
