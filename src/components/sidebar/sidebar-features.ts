import { showNotification } from "@/api/api";
import {
  buildSnippet,
  updateSnippetHighlight,
} from "@/components/sidebar/sidebar-note-items";
import { handleImportNote } from "@/notes/note-actions";
import type { SearchMatchResult } from "@/notes/search";
import {
  applySearch,
  applyTagView,
  applyUntaggedView,
  noteStore,
  restoreSidebarScope,
  searchEngine,
  stateStore,
} from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { createIconButton, createInfoSpan, requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { estimateReadingTime, getExtension } from "@/utils/note";
import { getAppItem, getUIItems } from "@/utils/registry";
import { createGlobalSpinner, initTippyDelegate } from "@/utils/ui";
import {
  CONTENT_TYPE_MAP,
  DEBOUNCE_MS,
  MAX_FILE_DROPS,
} from "@shared/constants";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import type { ResizeOptions } from "@shared/types";
import tippy from "tippy.js";

export let allTagsMenu: ReturnType<typeof createAllTagsPopover> | null = null;

function handleSearchInput(searchInput: string) {
  const sidebar = getAppItem("sidebar");
  const nextQuery = searchInput.trim();
  const prevQuery = stateStore.get("searchQuery");
  if (nextQuery === prevQuery) return;
  stateStore.setState({ searchQuery: nextQuery });
  if (!nextQuery) {
    restoreSidebarScope();
    return;
  }
  const results = nextQuery.startsWith("#")
    ? searchEngine.searchTags(nextQuery.slice(1))
    : searchEngine.search(nextQuery);
  applySearch(results);
  const noteElements = Array.from(
    sidebar.getElementsByClassName("note-item"),
  ) as HTMLDivElement[];
  updateSearchHighlights(noteElements, results);
}

function updateSearchHighlights(
  noteElements: HTMLDivElement[],
  results: SearchMatchResult[],
) {
  const resultsById = new Map(
    results.map((result) => [result.item.id, result]),
  );
  const noteIndex = noteStore.get("noteIndex");
  for (const noteElement of noteElements) {
    const noteId = noteElement.getAttribute("data-id");
    if (!noteId) continue;
    const result = resultsById.get(noteId);
    if (result) {
      const { snippet, indices } = buildSnippet(
        result.item.plainText ?? "",
        result.item.snippet,
        result.queryTerms,
      );
      updateSnippetHighlight(noteElement, snippet, indices);
      continue;
    }
    const note = noteIndex.get(noteId);
    if (!note) continue;
    updateSnippetHighlight(noteElement, note.snippet, []);
  }
}

//------------------------------------------------------------

// footer-bar

function updateStats() {
  const editor = getAppItem("editor");
  const { wordCountEl, charCountEl, readingTime } = getUIItems([
    "wordCountEl",
    "charCountEl",
    "readingTime",
  ]);
  const charCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();
  charCountEl.textContent = charCount.toString();
  wordCountEl.textContent = wordCount === 1 ? "1 word" : `${wordCount} words`;
  readingTime.textContent = estimateReadingTime(wordCount);
}

//------------------------------------------------------------

// sidebar-header all tag button

function createAllTagsPopover(button: HTMLButtonElement) {
  const popover = document.createElement("div");
  popover.className = "tags-popover";
  const content = document.createElement("div");
  content.className = "tags-popover-content";
  const allTagsSpan = createInfoSpan("All Tags", "tags-popover-title");
  const untaggedButton = createIconButton("tag-x", "Untagged");
  untaggedButton.className = "untagged-btn";
  allTagsSpan.appendChild(untaggedButton);
  popover.append(allTagsSpan, content);
  renderIcons(popover);
  popover.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const button = target.closest<HTMLButtonElement>(".untagged-btn");
    if (button) {
      applyUntaggedView();
      return;
    }
    const clickedTag = target.closest<HTMLSpanElement>(".tag-node");
    const tagId = clickedTag?.getAttribute("data-tag");
    if (clickedTag && tagId) {
      applyTagView(tagId);
      return;
    }
  });
  const instance = tippy(button, {
    content: popover,
    trigger: "manual",
    interactive: true,
    theme: "preview-theme",
    appendTo: () => document.body,
  });
  initTippyDelegate(popover, popover, "auto", false);
  renderIcons(button);
  return { button, popover, content, tippy: instance };
}

