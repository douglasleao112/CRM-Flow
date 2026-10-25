(() => {
  if (window.WFTriggerMatcher) return;

  const TYPES = new Set(["contains", "equals", "starts", "any"]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }

  function evaluate(text, trigger = {}) {
    const type = TYPES.has(trigger.type) ? trigger.type : "contains";
    if (type === "any") return { matched: true, priority: 0, keyword: "" };

    const incoming = normalize(text);
    const values = Array.isArray(trigger.keywords)
      ? trigger.keywords
      : [trigger.keywords];
    let best = null;

    for (const rawValue of values) {
      const expected = normalize(rawValue);
      if (!expected) continue;

      const matched = type === "equals"
        ? incoming === expected
        : type === "starts"
        ? incoming.startsWith(expected)
        : incoming.includes(expected);
      if (!matched) continue;

      const base = type === "equals" ? 300000 : type === "starts" ? 200000 : 100000;
      const result = { matched: true, priority: base + expected.length, keyword: expected };
      if (!best || result.priority > best.priority) best = result;
    }

    return best || { matched: false, priority: -1, keyword: "" };
  }

  function findBest({ flows, text, chatId, completed = {}, explicitOnly = false }) {
    let best = null;

    for (const flow of Array.isArray(flows) ? flows : []) {
      if (!flow?.enabled || flow.triggersEnabled === false) continue;
      if (flow.oncePerChat && completed[`${chatId}:${flow.id}`]) continue;

      const triggers = Array.isArray(flow.triggers) && flow.triggers.length
        ? flow.triggers
        : [flow.trigger || {}];

      triggers.forEach((trigger, triggerIndex) => {
        const type = TYPES.has(trigger?.type) ? trigger.type : "contains";
        if (explicitOnly && type === "any") return;
        const result = evaluate(text, { ...trigger, type });
        if (!result.matched || (best && best.priority >= result.priority)) return;
        best = {
          flow,
          matchedTriggerId: trigger.id || `legacy-${triggerIndex}`,
          priority: result.priority,
          keyword: result.keyword
        };
      });
    }

    return best;
  }

  window.WFTriggerMatcher = Object.freeze({ normalize, evaluate, findBest });
})();
