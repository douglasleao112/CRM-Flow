(() => {
  const REQUEST_KEY = "flowsiOpenKanbanAfterInbox";
  const ATTRIBUTE = "data-flowsi-kanban-transition";
  const STYLE_ID = "flowsi-kanban-transition-style";

  if (window.location.pathname !== "/direct/inbox/") return;

  let requestedAt = 0;
  try {
    requestedAt = Number(window.sessionStorage.getItem(REQUEST_KEY) || 0);
  } catch {}

  if (!requestedAt || Date.now() - requestedAt > 120000) return;

  const root = document.documentElement;
  root.setAttribute(ATTRIBUTE, "pending");
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html[${ATTRIBUTE}="pending"],
    html[${ATTRIBUTE}="pending"] body {
      background: #fff !important;
    }
    html[${ATTRIBUTE}="pending"] body {
      overflow: hidden !important;
    }
    html[${ATTRIBUTE}="pending"] body > * {
      visibility: hidden !important;
    }
    html[${ATTRIBUTE}="pending"] body > #flowsi-nav-bar,
    html[${ATTRIBUTE}="pending"] body > #flowsi-nav-bar * {
      visibility: visible !important;
    }
    html[${ATTRIBUTE}="pending"] #flowsi-nav-bar .flowsi-overlay {
      background: #fff !important;
      opacity: 1 !important;
    }
  `;
  root.appendChild(style);
})();
