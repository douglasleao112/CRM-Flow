(() => {
  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function splitName(value) {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return {
      firstName: parts.shift() || "",
      lastName: parts.join(" ")
    };
  }

  function csvCell(value) {
    const text = String(value ?? "");
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function normalizeContacts(contacts = []) {
    const unique = new Map();

    for (const contact of Array.isArray(contacts) ? contacts : []) {
      const phone = digitsOnly(contact?.phone);
      if (!phone) continue;

      const name = String(
        contact?.name ||
        [contact?.firstName, contact?.lastName].filter(Boolean).join(" ")
      ).trim();
      const current = unique.get(phone);
      const tags = String(contact?.tag || "")
        .split("|")
        .map(item => item.trim())
        .filter(Boolean);

      if (!current) {
        unique.set(phone, {
          name,
          phone,
          tags: [...new Set(tags)]
        });
        continue;
      }

      if (!current.name && name) current.name = name;
      current.tags = [...new Set([...current.tags, ...tags])];
    }

    return [...unique.values()];
  }

  function buildContactsCsv(contacts = []) {
    const rows = [
      ["Nome", "Sobrenome", "Telefone", "Etiqueta"]
    ];

    for (const contact of normalizeContacts(contacts)) {
      const { firstName, lastName } = splitName(contact.name);
      rows.push([
        firstName,
        lastName,
        `+${contact.phone}`,
        contact.tags.join(" | ")
      ]);
    }

    return "\uFEFF" + rows
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");
  }

  function safeFilename(value, fallback = "contatos-extraidos") {
    const normalized = String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    return normalized || fallback;
  }

  globalThis.WFExtractorUtils = Object.freeze({
    buildContactsCsv,
    digitsOnly,
    normalizeContacts,
    safeFilename,
    splitName
  });
})();
