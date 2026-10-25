(() => {
  if (window.__WF_CONTENT_V2__) return;
  window.__WF_CONTENT_V2__ = true;
  const bulkProtocolVersion = 14;

  const pending = new Map();
  let bridgeReady = false;
  let bridgeError = "";
  let bridgeStage = "injecting";
  let bridgeDiagnostics = {};
  let sessionObserved = sessionStorage.getItem("wf-session-observed") === "1";
  let healthFailureSince = 0;
  let healthCheckInFlight = false;
  let healthTimer = null;
  let recoveryReloadTimer = null;
  let fastRecoveryTimer = null;
  const contentStartedAt = Date.now();
  const isScheduleFailure = item => ["failed", "skipped", "unconfirmed"].includes(item?.status);

  function runtimeContextValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function scheduleRecoveryReload(reason = "connection", delay = 1500) {
    if (recoveryReloadTimer) return;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    let history = [];
    try {
      history = JSON.parse(sessionStorage.getItem("wf-recovery-reloads") || "[]")
        .map(Number)
        .filter(timestamp => Number.isFinite(timestamp) && now - timestamp < windowMs);
    } catch {}
    if (history.length >= 2) {
      console.warn("[WA Flow] Recarga automática bloqueada para evitar ciclo.", reason);
      return;
    }
    history.push(now);
    try {
      sessionStorage.setItem("wf-recovery-reloads", JSON.stringify(history));
      sessionStorage.setItem("wf-recovery-reason", String(reason || "connection"));
    } catch {}
    recoveryReloadTimer = setTimeout(() => window.location.reload(), Math.max(0, delay));
  }

  function inject(file, attempt = 1) {
    if (document.querySelector(`script[data-wf-injected="${file}"]`)) return;
    if (!runtimeContextValid()) {
      scheduleRecoveryReload("extension-context", 250);
      return;
    }
    const script = document.createElement("script");
    try {
      script.src = chrome.runtime.getURL(file);
    } catch (error) {
      console.warn("[WA Flow] Contexto da extensão foi substituído; recarregando a página.", error);
      scheduleRecoveryReload("extension-context", 250);
      return;
    }
    script.dataset.wfInjected = file;
    script.onload = () => script.remove();
    script.onerror = () => {
      script.remove();
      if (attempt < 3) {
        setTimeout(() => inject(file, attempt + 1), attempt * 750);
        return;
      }
      bridgeStage = file === "vendor-loader.js" ? "vendor-script" : "bridge-script";
      bridgeError = `Não foi possível injetar ${file} no WhatsApp Web.`;
    };
    (document.head || document.documentElement).appendChild(script);
  }

  function setBadge(text, mode = "off") {
    document.querySelector("#wf-v2-badge")?.remove();

    try {
      const request = chrome.runtime.sendMessage({
        type: "WF_STATUS",
        mode,
        detail: text || ""
      });
      request?.catch?.(() => {});
    } catch {}
  }

  function command(type, payload = {}, timeout = 30000) {
    const requestId = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("Tempo esgotado ao executar o comando."));
      }, timeout);

      pending.set(requestId, {
        resolve(value) {
          clearTimeout(timer);
          resolve(value);
        },
        reject(error) {
          clearTimeout(timer);
          reject(error);
        }
      });

      window.postMessage({
        source: "WF_CONTENT",
        type,
        requestId,
        ...payload
      }, "*");
    });
  }

  function startFlowAndWait({
    chatId,
    flowId,
    startIndex = 0,
    flowContext = {},
    replyText = "",
    failureOwner = "engine",
    failureSource = "scheduled-flow"
  }, timeout = 15000) {
    const requestId = crypto.randomUUID
      ? crypto.randomUUID()
      : `flow-${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        const error = new Error("O fluxo não confirmou a execução dentro do tempo limite.");
        error.code = "WF_FLOW_TIMEOUT";
        reject(error);
      }, timeout);
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("WF_CHAT_CONTROL_RESULT", onResult);
      };
      const onResult = event => {
        const result = event.detail || {};
        if (result.requestId !== requestId) return;
        cleanup();
        if (result.ok) {
          resolve(result);
          return;
        }
        const error = new Error(result.error || "Falha ao executar o fluxo.");
        if (result.errorCode) error.code = result.errorCode;
        if (Number.isFinite(Number(result.failedIndex))) error.failedIndex = Number(result.failedIndex);
        reject(error);
      };
      window.addEventListener("WF_CHAT_CONTROL_RESULT", onResult);
      window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", {
        detail: {
          action: "start-flow",
          requestId,
          chatId,
          flowId,
          startIndex,
          flowContext,
          replyText,
          failureOwner,
          failureSource
        }
      }));
    });
  }

  async function requireServerAck(response, timeout = 15000) {
    const result = response?.result || {};
    const messageId = String(result.messageId || "");
    let ack = Number(result.ack);
    if (Number.isFinite(ack) && ack < 0) {
      const error = new Error("O WhatsApp recusou o envio da mensagem.");
      error.code = "WF_NEGATIVE_ACK";
      throw error;
    }
    if (Number.isFinite(ack) && ack >= 1) return response;
    if (!messageId) {
      const error = new Error("O WhatsApp não informou o identificador da mensagem enviada.");
      error.code = "WF_MISSING_MESSAGE_ID";
      throw error;
    }

    const deadline = Date.now() + Math.max(1000, timeout);
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const checked = await command("CHECK_MESSAGE_ACKS", { messageIds: [messageId] }, 5000);
      ack = Number(checked?.result?.acks?.[0]?.ack);
      if (Number.isFinite(ack) && ack < 0) {
        const error = new Error("O WhatsApp recusou o envio da mensagem.");
        error.code = "WF_NEGATIVE_ACK";
        throw error;
      }
      if (Number.isFinite(ack) && ack >= 1) {
        result.ack = ack;
        result.ackPending = false;
        return response;
      }
    }

    const error = new Error("Mensagem registrada localmente, mas sem confirmação do servidor do WhatsApp.");
    error.code = "WF_ACK_UNCONFIRMED";
    error.messageId = messageId;
    throw error;
  }

  // The current WhatsApp Web no longer exposes MsgStore/MsgCollection in every
  // build. Keep the native bridge as the primary listener, but observe newly
  // rendered inbound bubbles so automatic triggers still work in the open chat.
  function installDomIncomingFallback() {
    if (window.__WF_DOM_INCOMING_FALLBACK__) return;
    window.__WF_DOM_INCOMING_FALLBACK__ = true;

    const seen = new WeakSet();
    document.querySelectorAll("div.copyable-text[data-pre-plain-text]").forEach(node => seen.add(node));

    const textFromBubble = bubble => Array.from(
      bubble.querySelectorAll('span[data-testid="selectable-text"]')
    ).map(node => node.innerText || node.textContent || "").join("\n").trim();

    const timestampFromMetadata = metadata => {
      const value = String(metadata || "");
      const match = value.match(
        /\[(\d{1,2}):(\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]/
      );
      if (!match) return 0;
      let year = Number(match[5]);
      if (year < 100) year += 2000;
      const timestamp = new Date(
        year,
        Number(match[4]) - 1,
        Number(match[3]),
        Number(match[1]),
        Number(match[2])
      ).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    const processBubble = async bubble => {
      if (!(bubble instanceof Element) || seen.has(bubble)) return;
      seen.add(bubble);

      // WhatsApp frequently renames/removes the message-in/message-out classes.
      // The accessible sender label is stable: outgoing bubbles contain
      // `aria-label="Você:"`; incoming bubbles contain the contact name.
      let messageContainer = bubble;
      let senderLabel = "";
      for (let level = 0; level < 7 && messageContainer; level++) {
        senderLabel = String(
          messageContainer.querySelector?.('span[aria-label$=":"]')?.getAttribute("aria-label") || ""
        ).trim();
        if (senderLabel) break;
        messageContainer = messageContainer.parentElement;
      }
      const normalizedSender = senderLabel
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (!senderLabel || normalizedSender === "voce:") return;

      // Give WhatsApp a moment to finish filling the text node.
      await new Promise(resolve => setTimeout(resolve, 120));
      const body = textFromBubble(bubble);
      if (!body) return;

      try {
        const active = await command("GET_ACTIVE_CHAT", {}, 8000);
        const chatId = String(active?.result?.chatId || "");
        if (!chatId) return;

        const metadata = String(bubble.getAttribute("data-pre-plain-text") || "");
        const metadataTimestamp = timestampFromMetadata(metadata);
        // O observer também enxerga mensagens antigas quando o WhatsApp
        // redesenha a conversa. Somente bolhas recém-chegadas podem disparar
        // automações pelo fallback visual.
        if (
          metadataTimestamp &&
          (Date.now() - metadataTimestamp > 75000 || metadataTimestamp - Date.now() > 75000)
        ) return;
        let hash = 2166136261;
        const fingerprint = `${chatId}|${metadata}|${body}`;
        for (let index = 0; index < fingerprint.length; index++) {
          hash ^= fingerprint.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }

        const message = {
          id: `dom-${(hash >>> 0).toString(16)}`,
          chatId,
          body,
          fromMe: false,
          isGroup: chatId.endsWith("@g.us"),
          timestamp: metadataTimestamp || Date.now(),
          source: "dom-fallback"
        };
        window.dispatchEvent(new CustomEvent("WF_INCOMING_ACTIVITY", { detail: message }));
        window.dispatchEvent(new CustomEvent("WF_NEW_MESSAGE", { detail: message }));
        console.info("[WA Flow] Incoming message captured by DOM fallback", message.id);
      } catch (error) {
        console.debug("[WA Flow] DOM fallback could not resolve the active chat", error);
      }
    };

    const inspectAddedNode = node => {
      if (!(node instanceof Element)) return;
      const bubbles = new Set();
      if (node.matches("div.copyable-text[data-pre-plain-text]")) bubbles.add(node);
      const parentBubble = node.closest("div.copyable-text[data-pre-plain-text]");
      if (parentBubble) bubbles.add(parentBubble);
      node.querySelectorAll?.("div.copyable-text[data-pre-plain-text]").forEach(item => bubbles.add(item));
      bubbles.forEach(processBubble);
    };

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(inspectAddedNode));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.WFBridge = {
    command,
    setBadge,
    isReady: () => bridgeReady
  };

  window.addEventListener("message", event => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "WF_PAGE") return;

    if (data.type === "BRIDGE_READY") {
      bridgeReady = true;
      bridgeError = "";
      bridgeStage = "ready";
      bridgeDiagnostics = data.capabilities || {};
      sessionObserved = true;
      healthFailureSince = 0;
      try { sessionStorage.setItem("wf-session-observed", "1"); } catch {}
      setBadge("engine conectada", "on");
      window.dispatchEvent(new CustomEvent("WF_BRIDGE_READY"));
      return;
    }

    if (data.type === "BRIDGE_ERROR") {
      bridgeReady = false;
      bridgeError = data.error || "Falha ao carregar o motor.";
      bridgeStage = data.stage || "error";
      bridgeDiagnostics = data.capabilities || {};
      setBadge(data.error || "erro na conexão", "error");
      return;
    }

    if (data.type === "VENDOR_LOADED") {
      bridgeStage = "vendor-loaded";
      return;
    }

    if (data.type === "NEW_MESSAGE") {
      window.dispatchEvent(new CustomEvent("WF_NEW_MESSAGE", {
        detail: data.message
      }));
      return;
    }

    if (data.type === "INCOMING_ACTIVITY") {
      window.dispatchEvent(new CustomEvent("WF_INCOMING_ACTIVITY", {
        detail: data.message
      }));
      return;
    }

    if (data.type === "MESSAGE_ACK") {
      window.dispatchEvent(new CustomEvent("WF_MESSAGE_ACK", {
        detail: data
      }));
      return;
    }

    if (data.type === "COMMAND_RESULT" || data.type === "PONG") {
      const entry = pending.get(data.requestId);
      if (!entry) return;
      pending.delete(data.requestId);

      if (data.type === "COMMAND_RESULT" && !data.ok) {
        const error = new Error(data.error || "Falha no comando.");
        if (data.errorCode) error.code = data.errorCode;
        entry.reject(error);
      } else {
        entry.resolve(data);
      }
    }
  });

  function visibleWhatsappSession() {
    const side = document.querySelector("#pane-side") ||
      document.querySelector('[data-testid="chat-list"]') ||
      document.querySelector('#side [role="grid"]');
    return Boolean(side && side.getClientRects().length > 0);
  }

  function visibleWhatsappLogin() {
    const login = document.querySelector(
      '[data-testid="qrcode"], canvas[aria-label*="QR" i], [data-ref] canvas'
    );
    return Boolean(login && login.getClientRects().length > 0);
  }

  async function checkConnectionHealth({ immediate = false } = {}) {
    if (healthCheckInFlight || recoveryReloadTimer || !runtimeContextValid()) {
      if (!runtimeContextValid()) scheduleRecoveryReload("extension-context", 250);
      return;
    }
    const hasSessionUi = visibleWhatsappSession();
    // A tela de QR/login não deve entrar em ciclo de recarga.
    if (
      !sessionObserved ||
      visibleWhatsappLogin() ||
      globalThis.navigator?.onLine === false
    ) return;
    // Em um carregamento normal, dê tempo para o painel aparecer. Se uma aba
    // antiga voltar do standby sem painel algum, trate como página travada.
    if (!hasSessionUi && Date.now() - contentStartedAt < 90000) return;

    healthCheckInFlight = true;
    try {
      const result = await command("PING", {}, immediate ? 4000 : 6500);
      const healthy = Boolean(result?.ready && result?.authenticated && result?.connected);
      bridgeReady = healthy;
      if (healthy) {
        healthFailureSince = 0;
        if (fastRecoveryTimer) {
          clearTimeout(fastRecoveryTimer);
          fastRecoveryTimer = null;
        }
        bridgeError = "";
        bridgeStage = "ready";
        return;
      }
      if (!healthFailureSince) healthFailureSince = Date.now();
    } catch (error) {
      bridgeReady = false;
      if (!healthFailureSince) healthFailureSince = Date.now();
      bridgeError = error?.message || String(error);
    } finally {
      healthCheckInFlight = false;
    }

    // When a suspended tab becomes visible again, do not make the user wait
    // for the regular 45-second watchdog. Give WhatsApp a short grace period
    // to reconnect by itself, then confirm once more before reloading.
    if (immediate && healthFailureSince && !fastRecoveryTimer) {
      fastRecoveryTimer = setTimeout(() => {
        fastRecoveryTimer = null;
        checkConnectionHealth({ immediate: true });
      }, 5000);
      if (Date.now() - healthFailureSince < 40000) {
        healthFailureSince = Date.now() - 40000;
      }
    }

    if (healthFailureSince && Date.now() - healthFailureSince >= 45000) {
      setBadge("reconectando WhatsApp", "work");
      scheduleRecoveryReload("whatsapp-standby", 750);
    }
  }

  function queueHealthCheck() {
    setTimeout(() => checkConnectionHealth({ immediate: true }), 250);
  }

  window.addEventListener("online", queueHealthCheck);
  window.addEventListener("focus", queueHealthCheck);
  window.addEventListener("pageshow", queueHealthCheck);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") queueHealthCheck();
  });
  healthTimer = setInterval(checkConnectionHealth, 15000);

  // Let WhatsApp finish login/history sync before loading automation hooks.
  // A script download or WA-JS isInjected flag is not an operational session.
  bridgeStage = "waiting-for-whatsapp";
  let sessionVisibleSince = 0;
  const sessionTimer = setInterval(() => {
    const side = document.querySelector("#pane-side") ||
      document.querySelector('[data-testid="chat-list"]') ||
      document.querySelector('#side [role="grid"]');
    const visible = side && side.getClientRects().length > 0;
    if (!visible) {
      sessionVisibleSince = 0;
      return;
    }
    if (!sessionVisibleSince) sessionVisibleSince = Date.now();
    if (Date.now() - sessionVisibleSince < 2000) return;
    clearInterval(sessionTimer);
    bridgeStage = "injecting";
    inject("vendor-loader.js");
    inject("page-bridge.js");
  }, 1000);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Keep this response independent from WA-JS/page-bridge. A renderer crash
    // also kills this listener, which lets the service worker distinguish a
    // dead WhatsApp tab from a disconnected/logged-out session that is still
    // rendering normally.
    if (request.type === "WF_WATCHDOG_HEALTH") {
      sendResponse({
        alive: true,
        ui: visibleWhatsappLogin()
          ? "login"
          : visibleWhatsappSession()
          ? "session"
          : "loading",
        bridgeReady,
        startedAt: contentStartedAt,
        checkedAt: Date.now()
      });
      return;
    }

    if (request.type === "WF_BULK_READY") {
      command("PING", {}, 2500)
        .then(result => {
          const currentBridge = Number(result.bridgeVersion || 0) === bulkProtocolVersion;
          bridgeReady = Boolean(result.ready && currentBridge);
          bridgeStage = bridgeReady ? "ready" : (result.loaderState || bridgeStage);
          bridgeDiagnostics = result.capabilities || bridgeDiagnostics;
          if (bridgeReady) bridgeError = "";
          sendResponse({
            ok: true,
            protocol: bulkProtocolVersion,
            bridgeVersion: Number(result.bridgeVersion || 0),
            bridgeReady,
            authenticated: Boolean(result.authenticated),
            connected: Boolean(result.connected),
            accountId: String(result.accountId || ""),
            stage: bridgeStage,
            diagnostics: bridgeDiagnostics,
            error: bridgeReady
              ? ""
              : currentBridge
              ? (result.loaderError || bridgeError)
              : "A ponte do WhatsFlow está desatualizada."
          });
        })
        .catch(error => sendResponse({
          ok: false,
          protocol: bulkProtocolVersion,
          bridgeVersion: 0,
          bridgeReady: false,
          authenticated: false,
          connected: false,
          accountId: "",
          stage: bridgeStage,
          diagnostics: bridgeDiagnostics,
          error: bridgeError,
          transientError: error?.message || String(error)
        }));
      return true;
    }

    if (request.type === "WF_BULK_START") {
      const requestId = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      let answered = false;
      const timer = setTimeout(() => {
        if (answered) return;
        answered = true;
        cleanup();
        sendResponse({
          ok: false,
          error: "O motor de campanhas não confirmou o início do disparo."
        });
      }, 15000);
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("WF_BULK_ACCEPTED", onAccepted);
        window.removeEventListener("WF_BULK_RESULT", onResult);
      };
      const onAccepted = event => {
        if (event.detail?.requestId !== requestId || answered) return;
        answered = true;
        cleanup();
        sendResponse({ ...event.detail, started: true });
      };
      const onResult = event => {
        if (event.detail?.requestId !== requestId || answered) return;
        answered = true;
        cleanup();
        sendResponse(event.detail);
      };
      window.addEventListener("WF_BULK_ACCEPTED", onAccepted);
      window.addEventListener("WF_BULK_RESULT", onResult);
      window.dispatchEvent(new CustomEvent("WF_BULK_START", {
        detail: { requestId, ...(request.payload || {}) }
      }));
      return true;
    }

    if (request.type === "WF_BULK_CONTROL") {
      const requestId = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      let answered = false;
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("WF_BULK_CONTROL_RESULT", onResult);
      };
      const onResult = event => {
        if (event.detail?.requestId !== requestId || answered) return;
        answered = true;
        cleanup();
        sendResponse(event.detail);
      };
      const timer = setTimeout(() => {
        if (answered) return;
        answered = true;
        cleanup();
        sendResponse({
          ok: false,
          error: "O motor não confirmou o controle da campanha."
        });
      }, 10000);
      window.addEventListener("WF_BULK_CONTROL_RESULT", onResult);
      window.dispatchEvent(new CustomEvent("WF_BULK_CONTROL", {
        detail: { requestId, ...(request.payload || {}) }
      }));
      return true;
    }

    if (request.type === "WF_EXTRACTION_SOURCES") {
      const sourceType = request.sourceType === "labels" ? "labels" : "groups";
      command("LIST_EXTRACTION_SOURCES", { sourceType }, 90000)
        .then(response => sendResponse({
          ok: true,
          ...(response.result || {})
        }))
        .catch(error => sendResponse({
          ok: false,
          error: error?.message || String(error)
        }));
      return true;
    }

    if (request.type === "WF_KANBAN_CHATS") {
      command('LIST_KANBAN_CHATS', { includeGroups: Boolean(request.includeGroups), forBulk: Boolean(request.forBulk) }, 90000)
        .then(response => sendResponse({ ok: true, chats: response.result?.chats || [] }))
        .catch(error => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }

    if (request.type === "WF_EXTRACTION_START") {
      const payload = request.payload || {};
      const sourceIds = (Array.isArray(payload.sourceIds) ? payload.sourceIds : [])
        .map(value => String(value || ""))
        .filter(Boolean)
        .slice(0, 250);
      const selectedIds = new Set(sourceIds);
      const sources = (Array.isArray(payload.sources) ? payload.sources : [])
        .filter(source => selectedIds.has(String(source?.id || "")))
        .slice(0, 250)
        .map(source => ({
          id: String(source?.id || ""),
          name: String(source?.name || "").slice(0, 240)
        }));
      const customTag = String(payload.customTag || "")
        .replace(/[|\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);

      command("EXTRACT_CONTACTS", {
        sourceType: payload.sourceType === "labels" ? "labels" : "groups",
        sourceIds,
        sources,
        includeAdmins: payload.includeAdmins !== false,
        customTag
      }, 10 * 60 * 1000)
        .then(response => sendResponse({
          ok: true,
          ...(response.result || {})
        }))
        .catch(error => sendResponse({
          ok: false,
          error: error?.message || String(error)
        }));
      return true;
    }

    if (request.type === "WF_EXTRACTION_CANCEL") {
      command("CANCEL_EXTRACTION", {}, 5000)
        .then(() => sendResponse({ ok: true }))
        .catch(error => sendResponse({
          ok: false,
          error: error?.message || String(error)
        }));
      return true;
    }

    if (request.type !== "WF_DIAGNOSTIC") return;

    command("PING", {})
      .then(async result => {
        const stored = await chrome.storage.local.get(["wfSettings", "wfFlows"]);
        const active = (stored.wfFlows || []).filter(flow => flow.enabled).length;

        sendResponse({
          message:
            `Motor interno: ${result.ready ? "ok" : "carregando"} | ` +
            `Autenticado: ${result.authenticated ? "sim" : "não"} | ` +
            `Automação: ${stored.wfSettings?.enabled ? "ativa" : "desligada"} | ` +
            `Fluxos: ${active}`
        });
      })
      .catch(error => sendResponse({ message: `Erro: ${error.message}` }));

    return true;
  });

  function mountChatControl() {
    if (!document.body || document.querySelector("#wf-chat-control")) return;

    const root = document.createElement("div");
    root.id = "wf-chat-control";
    root.innerHTML = `
      <div id="wf-chat-control-panel" hidden>
        <div class="wf-chat-tabs" role="tablist">
          <button type="button" class="wf-chat-tab active" data-wf-chat-tab="schedule">Programar</button>
          <button type="button" class="wf-chat-tab" data-wf-chat-tab="scheduled">
            Programadas <span id="wf-scheduled-count">0</span>
          </button>
          <button type="button" class="wf-chat-tab" data-wf-chat-tab="messages">Mensagens</button>
          <button type="button" class="wf-chat-tab" data-wf-chat-tab="flows">
            Fluxos <span id="wf-active-flow-count" hidden>0</span>
          </button>
        </div>
        <div class="wf-chat-tab-panel" data-wf-chat-panel="flows" hidden>
        <div id="wf-current-flow-card" class="wf-current-flow-card" hidden>
          <div class="wf-current-flow-info">
            <span id="wf-chat-status-dot" class="wf-chat-status-dot"></span>
            <div>
              <small>Automação nesta conversa</small>
              <strong id="wf-active-flow-name">Nenhum fluxo em execução</strong>
              <span id="wf-chat-flow-state">Pronta para iniciar um fluxo</span>
            </div>
          </div>
          <div class="wf-current-flow-actions">
            <button id="wf-chat-pause" class="wf-chat-pause-action" type="button" disabled
              aria-label="Pausar automação neste contato" title="Pausar automação neste contato">
              <span class="wf-pause-icon">⏸</span>
              <span class="wf-pause-label">Pausar</span>
            </button>
            <button id="wf-chat-advance" class="wf-chat-advance-action" type="button" disabled
              aria-label="Avançar para a próxima etapa" title="Avançar para a próxima etapa">
              <span>↠</span>
              <span>Avançar</span>
            </button>
            <button id="wf-chat-delete-flow" class="wf-chat-delete-flow" type="button" disabled
              aria-label="Remover fluxo desta conversa" title="Remover fluxo desta conversa">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path>
              </svg>
              <span>Remover</span>
            </button>
          </div>
        </div>
        <div class="wf-chat-field">
          <div class="wf-chat-field-heading">
            <label for="wf-chat-flow">Iniciar um fluxo</label>
            <span id="wf-flow-available-count">0 disponíveis</span>
          </div>
          <div class="wf-chat-flow-row">
            <select id="wf-chat-flow"><option value="">Selecione um fluxo</option></select>
            <button id="wf-chat-start" class="wf-chat-flow-play" type="button" disabled
              aria-label="Iniciar fluxo nesta conversa" title="Iniciar fluxo nesta conversa">
              <span>▶</span> Iniciar fluxo
            </button>
          </div>
        </div>
        <div id="wf-chat-feedback" class="wf-chat-feedback"></div>
        </div>
        <div class="wf-chat-tab-panel" data-wf-chat-panel="schedule">
          <form id="wf-schedule-form">
            <input id="wf-schedule-edit-id" type="hidden">
            <div class="wf-schedule-message-heading">
              <div class="wf-schedule-kind" role="tablist" aria-label="Tipo de agendamento">
                <button type="button" class="active" data-schedule-kind="message" role="tab" aria-selected="true">Mensagem</button>
                <button type="button" data-schedule-kind="flow" role="tab" aria-selected="false">Fluxo</button>
              </div>
            </div>
            <div id="wf-schedule-message-fields">
              <div class="wf-schedule-message-wrap" data-schedule-variant-row="0">
                <textarea id="wf-schedule-message" rows="4" maxlength="4096" aria-label="Mensagem"
                  placeholder="Digite a mensagem que será enviada ou use /atalho"></textarea>
                <div id="wf-message-suggestions" class="wf-message-suggestions" hidden></div>
                <div class="wf-schedule-variant-attachment">
                  <label class="wf-schedule-file" title="Anexar imagem, vídeo, áudio ou documento">
                    <input id="wf-schedule-file" type="file" data-schedule-variant-file="0"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      aria-label="Anexar arquivo à mensagem principal">
                    <span aria-hidden="true">📎</span><span>Anexar</span>
                  </label>
                  <small id="wf-schedule-file-name" class="wf-schedule-file-name" hidden></small>
                  <button class="wf-schedule-file-remove" type="button" data-remove-schedule-file
                    title="Remover anexo" aria-label="Remover anexo" hidden>×</button>
                </div>
              </div>
              <div id="wf-schedule-variations" class="wf-schedule-variations"></div>
              <div class="wf-schedule-template-row">
                <div id="wf-schedule-template-list" class="wf-schedule-template-list"></div>
              </div>
              <div class="wf-schedule-attachment-row">
                <button id="wf-save-schedule-template" class="wf-save-schedule-template" type="button"
                  title="Salvar esta configuração" aria-label="Salvar configuração">+</button>
                <button id="wf-add-schedule-variation" class="wf-add-schedule-variation" type="button">
                  + Variação
                </button>
              </div>
            </div>
            <div id="wf-schedule-flow-fields" class="wf-schedule-flow-fields" hidden>
              <label class="wf-schedule-label" for="wf-schedule-flow">Fluxo que será iniciado</label>
              <select id="wf-schedule-flow"><option value="">Selecione um fluxo</option></select>
              <small>O fluxo será iniciado automaticamente nesta conversa no horário escolhido.</small>
            </div>
            <label id="wf-bulk-program-check" class="wf-schedule-check wf-bulk-program-check" hidden>
              <input id="wf-bulk-program-enabled" type="checkbox">
              <span>Programar disparo em massa</span>
            </label>
            <div id="wf-bulk-schedule-options">
            <div class="wf-schedule-datetime">
              <div>
                <label class="wf-schedule-label" for="wf-schedule-date">Data</label>
                <input id="wf-schedule-date" type="date" lang="pt-BR" required>
              </div>
              <div>
                <label class="wf-schedule-label" for="wf-schedule-time">Hora</label>
                <input id="wf-schedule-time" type="time" required>
              </div>
            </div>
            <label class="wf-schedule-label" for="wf-schedule-repeat">Repetir</label>
            <select id="wf-schedule-repeat">
              <option value="none">Não repetir</option>
              <option value="hourly">A cada hora</option>
              <option value="daily">Todos os dias</option>
              <option value="weekly">Toda semana</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Todo mês</option>
              <option value="yearly">Todo ano</option>
              <option value="custom">Personalizado...</option>
            </select>
            <div id="wf-schedule-custom-repeat" class="wf-schedule-custom-repeat" hidden>
              <div>
                <label class="wf-schedule-label" for="wf-schedule-repeat-every">Repetir a cada</label>
                <input id="wf-schedule-repeat-every" type="number" min="1" step="1" value="1">
              </div>
              <div>
                <label class="wf-schedule-label" for="wf-schedule-repeat-unit">Unidade</label>
                <select id="wf-schedule-repeat-unit">
                  <option value="seconds">Segundo(s)</option>
                  <option value="minutes">Minuto(s)</option>
                  <option value="hours">Hora(s)</option>
                  <option value="days">Dia(s)</option>
                  <option value="weeks">Semana(s)</option>
                  <option value="months">Mês(es)</option>
                  <option value="years">Ano(s)</option>
                </select>
              </div>
            </div>
            <label id="wf-schedule-end-check" class="wf-schedule-check wf-schedule-end-check" hidden>
              <input id="wf-schedule-has-end" type="checkbox">
              <span>Data para encerrar</span>
            </label>
            <div id="wf-schedule-end-fields" class="wf-schedule-custom-repeat" hidden>
              <div>
                <label class="wf-schedule-label" for="wf-schedule-end-after">Encerrar após</label>
                <input id="wf-schedule-end-after" type="number" min="1" step="1" value="1">
              </div>
              <div>
                <label class="wf-schedule-label" for="wf-schedule-end-unit">Unidade</label>
                <select id="wf-schedule-end-unit">
                  <option value="hours">Hora(s)</option>
                  <option value="days">Dia(s)</option>
                  <option value="weeks">Semana(s)</option>
                  <option value="months">Mês(es)</option>
                </select>
              </div>
            </div>
            <label class="wf-schedule-check">
              <input id="wf-schedule-cancel-reply" type="checkbox">
              <span>Cancelar se o contato responder antes</span>
            </label>
            </div>
            <div class="wf-schedule-actions">
              <button id="wf-schedule-cancel-edit" type="button" hidden>Cancelar edição</button>
              <button id="wf-bulk-send-now" type="button" hidden>Enviar agora</button>
              <button id="wf-schedule-submit" type="submit">Programar mensagem</button>
            </div>
            <div id="wf-schedule-feedback" class="wf-chat-feedback"></div>
            <small class="wf-schedule-warning">O WhatsApp Web precisa estar aberto e conectado no horário do agendamento.</small>
          </form>
        </div>
        <div class="wf-chat-tab-panel" data-wf-chat-panel="scheduled" hidden>
          <div class="wf-scheduled-head">
            <strong>Agendamentos programados</strong>
            <div class="wf-scheduled-head-actions">
              <button id="wf-scheduled-export" class="wf-scheduled-file-button" type="button" title="Baixar mensagens programadas" aria-label="Baixar mensagens programadas">↓</button>
              <button id="wf-scheduled-import" class="wf-scheduled-file-button" type="button" title="Importar mensagens programadas" aria-label="Importar mensagens programadas">↑</button>
              <button id="wf-scheduled-new" type="button">+ Nova</button>
              <input id="wf-scheduled-import-file" type="file" accept="application/json,.json" hidden>
            </div>
          </div>
          <div id="wf-scheduled-transfer-feedback" class="wf-chat-feedback"></div>
          <div id="wf-scheduled-list" class="wf-scheduled-list"></div>
        </div>
        <div class="wf-chat-tab-panel" data-wf-chat-panel="messages" hidden>
          <div class="wf-message-template-head">
            <div>
              <strong>Mensagens rápidas</strong>
              <span>Crie textos reutilizáveis para seus agendamentos</span>
            </div>
          </div>
          <form id="wf-message-template-form" class="wf-message-template-form">
            <input id="wf-message-template-id" type="hidden">
            <div class="wf-message-template-row">
              <div>
                <label for="wf-message-template-shortcut">Atalho</label>
                <input id="wf-message-template-shortcut" maxlength="30" placeholder="/lembrar" required>
              </div>
            </div>
            <label for="wf-message-template-text">Mensagem</label>
            <textarea id="wf-message-template-text" rows="4" maxlength="4096"
              placeholder="Escreva a mensagem padrão" required></textarea>
            <div id="wf-message-template-feedback" class="wf-chat-feedback"></div>
            <div class="wf-message-template-actions">
              <button id="wf-message-template-cancel" type="button" hidden>Cancelar</button>
              <button type="submit">Salvar mensagem</button>
            </div>
          </form>
          <div id="wf-message-template-list" class="wf-message-template-list"></div>
        </div>
      </div>
      <button id="wf-chat-control-toggle" type="button" title="Controlar automação desta conversa" aria-label="Controlar fluxo">
        <span class="wf-chat-toggle-icon">⚡</span>
        <span id="wf-chat-control-badge" class="wf-chat-control-badge" hidden>0</span>
      </button>
    `;

    document.body.appendChild(root);

    const panel = root.querySelector("#wf-chat-control-panel");
    const toggle = root.querySelector("#wf-chat-control-toggle");
    const pauseButton = panel.querySelector("#wf-chat-pause");
    const advanceButton = panel.querySelector("#wf-chat-advance");
    const deleteFlowButton = panel.querySelector("#wf-chat-delete-flow");
    const flowSelect = panel.querySelector("#wf-chat-flow");
    const startButton = panel.querySelector("#wf-chat-start");
    const feedback = panel.querySelector("#wf-chat-feedback");
    const activeFlowLabel = panel.querySelector("#wf-active-flow-name");
    const currentFlowCard = panel.querySelector("#wf-current-flow-card");
    const activeFlowState = panel.querySelector("#wf-chat-flow-state");
    const chatStatusDot = panel.querySelector("#wf-chat-status-dot");
    const availableFlowCount = panel.querySelector("#wf-flow-available-count");
    const scheduleForm = panel.querySelector("#wf-schedule-form");
    const scheduleMessageFields = panel.querySelector("#wf-schedule-message-fields");
    const scheduleFlowFields = panel.querySelector("#wf-schedule-flow-fields");
    const scheduleFlow = panel.querySelector("#wf-schedule-flow");
    const saveScheduleTemplate = panel.querySelector("#wf-save-schedule-template");
    const scheduleTemplateList = panel.querySelector("#wf-schedule-template-list");
    const scheduleMessage = panel.querySelector("#wf-schedule-message");
    const messageSuggestions = panel.querySelector("#wf-message-suggestions");
    const scheduleVariations = panel.querySelector("#wf-schedule-variations");
    const addScheduleVariation = panel.querySelector("#wf-add-schedule-variation");
    const scheduleFile = panel.querySelector("#wf-schedule-file");
    const scheduleFileName = panel.querySelector("#wf-schedule-file-name");
    const scheduleDate = panel.querySelector("#wf-schedule-date");
    const scheduleTime = panel.querySelector("#wf-schedule-time");
    const scheduleRepeat = panel.querySelector("#wf-schedule-repeat");
    const scheduleCustomRepeat = panel.querySelector("#wf-schedule-custom-repeat");
    const scheduleRepeatEvery = panel.querySelector("#wf-schedule-repeat-every");
    const scheduleRepeatUnit = panel.querySelector("#wf-schedule-repeat-unit");
    const scheduleEndCheck = panel.querySelector("#wf-schedule-end-check");
    const scheduleHasEnd = panel.querySelector("#wf-schedule-has-end");
    const scheduleEndFields = panel.querySelector("#wf-schedule-end-fields");
    const scheduleEndAfter = panel.querySelector("#wf-schedule-end-after");
    const scheduleEndUnit = panel.querySelector("#wf-schedule-end-unit");
    const scheduleCancelReply = panel.querySelector("#wf-schedule-cancel-reply");
    const scheduleEditId = panel.querySelector("#wf-schedule-edit-id");
    const scheduleFeedback = panel.querySelector("#wf-schedule-feedback");
    const scheduleCancelEdit = panel.querySelector("#wf-schedule-cancel-edit");
    const bulkSendNow = panel.querySelector("#wf-bulk-send-now");
    const bulkProgramCheck = panel.querySelector("#wf-bulk-program-check");
    const bulkProgramEnabled = panel.querySelector("#wf-bulk-program-enabled");
    const bulkScheduleOptions = panel.querySelector("#wf-bulk-schedule-options");
    const scheduleSubmit = panel.querySelector("#wf-schedule-submit");
    const scheduledList = panel.querySelector("#wf-scheduled-list");
    const scheduledCount = panel.querySelector("#wf-scheduled-count");
    const scheduledExport = panel.querySelector("#wf-scheduled-export");
    const scheduledImport = panel.querySelector("#wf-scheduled-import");
    const scheduledImportFile = panel.querySelector("#wf-scheduled-import-file");
    const scheduledTransferFeedback = panel.querySelector("#wf-scheduled-transfer-feedback");
    const activeFlowCount = panel.querySelector("#wf-active-flow-count");
    const chatControlBadge = root.querySelector("#wf-chat-control-badge");
    const messageTemplateForm = panel.querySelector("#wf-message-template-form");
    const messageTemplateId = panel.querySelector("#wf-message-template-id");
    const messageTemplateShortcut = panel.querySelector("#wf-message-template-shortcut");
    const messageTemplateText = panel.querySelector("#wf-message-template-text");
    const messageTemplateFeedback = panel.querySelector("#wf-message-template-feedback");
    const messageTemplateCancel = panel.querySelector("#wf-message-template-cancel");
    const messageTemplateList = panel.querySelector("#wf-message-template-list");
    panel.classList.add("wf-chat-control-panel-portal");
    document.body.appendChild(panel);
    let activeChatId = "";
    let activeChatName = "";
    let editingScheduleVariantMedia = [];
    let scheduleKind = "message";
    let scheduleTemplates = [];
    let messageTemplates = [];
    let activeScheduleMessageField = scheduleMessage;
    let isPaused = false;
    let activeFlowName = "";
    let suppressToggleClick = false;
    let dragStartY = 0;
    let dragStartTop = 0;
    let draggingControl = false;
    let scheduledDispatchTimer = null;
    let chatBadgeSyncTimer = null;
    let chatBadgeSyncRunning = false;
    let chatBadgeInteractionTimer = null;
    let bulkScheduleTargets = [];
    let bulkScheduleColumnId = "";
    let bulkScheduleColumnName = "";
    let bulkScheduleAnchorRect = null;
    let chatControlDockObserver = null;
    let chatControlDockQueued = false;

    function dockChatControl() {
      chatControlDockQueued = false;
      const microphones = [...document.querySelectorAll('#main button[aria-label="Mensagem de voz"],#main button[aria-label="Voice message"]')];
      const microphone = microphones.find(button => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const microphoneWrapper = microphone?.parentElement?.parentElement;
      if (!microphoneWrapper?.parentElement) {
        root.classList.remove("wf-chat-control-docked");
        if (!root.isConnected) document.body.appendChild(root);
        return;
      }
      if (root.previousElementSibling !== microphoneWrapper || root.parentElement !== microphoneWrapper.parentElement) {
        microphoneWrapper.after(root);
      }
      root.classList.add("wf-chat-control-docked");
      root.classList.remove("panel-below", "is-dragging");
      root.style.removeProperty("top");
      root.style.removeProperty("bottom");
      root.style.removeProperty("right");
    }

    function queueChatControlDock() {
      if (chatControlDockQueued) return;
      chatControlDockQueued = true;
      requestAnimationFrame(dockChatControl);
    }

    function hasValidExtensionContext() {
      return runtimeContextValid();
    }

    function disposeInvalidExtensionContext() {
      if (scheduledDispatchTimer) {
        clearInterval(scheduledDispatchTimer);
        scheduledDispatchTimer = null;
      }
      if (chatBadgeSyncTimer) {
        clearInterval(chatBadgeSyncTimer);
        chatBadgeSyncTimer = null;
      }
      if (chatBadgeInteractionTimer) clearTimeout(chatBadgeInteractionTimer);
      if (healthTimer) {
        clearInterval(healthTimer);
        healthTimer = null;
      }
      if (fastRecoveryTimer) {
        clearTimeout(fastRecoveryTimer);
        fastRecoveryTimer = null;
      }
      chatControlDockObserver?.disconnect();
      document.removeEventListener("pointerup", queueChatBadgeSync, true);
      panel.remove();
      root.remove();
      scheduleRecoveryReload("extension-context", 250);
    }

    function positionChatControlPanel() {
      if (panel.hidden || !toggle.isConnected) return;
      if (panel.classList.contains("wf-bulk-mode") && bulkScheduleAnchorRect) {
        const panelWidth = panel.offsetWidth || 340;
        const panelHeight = panel.offsetHeight || 440;
        const gap = 8;
        const fitsRight = bulkScheduleAnchorRect.right + gap + panelWidth <= innerWidth - 8;
        const left = fitsRight
          ? bulkScheduleAnchorRect.right + gap
          : bulkScheduleAnchorRect.left - panelWidth - gap;
        panel.style.left = `${Math.max(8, Math.min(left, innerWidth - panelWidth - 8))}px`;
        panel.style.right = "auto";
        panel.style.top = `${Math.max(8, Math.min(bulkScheduleAnchorRect.top, innerHeight - panelHeight - 8))}px`;
        panel.style.bottom = "auto";
        return;
      }
      const rect = toggle.getBoundingClientRect();
      const panelWidth = panel.offsetWidth || 380;
      if (!rect.width || !rect.height) {
        panel.style.left = `${Math.max(8, (innerWidth - panelWidth) / 2)}px`;
        panel.style.right = "auto";
        panel.style.top = "70px";
        panel.style.bottom = "auto";
        return;
      }
      panel.style.left = `${Math.max(8, Math.min(rect.right - panelWidth, innerWidth - panelWidth - 8))}px`;
      panel.style.right = "auto";
      panel.style.top = "auto";
      panel.style.bottom = `${Math.max(8, innerHeight - rect.top + 8)}px`;
    }

    const escapeScheduleHtml = value => String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

    function normalizeMessageShortcut(value) {
      const normalized = String(value || "")
        .trim()
        .replace(/^\/+/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return normalized ? `/${normalized}` : "";
    }

    function resetMessageTemplateForm() {
      messageTemplateForm.reset();
      messageTemplateId.value = "";
      messageTemplateCancel.hidden = true;
      messageTemplateFeedback.textContent = "";
      messageTemplateForm.querySelector('button[type="submit"]').textContent = "Salvar mensagem";
    }

    function applyMessageTemplate(template, slashMatch = null, targetField = scheduleMessage) {
      if (!template) return;
      if (slashMatch) {
        const shortcutStart = slashMatch.index + String(slashMatch[1] || "").length;
        targetField.value =
          targetField.value.slice(0, shortcutStart) +
          template.text +
          targetField.value.slice(shortcutStart + slashMatch[0].length - String(slashMatch[1] || "").length);
      } else {
        targetField.value = template.text;
      }
      messageSuggestions.hidden = true;
      switchChatTab("schedule");
      targetField.focus();
      targetField.setSelectionRange(targetField.value.length, targetField.value.length);
    }

    function renderMessageSuggestions(event) {
      const targetField = event?.target?.matches?.("textarea")
        ? event.target
        : activeScheduleMessageField;
      activeScheduleMessageField = targetField || scheduleMessage;
      const suggestionHost = activeScheduleMessageField.closest(
        ".wf-schedule-message-wrap, .wf-schedule-variation"
      );
      if (suggestionHost && messageSuggestions.parentElement !== suggestionHost) {
        suggestionHost.appendChild(messageSuggestions);
      }
      const slashMatch = activeScheduleMessageField.value.match(/(^|\s)\/([^\s]*)$/);
      if (!slashMatch) {
        messageSuggestions.hidden = true;
        return;
      }
      const query = String(slashMatch[2] || "").toLowerCase();
      const matches = messageTemplates.filter(template =>
        template.shortcut.slice(1).toLowerCase().includes(query)
      ).slice(0, 8);
      if (!matches.length) {
        messageSuggestions.innerHTML = '<div class="wf-message-suggestion-empty">Nenhum atalho encontrado</div>';
        messageSuggestions.hidden = false;
        return;
      }
      messageSuggestions.innerHTML = matches.map(template => `
        <button type="button" data-message-suggestion="${template.id}">
          <span><strong>${escapeScheduleHtml(template.shortcut)}</strong></span>
          <em>${escapeScheduleHtml(template.text)}</em>
        </button>
      `).join("");
      messageSuggestions.hidden = false;
    }

    async function renderMessageTemplates() {
      if (!hasValidExtensionContext()) return;
      const stored = await chrome.storage.local.get("wfMessageTemplates");
      messageTemplates = (Array.isArray(stored.wfMessageTemplates) ? stored.wfMessageTemplates : [])
        .sort((a, b) => String(a.shortcut).localeCompare(String(b.shortcut), "pt-BR"));

      if (!messageTemplates.length) {
        messageTemplateList.innerHTML = `
          <div class="wf-message-template-empty">
            Nenhuma mensagem salva. Crie a primeira acima.
          </div>
        `;
        return;
      }

      messageTemplateList.innerHTML = messageTemplates.map(template => `
        <article class="wf-message-template-item" data-template-apply="${template.id}"
          title="Clique para usar esta mensagem">
          <div class="wf-message-template-item-head">
            <div>
              <strong>${escapeScheduleHtml(template.shortcut)}</strong>
            </div>
            <div class="wf-message-template-corner-actions">
              <button type="button" data-template-send="${template.id}"
                title="Enviar agora" aria-label="Enviar mensagem agora">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 9-18 9 3.2-7.5L15 12l-8.8-1.5L3 3z"/></svg>
              </button>
              <button type="button" data-template-edit="${template.id}"
                title="Editar mensagem" aria-label="Editar mensagem">✎</button>
              <button type="button" data-template-delete="${template.id}"
                title="Excluir mensagem" aria-label="Excluir mensagem">×</button>
            </div>
          </div>
          <p>${escapeScheduleHtml(template.text)}</p>
        </article>
      `).join("");
    }

    async function updateMenuBadges() {
      if (!hasValidExtensionContext()) return;
      try {
        const stored = await chrome.storage.local.get(["wfScheduledMessages", "wfRuntime"]);
        const messages = Array.isArray(stored.wfScheduledMessages)
          ? stored.wfScheduledMessages
          : [];
        const targetsActiveChat = item => Boolean(activeChatId && (
          item.chatId === activeChatId ||
          item.targetStates?.some(target => target.chatId === activeChatId) ||
          item.bulkTargets?.some(target => target.chatId === activeChatId)
        ));
        const pendingMessages = messages.filter(item =>
          targetsActiveChat(item) &&
          (item.status === "pending" || item.status === "sending")
        ).length;
        const activeFlows = stored.wfRuntime?.activeFlows || {};
        const currentChatFlowCount = activeChatId && activeFlows[activeChatId] ? 1 : 0;
        const total = pendingMessages + currentChatFlowCount;

        activeFlowCount.textContent = String(currentChatFlowCount);
        activeFlowCount.hidden = currentChatFlowCount === 0;
        activeFlowCount.title = currentChatFlowCount ? "1 fluxo ativo nesta conversa" : "";

      const activeChatHasFailure = messages.some(item =>
        targetsActiveChat(item) && (
          isScheduleFailure(item) || item.targetStates?.some(target => target.chatId === activeChatId && isScheduleFailure(target))
        )
      );
      chatControlBadge.textContent = activeChatHasFailure ? "x" : (total > 99 ? "99+" : String(total));
      chatControlBadge.hidden = !activeChatHasFailure && total === 0;
        chatControlBadge.title =
          `${pendingMessages} mensagem(ns) programada(s) e ${currentChatFlowCount} fluxo ativo nesta conversa`;
      } catch (error) {
        if (!String(error?.message || error).includes("Extension context invalidated")) {
          console.debug("[WA Flow] Não foi possível atualizar os indicadores.", error);
        }
      }
    }

    async function syncActiveChatBadges() {
      if (chatBadgeSyncRunning || !hasValidExtensionContext()) return;
      chatBadgeSyncRunning = true;
      try {
        const active = await command("GET_ACTIVE_CHAT", {}, 2000);
        const detectedChatId = String(active?.result?.chatId || "");
        if (detectedChatId !== activeChatId) {
          activeChatId = detectedChatId;
          activeChatName = String(active?.result?.name || "").trim();
          await renderScheduledMessages();
        }
        await updateMenuBadges();
      } catch (error) {
        if (!hasValidExtensionContext()) disposeInvalidExtensionContext();
      } finally {
        chatBadgeSyncRunning = false;
      }
    }

    function queueChatBadgeSync() {
      if (chatBadgeInteractionTimer) clearTimeout(chatBadgeInteractionTimer);
      chatBadgeInteractionTimer = setTimeout(syncActiveChatBadges, 120);
    }

    function switchChatTab(tabName) {
      panel.querySelectorAll("[data-wf-chat-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.wfChatTab === tabName);
      });
      panel.querySelectorAll("[data-wf-chat-panel]").forEach(tabPanel => {
        tabPanel.hidden = tabPanel.dataset.wfChatPanel !== tabName;
      });
    }

    function setScheduleKind(kind) {
      scheduleKind = kind === "flow" ? "flow" : "message";
      panel.querySelectorAll("[data-schedule-kind]").forEach(button => {
        const active = button.dataset.scheduleKind === scheduleKind;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      scheduleMessageFields.hidden = scheduleKind !== "message";
      scheduleFlowFields.hidden = scheduleKind !== "flow";
      addScheduleVariation.hidden = scheduleKind !== "message";
      messageSuggestions.hidden = true;
      panel.querySelector("#wf-schedule-submit").textContent = scheduleEditId.value
        ? "Salvar alterações"
        : scheduleKind === "flow" ? "Programar fluxo" : "Programar mensagem";
    }

    function setDefaultScheduleTime() {
      const date = new Date(Date.now() + 60 * 1000);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      scheduleDate.value = localDate.toISOString().slice(0, 10);
      scheduleTime.value = localDate.toISOString().slice(11, 16);
    }

    function formatTimeUntil(timestamp) {
      const difference = Number(timestamp) - Date.now();
      if (difference <= 0) return "Horário de envio atingido";
      const seconds = Math.ceil(difference / 1000);
      if (seconds < 60) return `Envia em ${seconds}s`;
      const minutes = Math.ceil(seconds / 60);
      if (minutes < 60) return `Envia em ${minutes} min`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours < 24) return `Envia em ${hours}h${remainingMinutes ? ` ${remainingMinutes}min` : ""}`;
      const days = Math.floor(hours / 24);
      return `Envia em ${days} ${days === 1 ? "dia" : "dias"}`;
    }

    function resetScheduleForm() {
      scheduleForm.reset();
      scheduleVariations.innerHTML = "";
      updateScheduleVariationChances();
      scheduleEditId.value = "";
      editingScheduleVariantMedia = [];
      updateScheduleFileName();
      scheduleCancelEdit.hidden = true;
      scheduleCustomRepeat.hidden = true;
      scheduleEndCheck.hidden = true;
      scheduleEndFields.hidden = true;
      setScheduleKind("message");
      scheduleFeedback.textContent = "";
      setDefaultScheduleTime();
    }

    function scheduleTextFields() {
      return [scheduleMessage, ...scheduleVariations.querySelectorAll("textarea")];
    }

    function scheduleVariantRows() {
      return [
        scheduleMessage.closest("[data-schedule-variant-row]"),
        ...scheduleVariations.querySelectorAll("[data-schedule-variant-row]")
      ].filter(Boolean);
    }

    function scheduleEndTimestamp(timestamp, amount, unit) {
      const end = new Date(timestamp);
      const value = Math.max(1, Math.floor(Number(amount) || 1));
      if (unit === "hours") end.setHours(end.getHours() + value);
      if (unit === "days") end.setDate(end.getDate() + value);
      if (unit === "weeks") end.setDate(end.getDate() + value * 7);
      if (unit === "months") end.setMonth(end.getMonth() + value);
      return end.getTime();
    }

    function updateScheduleVariationChances() {
      const fields = scheduleTextFields();
      addScheduleVariation.disabled = fields.length >= 5;
      addScheduleVariation.textContent = fields.length >= 5
        ? "Limite de 5 variações"
        : "+ Variação";
    }

    function addVariationField(value = "", media = null) {
      if (scheduleTextFields().length >= 5) return;
      const variantIndex = scheduleTextFields().length;
      const variation = document.createElement("div");
      variation.className = "wf-schedule-variation";
      variation.dataset.scheduleVariantRow = String(variantIndex);
      variation.innerHTML = `
        <label>Variação ${variantIndex + 1}</label>
        <textarea rows="3" maxlength="4096" placeholder="Digite outra versão ou use /atalho"></textarea>
        <button type="button" data-remove-schedule-variation title="Remover variação" aria-label="Remover variação">×</button>
        <div class="wf-schedule-variant-attachment">
          <label class="wf-schedule-file" title="Anexar imagem, vídeo, áudio ou documento">
            <input type="file" data-schedule-variant-file="${variantIndex}"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              aria-label="Anexar arquivo à variação ${variantIndex + 1}">
            <span aria-hidden="true">📎</span><span>Anexar</span>
          </label>
          <small class="wf-schedule-file-name" hidden></small>
          <button class="wf-schedule-file-remove" type="button" data-remove-schedule-file
            title="Remover anexo" aria-label="Remover anexo" hidden>×</button>
        </div>
      `;
      variation.querySelector("textarea").value = value;
      editingScheduleVariantMedia[variantIndex] = media || null;
      scheduleVariations.appendChild(variation);
      updateScheduleFileName(variation.querySelector("[data-schedule-variant-file]"));
      updateScheduleVariationChances();
    }

    async function renderScheduledMessages() {
      const { wfScheduledMessages = [] } = await chrome.storage.local.get("wfScheduledMessages");
      const visibleStoredMessages = wfScheduledMessages.filter(item =>
        item.status !== "cancelled" &&
        !(item.status === "sent" && (!item.repeat || item.repeat === "none"))
      );
      if (visibleStoredMessages.length !== wfScheduledMessages.length) {
        chrome.storage.local.set({ wfScheduledMessages: visibleStoredMessages }).catch(() => {});
      }
      const messages = visibleStoredMessages
        .filter(item => bulkScheduleColumnId
          ? item.bulkColumnId === bulkScheduleColumnId
          : (!Array.isArray(item.bulkTargets) && (!activeChatId || item.chatId === activeChatId)))
        .sort((a, b) => Number(a.scheduledAt) - Number(b.scheduledAt));
      const pendingCount = messages.filter((item) => item.status === "pending").length; const hasFailed = messages.some(isScheduleFailure); scheduledCount.textContent  = hasFailed ? "x" : String(pendingCount); scheduledCount.hidden = !hasFailed && pendingCount === 0;

      if (!messages.length) {
        scheduledList.innerHTML = `<div class="wf-scheduled-empty">Nenhuma mensagem ou fluxo programado para ${bulkScheduleColumnId ? "esta etapa" : "esta conversa"}.</div>`;
        return;
      }

      const repeatLabels = {
        hourly: "A cada hora", daily: "Diária", weekly: "Semanal",
        biweekly: "Quinzenal", monthly: "Mensal", yearly: "Anual"
      };
      const customUnitLabels = {
        seconds: ["segundo", "segundos"],
        minutes: ["minuto", "minutos"],
        hours: ["hora", "horas"],
        days: ["dia", "dias"],
        weeks: ["semana", "semanas"],
        months: ["mês", "meses"],
        years: ["ano", "anos"]
      };
      const statusLabels = {
        pending: "Programada", sending: "Enviando", sent: "Enviada",
        cancelled: "Cancelada", failed: "Falhou", skipped: "Ignorada",
        unconfirmed: "Confirmando envio"
      };
      scheduledList.innerHTML = messages.map(item => {
        const legacyTexts = Array.isArray(item.texts) && item.texts.length ? item.texts : [item.text || ""];
        const variants = (
          Array.isArray(item.variants) && item.variants.length
            ? item.variants
            : legacyTexts.map((text, index) => ({
                text,
                media: index === 0 ? item.media || null : null
              }))
        ).filter(variant => variant?.text || variant?.media?.dataUrl);
        const primaryVariant = variants[0] || { text: item.text || "", media: item.media || null };
        const hasVariations = variants.length > 1;
        return `
        <article class="wf-scheduled-item ${escapeScheduleHtml(item.status || "pending")}${hasVariations ? " has-variations" : ""}"
          ${hasVariations ? 'data-scheduled-expandable="true" role="button" tabindex="0" aria-expanded="false"' : ""}>
          <div class="wf-scheduled-item-head">
            <div>
              <time>${new Date(item.scheduledAt).toLocaleString("pt-BR", {
                dateStyle: "short", timeStyle: "short"
              })}</time>
              ${item.status === "pending"
                ? `<small class="wf-scheduled-countdown">${item.type === "flow"
                    ? formatTimeUntil(item.scheduledAt).replace("Envia", "Inicia")
                    : formatTimeUntil(item.scheduledAt)}</small>`
                : ""}
            </div>
            <span>${statusLabels[item.status] || item.status}</span>
          </div>
          ${item.type === "flow"
            ? `<div class="wf-scheduled-flow-name"><small>Fluxo programado</small><strong>⚡ ${escapeScheduleHtml(item.flowName || "Fluxo")}</strong></div>`
            : primaryVariant.text ? `<p>${escapeScheduleHtml(primaryVariant.text)}</p>` : ""}
          ${Array.isArray(item.bulkTargets) ? `<div class="wf-scheduled-bulk-targets">${item.bulkTargets.length} contatos · ${escapeScheduleHtml(item.bulkColumnName || "Etapa")}</div>` : ""}
          ${hasVariations
            ? `<div class="wf-scheduled-variations">${variants.length} variações possíveis <span aria-hidden="true">⌄</span></div>
               <div class="wf-scheduled-variation-list" hidden>
                 <strong>Outras variações</strong>
                 ${variants.slice(1).map((variant, index) => `
                   <div>
                     <small>Variação ${index + 2}</small>
                     ${variant.text ? `<p>${escapeScheduleHtml(variant.text)}</p>` : ""}
                     ${variant.media ? `<span class="wf-scheduled-file">📎 ${escapeScheduleHtml(variant.media.fileName)}</span>` : ""}
                   </div>
                 `).join("")}
               </div>`
            : ""}
          ${primaryVariant.media ? `<div class="wf-scheduled-file">📎 ${escapeScheduleHtml(primaryVariant.media.fileName)}</div>` : ""}
          <div class="wf-scheduled-meta">
            <span>${
              item.repeat === "custom"
                ? `A cada ${Number(item.repeatEvery) || 1} ${
                    (customUnitLabels[item.repeatUnit] || ["intervalo", "intervalos"])[
                      (Number(item.repeatEvery) || 1) === 1 ? 0 : 1
                    ]
                  }`
                : repeatLabels[item.repeat] || "Uma vez"
            }${item.endsAt ? ` · encerra em ${new Date(item.endsAt).toLocaleString("pt-BR", {
              dateStyle: "short", timeStyle: "short"
            })}` : ""}${item.cancelIfReply ? " · cancela ao responder" : ""}</span>
            <div>
              ${item.status === "pending" ? `
                <button type="button" data-schedule-send-now="${item.id}">Enviar</button>
                <button type="button" data-schedule-edit="${item.id}">Editar</button>
                <button type="button" data-schedule-delete="${item.id}">Excluir</button>
              ` : ["failed", "skipped", "unconfirmed"].includes(item.status) ? `
                <button type="button" data-schedule-retry="${item.id}">Tentar novamente</button>
                  <button type="button" data-schedule-edit="${item.id}">Editar</button>
                <button type="button" data-schedule-delete="${item.id}">Excluir</button>
              ` : ""}
            </div>
          </div>
          ${item.error ? `<small class="wf-scheduled-error">${escapeScheduleHtml(item.error)}</small>` : ""}
        </article>
      `;
      }).join("");
    }

    function clampControlTop(value) {
      const margin = 8;
      const height = toggle.offsetHeight || 48;
      return Math.max(margin, Math.min(Number(value) || margin, window.innerHeight - height - margin));
    }

    function positionChatControl(value, persist = false) {
      const top = clampControlTop(value);
      root.style.top = `${top}px`;
      root.style.bottom = "auto";
      root.classList.toggle("panel-below", top < 350);
      if (persist) {
        chrome.storage.local.set({ wfChatControlTop: top }).catch(() => {});
      }
    }

    chrome.storage.local.get("wfChatControlTop")
      .then(stored => {
        if (Number.isFinite(Number(stored.wfChatControlTop))) {
          positionChatControl(Number(stored.wfChatControlTop));
        }
      })
      .catch(() => {});

    toggle.addEventListener("pointerdown", event => {
      if (root.classList.contains("wf-chat-control-docked")) return;
      if (event.button !== undefined && event.button !== 0) return;
      const rect = root.getBoundingClientRect();
      dragStartY = event.clientY;
      dragStartTop = rect.top;
      draggingControl = true;
      toggle.setPointerCapture?.(event.pointerId);
      root.classList.add("is-dragging");
    });

    toggle.addEventListener("pointermove", event => {
      if (root.classList.contains("wf-chat-control-docked")) return;
      if (!draggingControl) return;
      const delta = event.clientY - dragStartY;
      if (Math.abs(delta) > 4) suppressToggleClick = true;
      positionChatControl(dragStartTop + delta);
    });

    const finishControlDrag = event => {
      if (!draggingControl) return;
      draggingControl = false;
      root.classList.remove("is-dragging");
      toggle.releasePointerCapture?.(event.pointerId);
      if (suppressToggleClick) {
        positionChatControl(root.getBoundingClientRect().top, true);
        setTimeout(() => {
          suppressToggleClick = false;
        }, 0);
      }
    };

    toggle.addEventListener("pointerup", finishControlDrag);
    toggle.addEventListener("pointercancel", finishControlDrag);
    window.addEventListener("resize", () => {
      queueChatControlDock();
      positionChatControlPanel();
      if (root.classList.contains("wf-chat-control-docked")) return;
      if (root.style.top) positionChatControl(root.getBoundingClientRect().top, true);
    });

    function updatePauseButton() {
      currentFlowCard.hidden = !activeFlowName;
      activeFlowLabel.textContent = activeFlowName || "Nenhum fluxo em execução";
      pauseButton.querySelector(".wf-pause-icon").textContent = isPaused ? "▶" : "⏸";
      pauseButton.querySelector(".wf-pause-label").textContent = isPaused ? "Retomar" : "Pausar";
      pauseButton.classList.toggle("is-paused", isPaused);
      chatStatusDot.classList.toggle("active", Boolean(activeFlowName) && !isPaused);
      chatStatusDot.classList.toggle("paused", isPaused);
      activeFlowState.textContent = isPaused
        ? "Pausada somente para este contato"
        : activeFlowName
          ? "Fluxo em andamento"
          : "Pronta para iniciar um fluxo";
      pauseButton.setAttribute(
        "aria-label",
        isPaused ? "Retomar neste contato" : "Pausar neste contato"
      );
      pauseButton.title = isPaused ? "Retomar neste contato" : "Pausar neste contato";
      deleteFlowButton.disabled = !activeFlowName;
      advanceButton.disabled = !activeFlowName;
    }

    function populateScheduleFlowOptions(flows) {
      const availableFlows = Array.isArray(flows) ? flows : [];
      const selectedFlowId = scheduleFlow.value;
      scheduleFlow.innerHTML = '<option value="">Selecione um fluxo</option>';
      availableFlows.forEach(flow => {
        const option = document.createElement("option");
        option.value = flow.id;
        option.textContent = `${flow.name || "Fluxo sem nome"}${flow.enabled ? "" : " (inativo)"}`;
        scheduleFlow.appendChild(option);
      });
      scheduleFlow.disabled = availableFlows.length === 0;
      if (availableFlows.some(flow => String(flow.id) === String(selectedFlowId))) {
        scheduleFlow.value = selectedFlowId;
      }
    }

    async function refreshPanel() {
      feedback.textContent = "Identificando conversa...";
      pauseButton.disabled = true;
      startButton.disabled = true;

      try {
        const stored = await chrome.storage.local.get(["wfFlows", "wfRuntime"]);
        const flows = stored.wfFlows || [];
        flowSelect.innerHTML = '<option value="">Selecione um fluxo</option>';
        flows.forEach(flow => {
          const option = document.createElement("option");
          option.value = flow.id;
          option.textContent = `${flow.name || "Fluxo sem nome"}${flow.enabled ? "" : " (inativo)"}`;
          flowSelect.appendChild(option);
        });
        populateScheduleFlowOptions(flows);
        availableFlowCount.textContent = `${flows.length} ${flows.length === 1 ? "disponível" : "disponíveis"}`;
        flowSelect.disabled = flows.length === 0;

        try {
          let active = null;
          let lastError = null;
          for (let attempt = 0; attempt < 3 && !active; attempt++) {
            try {
              active = await command("GET_ACTIVE_CHAT", {}, 5000);
            } catch (error) {
              lastError = error;
              if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          if (!active) throw lastError || new Error("Conversa não identificada.");

          activeChatId = active.result.chatId;
          activeChatName = String(
            active.result.name ||
            document.querySelector('#main header span[title]')?.getAttribute("title") ||
            document.querySelector('#main header [dir="auto"]')?.textContent ||
            activeChatId.replace(/@.+$/, "")
          ).trim();
          isPaused = Number(stored.wfRuntime?.pausedUntil?.[activeChatId] || 0) > Date.now();
          activeFlowName = stored.wfRuntime?.activeFlows?.[activeChatId]?.name || "";
          feedback.textContent = flows.length === 0
            ? "Nenhum fluxo disponível."
            : isPaused
              ? "Automação pausada somente para esta conversa."
              : "";
        } catch (chatError) {
          activeChatId = "";
          activeChatName = "";
          activeFlowName = "";
          isPaused = false;
          feedback.textContent = flows.length
            ? "Os fluxos estão disponíveis, mas a conversa ainda não foi identificada. Feche e abra este painel para tentar novamente."
            : "Nenhum fluxo disponível.";
          console.debug("[WA Flow] Conversa ativa ainda não identificada:", chatError);
        }

        pauseButton.disabled = flows.length === 0 || !activeChatId;
        pauseButton.classList.toggle("no-active-flow", flows.length === 0);
        updatePauseButton();
        startButton.disabled = !activeChatId || !flowSelect.value;
        await renderScheduledMessages();
        await updateMenuBadges();
      } catch (error) {
        activeChatId = "";
        activeFlowName = "";
        availableFlowCount.textContent = "Erro ao carregar";
        flowSelect.innerHTML = '<option value="">Não foi possível carregar os fluxos</option>';
        flowSelect.disabled = true;
        updatePauseButton();
        feedback.textContent = error?.message || String(error);
      }
    }

    toggle.addEventListener("click", () => {
      if (suppressToggleClick) return;
      panel.hidden = !panel.hidden;
      if (panel.hidden) bulkScheduleTargets = [];
      if (!panel.hidden) {
        bulkScheduleTargets = [];
        bulkScheduleColumnId = "";
        bulkScheduleColumnName = "";
        bulkScheduleAnchorRect = null;
        panel.classList.remove("wf-bulk-mode");
        bulkSendNow.hidden = true;
        bulkProgramCheck.hidden = true;
        bulkScheduleOptions.hidden = false;
        scheduleSubmit.hidden = false;
        positionChatControlPanel();
        switchChatTab("schedule");
        if (!scheduleDate.value) setDefaultScheduleTime();
        refreshPanel();
      }
    });

    document.addEventListener("pointerdown", event => {
      if (panel.hidden || root.contains(event.target) || panel.contains(event.target)) return;
      panel.hidden = true;
      bulkScheduleTargets = [];
      bulkScheduleColumnId = "";
      bulkScheduleColumnName = "";
      bulkScheduleAnchorRect = null;
      panel.classList.remove("wf-bulk-mode");
      bulkSendNow.hidden = true;
      bulkProgramCheck.hidden = true;
      bulkScheduleOptions.hidden = false;
      scheduleSubmit.hidden = false;
      messageSuggestions.hidden = true;
    }, true);

    window.addEventListener("WF_OPEN_BULK_SCHEDULE", async event => {
      const targets = Array.isArray(event.detail?.targets) ? event.detail.targets.filter(item => item?.chatId) : [];
      if (!targets.length) return;
      bulkScheduleTargets = targets;
      bulkScheduleColumnId = String(event.detail?.columnId || "");
      bulkScheduleColumnName = String(event.detail?.columnName || "Etapa");
      const anchor = event.detail?.anchorRect;
      bulkScheduleAnchorRect = anchor && Number.isFinite(Number(anchor.left)) ? {
        left: Number(anchor.left),
        right: Number(anchor.right),
        top: Number(anchor.top),
        bottom: Number(anchor.bottom),
        width: Number(anchor.width),
        height: Number(anchor.height)
      } : null;
      panel.classList.add("wf-bulk-mode");
      bulkSendNow.hidden = false;
      bulkProgramCheck.hidden = false;
      bulkProgramEnabled.checked = false;
      bulkScheduleOptions.hidden = true;
      scheduleSubmit.hidden = true;
      resetScheduleForm();
      setDefaultScheduleTime();
      switchChatTab("schedule");
      panel.hidden = false;
      positionChatControlPanel();
      try {
        const { wfFlows = [] } = await chrome.storage.local.get("wfFlows");
        populateScheduleFlowOptions(wfFlows);
        scheduleFeedback.textContent = `Disparo em massa para ${targets.length} contato${targets.length === 1 ? "" : "s"} da etapa ${event.detail?.columnName || "selecionada"}.`;
        positionChatControlPanel();
      } catch (error) {
        populateScheduleFlowOptions([]);
        scheduleFeedback.textContent = "Não foi possível carregar os fluxos salvos.";
        console.error("[WA Flow] Falha ao carregar fluxos para o disparo em massa:", error);
      }
    });

    bulkProgramEnabled.addEventListener("change", () => {
      const enabled = bulkProgramEnabled.checked;
      bulkScheduleOptions.hidden = !enabled;
      scheduleSubmit.hidden = !enabled;
      bulkSendNow.hidden = enabled;
      if (enabled && !scheduleDate.value) setDefaultScheduleTime();
    });

    bulkSendNow.addEventListener("click", async () => {
      const targets = [...bulkScheduleTargets];
      if (!targets.length || bulkSendNow.disabled) return;
      let variants = [];
      try {
        variants = scheduleKind === "message" ? await collectScheduleVariants() : [];
      } catch (error) {
        scheduleFeedback.textContent = error?.message || "Não foi possível ler o arquivo.";
        return;
      }
      if (
        scheduleKind === "message" &&
        variants.length > 1 &&
        variants.some(variant => !variant.text && !variant.media?.dataUrl)
      ) {
        scheduleFeedback.textContent = "Preencha o texto, anexe um arquivo ou remova a variação vazia.";
        return;
      }
      variants = variants.filter(variant => variant.text || variant.media?.dataUrl);
      const texts = variants.map(variant => variant.text);
      if (scheduleKind === "message" && !variants.length) {
        scheduleFeedback.textContent = "Digite uma mensagem ou adicione um arquivo.";
        return;
      }
      if (scheduleKind === "flow" && !scheduleFlow.value) {
        scheduleFeedback.textContent = "Selecione o fluxo que será iniciado.";
        return;
      }
      if (!confirm(`Enviar agora para ${targets.length} contato${targets.length === 1 ? "" : "s"}?`)) return;
      bulkSendNow.disabled = true;
      try {
        const media = scheduleKind === "message" ? variants[0]?.media || null : null;
        const now = Date.now();
        const id = crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`;
        const flowName = scheduleFlow.selectedOptions[0]?.textContent || "Fluxo";
        const item = {
          id,
          chatId: "",
          chatName: bulkScheduleColumnName || "Etapa",
          bulkTargets: targets.map(target => ({ chatId: target.chatId, chatName: target.chatName || "Contato" })),
          targetStates: targets.map(target => ({
            chatId: target.chatId,
            chatName: target.chatName || "Contato",
            status: "pending",
            error: "",
            updatedAt: now
          })),
          bulkColumnId: bulkScheduleColumnId,
          bulkColumnName: bulkScheduleColumnName || "Etapa",
          type: scheduleKind,
          flowId: scheduleKind === "flow" ? scheduleFlow.value : "",
          flowName: scheduleKind === "flow" ? flowName : "",
          text: texts[0] || "",
          texts,
          media,
          variants,
          scheduledAt: now,
          recurrenceAnchorAt: now,
          repeat: "none",
          repeatEvery: 1,
          repeatUnit: "",
          endsAt: 0,
          cancelIfReply: false,
          status: "pending",
          createdAt: now,
          updatedAt: now
        };
        const stored = await chrome.storage.local.get("wfScheduledMessages");
        const queue = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];
        queue.push(item);
        await chrome.storage.local.set({ wfScheduledMessages: queue });
        scheduleFeedback.textContent = `Enviando para ${targets.length} contato${targets.length === 1 ? "" : "s"}...`;
        await safelyDispatchScheduledMessages();
        const finished = await chrome.storage.local.get("wfScheduledMessages");
        const resultItem = (Array.isArray(finished.wfScheduledMessages) ? finished.wfScheduledMessages : [])
          .find(candidate => candidate.id === id);
        const failedCount = resultItem?.targetStates?.filter(isScheduleFailure).length || 0;
        if (failedCount) {
          scheduleFeedback.textContent = `${targets.length - failedCount} enviado${targets.length - failedCount === 1 ? "" : "s"}; ${failedCount} falha${failedCount === 1 ? "" : "s"} registrada${failedCount === 1 ? "" : "s"}.`;
        } else {
          scheduleFeedback.textContent = `Disparo concluído para ${targets.length} contato${targets.length === 1 ? "" : "s"}.`;
        }
      } catch (error) {
        scheduleFeedback.textContent = error?.message || "Não foi possível concluir o disparo.";
      } finally {
        bulkSendNow.disabled = false;
      }
    });

    panel.querySelectorAll("[data-wf-chat-tab]").forEach(button => {
      button.addEventListener("click", () => {
        switchChatTab(button.dataset.wfChatTab);
        if (button.dataset.wfChatTab === "scheduled") renderScheduledMessages();
        if (button.dataset.wfChatTab === "schedule" && !scheduleDate.value) setDefaultScheduleTime();
        if (button.dataset.wfChatTab === "messages") renderMessageTemplates();
      });
    });

    panel.querySelectorAll("[data-schedule-kind]").forEach(button => {
      button.addEventListener("click", () => setScheduleKind(button.dataset.scheduleKind));
    });

    scheduleMessage.addEventListener("input", renderMessageSuggestions);
    scheduleMessage.addEventListener("keydown", event => {
      if (event.key === "Escape") messageSuggestions.hidden = true;
    });
    panel.addEventListener("click", event => {
      if (!event.target.closest(".wf-schedule-message-wrap, .wf-schedule-variation")) {
        messageSuggestions.hidden = true;
      }
    });

    addScheduleVariation.addEventListener("click", () => {
      addVariationField();
      scheduleVariations.lastElementChild?.querySelector("textarea")?.focus();
    });

    scheduleVariations.addEventListener("click", event => {
      const removeButton = event.target.closest("[data-remove-schedule-variation]");
      if (!removeButton) return;
      const removedVariation = removeButton.closest(".wf-schedule-variation");
      const removedIndex = Math.max(1, Number(removedVariation?.dataset.scheduleVariantRow) || 1);
      editingScheduleVariantMedia.splice(removedIndex, 1);
      removedVariation?.remove();
      [...scheduleVariations.querySelectorAll(".wf-schedule-variation")].forEach((variation, index) => {
        const variantIndex = index + 1;
        variation.dataset.scheduleVariantRow = String(variantIndex);
        variation.querySelector(":scope > label").textContent = `Variação ${variantIndex + 1}`;
        const fileInput = variation.querySelector("[data-schedule-variant-file]");
        fileInput.dataset.scheduleVariantFile = String(variantIndex);
        fileInput.setAttribute("aria-label", `Anexar arquivo à variação ${variantIndex + 1}`);
      });
      updateScheduleVariationChances();
    });

    scheduleVariations.addEventListener("input", event => {
      if (event.target.matches("textarea")) renderMessageSuggestions(event);
    });

    scheduleVariations.addEventListener("keydown", event => {
      if (event.target.matches("textarea") && event.key === "Escape") {
        messageSuggestions.hidden = true;
      }
    });

    messageSuggestions.addEventListener("click", event => {
      const button = event.target.closest("[data-message-suggestion]");
      if (!button) return;
      const template = messageTemplates.find(item => item.id === button.dataset.messageSuggestion);
      const targetField = activeScheduleMessageField || scheduleMessage;
      const slashMatch = targetField.value.match(/(^|\s)\/([^\s]*)$/);
      applyMessageTemplate(template, slashMatch, targetField);
    });

    messageTemplateShortcut.addEventListener("blur", () => {
      messageTemplateShortcut.value = normalizeMessageShortcut(messageTemplateShortcut.value);
    });

    messageTemplateCancel.addEventListener("click", resetMessageTemplateForm);

    messageTemplateForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!hasValidExtensionContext()) {
        disposeInvalidExtensionContext();
        return;
      }
      const shortcut = normalizeMessageShortcut(messageTemplateShortcut.value);
      const text = messageTemplateText.value.trim();
      if (!shortcut || !text) {
        messageTemplateFeedback.textContent = "Preencha o atalho e a mensagem.";
        return;
      }

      const stored = await chrome.storage.local.get("wfMessageTemplates");
      const templates = Array.isArray(stored.wfMessageTemplates) ? stored.wfMessageTemplates : [];
      const editingId = messageTemplateId.value;
      const duplicate = templates.find(template =>
        template.shortcut === shortcut && template.id !== editingId
      );
      if (duplicate) {
        messageTemplateFeedback.textContent = `O atalho ${shortcut} já está sendo usado.`;
        return;
      }

      const template = {
        id: editingId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        name: shortcut,
        shortcut,
        text,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const existingIndex = templates.findIndex(item => item.id === editingId);
      if (existingIndex >= 0) {
        template.createdAt = templates[existingIndex].createdAt || template.createdAt;
        templates.splice(existingIndex, 1, template);
      } else {
        templates.push(template);
      }
      await chrome.storage.local.set({ wfMessageTemplates: templates });
      resetMessageTemplateForm();
      renderMessageTemplates();
    });

    messageTemplateList.addEventListener("click", async event => {
      const applyButton = event.target.closest("[data-template-apply]");
      const editButton = event.target.closest("[data-template-edit]");
      const sendButton = event.target.closest("[data-template-send]");
      const deleteButton = event.target.closest("[data-template-delete]");
      const templateId =
        editButton?.dataset.templateEdit ||
        sendButton?.dataset.templateSend ||
        deleteButton?.dataset.templateDelete ||
        applyButton?.dataset.templateApply;
      const template = messageTemplates.find(item => item.id === templateId);
      if (!template) return;

      if (editButton) {
        messageTemplateId.value = template.id;
        messageTemplateShortcut.value = template.shortcut;
        messageTemplateText.value = template.text;
        messageTemplateCancel.hidden = false;
        messageTemplateForm.querySelector('button[type="submit"]').textContent = "Salvar alterações";
        messageTemplateShortcut.focus();
        return;
      }

      if (deleteButton) {
        if (confirm(`Excluir a mensagem rápida “${template.shortcut}”?`)) {
          await chrome.storage.local.set({
            wfMessageTemplates: messageTemplates.filter(item => item.id !== template.id)
          });
          renderMessageTemplates();
        }
        return;
      }

      if (sendButton) {
        messageTemplateFeedback.textContent = "Enviando...";
        try {
          const active = await command("GET_ACTIVE_CHAT", {}, 8000);
          const chatId = String(active?.result?.chatId || "");
          if (!chatId) throw new Error("Abra uma conversa antes de enviar.");
          await command("SEND_TEXT", {
            chatId,
            text: template.text,
            linkPreview: true
          }, 45000);
          messageTemplateFeedback.textContent = `Mensagem ${template.shortcut} enviada.`;
        } catch (error) {
          messageTemplateFeedback.textContent = error?.message || "Não foi possível enviar a mensagem.";
        }
        return;
      }

      if (applyButton) {
        applyMessageTemplate(template);
      }
    });

    function scheduledMessageMatchesCurrentContext(item) {
      if (bulkScheduleColumnId) return item?.bulkColumnId === bulkScheduleColumnId;
      return Boolean(activeChatId)
        && !Array.isArray(item?.bulkTargets)
        && item?.chatId === activeChatId;
    }

    function scheduledMessageFingerprint(item) {
      return JSON.stringify({
        chatId: item?.chatId || "",
        bulkColumnId: item?.bulkColumnId || "",
        bulkTargets: Array.isArray(item?.bulkTargets)
          ? item.bulkTargets.map(target => target?.chatId || "").sort()
          : [],
        type: item?.type || "",
        flowId: item?.flowId || "",
        flowName: item?.flowName || "",
        text: item?.text || "",
        texts: Array.isArray(item?.texts) ? item.texts : [],
        media: item?.media || null,
        variants: Array.isArray(item?.variants) ? item.variants : [],
        scheduledAt: Number(item?.scheduledAt) || 0,
        repeat: item?.repeat || "none",
        repeatEvery: Number(item?.repeatEvery) || 1,
        repeatUnit: item?.repeatUnit || "",
        endAfter: Number(item?.endAfter) || 0,
        endUnit: item?.endUnit || "",
        cancelIfReply: Boolean(item?.cancelIfReply)
      });
    }

    function setScheduledTransferFeedback(message) {
      scheduledTransferFeedback.textContent = message || "";
    }

    scheduledExport.addEventListener("click", async () => {
      setScheduledTransferFeedback("");
      if (!bulkScheduleColumnId && !activeChatId) {
        setScheduledTransferFeedback("Abra uma conversa antes de baixar os agendamentos.");
        return;
      }

      try {
        const { wfScheduledMessages = [] } = await chrome.storage.local.get("wfScheduledMessages");
        const messages = wfScheduledMessages.filter(item =>
          item.status !== "cancelled"
          && !(item.status === "sent" && (!item.repeat || item.repeat === "none"))
          && scheduledMessageMatchesCurrentContext(item)
        );

        if (!messages.length) {
          setScheduledTransferFeedback("Não há mensagens programadas nesta conversa para baixar.");
          return;
        }

        const sourceName = bulkScheduleColumnId
          ? (bulkScheduleColumnName || "etapa")
          : (activeChatName || "conversa");
        const safeName = String(sourceName)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "conversa";
        const payload = {
          format: "whatsflow-scheduled-messages",
          version: 1,
          exportedAt: new Date().toISOString(),
          source: bulkScheduleColumnId
            ? {
                scope: "bulk-column",
                bulkColumnId: bulkScheduleColumnId,
                bulkColumnName: bulkScheduleColumnName || ""
              }
            : {
                scope: "chat",
                chatId: activeChatId,
                chatName: activeChatName || ""
              },
          messages
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `whatsflow-agendamentos-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setScheduledTransferFeedback(`${messages.length} agendamento(s) baixado(s).`);
      } catch (error) {
        setScheduledTransferFeedback(error?.message || "Não foi possível baixar os agendamentos.");
      }
    });

    scheduledImport.addEventListener("click", () => {
      setScheduledTransferFeedback("");
      scheduledImportFile.value = "";
      scheduledImportFile.click();
    });

    scheduledImportFile.addEventListener("change", async () => {
      const file = scheduledImportFile.files?.[0];
      if (!file) return;

      try {
        const importedFile = JSON.parse(await file.text());
        if (
          importedFile?.format !== "whatsflow-scheduled-messages"
          || importedFile?.version !== 1
          || !Array.isArray(importedFile?.messages)
        ) {
          throw new Error("Arquivo de agendamentos inválido.");
        }

        if (importedFile.source?.scope === "chat") {
          if (!activeChatId || importedFile.source.chatId !== activeChatId) {
            throw new Error("Este arquivo pertence a outra conversa.");
          }
        } else if (importedFile.source?.scope === "bulk-column") {
          if (!bulkScheduleColumnId || importedFile.source.bulkColumnId !== bulkScheduleColumnId) {
            throw new Error("Este arquivo pertence a outra etapa.");
          }
        } else {
          throw new Error("O arquivo não informa a conversa de origem.");
        }

        const importedMessages = importedFile.messages.filter(item =>
          item
          && typeof item === "object"
          && typeof item.id === "string"
          && item.id
          && Number.isFinite(Number(item.scheduledAt))
          && scheduledMessageMatchesCurrentContext(item)
        );
        if (importedMessages.length !== importedFile.messages.length) {
          throw new Error("O arquivo contém agendamentos inválidos ou de outra conversa.");
        }

        const stored = await chrome.storage.local.get("wfScheduledMessages");
        const existing = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];
        const existingIds = new Set(existing.map(item => String(item?.id || "")).filter(Boolean));
        const existingFingerprints = new Set(existing.map(scheduledMessageFingerprint));
        const additions = [];
        let skipped = 0;

        importedMessages.forEach(item => {
          const fingerprint = scheduledMessageFingerprint(item);
          if (existingIds.has(item.id) || existingFingerprints.has(fingerprint)) {
            skipped += 1;
            return;
          }
          additions.push(item);
          existingIds.add(item.id);
          existingFingerprints.add(fingerprint);
        });

        if (additions.length) {
          await chrome.storage.local.set({
            wfScheduledMessages: [...existing, ...additions]
          });
          await renderScheduledMessages();
        }

        if (!additions.length) {
          setScheduledTransferFeedback(`Nenhum agendamento novo foi importado (${skipped} já existia(m)).`);
        } else {
          setScheduledTransferFeedback(
            `${additions.length} agendamento(s) importado(s)${skipped ? `; ${skipped} duplicado(s) ignorado(s).` : "."}`
          );
        }
      } catch (error) {
        setScheduledTransferFeedback(error?.message || "Não foi possível importar os agendamentos.");
      } finally {
        scheduledImportFile.value = "";
      }
    });

    panel.querySelector("#wf-scheduled-new").addEventListener("click", () => {
      resetScheduleForm();
      switchChatTab("schedule");
      scheduleMessage.focus();
    });

    scheduleCancelEdit.addEventListener("click", resetScheduleForm);

    scheduleRepeat.addEventListener("change", () => {
      scheduleCustomRepeat.hidden = scheduleRepeat.value !== "custom";
      const recurring = scheduleRepeat.value !== "none";
      scheduleEndCheck.hidden = !recurring;
      if (!recurring) {
        scheduleHasEnd.checked = false;
        scheduleEndFields.hidden = true;
      }
      if (!scheduleCustomRepeat.hidden) scheduleRepeatEvery.focus();
    });

    scheduleHasEnd.addEventListener("change", () => {
      scheduleEndFields.hidden = !scheduleHasEnd.checked;
      if (scheduleHasEnd.checked) scheduleEndAfter.focus();
    });

    function updateScheduleFileName(fileInput = scheduleFile) {
      if (!fileInput) return;
      const variantIndex = Math.max(0, Number(fileInput.dataset.scheduleVariantFile) || 0);
      const row = fileInput.closest("[data-schedule-variant-row]");
      const nameElement = row?.querySelector(".wf-schedule-file-name") || scheduleFileName;
      const removeButton = row?.querySelector("[data-remove-schedule-file]");
      const name = fileInput.files?.[0]?.name || editingScheduleVariantMedia[variantIndex]?.fileName || "";
      nameElement.textContent = name;
      nameElement.title = name;
      nameElement.hidden = !name;
      if (removeButton) removeButton.hidden = !name;
    }

    scheduleMessageFields.addEventListener("change", event => {
      if (event.target.matches("[data-schedule-variant-file]")) {
        updateScheduleFileName(event.target);
      }
    });

    scheduleMessageFields.addEventListener("click", event => {
      const removeButton = event.target.closest("[data-remove-schedule-file]");
      if (!removeButton) return;
      const row = removeButton.closest("[data-schedule-variant-row]");
      const fileInput = row?.querySelector("[data-schedule-variant-file]");
      if (!fileInput) return;
      const variantIndex = Math.max(0, Number(fileInput.dataset.scheduleVariantFile) || 0);
      fileInput.value = "";
      editingScheduleVariantMedia[variantIndex] = null;
      updateScheduleFileName(fileInput);
    });

    async function scheduleMediaFileFromStored(media) {
      const response = await fetch(media.dataUrl);
      const blob = await response.blob();
      return new File([blob], media.fileName || "audio", {
        type: media.mimeType || blob.type || "application/octet-stream",
        lastModified: Date.now()
      });
    }

    async function readScheduleFile(file, fallbackMedia = null) {
      if (!file && !fallbackMedia?.dataUrl) return null;
      if (
        !file &&
        fallbackMedia?.isPtt === true &&
        String(fallbackMedia.mimeType || "").toLowerCase() === "audio/ogg"
      ) {
        return fallbackMedia;
      }

      let preparedFile = file || await scheduleMediaFileFromStored(fallbackMedia);
      if (preparedFile.size > 15 * 1024 * 1024) {
        throw new Error("Use arquivos de até 15 MB.");
      }

      const fileType = String(preparedFile.type || fallbackMedia?.mimeType || "").toLowerCase();
      const fileName = String(preparedFile.name || fallbackMedia?.fileName || "");
      const isAudio = fileType.startsWith("audio/") || /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|webm)$/i.test(fileName);
      if (isAudio) {
        if (!window.WFAudioConverter?.inspectFile || !window.WFAudioConverter?.convertToVoiceNote) {
          throw new Error("O conversor de áudio não foi carregado. Atualize o WhatsApp e tente novamente.");
        }
        const inspection = await window.WFAudioConverter.inspectFile(preparedFile);
        if (!inspection.isOggOpus) {
          preparedFile = await window.WFAudioConverter.convertToVoiceNote(preparedFile);
        }
      }

      if (preparedFile.size > 15 * 1024 * 1024) {
        throw new Error("O áudio convertido ultrapassou o limite de 15 MB.");
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          fileName: preparedFile.name,
          mimeType: isAudio ? "audio/ogg" : (preparedFile.type || "application/octet-stream"),
          dataUrl: reader.result,
          isPtt: isAudio
        });
        reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
        reader.readAsDataURL(preparedFile);
      });
    }

    async function collectScheduleVariants() {
      return Promise.all(scheduleVariantRows().map(async (row, index) => {
        const text = String(row.querySelector("textarea")?.value || "").trim();
        const fileInput = row.querySelector("[data-schedule-variant-file]");
        const media = await readScheduleFile(
          fileInput?.files?.[0],
          editingScheduleVariantMedia[index] || null
        );
        return { text, media };
      }));
    }

    function renderScheduleTemplates() {
      scheduleTemplateList.innerHTML = scheduleTemplates.map((template, index) => `
        <span class="wf-schedule-template-chip">
          <button type="button" data-apply-schedule-template="${template.id}"
            title="Aplicar configuração ${index + 1}">${index + 1}</button>
          <button type="button" data-delete-schedule-template="${template.id}"
            title="Excluir configuração ${index + 1}" aria-label="Excluir configuração ${index + 1}">×</button>
        </span>
      `).join("");
    }

    async function loadScheduleTemplates() {
      const stored = await chrome.storage.local.get("wfScheduleTemplates");
      scheduleTemplates = Array.isArray(stored.wfScheduleTemplates) ? stored.wfScheduleTemplates : [];
      renderScheduleTemplates();
    }

    function applyScheduleTemplate(template) {
      if (!template) return;
      scheduleEditId.value = "";
      scheduleCancelEdit.hidden = true;
      setScheduleKind(template.kind === "flow" ? "flow" : "message");
      scheduleFlow.value = template.flowId || "";
      const legacyTexts = Array.isArray(template.texts) && template.texts.length ? template.texts : [""];
      const variants = Array.isArray(template.variants) && template.variants.length
        ? template.variants.slice(0, 5)
        : legacyTexts.slice(0, 5).map((text, index) => ({
            text,
            media: index === 0 ? template.media || null : null
          }));
      scheduleMessage.value = variants[0]?.text || "";
      scheduleVariations.innerHTML = "";
      editingScheduleVariantMedia = variants.map(variant => variant?.media || null);
      variants.slice(1, 5).forEach(variant => addVariationField(variant?.text || "", variant?.media || null));
      updateScheduleVariationChances();
      scheduleFile.value = "";
      updateScheduleFileName();
      const now = new Date();
      const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      scheduleDate.value = localToday.toISOString().slice(0, 10);
      scheduleTime.value = template.time || "";
      scheduleRepeat.value = template.repeat || "none";
      scheduleRepeatEvery.value = String(Math.max(1, Number(template.repeatEvery) || 1));
      scheduleRepeatUnit.value = template.repeatUnit || "days";
      scheduleCustomRepeat.hidden = scheduleRepeat.value !== "custom";
      const recurring = scheduleRepeat.value !== "none";
      scheduleEndCheck.hidden = !recurring;
      scheduleHasEnd.checked = recurring && Boolean(template.hasEnd);
      scheduleEndAfter.value = String(Math.max(1, Number(template.endAfter) || 1));
      scheduleEndUnit.value = template.endUnit || "days";
      scheduleEndFields.hidden = !scheduleHasEnd.checked;
      scheduleCancelReply.checked = Boolean(template.cancelIfReply);
      scheduleFeedback.textContent = "Configuração aplicada.";
    }

    saveScheduleTemplate.addEventListener("click", async () => {
      if (!hasValidExtensionContext()) return;
      try {
        const variants = scheduleKind === "message" ? await collectScheduleVariants() : [];
        const texts = variants.map(variant => variant.text);
        const media = variants[0]?.media || null;
        scheduleTemplates.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          kind: scheduleKind,
          flowId: scheduleFlow.value,
          texts,
          media,
          variants,
          time: scheduleTime.value,
          repeat: scheduleRepeat.value,
          repeatEvery: Math.max(1, Number(scheduleRepeatEvery.value) || 1),
          repeatUnit: scheduleRepeatUnit.value,
          hasEnd: scheduleHasEnd.checked,
          endAfter: Math.max(1, Number(scheduleEndAfter.value) || 1),
          endUnit: scheduleEndUnit.value,
          cancelIfReply: scheduleCancelReply.checked,
          createdAt: Date.now()
        });
        await chrome.storage.local.set({ wfScheduleTemplates: scheduleTemplates });
        renderScheduleTemplates();
        scheduleFeedback.textContent = `Configuração ${scheduleTemplates.length} salva.`;
      } catch (error) {
        scheduleFeedback.textContent = error?.message || "Não foi possível salvar a configuração.";
      }
    });

    scheduleTemplateList.addEventListener("click", async event => {
      const applyButton = event.target.closest("[data-apply-schedule-template]");
      const deleteButton = event.target.closest("[data-delete-schedule-template]");
      const id = applyButton?.dataset.applyScheduleTemplate || deleteButton?.dataset.deleteScheduleTemplate;
      if (!id) return;
      if (deleteButton) {
        scheduleTemplates = scheduleTemplates.filter(template => template.id !== id);
        await chrome.storage.local.set({ wfScheduleTemplates: scheduleTemplates });
        renderScheduleTemplates();
        return;
      }
      applyScheduleTemplate(scheduleTemplates.find(template => template.id === id));
    });

    scheduleForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!hasValidExtensionContext()) {
        disposeInvalidExtensionContext();
        return;
      }
      scheduleFeedback.textContent = "";
      const bulkTargets = [...bulkScheduleTargets];
      if (!bulkTargets.length) {
        try {
          const active = await command("GET_ACTIVE_CHAT", {}, 8000);
          activeChatId = String(active?.result?.chatId || "");
          activeChatName = String(
            document.querySelector('#main header span[title]')?.getAttribute("title") ||
            activeChatId.replace(/@.+$/, "")
          ).trim();
        } catch {}
      }
      if (!activeChatId && !bulkTargets.length) {
        scheduleFeedback.textContent = "Abra uma conversa antes de programar.";
        return;
      }

      let variants = [];
      try {
        variants = scheduleKind === "message" ? await collectScheduleVariants() : [];
      } catch (error) {
        scheduleFeedback.textContent = error?.message || "Não foi possível ler o arquivo.";
        return;
      }
      if (
        scheduleKind === "message" &&
        variants.length > 1 &&
        variants.some(variant => !variant.text && !variant.media?.dataUrl)
      ) {
        scheduleFeedback.textContent = "Preencha o texto, anexe um arquivo ou remova a variação vazia.";
        return;
      }
      variants = variants.filter(variant => variant.text || variant.media?.dataUrl);
      const texts = variants.map(variant => variant.text);
      const text = variants[0]?.text || "";
      const scheduledAt = new Date(`${scheduleDate.value}T${scheduleTime.value}:00`).getTime();
      if (scheduleKind === "message" && !variants.length) {
        scheduleFeedback.textContent = "Digite uma mensagem ou adicione um arquivo.";
        return;
      }
      if (scheduleKind === "flow" && !scheduleFlow.value) {
        scheduleFeedback.textContent = "Selecione o fluxo que será iniciado.";
        return;
      }
      if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
        scheduleFeedback.textContent = "Selecione uma data e hora futuras.";
        return;
      }
      const repeatEvery = Math.floor(Number(scheduleRepeatEvery.value));
      if (scheduleRepeat.value === "custom" && (!Number.isFinite(repeatEvery) || repeatEvery < 1)) {
        scheduleFeedback.textContent = "Informe um intervalo personalizado maior que zero.";
        return;
      }
      const endAfter = Math.floor(Number(scheduleEndAfter.value));
      if (scheduleHasEnd.checked && (!Number.isFinite(endAfter) || endAfter < 1)) {
        scheduleFeedback.textContent = "Informe após quanto tempo o agendamento deve encerrar.";
        return;
      }

      const stored = await chrome.storage.local.get("wfScheduledMessages");
      const messages = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];
      const editingId = scheduleEditId.value;
      const media = scheduleKind === "message" ? variants[0]?.media || null : null;

      const payload = {
        id: editingId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        chatId: bulkTargets[0]?.chatId || activeChatId,
        chatName: bulkTargets[0]?.chatName || activeChatName,
        type: scheduleKind,
        flowId: scheduleKind === "flow" ? scheduleFlow.value : "",
        flowName: scheduleKind === "flow"
          ? scheduleFlow.selectedOptions[0]?.textContent?.replace(/\s*\(inativo\)\s*$/, "") || "Fluxo"
          : "",
        text,
        texts,
        media,
        variants,
        scheduledAt,
        repeat: scheduleRepeat.value,
        repeatEvery: scheduleRepeat.value === "custom" ? repeatEvery : 1,
        repeatUnit: scheduleRepeat.value === "custom" ? scheduleRepeatUnit.value : "",
        endAfter: scheduleHasEnd.checked ? endAfter : 0,
        endUnit: scheduleHasEnd.checked ? scheduleEndUnit.value : "",
        endsAt: scheduleHasEnd.checked
          ? scheduleEndTimestamp(scheduledAt, endAfter, scheduleEndUnit.value)
          : 0,
        cancelIfReply: scheduleCancelReply.checked,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const existingIndex = messages.findIndex(item => item.id === editingId);
      if (bulkTargets.length) {
        const bulkPayload = {
          ...payload,
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          chatId: "",
          chatName: bulkScheduleColumnName || "Etapa",
          bulkTargets: bulkTargets.map(target => ({ chatId: target.chatId, chatName: target.chatName || "Contato" })),
          targetStates: bulkTargets.map(target => ({
            chatId: target.chatId,
            chatName: target.chatName || "Contato",
            status: "pending",
            error: "",
            updatedAt: Date.now()
          })),
          bulkColumnId: bulkScheduleColumnId,
          bulkColumnName: bulkScheduleColumnName || "Etapa",
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        if (existingIndex >= 0) {
          bulkPayload.id = messages[existingIndex].id;
          bulkPayload.createdAt = messages[existingIndex].createdAt || bulkPayload.createdAt;
          messages.splice(existingIndex, 1, bulkPayload);
        } else {
          messages.push(bulkPayload);
        }
      } else if (existingIndex >= 0) {
        payload.createdAt = messages[existingIndex].createdAt || payload.createdAt;
        messages.splice(existingIndex, 1, payload);
      } else {
        messages.push(payload);
      }
      await chrome.storage.local.set({ wfScheduledMessages: messages });
      if (!bulkTargets.length) bulkScheduleTargets = [];
      resetScheduleForm();
      await renderScheduledMessages();
      switchChatTab("scheduled");
    });

    scheduledList.addEventListener("click", async event => {
      const expandableCard = event.target.closest("[data-scheduled-expandable]");
      const clickedAction = event.target.closest("button, a, input, select, textarea");
      if (expandableCard && !clickedAction) {
        const details = expandableCard.querySelector(".wf-scheduled-variation-list");
        const expanded = expandableCard.getAttribute("aria-expanded") === "true";
        expandableCard.setAttribute("aria-expanded", String(!expanded));
        expandableCard.classList.toggle("expanded", !expanded);
        if (details) details.hidden = expanded;
        return;
      }
      if (!hasValidExtensionContext()) {
        disposeInvalidExtensionContext();
        return;
      }
      const editButton = event.target.closest("[data-schedule-edit]");
      const deleteButton = event.target.closest("[data-schedule-delete]");
      const sendNowButton = event.target.closest("[data-schedule-send-now]");
      const retryButton = event.target.closest("[data-schedule-retry]");
      const stored = await chrome.storage.local.get("wfScheduledMessages");
      const messages = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];

      if (editButton) {
        const item = messages.find(message => message.id === editButton.dataset.scheduleEdit);
        if (!item) return;
        if (Array.isArray(item.bulkTargets)) {
          const retryTargets = Array.isArray(item.targetStates)
            ? item.targetStates.filter(isScheduleFailure)
            : [];
          bulkScheduleTargets = retryTargets.length ? retryTargets : item.bulkTargets;
          bulkScheduleColumnId = item.bulkColumnId || "";
          bulkScheduleColumnName = item.bulkColumnName || "Etapa";
          panel.classList.add("wf-bulk-mode");
          bulkProgramCheck.hidden = false;
          bulkProgramEnabled.checked = true;
        } else {
          bulkScheduleTargets = [];
          bulkScheduleColumnId = "";
          bulkScheduleColumnName = "";
          panel.classList.remove("wf-bulk-mode");
          bulkProgramCheck.hidden = true;
        }
        bulkSendNow.hidden = true;
        bulkScheduleOptions.hidden = false;
        scheduleSubmit.hidden = false;
        const localDate = new Date(item.scheduledAt - new Date(item.scheduledAt).getTimezoneOffset() * 60000);
        scheduleEditId.value = item.id;
        setScheduleKind(item.type === "flow" ? "flow" : "message");
        scheduleFlow.value = item.flowId || "";
        const savedTexts = Array.isArray(item.texts) && item.texts.length
          ? item.texts
          : [item.text || ""];
        const savedVariants = Array.isArray(item.variants) && item.variants.length
          ? item.variants.slice(0, 5)
          : savedTexts.slice(0, 5).map((text, index) => ({
              text,
              media: index === 0 ? item.media || null : null
            }));
        scheduleMessage.value = savedVariants[0]?.text || "";
        scheduleVariations.innerHTML = "";
        editingScheduleVariantMedia = savedVariants.map(variant => variant?.media || null);
        savedVariants.slice(1, 5).forEach(variant => addVariationField(variant?.text || "", variant?.media || null));
        updateScheduleVariationChances();
        scheduleFile.value = "";
        updateScheduleFileName();
        scheduleDate.value = localDate.toISOString().slice(0, 10);
        scheduleTime.value = localDate.toISOString().slice(11, 16);
        scheduleRepeat.value = item.repeat || "none";
        scheduleRepeatEvery.value = String(Math.max(1, Number(item.repeatEvery) || 1));
        scheduleRepeatUnit.value = item.repeatUnit || "days";
        scheduleCustomRepeat.hidden = item.repeat !== "custom";
        const recurring = Boolean(item.repeat && item.repeat !== "none");
        scheduleEndCheck.hidden = !recurring;
        scheduleHasEnd.checked = recurring && Number(item.endsAt) > 0;
        scheduleEndAfter.value = String(Math.max(1, Number(item.endAfter) || 1));
        scheduleEndUnit.value = item.endUnit || "days";
        scheduleEndFields.hidden = !scheduleHasEnd.checked;
        scheduleCancelReply.checked = Boolean(item.cancelIfReply);
        scheduleCancelEdit.hidden = false;
        panel.querySelector("#wf-schedule-submit").textContent = "Salvar alterações";
        switchChatTab("schedule");
        scheduleMessage.focus();
      }

      if (deleteButton && confirm("Excluir esta mensagem programada?")) {
        await chrome.storage.local.set({
          wfScheduledMessages: messages.filter(message => message.id !== deleteButton.dataset.scheduleDelete)
        });
        renderScheduledMessages();
      }

      const immediateId = sendNowButton?.dataset.scheduleSendNow || retryButton?.dataset.scheduleRetry;
      if (immediateId) {
        const itemIndex = messages.findIndex(message => message.id === immediateId);
        if (itemIndex >= 0) {
          const item = messages[itemIndex];
          const recurring = Boolean(item.repeat && item.repeat !== "none");
          const isRetry = Boolean(retryButton?.dataset.scheduleRetry);
          if (isRetry && hasSendTimeoutFailure(item)) {
            const reconciliation = await reconcileTimedOutSchedule(messages, itemIndex, {
              force: true
            });
            if (reconciliation.completed) {
              scheduleFeedback.textContent = "O envio já havia sido concluído pelo WhatsApp. Nenhuma mensagem foi duplicada.";
              await renderScheduledMessages();
              return;
            }
          }
          const retryWithoutLinkPreview = Boolean(
            isRetry && (
              item.retryWithoutLinkPreview ||
              item.errorCode === "WF_SEND_TIMEOUT" ||
              item.targetStates?.some(target => target.errorCode === "WF_SEND_TIMEOUT")
            )
          );
          messages[itemIndex] = {
            ...item,
            status: "pending",
            scheduledAt: Date.now(),
            ...(recurring ? { recurrenceAnchorAt: Number(item.recurrenceAnchorAt || item.scheduledAt) } : {}),
            // A prévia de links pode bloquear o motor interno do WhatsApp.
            // Em uma repetição após timeout, envia o mesmo texto sem a prévia.
            retryWithoutLinkPreview,
            // Antes de repetir um timeout, procura no histórico a mensagem que
            // pode ter sido enviada sem devolver a confirmação ao WhatsFlow.
            retryDedupeSince: isRetry
              ? Number(item.retryDedupeSince || item.scheduledAt || Date.now())
              : 0,
            error: "",
            targetStates: Array.isArray(item.targetStates)
              ? item.targetStates.map(target => ["failed", "skipped", "unconfirmed"].includes(target.status)
                ? { ...target, status: "pending", error: "", errorCode: "", updatedAt: Date.now() }
                : target)
              : item.targetStates,
            updatedAt: Date.now()
          };
          await chrome.storage.local.set({ wfScheduledMessages: messages });
          scheduleFeedback.textContent = "";
          await safelyDispatchScheduledMessages();
        }
      }
    });

    scheduledList.addEventListener("keydown", event => {
      if (!event.target.matches("[data-scheduled-expandable]")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.target.click();
    });

    function nextScheduledTime(timestamp, repeat, repeatEvery = 1, repeatUnit = "") {
      const next = new Date(timestamp);
      if (repeat === "hourly") next.setHours(next.getHours() + 1);
      if (repeat === "daily") next.setDate(next.getDate() + 1);
      if (repeat === "weekly") next.setDate(next.getDate() + 7);
      if (repeat === "biweekly") next.setDate(next.getDate() + 14);
      if (repeat === "monthly") next.setMonth(next.getMonth() + 1);
      if (repeat === "yearly") next.setFullYear(next.getFullYear() + 1);
      if (repeat === "custom") {
        const amount = Math.max(1, Math.floor(Number(repeatEvery) || 1));
        if (repeatUnit === "seconds") next.setSeconds(next.getSeconds() + amount);
        if (repeatUnit === "minutes") next.setMinutes(next.getMinutes() + amount);
        if (repeatUnit === "hours") next.setHours(next.getHours() + amount);
        if (repeatUnit === "days") next.setDate(next.getDate() + amount);
        if (repeatUnit === "weeks") next.setDate(next.getDate() + amount * 7);
        if (repeatUnit === "months") next.setMonth(next.getMonth() + amount);
        if (repeatUnit === "years") next.setFullYear(next.getFullYear() + amount);
      }
      return next.getTime();
    }

    function nextFutureScheduledTime(timestamp, repeat, repeatEvery = 1, repeatUnit = "") {
      let nextAt = nextScheduledTime(timestamp, repeat, repeatEvery, repeatUnit);
      const now = Date.now();
      let guard = 0;
      while (nextAt <= now && guard < 10000) {
        nextAt = nextScheduledTime(nextAt, repeat, repeatEvery, repeatUnit);
        guard += 1;
      }
      return nextAt;
    }

    function scheduledTargetStates(item) {
      if (Array.isArray(item.targetStates) && item.targetStates.length) {
        return item.targetStates.map(target => ({ ...target }));
      }
      const targets = Array.isArray(item.bulkTargets) && item.bulkTargets.length
        ? item.bulkTargets
        : [{ chatId: item.chatId, chatName: item.chatName }];
      return targets
        .filter(target => String(target?.chatId || "").trim())
        .map(target => ({
          chatId: String(target.chatId),
          chatName: String(target.chatName || item.chatName || "Contato"),
          status: "pending",
          error: "",
          updatedAt: Date.now()
        }));
    }

    function scheduleFailureStatus(error) {
      return ["WF_ACK_UNCONFIRMED", "WF_SEND_TIMEOUT"].includes(String(error?.code || ""))
        ? "unconfirmed"
        : "failed";
    }

    function hasSendTimeoutFailure(item) {
      return Boolean(
        item?.errorCode === "WF_SEND_TIMEOUT" ||
        item?.targetStates?.some(target => target?.errorCode === "WF_SEND_TIMEOUT")
      );
    }

    function scheduledTextCandidates(item) {
      const values = Array.isArray(item?.variants) && item.variants.length
        ? item.variants.map(variant => variant?.text)
        : (Array.isArray(item?.texts) && item.texts.length ? item.texts : [item?.text]);
      return values
        .map(value => String(value || ""))
        .filter(value => value.trim());
    }

    async function reconcileTimedOutSchedule(messages, index, { force = false } = {}) {
      const item = messages[index];
      if (
        !item ||
        item.type === "flow" ||
        item.media?.dataUrl ||
        item.variants?.some(variant => variant?.media?.dataUrl) ||
        !hasSendTimeoutFailure(item)
      ) {
        return { checked: false, completed: false };
      }

      const texts = scheduledTextCandidates(item);
      if (!texts.length) return { checked: false, completed: false };

      const now = Date.now();
      const states = scheduledTargetStates(item);
      let checked = false;
      let foundAny = false;

      for (const target of states) {
        const timeoutFailure =
          ["failed", "unconfirmed"].includes(target.status) &&
          (target.errorCode === "WF_SEND_TIMEOUT" || item.errorCode === "WF_SEND_TIMEOUT");
        if (!timeoutFailure) continue;
        if (!force && Number(target.reconcileAttempts || 0) >= 18) continue;
        if (!force && now - Number(target.lastReconcileAt || 0) < 10000) continue;

        checked = true;
        target.lastReconcileAt = now;
        target.reconcileAttempts = Number(target.reconcileAttempts || 0) + 1;
        try {
          const response = await command("CHECK_RECENT_OUTGOING", {
            chatId: target.chatId,
            texts,
            since: Number(item.retryDedupeSince || item.scheduledAt || item.createdAt || now),
            timeoutMs: force ? 3000 : 1200
          }, force ? 15000 : 12000);
          if (response?.result?.found) {
            foundAny = true;
            target.status = "sent";
            target.sentAt = now;
            target.messageIds = response.result.messageId ? [String(response.result.messageId)] : [];
            target.error = "";
            target.errorCode = "";
          }
        } catch (error) {
          console.debug("[WA Flow] A confirmação tardia ainda não apareceu.", error);
        }
        target.updatedAt = now;
      }

      if (!checked) return { checked: false, completed: false };

      const remainingFailures = states.filter(target =>
        ["failed", "unconfirmed"].includes(target.status)
      );
      if (!remainingFailures.length) {
        messages.splice(index, 1);
        await chrome.storage.local.set({ wfScheduledMessages: messages });
        return { checked: true, completed: true, foundAny };
      }

      messages[index] = {
        ...item,
        status: remainingFailures.some(target => target.status === "failed") ? "failed" : "unconfirmed",
        targetStates: states,
        error: remainingFailures[0].error || item.error,
        errorCode: remainingFailures[0].errorCode || item.errorCode,
        updatedAt: now
      };
      await chrome.storage.local.set({ wfScheduledMessages: messages });
      return { checked: true, completed: false, foundAny };
    }

    function nextOccurrenceFor(item) {
      return nextFutureScheduledTime(
        item.repeat === "custom" && ["seconds", "minutes", "hours"].includes(item.repeatUnit)
          ? Date.now()
          : Number(item.recurrenceAnchorAt || item.scheduledAt),
        item.repeat,
        item.repeatEvery,
        item.repeatUnit
      );
    }

    function advanceRecurringItem(item, nextAt, now) {
      return {
        ...item,
        status: "pending",
        scheduledAt: nextAt,
        recurrenceAnchorAt: nextAt,
        targetStates: scheduledTargetStates(item).map(target => ({
          ...target,
          status: "pending",
          error: "",
          errorCode: "",
          messageId: "",
          updatedAt: now
        })),
        error: "",
        updatedAt: now
      };
    }

    function preserveFailedOccurrence(messages, index, item, error, targetStates, now) {
      const status = scheduleFailureStatus(error);
      const errorMessage = error?.message || String(error);
      const failedStates = (targetStates?.length ? targetStates : scheduledTargetStates(item)).map(target =>
        ["sent", "failed", "unconfirmed"].includes(target.status)
          ? target
          : { ...target, status, error: errorMessage, errorCode: String(error?.code || ""), updatedAt: now }
      );
      const failedItem = {
        ...item,
        status,
        targetStates: failedStates,
        flowStartIndex: Number.isFinite(Number(error?.failedIndex))
          ? Number(error.failedIndex)
          : Number(item.flowStartIndex || 0),
        error: errorMessage,
        errorCode: String(error?.code || ""),
        updatedAt: now
      };
      if (!(item.repeat && item.repeat !== "none")) {
        messages[index] = failedItem;
        return;
      }
      const nextAt = nextOccurrenceFor(item);
      const canContinue = !(Number(item.endsAt) > 0 && nextAt > Number(item.endsAt));
      if (!canContinue) {
        messages[index] = { ...failedItem, repeat: "none" };
        return;
      }
      messages.push({
        ...failedItem,
        id: `${item.id}-failed-${Number(item.scheduledAt) || now}`,
        parentScheduleId: item.id,
        repeat: "none",
        repeatEvery: 1,
        repeatUnit: "",
        endsAt: 0,
        createdAt: now
      });
      messages[index] = advanceRecurringItem(item, nextAt, now);
    }

    async function dispatchScheduledMessages() {
      if (!hasValidExtensionContext()) {
        disposeInvalidExtensionContext();
        return;
      }
      const run = async () => {
        const stored = await chrome.storage.local.get(["wfScheduledMessages", "wfFlows"]);
        const now = Date.now();
        const messages = (Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [])
          .map(item => item.status === "sending" && now - Number(item.updatedAt || 0) > 2 * 60 * 1000
            ? { ...item, status: "pending", error: "Envio retomado após interrupção." }
            : item);
        let repairedLegacyFailures = false;
        const legacyLength = messages.length;
        for (let itemIndex = 0; itemIndex < legacyLength; itemIndex++) {
          const item = messages[itemIndex];
          if (item?.status !== "skipped") continue;
          const error = new Error(item.error || "O horário passou e a mensagem não foi enviada.");
          preserveFailedOccurrence(messages, itemIndex, item, error, scheduledTargetStates(item), now);
          repairedLegacyFailures = true;
        }
        if (repairedLegacyFailures) {
          await chrome.storage.local.set({ wfScheduledMessages: messages });
        }
        const timeoutFailureIndex = messages.findIndex(item =>
          ["failed", "unconfirmed"].includes(item?.status) &&
          hasSendTimeoutFailure(item) &&
          Date.now() - Number(item.scheduledAt || item.createdAt || 0) < 24 * 60 * 60 * 1000
        );
        if (timeoutFailureIndex >= 0) {
          await reconcileTimedOutSchedule(messages, timeoutFailureIndex);
        }
        const due = messages
          .filter(item => item.status === "pending" && Number(item.scheduledAt) <= now)
          .sort((a, b) => Number(a.scheduledAt) - Number(b.scheduledAt))[0];
        if (!due) return;

        const index = messages.findIndex(item => item.id === due.id);
        if (Number(due.endsAt) > 0 && now > Number(due.endsAt)) {
          messages.splice(index, 1);
          await chrome.storage.local.set({ wfScheduledMessages: messages });
          return;
        }
        if (now - Number(due.scheduledAt) > 30 * 60 * 1000) {
          const error = new Error("O horário passou há mais de 30 minutos e a mensagem não foi enviada.");
          error.code = "WF_SCHEDULE_MISSED";
          preserveFailedOccurrence(messages, index, due, error, scheduledTargetStates(due), now);
          await chrome.storage.local.set({ wfScheduledMessages: messages });
          return;
        }

        messages[index] = {
          ...due,
          status: "sending",
          targetStates: scheduledTargetStates(due),
          updatedAt: now
        };
        await chrome.storage.local.set({ wfScheduledMessages: messages });

        const scheduledFlow = due.type === "flow"
          ? (Array.isArray(stored.wfFlows) ? stored.wfFlows : [])
            .find(flow => String(flow.id) === String(due.flowId))
          : null;
        const legacyTextOptions = (Array.isArray(due.texts) && due.texts.length
          ? due.texts
          : [due.text])
          .map(value => String(value || ""));
        const variantOptions = (
          Array.isArray(due.variants) && due.variants.length
            ? due.variants
            : legacyTextOptions.map((text, index) => ({
                text,
                media: index === 0 ? due.media || null : null
              }))
        )
          .slice(0, 5)
          .map(variant => ({
            text: String(variant?.text || ""),
            media: variant?.media || null
          }))
          .filter(variant => variant.text.trim() || variant.media?.dataUrl);
        const targetStates = scheduledTargetStates(due);
        const preparedVoiceMedia = new Map();
        let firstError = null;

        const persistProgress = async () => {
          const latest = await chrome.storage.local.get("wfScheduledMessages");
          const updated = Array.isArray(latest.wfScheduledMessages) ? latest.wfScheduledMessages : [];
          const latestIndex = updated.findIndex(item => item.id === due.id);
          if (latestIndex < 0) return false;
          updated[latestIndex] = {
            ...updated[latestIndex],
            status: "sending",
            targetStates: targetStates.map(target => ({ ...target })),
            updatedAt: Date.now()
          };
          await chrome.storage.local.set({ wfScheduledMessages: updated });
          return true;
        };

        for (const target of targetStates) {
          if (target.status === "sent") continue;
          target.status = "sending";
          target.error = "";
          target.errorCode = "";
          target.updatedAt = Date.now();
          if (!await persistProgress()) return;
          try {
            const messageIds = [];
            if (due.type === "flow") {
              if (!scheduledFlow) throw new Error("O fluxo programado não existe mais.");
              await startFlowAndWait({
                chatId: target.chatId,
                flowId: due.flowId,
                startIndex: Number(target.flowStartIndex ?? due.flowStartIndex) || 0,
                flowContext: {
                  ...(due.flowContext || {}),
                  chatName: target.chatName || due.chatName || "Contato"
                },
                replyText: String(due.flowReplyText || ""),
                failureOwner: "engine",
                failureSource: "scheduled-flow"
              });
            } else {
              const selectedVariant = variantOptions.length
                ? variantOptions[Math.floor(Math.random() * variantOptions.length)]
                : { text: "", media: null };
              const outgoingText = selectedVariant.text;
              let outgoingMedia = selectedVariant.media;
              if (outgoingMedia?.dataUrl) {
                const mimeType = String(outgoingMedia.mimeType || "");
                const mediaType = mimeType.startsWith("image/")
                  ? "image"
                  : mimeType.startsWith("video/")
                    ? "video"
                    : mimeType.startsWith("audio/")
                      ? "audio"
                      : "document";
                if (mediaType === "audio" && outgoingMedia.isPtt !== true) {
                  const mediaKey = outgoingMedia.dataUrl;
                  if (!preparedVoiceMedia.has(mediaKey)) {
                    preparedVoiceMedia.set(mediaKey, readScheduleFile(null, outgoingMedia));
                  }
                  outgoingMedia = await preparedVoiceMedia.get(mediaKey);
                }
                const mediaResult = await command("SEND_FILE", {
                  chatId: target.chatId,
                  block: {
                    ...outgoingMedia,
                    type: mediaType,
                    caption: outgoingText,
                    isPtt: mediaType === "audio"
                  }
                }, 45000);
                await requireServerAck(mediaResult);
                if (mediaResult?.result?.messageId) messageIds.push(String(mediaResult.result.messageId));
                if (outgoingText && !["image", "video"].includes(mediaType)) {
                  const textResult = await command("SEND_TEXT", {
                    chatId: target.chatId,
                    text: outgoingText,
                    linkPreview: due.retryWithoutLinkPreview !== true,
                    dedupeSince: Number(due.retryDedupeSince || 0)
                  }, 45000);
                  await requireServerAck(textResult);
                  if (textResult?.result?.messageId) messageIds.push(String(textResult.result.messageId));
                }
              } else {
                const textResult = await command("SEND_TEXT", {
                  chatId: target.chatId,
                  text: outgoingText,
                  linkPreview: due.retryWithoutLinkPreview !== true,
                  dedupeSince: Number(due.retryDedupeSince || 0)
                }, 45000);
                await requireServerAck(textResult);
                if (textResult?.result?.messageId) messageIds.push(String(textResult.result.messageId));
              }
            }
            target.status = "sent";
            target.sentAt = Date.now();
            target.messageIds = messageIds;
            target.error = "";
            target.errorCode = "";
          } catch (error) {
            firstError ||= error;
            target.status = scheduleFailureStatus(error);
            target.error = error?.message || String(error);
            target.errorCode = String(error?.code || "");
            if (error?.messageId) target.messageId = String(error.messageId);
            if (Number.isFinite(Number(error?.failedIndex))) {
              target.flowStartIndex = Number(error.failedIndex);
            }
          }
          target.updatedAt = Date.now();
          if (!await persistProgress()) return;
        }

        const latest = await chrome.storage.local.get("wfScheduledMessages");
        const updated = Array.isArray(latest.wfScheduledMessages) ? latest.wfScheduledMessages : [];
        const latestIndex = updated.findIndex(item => item.id === due.id);
        if (latestIndex < 0) return;
        const finishedAt = Date.now();
        const failedTargets = targetStates.filter(target => ["failed", "unconfirmed"].includes(target.status));
        if (failedTargets.length) {
          const aggregateError = firstError || new Error(failedTargets[0].error || "Mensagem não enviada.");
          if (!aggregateError.code) aggregateError.code = failedTargets[0].errorCode || "";
          if (!Number.isFinite(Number(aggregateError.failedIndex))) {
            const failedIndex = Number(failedTargets[0].flowStartIndex);
            if (Number.isFinite(failedIndex)) aggregateError.failedIndex = failedIndex;
          }
          preserveFailedOccurrence(
            updated,
            latestIndex,
            { ...updated[latestIndex], targetStates },
            aggregateError,
            targetStates,
            finishedAt
          );
        } else if (due.repeat && due.repeat !== "none") {
          const nextAt = nextOccurrenceFor(due);
          if (Number(due.endsAt) > 0 && nextAt > Number(due.endsAt)) {
            updated.splice(latestIndex, 1);
          } else {
            updated[latestIndex] = {
              ...advanceRecurringItem({ ...updated[latestIndex], targetStates }, nextAt, finishedAt),
              lastSentAt: finishedAt
            };
          }
        } else {
          updated.splice(latestIndex, 1);
        }
        await chrome.storage.local.set({ wfScheduledMessages: updated });
      };

      if (navigator.locks?.request) {
        await navigator.locks.request("wf-scheduled-dispatch", { ifAvailable: true }, lock => {
          if (lock) return run();
        });
      } else {
        await run();
      }
    }

    window.addEventListener("WF_INCOMING_ACTIVITY", async event => {
      const chatId = String(event.detail?.chatId || "");
      if (!chatId) return;
      const stored = await chrome.storage.local.get("wfScheduledMessages");
      const messages = Array.isArray(stored.wfScheduledMessages) ? stored.wfScheduledMessages : [];
      let changed = false;
      const updated = messages.map(item => {
        const shouldCancel =
          item.status === "pending" &&
          item.cancelIfReply &&
          Number(item.scheduledAt) > Date.now();
        if (!shouldCancel) return item;
        if (Array.isArray(item.bulkTargets)) {
          const remainingTargets = item.bulkTargets.filter(target => target.chatId !== chatId);
          if (remainingTargets.length !== item.bulkTargets.length) changed = true;
          const remainingStates = Array.isArray(item.targetStates)
            ? item.targetStates.filter(target => target.chatId !== chatId)
            : item.targetStates;
          return remainingTargets.length
            ? { ...item, bulkTargets: remainingTargets, targetStates: remainingStates, updatedAt: Date.now() }
            : null;
        }
        if (item.chatId === chatId) {
          changed = true;
          return null;
        }
        return item;
      }).filter(Boolean);
      if (changed) {
        await chrome.storage.local.set({ wfScheduledMessages: updated });
      }
    });

    async function safelyDispatchScheduledMessages() {
      if (!hasValidExtensionContext()) {
        disposeInvalidExtensionContext();
        return;
      }
      try {
        await dispatchScheduledMessages();
      } catch (error) {
        if (
          !hasValidExtensionContext() ||
          String(error?.message || error).includes("Extension context invalidated")
        ) {
          disposeInvalidExtensionContext();
          return;
        }
        console.error("[WA Flow] Falha ao verificar mensagens programadas:", error);
      }
    }

    setDefaultScheduleTime();
    updateScheduleVariationChances();
    renderMessageTemplates().catch(() => {});
    loadScheduleTemplates().catch(() => {});
    updateMenuBadges();
    syncActiveChatBadges();
    document.addEventListener("pointerup", queueChatBadgeSync, true);
    chatBadgeSyncTimer = setInterval(syncActiveChatBadges, 1000);
    chatControlDockObserver = new MutationObserver(queueChatControlDock);
    chatControlDockObserver.observe(document.body, { childList: true, subtree: true });
    queueChatControlDock();
    setTimeout(safelyDispatchScheduledMessages, 3000);
    scheduledDispatchTimer = setInterval(safelyDispatchScheduledMessages, 1000);

    flowSelect.addEventListener("change", () => {
      startButton.disabled = !activeChatId || !flowSelect.value;
      feedback.textContent = "";
    });

    pauseButton.addEventListener("click", () => {
      if (!activeChatId) return;
      const action = isPaused ? "resume" : "pause";
      window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", {
        detail: { action, chatId: activeChatId }
      }));
      isPaused = !isPaused;
      updatePauseButton();
      feedback.textContent = isPaused
        ? "Automação pausada somente para esta conversa."
        : "Automação retomada para esta conversa.";
    });

    advanceButton.addEventListener("click", () => {
      if (!activeChatId || !activeFlowName) return;
      window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", {
        detail: { action: "advance-flow", chatId: activeChatId }
      }));
      feedback.textContent = "Avançando para a próxima etapa...";
      advanceButton.disabled = true;
      setTimeout(() => {
        if (activeFlowName) advanceButton.disabled = false;
      }, 800);
    });

    deleteFlowButton.addEventListener("click", () => {
      if (!activeChatId || !activeFlowName) return;
      if (!confirm("Remover o fluxo em execução desta conversa?")) return;
      window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", {
        detail: { action: "cancel-flow", chatId: activeChatId }
      }));
      activeFlowName = "";
      isPaused = false;
      updatePauseButton();
      feedback.textContent = "Fluxo removido desta conversa.";
    });

    startButton.addEventListener("click", () => {
      if (!activeChatId || !flowSelect.value) return;
      const selectedFlowName = flowSelect.selectedOptions[0]?.textContent
        ?.replace(/\s*\(inativo\)\s*$/, "") || "Fluxo";
      if (isPaused) {
        window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", {
          detail: { action: "resume", chatId: activeChatId }
        }));
        isPaused = false;
      }
      window.dispatchEvent(new CustomEvent("WF_CHAT_CONTROL", {
        detail: {
          action: "start-flow",
          chatId: activeChatId,
          flowId: flowSelect.value
        }
      }));
      activeFlowName = selectedFlowName;
      updatePauseButton();
      flowSelect.value = "";
      startButton.disabled = true;
      feedback.textContent = `“${selectedFlowName}” iniciado nesta conversa.`;
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.wfMessageTemplates) renderMessageTemplates();
      if (changes.wfScheduleTemplates) loadScheduleTemplates();
      if (changes.wfScheduledMessages || changes.wfRuntime) updateMenuBadges();
      if (!activeChatId) return;
      if (changes.wfRuntime) {
        const runtime = changes.wfRuntime.newValue || {};
        isPaused = Number(runtime.pausedUntil?.[activeChatId] || 0) > Date.now();
        activeFlowName = runtime.activeFlows?.[activeChatId]?.name || "";
        updatePauseButton();
      }
      if (changes.wfScheduledMessages) renderScheduledMessages();
    });
  }

  if (document.body) {
    installDomIncomingFallback();
    mountChatControl();
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      installDomIncomingFallback();
      mountChatControl();
    }, { once: true });
  }

  setBadge("carregando engine", "work");
})();
