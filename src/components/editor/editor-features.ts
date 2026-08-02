import { rendererLogger } from "@/app";
import { stateStore } from "@/state/state";
import { debounce } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { waitForPaint } from "@/utils/ui";
import { DEBOUNCE_MS, MIN_SEARCH_LENGTH } from "@shared/constants";
import { Editor, type JSONContent } from "@tiptap/core";

function recreateEditorState(editor: Editor, doc: JSONContent) {
  editor
    .chain()
    .setMeta("addToHistory", false)
    .setContent(doc, {
      emitUpdate: false,
      errorOnInvalidContent: false,
      contentType: "json",
    })
    .focus("start")
    .run();
}

function hasSearchMatch(editor: Editor): boolean {
  const search = editor.storage.docSearch;
  const hasMatches = search.results.length > 0;
  return !!hasMatches;
}

function initEditorSearch(editor: Editor) {
  const editorWrapper = getAppItem("editorWrapper");
  const inputWrapper = requireElement<HTMLDivElement>(".input-wrapper-editor");
  const input = requireElement<HTMLInputElement>(".search-input-editor");
  const replaceInputWrapper = requireElement<HTMLDivElement>(
    ".input-wrapper-editor-replace",
  );
  const replaceInput = requireElement<HTMLInputElement>(
    ".replace-input-editor",
  );
  const chevronBtn = requireElement<HTMLButtonElement>(
    ".input-wrapper-chevron",
  );
  const searchCount = requireElement<HTMLSpanElement>(".search-count");

  function updateButtons() {
    const disabled = input.value.trim() === "" || !hasSearchMatch(editor);
    const buttons = inputWrapper.querySelectorAll<HTMLButtonElement>(
      ".search-prev, .search-next",
    );
    for (const button of buttons) {
      button.disabled = disabled;
    }
  }

  function syncQuery() {
    editor.commands.docSearchClear();
    editor.commands.docSearchSetQuery(input.value);
    updateCount();
  }

  function open() {
    inputWrapper.classList.remove("invisible");
    input.focus();
    input.select();
    const globalQuery = stateStore.get("searchQuery");
    if (globalQuery && globalQuery.trim().length > MIN_SEARCH_LENGTH) {
      input.value = globalQuery;
      editor.commands.docSearchSetQuery(globalQuery);
      updateCount();
    }
    updateButtons();
  }

  function close() {
    input.value = "";
    replaceInput.value = "";
    inputWrapper.classList.add("invisible");
    replaceInputWrapper.classList.add("invisible");
    chevronBtn.classList.remove("open");
    editor.commands.docSearchClear();
    updateButtons();
    updateCount();
  }

  async function scrollToSelection(editor: Editor, container: HTMLDivElement) {
    await waitForPaint();
    const storage = editor.storage.docSearch;
    if (
      !storage?.results ||
      storage.results.length === 0 ||
      storage.activeIndex < 0
    )
      return;
    const activeResult = storage.results[storage.activeIndex];
    if (!activeResult) return;
    const pos = activeResult.from;
    if (pos > editor.state.doc.content.size) return;
    try {
      const coords = editor.view.coordsAtPos(pos);
      const editorRect = editor.view.dom.getBoundingClientRect();
      const targetTop = coords.top - editorRect.top;
      container.scrollTo({
        top: Math.max(0, targetTop - container.clientHeight / 2),
        behavior: "auto",
      });
    } catch (error) {
      rendererLogger.appError(
        "[scrollToSelection]: Failed to scroll to selection:",
        error,
      );
    }
  }

  function updateCount() {
    const { results, activeIndex, query } = editor.storage.docSearch;
    if (!query || results.length === 0) {
      searchCount.textContent = "0 of 0";
      return;
    }
    searchCount.textContent = `${activeIndex + 1} of ${results.length}`;
  }

  function goPrev() {
    if (editor.commands.docSearchPrev()) {
      void scrollToSelection(editor, editorWrapper).catch(
        rendererLogger.appError,
      );
      updateCount();
    }
  }

  function goNext() {
    if (editor.commands.docSearchNext()) {
      void scrollToSelection(editor, editorWrapper).catch(
        rendererLogger.appError,
      );
      updateCount();
    }
  }

  inputWrapper.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(".search-prev")) {
      event.preventDefault();
      goPrev();
      return;
    } else if (target.closest(".search-next")) {
      event.preventDefault();
      goNext();
      return;
    }
  });

  replaceInputWrapper.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const isReplaceOne = target.closest(".replace-one");
    const isReplaceAll = target.closest(".replace-all");
    if (isReplaceOne || isReplaceAll) {
      event.preventDefault();
      editor.commands.docSearchSetReplacement(replaceInput.value);
      if (isReplaceOne) {
        editor.commands.docSearchReplaceCurrent();
      } else {
        editor.commands.docSearchReplaceAll();
      }
      updateCount();
    }
  });

  chevronBtn.addEventListener("click", () => {
    const isHidden = replaceInputWrapper.classList.toggle("invisible");
    chevronBtn.classList.toggle("open", !isHidden);
    if (!isHidden) replaceInput.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.shiftKey ? goPrev() : goNext();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  replaceInput.addEventListener("keydown", (event) => {
    const isMod = event.metaKey || event.ctrlKey;
    if (event.key === "Enter") {
      event.preventDefault();
      syncQuery();
      if (event.altKey && isMod) {
        editor.commands.docSearchReplaceAll();
      } else {
        editor.commands.docSearchReplaceCurrent();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  editorWrapper.addEventListener("keydown", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      open();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!inputWrapper.classList.contains("invisible")) {
      if (inputWrapper.contains(target) || replaceInputWrapper.contains(target))
        return;
      event.preventDefault();
      close();
      return;
    }
  });

  const debouncedSearch = debounce(() => {
    syncQuery();
    updateButtons();
  }, DEBOUNCE_MS.fast);

  input.addEventListener("input", debouncedSearch);
}

export { initEditorSearch, recreateEditorState };
