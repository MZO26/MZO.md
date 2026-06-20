import { getViews } from "@/api/api";
import { updateSnippetHighlight } from "@/components/sidebar/sidebar-note-items";
import { noteStore, searchEngine, stateStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import { estimateReadingTime } from "@/utils/note";
import { getAppItem, getUIItems } from "@/utils/registry";
import { DEBOUNCE_MS, MAX_CHARS, PADDING } from "@shared/constants";
import type { ResizeOptions, SnippetCacheValue, ViewId } from "@shared/types";

// sidebar

// search handled by fuse

function showSearchItems(
  noteElements: HTMLDivElement[],
  searchCache: Map<string, SnippetCacheValue>,
) {
  const noteIndex = noteStore.get("noteIndex");
  for (const element of noteElements) {
    const noteId = element.getAttribute("data-id");
    if (!noteId) continue;
    const matchData = searchCache.get(noteId);
    const contentEl = findElement<HTMLDivElement>(".note-content", element);
    if (!contentEl) continue;
    if (matchData) {
      updateSnippetHighlight(contentEl, matchData.snippet, matchData.indices);
    } else {
      const note = noteIndex.get(noteId);
      if (note && contentEl.textContent !== note.snippet) {
        contentEl.textContent = note.snippet;
      }
    }
  }
}

function applySearch(searchCache: Map<string, SnippetCacheValue>) {
  const matchedIds = [...searchCache.keys()];
  noteStore.setState({
    visibleIds: matchedIds,
    sidebarChange: { type: "reload" },
  });
}

function search(searchInput: string) {
  const results = searchEngine.search(searchInput);
  // holds id together with highlighted snippet text and indices where the match was found
  const searchCache = new Map<string, SnippetCacheValue>();
  // replace symbols
  const safeTerm = searchInput.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!safeTerm || searchInput.trim().length < 2) {
    // don't show highlight if search result is < 2. Else too many random matches would be found. Keeps indices array empty
    for (const { item: note } of results) {
      searchCache.set(note.id, { snippet: note.snippet, indices: [] });
    }
  } else {
    // case insensitive
    const exactRegex = new RegExp(safeTerm, "gi");
    for (const { item: note } of results) {
      const fullText = note.plainText ?? "";
      const firstMatch = exactRegex.exec(fullText);
      exactRegex.lastIndex = 0;
      if (!firstMatch) {
        searchCache.set(note.id, { snippet: note.snippet, indices: [] });
        continue;
      }
      const phraseStart = firstMatch.index;
      // Math.max(0) to prevent negative index if matched word is at the start of the document. PADDING ensures context for the snippet
      let winStart = Math.max(0, phraseStart - PADDING);
      let winEnd = winStart + MAX_CHARS;
      // if character window overshoots total length of the plainText of the document, it recalculates winStart from winEnd backwards 47 chars
      if (winEnd > fullText.length) {
        winEnd = fullText.length;
        winStart = Math.max(0, winEnd - MAX_CHARS);
      }
      // creates the snippet from the two variables
      const snippet =
        fullText.slice(winStart, winEnd) +
        (winEnd < fullText.length ? "..." : "");
      const indices: [number, number][] = [];
      for (const match of fullText.matchAll(exactRegex)) {
        const start = match.index;
        const end = start + match[0].length - 1; // 0-indexed
        if (start >= winStart && end < winEnd) {
          // creates indices based on global positions and start of the frame containing 47 chars for the snippet
          indices.push([start - winStart, end - winStart]);
        }
      }
      searchCache.set(note.id, { snippet, indices });
    }
  }
  return searchCache; // returns to be highlighted snippets
}

function handleSearchInput(searchInput: string) {
  const sidebar = getAppItem("sidebar");
  stateStore.setState({ searchQuery: searchInput });
  if (searchInput === "") {
    noteStore.setState((state) => ({
      visibleIds: state.notes.map((n) => n.id),
      sidebarChange: { type: "reload" },
    }));
    return;
  }
  const searchCache = search(searchInput);
  applySearch(searchCache);
  const noteElements = Array.from(
    sidebar.getElementsByClassName("note-item"),
  ) as HTMLDivElement[];
  showSearchItems(noteElements, searchCache);
}

// views handled by db

async function handleViews(view: ViewId) {
  const activeId = stateStore.getState().activeId;
  stateStore.setState({ searchQuery: "" });
  const result = await getViews(view, activeId);
  if (!result.success) {
    console.error("[handleViews]: Failed to fetch views:", result.error);
    return;
  }
  noteStore.setState({
    visibleIds: result.data.map((n) => n.id),
    sidebarChange: { type: "reload" },
  });
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

// resizing logic

function resizeSidebar(
  resizerSelector: string,
  sidebarSelector: string,
  options: ResizeOptions = {},
) {
  const {
    minWidth = 0,
    maxWidth = 450,
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

//------------------------------------------------------------

// debounced functions

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement | null;
  const value = target?.value.trim();
  handleSearchInput(value ?? "");
}, DEBOUNCE_MS.fast);

export {
  debouncedSearch,
  handleSearchInput,
  handleViews,
  resizeSidebar,
  updateStats,
};
