import {
  handleSidebarEmptyState,
  renderNoteList,
} from "@/components/sidebar/sidebar-ui";
import { settingsStore } from "@/settings/app-state";
import { formatNoteDate } from "@/utils/date";
import { findElement } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { getTemplateItem } from "@/utils/registry";
import { UNTITLED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { SidebarChange } from "@shared/types";

let cachedNoteItem: HTMLDivElement | null = null;

function createNoteItem(note: NoteListItem) {
  cachedNoteItem ??= getTemplateItem("noteItemTemplate").content
    .firstElementChild as HTMLDivElement;
  const item = cachedNoteItem.cloneNode(true) as HTMLDivElement;
  const display = settingsStore.get("note_item_display");
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  item.setAttribute("data-tippy-content", note.title);
  if (note.pinned) renderIcons(item);
  const titleEl = findElement<HTMLSpanElement>(".note-title", item);
  if (titleEl) titleEl.textContent = note.title.trim() || UNTITLED;
  const dateEl = findElement<HTMLDivElement>(".note-date", item);
  if (dateEl) dateEl.textContent = formatNoteDate(note.updated_at);
  const contentEl = findElement<HTMLDivElement>(".note-content", item);
  if (contentEl) {
    contentEl.textContent = display === "preview" ? note.snippet : "";
  }
  const tagsContainer = findElement<HTMLDivElement>(".note-tags", item);
  if (tagsContainer) {
    tagsContainer.replaceChildren();
    if (display === "tags") {
      for (const tag of note.tags ?? []) {
        const span = document.createElement("span");
        span.classList.add("tag");
        span.setAttribute("data-tippy-content", `#${tag}`);
        span.textContent = `#${tag}`;
        tagsContainer.append(span);
      }
    }
  }
  return item;
}

//-------------------------------------------------------------

// sidebar change handler for note items

function handleSidebarChange(change: SidebarChange, notes: NoteListItem[]) {
  if (!change) return;
  switch (change.type) {
    case "remove":
    case "reload":
    case "update":
    case "add":
      renderNoteList(notes);
      break;
  }
  handleSidebarEmptyState();
}
//-------------------------------------------------------------

// snippet highlighter for note items

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSnippet(
  plainText: string,
  fallbackSnippet: string,
  queryTerms: readonly string[],
  maxChars = 50,
): { snippet: string; indices: [number, number][] } {
  const terms = [
    ...new Set(
      queryTerms.map((term) => term.trim()).filter((term) => term.length >= 2),
    ),
  ];
  const fallback =
    fallbackSnippet.length > maxChars
      ? fallbackSnippet.slice(0, maxChars - 3) + "..."
      : fallbackSnippet;
  if (!plainText || terms.length === 0) {
    return { snippet: fallback, indices: [] };
  }
  const lowerText = plainText.toLowerCase();
  const matchIndex = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .find((index) => index >= 0);
  if (matchIndex == null || matchIndex < 0) {
    return { snippet: fallback, indices: [] };
  }
  const isTruncated = plainText.length > maxChars;
  const contentLength = isTruncated ? maxChars - 3 : maxChars;
  let start = Math.max(0, matchIndex - Math.floor(contentLength / 2));
  let end = Math.min(plainText.length, start + contentLength);
  start = Math.max(0, end - contentLength);
  let snippet = plainText.slice(start, end);
  const indices: [number, number][] = [];
  const regex = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
  for (const match of snippet.matchAll(regex)) {
    const i = match.index ?? 0;
    indices.push([i, i + match[0].length - 1]);
  }
  if (end < plainText.length) {
    snippet += "...";
  }
  return { snippet, indices };
}

function updateSnippetHighlight(
  noteElement: HTMLDivElement,
  snippet: string,
  indices: [number, number][],
) {
  const contentEl = findElement(".note-content", noteElement);
  if (!contentEl) return;
  if (indices.length === 0) {
    contentEl.textContent = snippet;
    return;
  }
  const nodes: (string | HTMLElement)[] = [];
  let cursor = 0;
  for (const [start, end] of indices) {
    if (start > cursor) {
      nodes.push(snippet.slice(cursor, start));
    }
    const mark = document.createElement("mark");
    mark.textContent = snippet.slice(start, end + 1);
    nodes.push(mark);
    cursor = end + 1;
  }
  if (cursor < snippet.length) {
    nodes.push(snippet.slice(cursor));
  }
  contentEl.replaceChildren(...nodes);
}

export {
  buildSnippet,
  createNoteItem,
  handleSidebarChange,
  updateSnippetHighlight,
};
