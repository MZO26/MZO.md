import { search, showNotification } from "@/api/api";
import { rendererLogger } from "@/app";
import { getTextMetrics } from "@/extensions/text-metrics";
import { handleImportNote } from "@/notes/note-actions";
import { stateStore } from "@/state/state";
import {
  applySearch,
  applyTagView,
  applyUntaggedView,
  restoreSidebarScope,
} from "@/state/state-helpers";
import { debounce } from "@/utils/async";
import { createIconButton, createInfoSpan, requireElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import {
  estimateReadingTime,
  getExtension,
  isValidExtension,
} from "@/utils/note";
import { getAppItem, getUIItems } from "@/utils/registry";
import { createGlobalSpinner } from "@/utils/ui";
import {
  DEBOUNCE_MS,
  MAX_FILE_DROPS,
  MAX_SEARCH_LENGTH,
} from "@shared/constants";
import type { SearchQuery } from "@shared/schemas/note-schema";
import type { FilePathRequest } from "@shared/schemas/request-schema";
import type { ResizeOptions } from "@shared/types";

async function handleSearch(searchInput: SearchQuery) {
  const nextQuery = searchInput.trim();
  if (nextQuery.length > MAX_SEARCH_LENGTH) return;
  const prevQuery = stateStore.get("searchQuery");
  if (nextQuery === prevQuery) {
    rendererLogger.devLog("Same query. Skipping search");
    return;
  }
  stateStore.setState({ searchQuery: nextQuery });
  if (!nextQuery) {
    restoreSidebarScope();
    return;
  }
  const result = await search(nextQuery);
  if (!result.success) {
    rendererLogger.appError("[handleSearch]: Failed to search:", result.error);
    return;
  }
  const data = result.data.map((row) => {
    const { search_match, ...rest } = row;
    return {
      ...rest,
      snippet: row.search_match,
    };
  });
  applySearch(data);
}

function updateStats() {
  const editor = getAppItem("editor");
  const { wordCountEl, charCountEl, readingTime } = getUIItems([
    "wordCountEl",
    "charCountEl",
    "readingTime",
  ]);
  const { characters, words } = getTextMetrics(editor);
  charCountEl.textContent =
    characters === 1 ? "1 character" : `${characters} characters`;
  wordCountEl.textContent = words === 1 ? "1 word" : `${words} words`;
  readingTime.textContent = estimateReadingTime(words);
}

type AllTagsMenu = {
  popover: HTMLDivElement;
  content: HTMLDivElement;
  render(tags: string[]): void;
  toggle(): void;
  open(): void;
  close(): void;
};

let allTagsMenu: AllTagsMenu | null = null;

function createAllTagsPopover(button: HTMLButtonElement): AllTagsMenu {
  const popover = document.createElement("div");
  const content = document.createElement("div");
  let isOpen = false;
  popover.className = "tags-popover";
  content.className = "tags-popover-content";
  const header = createInfoSpan("All Tags", "tags-popover-title");
  const untaggedButton = createIconButton("tag-x", "Untagged");
  untaggedButton.type = "button";
  untaggedButton.className = "untagged-btn";
  header.appendChild(untaggedButton);
  popover.append(header, content);
  document.body.appendChild(popover);
  renderIcons(popover);

  function positionPopover() {
    const rect = button.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY}px`;
    popover.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
    popover.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
  }

  function open() {
    if (isOpen) return;
    positionPopover();
    popover.classList.remove("hidden");
    isOpen = true;
  }

  function close() {
    if (!isOpen) return;
    popover.classList.add("hidden");
    isOpen = false;
  }

  function toggle() {
    isOpen ? close() : open();
  }

  popover.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(".untagged-btn")) {
      applyUntaggedView();
      close();
      return;
    }
    const tagElement = target.closest<HTMLSpanElement>(".tag");
    const tag = tagElement?.dataset["tag"];
    if (tag) {
      applyTagView(tag);
      close();
    }
  });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (popover.contains(target) || button.contains(target)) return;
    close();
  });

  return {
    popover,
    content,
    render(tags) {
      const uniqueSortedTags = [...new Set(tags)].sort((a, b) =>
        a.localeCompare(b),
      );
      if (uniqueSortedTags.length === 0) {
        content.replaceChildren(createInfoSpan("No tags here."));
        return;
      }
      const frag = document.createDocumentFragment();
      for (const tag of uniqueSortedTags) {
        const item = document.createElement("span");
        item.className = "tags-popover-item tag";
        item.dataset["tag"] = tag;
        item.title = `#${tag}`;
        item.textContent = `#${tag}`;
        frag.appendChild(item);
      }
      content.replaceChildren(frag);
    },
    toggle,
    open,
    close,
  };
}

function showAllTagsMenu(button: HTMLButtonElement, tags: string[]) {
  const menu = (allTagsMenu ??= createAllTagsPopover(button));
  menu.render(tags);
  menu.toggle();
}

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

function setupSidebarFileDrop(sidebar: HTMLDivElement) {
  const setActive = (active: boolean) => {
    sidebar.classList.toggle("is-drop-target", active);
  };

  const hasFiles = (event: DragEvent) =>
    event.dataTransfer?.types.includes("Files") ?? false;

  const handleDragOver = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setActive(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const relatedTarget = event.relatedTarget as Node | null;
    if (!sidebar.contains(relatedTarget)) {
      setActive(false);
    }
  };

  const handleDrop = async (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setActive(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > MAX_FILE_DROPS) {
      await showNotification(
        "File Drop Limit Exceeded",
        `You can only drop up to ${MAX_FILE_DROPS} files at once.`,
      );
      return;
    }
    const validFilePaths = new Set<string>();
    for (const file of files) {
      if (!isValidExtension(getExtension(file.name))) continue;
      const filePath = window.electronAPI.getPathForFile?.(file);
      if (filePath) validFilePaths.add(filePath);
    }
    if (validFilePaths.size === 0) return;
    const request: FilePathRequest = {
      source: "external",
      filePaths: Array.from(validFilePaths),
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

// debounced functions

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;
  const value = (target.value ?? "").trim();
  handleSearch(value);
}, DEBOUNCE_MS.very_fast);

export {
  applyTagView,
  createInfoSpan,
  debouncedSearch,
  resizeSidebar,
  setupSidebarFileDrop,
  showAllTagsMenu,
  updateStats,
};
