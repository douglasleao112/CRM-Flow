(() => {
  if (window.WFMessageFormatting) return;

  const MESSAGE_SELECTOR =
    "textarea[data-message-index], textarea[data-bulk-message], textarea[data-campaign-message]";

  function emitInput(textarea) {
    const event = typeof InputEvent === "function"
      ? new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: null
        })
      : new Event("input", { bubbles: true });
    textarea.dispatchEvent(event);
  }

  function replaceAndSelect(textarea, replacement, start, end, selectionStart, selectionEnd) {
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    const selectionDirection = textarea.selectionDirection || "none";

    textarea.setRangeText(replacement, start, end, "preserve");
    textarea.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
    textarea.scrollTop = scrollTop;
    textarea.scrollLeft = scrollLeft;
    textarea.focus();
    emitInput(textarea);
  }

  function toggleMarker(textarea, marker) {
    if (
      !textarea ||
      textarea.disabled ||
      textarea.readOnly ||
      typeof textarea.setRangeText !== "function"
    ) {
      return false;
    }

    const value = String(textarea.value || "");
    const start = Number.isInteger(textarea.selectionStart)
      ? textarea.selectionStart
      : value.length;
    const end = Number.isInteger(textarea.selectionEnd)
      ? textarea.selectionEnd
      : start;
    const selected = value.slice(start, end);

    if (start !== end) {
      const selectionHasMarkers =
        selected.length >= marker.length * 2 &&
        selected.startsWith(marker) &&
        selected.endsWith(marker);

      if (selectionHasMarkers) {
        const unwrapped = selected.slice(marker.length, -marker.length);
        replaceAndSelect(
          textarea,
          unwrapped,
          start,
          end,
          start,
          start + unwrapped.length
        );
        return true;
      }

      const selectionIsInsideMarkers =
        start >= marker.length &&
        value.slice(start - marker.length, start) === marker &&
        value.slice(end, end + marker.length) === marker;

      if (selectionIsInsideMarkers) {
        replaceAndSelect(
          textarea,
          selected,
          start - marker.length,
          end + marker.length,
          start - marker.length,
          end - marker.length
        );
        return true;
      }

      replaceAndSelect(
        textarea,
        `${marker}${selected}${marker}`,
        start,
        end,
        start + marker.length,
        end + marker.length
      );
      return true;
    }

    const cursorIsInsideEmptyMarkers =
      start >= marker.length &&
      value.slice(start - marker.length, start) === marker &&
      value.slice(start, start + marker.length) === marker;

    if (cursorIsInsideEmptyMarkers) {
      replaceAndSelect(
        textarea,
        "",
        start - marker.length,
        start + marker.length,
        start - marker.length,
        start - marker.length
      );
      return true;
    }

    replaceAndSelect(
      textarea,
      `${marker}${marker}`,
      start,
      end,
      start + marker.length,
      start + marker.length
    );
    return true;
  }

  function handleKeydown(event) {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.repeat ||
      event.altKey ||
      event.shiftKey ||
      (!event.ctrlKey && !event.metaKey)
    ) {
      return;
    }

    const textarea = event.target;
    if (!textarea?.matches?.(MESSAGE_SELECTOR)) return;

    const key = String(event.key || "").toLowerCase();
    const marker = key === "b" ? "*" : key === "i" ? "_" : "";
    if (!marker) return;

    event.preventDefault();
    toggleMarker(textarea, marker);
  }

  window.WFMessageFormatting = {
    MESSAGE_SELECTOR,
    toggleMarker,
    handleKeydown
  };

  document.addEventListener("keydown", handleKeydown);
})();
