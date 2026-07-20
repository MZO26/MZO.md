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

//-----------------------------------------------------------

// sidebar change handler for note items

function refreshSidebar(notes: NoteListItem[]) {
  renderNoteList(notes);
  handleSidebarEmptyState();
}

//----------------------------------------------------------

// snippet highlighter for note items

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSnippet(
  snippet: string,
  queryTerms: readonly string[],
): { snippet: string; indices: [number, number][] } {
  const terms = [
    ...new Set(
      queryTerms.map((term) => term.trim()).filter((term) => term.length >= 2),
    ),
  ];
  if (terms.length === 0) {
    return { snippet, indices: [] };
  }
  const regex = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
  const indices: [number, number][] = [];
  for (const match of snippet.matchAll(regex)) {
    const start = match.index ?? 0;
    indices.push([start, start + match[0].length - 1]);
  }
  return { snippet, indices };
}

function updateSnippetHighlight(
  noteElement: HTMLDivElement,
  snippet: string,
  indices: [number, number][],
) {
  const contentEl = findElement<HTMLDivElement>(".note-content", noteElement);
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

export { buildSnippet, createNoteItem, refreshSidebar, updateSnippetHighlight };
