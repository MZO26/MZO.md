import { getManyById, getViews } from "@/api/api";
import { updateSnippetHighlight } from "@/components/sidebar/sidebar-note-items";
import { showTodoProgress } from "@/components/sidebar/sidebar-ui";
import { noteStore, searchEngine, stateStore } from "@/settings/app-state";
import { debounce } from "@/utils/async";
import { formatNoteDate } from "@/utils/date";
import { findElement, requireElement } from "@/utils/dom";
import { estimateReadingTime } from "@/utils/note";
import { getAppItem, getInfobarItem, getInfobarItems } from "@/utils/registry";
import { DEBOUNCE_MS, MAX_CHARS, PADDING } from "@shared/constants";
import type { Note } from "@shared/schemas/note-schema";
import type { ResizeOptions, SnippetCacheValue, View } from "@shared/types";

// sidebar

// search handled by fuse

function handleSearchInput(searchInput: string) {
  const editor = getAppItem("editor");
  const sidebar = getAppItem("sidebar");
  stateStore.setState({ searchQuery: searchInput });
  editor.commands.setSearchTerm(searchInput);
  const noteElements = Array.from(
    sidebar.getElementsByClassName("note-item"),
  ) as HTMLDivElement[];
  // revert ui to normal if search input is empty and go back to normal content snippets instead of highlight snippets as well as unhide any note item
  if (searchInput === "") {
    for (const element of noteElements) {
      element.classList.remove("hidden");
      const contentEl = findElement<HTMLDivElement>(".note-content", element);
      const noteId = element.getAttribute("data-id");
      const note = noteStore.get("notes").find((n) => n.id === noteId);
      if (contentEl && note) contentEl.textContent = note.snippet;
    }
    return;
  }
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
  // for fast lookups to avoid calling note store everytime
  const noteMap = new Map(noteStore.get("notes").map((n) => [n.id, n]));
  for (const element of noteElements) {
    const noteId = element.getAttribute("data-id");
    if (!noteId) continue;
    const matchData = searchCache.get(noteId);
    const isMatch = matchData !== undefined;
    element.classList.toggle("hidden", !isMatch);
    const contentEl = findElement<HTMLDivElement>(".note-content", element);
    if (!contentEl) continue;
    if (isMatch) {
      updateSnippetHighlight(contentEl, matchData.snippet, matchData.indices);
    } else {
      const note = noteMap.get(noteId);
      if (note && contentEl.textContent !== note.snippet) {
        contentEl.textContent = note.snippet;
      }
    }
  }
}

// views handled by db

async function handleViews(view: View) {
  const editor = getAppItem("editor");
  stateStore.setState({ searchQuery: "" });
  editor.commands.setSearchTerm("");
  const result = await getViews(view);
  if (!result.success) {
    console.error("[handleViews]: Failed to fetch views:", result.error);
    return;
  }
  noteStore.setState({ notes: result.data, sidebarChange: { type: "reload" } });
}

//------------------------------------------------------------

// info-sidebar

function updateInfoHeader(date: Note["created_at"], title: Note["title"]) {
  const container = getInfobarItem("headerContainer");
  if (!container) return;
  container.replaceChildren();
  if (!date || !title) return;
  const formattedDate = formatNoteDate(date);
  const span = document.createElement("span");
  const h4 = document.createElement("h4");
  span.classList.add("info-span");
  span.textContent = formattedDate;
  h4.classList.add("note-title");
  h4.textContent = title.trim();
  container.append(span, h4);
}

function updateNoteTags(tags: Note["tags"]) {
  const container = getInfobarItem("tagContainer");
  if (!container) return;
  container.replaceChildren();
  if (!tags || tags.length === 0) return;
  for (const tag of tags) {
    const span = document.createElement("span");
    span.classList.add("tag", "searchTag");
    span.setAttribute("data-tag", String(tag));
    span.textContent = `#${tag}`;
    container.append(span);
  }
}

async function updateNoteLinks(links: Note["links"]) {
  const container = getInfobarItem("linkContainer");
  if (!container) return;
  container.replaceChildren();
  if (!links || links.length === 0) return;
  const ids: string[] = links.map((link) => link.id);
  const relatedNotes = await getManyById(ids);
  if (!relatedNotes.success) {
    console.error(
      "[updateNoteLinks]: Failed to fetch linked notes:",
      relatedNotes.error,
    );
    return;
  }
  const linkMap = new Map<string, string>();
  for (const note of relatedNotes.data) {
    linkMap.set(note.id, note.title.trim());
  }
  for (const link of links) {
    const span = document.createElement("span");
    span.classList.add("link");
    span.setAttribute("data-link", link.id);
    span.textContent = `${link.dir}: ${linkMap.get(link.id) ?? link.id}`;
    container.append(span);
  }
}

async function updateStats(note: Note) {
  const editor = getAppItem("editor");
  const { wordCountEl, charCountEl, readingTime } = getInfobarItems([
    "wordCountEl",
    "charCountEl",
    "readingTime",
  ]);
  const charCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();
  charCountEl.textContent = charCount.toString();
  wordCountEl.textContent = wordCount === 1 ? "1 word" : `${wordCount} words`;
  readingTime.textContent = estimateReadingTime(wordCount);
  showTodoProgress(note.content);
  updateNoteTags(note.tags);
  updateInfoHeader(note.created_at, note.title);
  await updateNoteLinks(note.links);
}

//---------------------------------------------------------

// resizing logic

function resizeSidebar(
  resizerSelector: string,
  sidebarSelector: string,
  options: ResizeOptions = {},
) {
  const {
    minWidth = 0,
    maxWidth = 600,
    cssVariable = "--sidebar-width",
    side = "left",
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
      const adjustedWidth =
        side === "right" ? startWidth - deltaX : startWidth + deltaX;
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
  const target = e.target as HTMLInputElement;
  const value = target.value.trim();
  handleSearchInput(value);
}, DEBOUNCE_MS.fast);

const debouncedUpdateStats = debounce(updateStats, DEBOUNCE_MS.slow);

export {
  debouncedSearch,
  debouncedUpdateStats,
  handleViews,
  resizeSidebar,
  updateStats,
};
