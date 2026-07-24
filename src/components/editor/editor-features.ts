import { getRequestExtensions } from "@/components/editor/editor-init";
import { debounce } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { waitForPaint } from "@/utils/note";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS } from "@shared/constants";
import { Editor } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { getSearchState } from "prosemirror-search";

let editorExtensions: ReturnType<typeof getRequestExtensions> | undefined;
let markdownManager: MarkdownManager | undefined;

function getCachedEditorExtensions() {
  return (editorExtensions ??= getRequestExtensions());
}

function getMarkdownManager() {
  return (markdownManager ??= new MarkdownManager({
    extensions: getCachedEditorExtensions(),
  }));
}

function hasSearchMatch(editor: Editor): boolean {
  const searchState = getSearchState(editor.state);
  if (!searchState?.query.search) return false;
  return !!searchState.query.findNext(editor.state, 0);
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

  chevronBtn.addEventListener("click", () => {
    const isHidden = replaceInputWrapper.classList.toggle("invisible");
    chevronBtn.classList.toggle("open", !isHidden);
    if (!isHidden) replaceInput.focus();
  });

  function updateButtons() {
    const disabled = input.value.trim() === "" || !hasSearchMatch(editor);
    inputWrapper
      .querySelectorAll<HTMLButtonElement>(".search-prev, .search-next")
      .forEach((button) => {
        button.disabled = disabled;
      });
  }

  function syncQuery() {
    editor.commands.setSearchTerm({
      searchTerm: input.value,
      replaceTerm: replaceInput.value,
    });
  }

  function open() {
    inputWrapper.classList.remove("invisible");
    input.focus();
    input.select();
    updateButtons();
  }

  function close() {
    input.value = "";
    replaceInput.value = "";
    inputWrapper.classList.add("invisible");
    replaceInputWrapper.classList.add("invisible");
    chevronBtn.classList.remove("open");
    editor.commands.clearSearch();
    updateButtons();
  }

  async function scrollToSelection(editor: Editor, container: HTMLDivElement) {
    const pos = editor.state.selection.from;
    await waitForPaint(2);
    const coords = editor.view.coordsAtPos(pos);
    const editorRect = editor.view.dom.getBoundingClientRect();
    const targetTop = coords.top - editorRect.top;
    container.scrollTo({
      top: Math.max(0, targetTop - container.clientHeight / 2),
      behavior: "auto",
    });
  }

  function goPrev() {
    editor.commands.findPrev();
    void scrollToSelection(editor, editorWrapper).catch(console.error);
  }

  function goNext() {
    editor.commands.findNext();
    void scrollToSelection(editor, editorWrapper).catch(console.error);
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
    if (target.closest(".replace-one")) {
      event.preventDefault();
      syncQuery();
      editor.commands.replaceNext();
      return;
    } else if (target.closest(".replace-all")) {
      event.preventDefault();
      syncQuery();
      editor.commands.replaceAll();
      return;
    }
  });

  const debouncedSearch = debounce(() => {
    syncQuery();
    updateButtons();
    goNext();
  }, DEBOUNCE_MS.normal);

  input.addEventListener("input", debouncedSearch);

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
        editor.commands.replaceAll();
      } else {
        editor.commands.replaceNext();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  editorWrapper.addEventListener("keydown", (event) => {
    const isFind =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
    if (!isFind) return;
    event.preventDefault();
    open();
  });

  updateButtons();
  return { open, close };
}

export { getCachedEditorExtensions, getMarkdownManager, initEditorSearch };