function renderAllTags(button: HTMLButtonElement, tags: string[]) {
  const menu = (allTagsMenu ??= createAllTagsPopover(button));
  if (tags.length === 0) {
    const span = createInfoSpan("No tags here.");
    menu.content.replaceChildren(span);
    return;
  }
  const frag = document.createDocumentFragment();
  const uniqueSortedTags = [...new Set(tags)].sort((a, b) =>
    a.localeCompare(b),
  );
  for (const tag of uniqueSortedTags) {
    const item = document.createElement("span");
    item.className = "tags-popover-item tag-node";
    item.setAttribute("data-tippy-content", `#${tag}`);
    item.dataset["tag"] = tag;
    item.textContent = `#${tag}`;
    frag.appendChild(item);
  }
  menu.content.replaceChildren(frag);
}

//-------------------------------------------------------------

// resizing logic

function resizeSidebar(
  resizerSelector: string,
  sidebarSelector: string,
  options: ResizeOptions = {},
) {
  const {
    minWidth = 0,
    maxWidth = 420,
    cssVariable = "--sidebar-width",
  } = options;
  const resizer = requireElement<HTMLDivElement>(resizerSelector);
  const sidebar = requireElement<HTMLDivElement>(sidebarSelector);
  let isResizing = false;
  let isUpdatePending = false;
  let startX = 0;
  let startWidth = 0;
  resizer.addEventListener("pointerdown", (e: PointerEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    resizer.setPointerCapture(e.pointerId);
    document.body.classList.add("is-dragging");
    document.body.style.userSelect = "none";
  });

  document.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isResizing || isUpdatePending) return;
    isUpdatePending = true;
    requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const adjustedWidth = startWidth + deltaX;
      const newWidth = Math.max(minWidth, Math.min(adjustedWidth, maxWidth));

      document.documentElement.style.setProperty(cssVariable, `${newWidth}px`);
      isUpdatePending = false;
    });
  });

  document.addEventListener("pointerup", (e: PointerEvent) => {
    if (isResizing) {
      isResizing = false;
      if (resizer.hasPointerCapture(e.pointerId)) {
        resizer.releasePointerCapture(e.pointerId);
      }
      document.body.classList.remove("is-dragging");
      document.body.style.userSelect = "";
    }
  });
}

//---------------------------------------------------------

// file drop logic

function setupSidebarFileDrop(sidebar: HTMLDivElement) {
  const setActive = (active: boolean) => {
    sidebar.classList.toggle("is-drop-target", active);
  };

  const hasFiles = (event: DragEvent) =>
    event.dataTransfer?.types.includes("Files") ?? false;

  const handleDragOver = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setActive(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    const relatedTarget = event.relatedTarget as Node | null;
    if (!sidebar.contains(relatedTarget)) {
      setActive(false);
    }
  };

  const handleDrop = async (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setActive(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > MAX_FILE_DROPS) {
      await showNotification(
        "File Drop Limit Exceeded",
        `You can only drop up to ${MAX_FILE_DROPS} files at once.`,
      );
      return;
    }
    const validFilePaths = files.flatMap((file) => {
      const extension = getExtension(file.name);
      if (!(extension in CONTENT_TYPE_MAP) && !(extension === "txt")) {
        return [];
      }
      const filePath = window.electronAPI?.getPathForFile?.(file);
      return filePath ? [filePath] : [];
    });
    if (validFilePaths.length === 0) return;
    const request: FilePathRequest = {
      source: "external",
      filePaths: validFilePaths,
    };
    const loading = createGlobalSpinner(0);
    await loading.wrap(async () => {
      await handleImportNote(request);
    });
  };

  sidebar.addEventListener("dragover", handleDragOver);
  sidebar.addEventListener("drop", handleDrop);
  sidebar.addEventListener("dragleave", handleDragLeave);
}
//------------------------------------------------------------

// debounced functions

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;
  const value = (target.value ?? "").trim();
  handleSearchInput(value);
}, DEBOUNCE_MS.very_fast);

export {
  applyTagView,
  createIconButton,
  createInfoSpan,
  debouncedSearch,
  handleSearchInput,
  renderAllTags,
  resizeSidebar,
  setupSidebarFileDrop,
  updateStats,
};
