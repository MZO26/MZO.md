import {
  handleSidebarEmptyState,
  prependNoteToList,
  removeNoteFromList,
  renderNoteList,
  updateNoteInList,
} from "@/components/sidebar/sidebar-ui";
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
    .firstElementChild as HTMLDivElement; // if left side has a value it doesn't run right side. -> getTemplateItem only runs once
  const item = cachedNoteItem.cloneNode(true) as HTMLDivElement;
  // Deep clone with true
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  item.setAttribute("data-tippy-content", note.title);
  if (note.pinned) renderIcons(item);
  const titleEl = findElement<HTMLSpanElement>(".note-title", item);
  if (titleEl) titleEl.textContent = note.title.trim() || UNTITLED;
  const dateEl = findElement<HTMLDivElement>(".note-date", item);
  if (dateEl) dateEl.textContent = formatNoteDate(note.updated_at);
  const contentEl = findElement<HTMLDivElement>(".note-content", item);
  if (contentEl) contentEl.textContent = note.snippet;
  const tagsContainer = findElement<HTMLDivElement>(".note-tags", item);
  if (tagsContainer && note.tags?.length > 0) {
    tagsContainer.replaceChildren();
    for (const tag of note.tags) {
      const span = document.createElement("span");
      span.classList.add("tag");
      span.setAttribute("data-tippy-content", `#${tag}`);
      span.textContent = `#${tag}`;
      tagsContainer.append(span);
    }
  }
  return item;
}

function handleSidebarChange(change: SidebarChange, notes: NoteListItem[]) {
  if (!change) return;
  switch (change.type) {
    case "reload":
      renderNoteList(notes);
      handleSidebarEmptyState();
      break;
    case "update": {
      const note = notes.find((n) => n.id === change.noteId);
      if (note) updateNoteInList(note);
      break;
    }
    case "prepend": {
      const needsToBeSorted = notes.some((n) => n.pinned);
      if (needsToBeSorted) {
        renderNoteList(notes);
        break;
      }
      const note = notes.find((n) => n.id === change.noteId);
      if (note) prependNoteToList(note);
      break;
    }
    case "remove":
      removeNoteFromList(change.noteId);
      break;
  }
  handleSidebarEmptyState();
}

// snippet highlighter for note items

function updateSnippetHighlight(
  element: HTMLDivElement,
  snippetText: string,
  indices?: [number, number][],
) {
  if (!indices || indices.length === 0) {
    element.textContent = snippetText;
    return;
  }
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedIndices) {
    if (start < lastIndex) continue;
    if (start > lastIndex) {
      fragment.append(
        document.createTextNode(snippetText.slice(lastIndex, start)),
      );
    }
    const mark = document.createElement("mark");
    mark.textContent = snippetText.slice(start, end + 1);
    fragment.append(mark);
    lastIndex = end + 1;
  }
  if (lastIndex < snippetText.length) {
    fragment.append(document.createTextNode(snippetText.slice(lastIndex)));
  }
  element.replaceChildren(fragment);
}

export { createNoteItem, handleSidebarChange, updateSnippetHighlight };
