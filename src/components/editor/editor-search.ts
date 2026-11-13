import { stateStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { debounce } from "@/utils/helpers";
import { requireElement } from "@/utils/ui";
import { appEvents } from "@shared/event-emitter";
import type { SearchQuery } from "@shared/schemas/note-schema";
import { APP_EVENTS, MIN_SEARCH_LENGTH } from "@shared/shared-constants";
import { Editor } from "@tiptap/core";

function hasSearchMatch(editor: Editor): boolean {
  const search = editor.storage.docSearch;
  const hasMatches = search.results.length > 0;
  return !!hasMatches;
}

function initEditorSearch(
  editor: Editor,
  editorContainer: HTMLDivElement,
  editorWrapper: HTMLDivElement,
) {
  const inputWrapper = requireElement<HTMLDivElement>(
    ".input-wrapper-editor",
    editorContainer,
  );
  const input = requireElement<HTMLInputElement>(".search-input-editor");
  const replaceInputWrapper = requireElement<HTMLDivElement>(
    ".input-wrapper-editor-replace",
    editorContainer,
  );
  const replaceInput = requireElement<HTMLInputElement>(
    ".replace-input-editor",
    replaceInputWrapper,
  );
  const chevronBtn = requireElement<HTMLButtonElement>(
    ".input-wrapper-chevron",
    inputWrapper,
  );
  const searchCount = requireElement<HTMLSpanElement>(
    ".search-count",
    inputWrapper,
  );

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

  function applyQuery(rawQuery: string) {
    const query = rawQuery.trim();
    if (query.length > MIN_SEARCH_LENGTH) {
      input.value = query;
      editor.commands.docSearchSetQuery(query);
    } else {
      input.value = "";
      editor.commands.docSearchClear();
    }
    updateCount();
    updateButtons();
  }

  function open(focus: boolean = true) {
    inputWrapper.classList.remove("invisible");
    if (!input.value) {
      applyQuery(stateStore.get("searchQuery") ?? "");
    }
    if (focus) {
      input.focus();
      input.select();
    }
  }

  function close() {
    inputWrapper.classList.add("invisible");
    replaceInputWrapper.classList.add("invisible");
    chevronBtn.classList.remove("open");
    applyQuery("");
    replaceInput.value = "";
  }

  function updateCount() {
    const { results, activeIndex, query } = editor.storage.docSearch;
    if (!query || results.length === 0) {
      searchCount.textContent = "0 of 0";
      return;
    }
    searchCount.textContent = `${activeIndex + 1} of ${results.length}`;
  }

  function go(direction: "prev" | "next") {
    const moved =
      direction === "prev"
        ? editor.commands.docSearchPrev()
        : editor.commands.docSearchNext();
    if (moved) updateCount();
  }

  inputWrapper.addEventListener("click", (event: Event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".search-prev")) {
      event.preventDefault();
      go("prev");
      return;
    } else if (event.target.closest(".search-next")) {
      event.preventDefault();
      go("next");
      return;
    }
  });

  replaceInputWrapper.addEventListener("click", (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const isReplaceOne = event.target.closest(".replace-one");
    const isReplaceAll = event.target.closest(".replace-all");
    if (isReplaceOne || isReplaceAll) {
      event.preventDefault();
      editor.commands.docSearchSetReplacement(replaceInput.value);
      if (isReplaceOne) {
        editor.commands.docSearchReplaceCurrent();
      } else {
        editor.commands.docSearchReplaceAll();
      }
      updateCount();
      updateButtons();
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
      event.shiftKey ? go("prev") : go("next");
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
      if (input.value.trim().length <= MIN_SEARCH_LENGTH) return;
      editor.commands.docSearchSetReplacement(replaceInput.value);
      if (event.altKey && isMod) {
        editor.commands.docSearchReplaceAll();
      } else {
        editor.commands.docSearchReplaceCurrent();
      }
      updateCount();
      updateButtons();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  editorWrapper.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      open();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (!inputWrapper.classList.contains("invisible")) {
      const clickedInput = inputWrapper.contains(event.target);
      const clickedReplace = replaceInputWrapper.contains(event.target);
      const clickedToolbar = event.target.closest("#toolbar");
      if (clickedInput || clickedReplace || clickedToolbar) return;
      event.preventDefault();
      close();
      return;
    }
  });

  const debouncedSearch = debounce(() => {
    syncQuery();
    updateButtons();
  }, DEBOUNCE_MS.normal);

  input.addEventListener("input", debouncedSearch);
  appEvents.on(APP_EVENTS.TOGGLE_EDITOR_SEARCH, () => {
    const isHidden = inputWrapper.classList.contains("invisible");
    if (isHidden) {
      open(true);
    } else {
      close();
    }
  });
  appEvents.on(
    APP_EVENTS.SYNC_EDITOR_SEARCH,
    ({ query = "" }: { query: SearchQuery }) => {
      const globalQuery = typeof query === "string" ? query : "";
      applyQuery(globalQuery);
      if (query.trim().length > MIN_SEARCH_LENGTH) {
        open(false);
      }
    },
  );
}

export { initEditorSearch };
