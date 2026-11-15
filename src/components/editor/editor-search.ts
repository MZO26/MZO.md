import { stateStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { debounce } from "@/utils/helpers";
import { useCore, useUI } from "@/utils/registry";
import { appEvents } from "@shared/event-emitter";
import type { SearchQuery } from "@shared/schemas/note-schema";
import { APP_EVENTS, MIN_SEARCH_LENGTH } from "@shared/shared-constants";

export type EditorSearchState = {
  isOpen: boolean;
  isReplaceOpen: boolean;
  query: SearchQuery;
  replaceText: string;
};

type QueryOptions = "new" | "prev" | "next" | "clear" | "replace-one" | "replace-all";

type ChangeDisplayArgs =
  | [action: "new", esState: EditorSearchState, options?: { focus?: boolean }]
  | [action: Exclude<QueryOptions, "new">, esState: EditorSearchState];

function initEditorSearch(editorWrapper: HTMLDivElement) {
  const {
    inputWrapperEditor,
    searchInputEditor,
    replaceInputWrapper,
    replaceInputEditor,
    chevronButton,
    searchPrev,
    searchNext,
    replaceOne,
    replaceAll,
    searchCount,
  } = useUI(
    "inputWrapperEditor",
    "searchInputEditor",
    "replaceInputWrapper",
    "replaceInputEditor",
    "chevronButton",
    "searchPrev",
    "searchNext",
    "replaceOne",
    "replaceAll",
    "searchCount",
  );

  function createInitialSearchState(): EditorSearchState {
    return {
      isOpen: false,
      isReplaceOpen: false,
      query: "",
      replaceText: "",
    };
  }

  function resetEditorSearchState(esState: EditorSearchState) {
    Object.assign(esState, createInitialSearchState());
  }

  const esState: EditorSearchState = createInitialSearchState();

  function renderEditorSearch(esState: Readonly<EditorSearchState>) {
    const { isOpen, isReplaceOpen, query } = esState;
    const { editor } = useCore("editor");
    const { results, activeIndex } = editor.storage.docSearch;
    inputWrapperEditor.classList.toggle("invisible", !isOpen);
    const showReplace = isOpen && isReplaceOpen;
    replaceInputWrapper.classList.toggle("invisible", !showReplace);
    chevronButton.classList.toggle("open", showReplace);
    if (!isOpen) {
      searchInputEditor.value = "";
      replaceInputEditor.value = "";
    } else if (document.activeElement !== searchInputEditor && searchInputEditor.value !== query) {
      searchInputEditor.value = query;
    }
    const hasResults = query.length > 0 && results.length > 0;
    searchCount.textContent = hasResults ? `${activeIndex + 1} of ${results.length}` : "0 of 0";
    const disabled = !hasResults;
    searchPrev.disabled = disabled;
    searchNext.disabled = disabled;
  }

  function decideQueryOption(options: QueryOptions, esState: Readonly<EditorSearchState>) {
    const { editor } = useCore("editor");
    switch (options) {
      case "new":
        editor.commands.docSearchSetQuery(esState.query);
        return;
      case "prev":
        editor.commands.docSearchPrev();
        return;
      case "next":
        editor.commands.docSearchNext();
        return;
      case "clear":
        editor.commands.docSearchClear();
        return;
      case "replace-one":
        editor.commands.docSearchSetReplacement(esState.replaceText);
        editor.commands.docSearchReplaceCurrent();
        return;
      case "replace-all":
        editor.commands.docSearchSetReplacement(esState.replaceText);
        editor.commands.docSearchReplaceAll();
        return;
      default:
        options satisfies never;
    }
  }

  function changeDisplay(...[queryOptions, esState, options]: ChangeDisplayArgs) {
    const { searchInputEditor } = useUI("searchInputEditor");
    decideQueryOption(queryOptions, esState);
    if (queryOptions === "new") {
      esState.isOpen = true;
    } else if (queryOptions === "clear") {
      const { editor } = useCore("editor");
      const { replaceInputEditor } = useUI("replaceInputEditor");
      resetEditorSearchState(esState);
      searchInputEditor.value = "";
      replaceInputEditor.value = "";
      editor.commands.focus();
    }
    renderEditorSearch(esState);
    if (queryOptions === "new" && options?.focus) {
      searchInputEditor.focus();
      searchInputEditor.select();
    }
  }

  const debouncedSearch = debounce((e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const value = e.target.value.trim();
    if (value === esState.query) return;
    esState.query = value;
    changeDisplay("new", esState);
  }, DEBOUNCE_MS.normal);

  const unsubAppEvents = appEvents.onMany({
    [APP_EVENTS.TOGGLE_EDITOR_SEARCH]: () => {
      const isHidden = !esState.isOpen;
      const globalQuery = stateStore.get("searchQuery") ?? "";
      if (globalQuery.trim().length > MIN_SEARCH_LENGTH && isHidden) {
        esState.query = globalQuery;
      }
      isHidden ? changeDisplay("new", esState, { focus: true }) : changeDisplay("clear", esState);
    },
    [APP_EVENTS.SYNC_EDITOR_SEARCH]: ({ query }: { query: SearchQuery }) => {
      if (query.trim().length > MIN_SEARCH_LENGTH) {
        esState.query = query;
        changeDisplay("new", esState);
      }
    },
  });

  const triggerReplace = (mode: "replace-one" | "replace-all") => {
    debouncedSearch.cancel();
    const currentVal = searchInputEditor.value.trim();
    if (currentVal !== esState.query) {
      esState.query = currentVal;
      changeDisplay("new", esState);
    }
    if (esState.query.length <= MIN_SEARCH_LENGTH) return;
    esState.replaceText = replaceInputEditor.value;
    changeDisplay(mode, esState);
  };

  const chevronButtonClickHandler = () => {
    esState.isReplaceOpen = !esState.isReplaceOpen;
    renderEditorSearch(esState);
    if (esState.isReplaceOpen) {
      replaceInputEditor.focus();
    }
  };

  const searchInputEditorKeydownHandler = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      debouncedSearch.cancel();
      const currentVal = searchInputEditor.value.trim();
      if (currentVal !== esState.query) {
        esState.query = currentVal;
        changeDisplay("new", esState);
      } else {
        changeDisplay(event.shiftKey ? "prev" : "next", esState);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      debouncedSearch.cancel();
      changeDisplay("clear", esState);
    }
  };

  const replaceInputEditorKeydownHandler = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.key === "Enter") {
      event.preventDefault();
      const isMod = event.metaKey || event.ctrlKey;
      triggerReplace(event.altKey && isMod ? "replace-all" : "replace-one");
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      debouncedSearch.cancel();
      changeDisplay("clear", esState);
    }
  };

  const replaceInputHandler = () => {
    esState.replaceText = replaceInputEditor.value;
  };
  replaceInputEditor.addEventListener("input", replaceInputHandler);

  const editorWrapperKeydownHandler = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      if (!esState.isOpen) {
        esState.query = stateStore.get("searchQuery") ?? "";
      }
      changeDisplay("new", esState, { focus: true });
    } else if (event.key === "Escape" && esState.isOpen) {
      event.preventDefault();
      debouncedSearch.cancel();
      changeDisplay("clear", esState);
    }
  };

  const documentClickHandler = (event: MouseEvent) => {
    if (!esState.isOpen || !(event.target instanceof Element)) return;
    const clickedInput = inputWrapperEditor.contains(event.target);
    const clickedReplace = replaceInputWrapper.contains(event.target);
    const clickedToolbar = event.target.closest("#toolbar");
    if (clickedInput || clickedReplace || clickedToolbar) return;
    debouncedSearch.cancel();
    changeDisplay("clear", esState);
  };

  const navClickHandler = (event: MouseEvent) => {
    changeDisplay(event.currentTarget === searchPrev ? "prev" : "next", esState);
  };

  const replaceClickHandler = (event: MouseEvent) => {
    triggerReplace(event.currentTarget === replaceOne ? "replace-one" : "replace-all");
  };

  chevronButton.addEventListener("click", chevronButtonClickHandler);
  searchInputEditor.addEventListener("keydown", searchInputEditorKeydownHandler);
  replaceInputEditor.addEventListener("keydown", replaceInputEditorKeydownHandler);
  searchPrev.addEventListener("click", navClickHandler);
  searchNext.addEventListener("click", navClickHandler);
  replaceOne.addEventListener("click", replaceClickHandler);
  replaceAll.addEventListener("click", replaceClickHandler);
  editorWrapper.addEventListener("keydown", editorWrapperKeydownHandler);
  document.addEventListener("click", documentClickHandler);
  searchInputEditor.addEventListener("input", debouncedSearch);

  return function unsubscribe() {
    unsubAppEvents();
    debouncedSearch.cancel();
    searchInputEditor.removeEventListener("input", debouncedSearch);
    replaceInputEditor.removeEventListener("input", replaceInputHandler);
    chevronButton.removeEventListener("click", chevronButtonClickHandler);
    searchInputEditor.removeEventListener("keydown", searchInputEditorKeydownHandler);
    replaceInputEditor.removeEventListener("keydown", replaceInputEditorKeydownHandler);
    searchPrev.removeEventListener("click", navClickHandler);
    searchNext.removeEventListener("click", navClickHandler);
    replaceOne.removeEventListener("click", replaceClickHandler);
    replaceAll.removeEventListener("click", replaceClickHandler);
    editorWrapper.removeEventListener("keydown", editorWrapperKeydownHandler);
    document.removeEventListener("click", documentClickHandler);
  };
}

export { initEditorSearch };
