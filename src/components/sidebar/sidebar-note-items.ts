import { noteStore, settingsStore } from "@/state/state";
import { formatNoteDate } from "@/utils/date";
import { createTemplateCloner, isDiv } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { DOMPURIFY_CONFIG, UNTITLED } from "@shared/constants";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import DOMPurify from "dompurify";

const getNoteItemClone = createTemplateCloner("noteItemTemplate", isDiv);

function getSafeSnippet(
  item: HTMLDivElement,
  note: NoteListItem,
  display: AppSettings["note_item_display"],
) {
  const contentEl = item.querySelector<HTMLDivElement>(".note-content");
  if (!contentEl) return;
  const searchSnippets = noteStore.get("searchSnippets") || {};
  const displaySnippet = searchSnippets[note.id] || note.snippet;
  const safe = DOMPurify.sanitize(displaySnippet, DOMPURIFY_CONFIG);
  contentEl.innerHTML = display === "preview" ? safe : "";
}

function renderTags(tags: NoteListItem["tags"], container: HTMLDivElement) {
  for (const tag of tags) {
    const span = document.createElement("span");
    span.classList.add("tag");
    span.textContent = `#${tag}`;
    span.title = `#${tag}`;
    container.appendChild(span);
  }
}

function createNoteItem(note: Readonly<NoteListItem>) {
  const item = getNoteItemClone();
  const display = settingsStore.get("note_item_display");
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  const safeTitle = note.title.trim() || UNTITLED;
  item.title = safeTitle;
  if (note.pinned) renderIcons(item);
  const titleEl = item.querySelector<HTMLSpanElement>(".note-title");
  if (titleEl) titleEl.textContent = safeTitle;
  const dateEl = item.querySelector<HTMLDivElement>(".note-date");
  if (dateEl) dateEl.textContent = formatNoteDate(note.updated_at);
  getSafeSnippet(item, note, display);
  const tagsContainer = item.querySelector<HTMLDivElement>(".note-tags");
  if (tagsContainer) {
    tagsContainer.replaceChildren();
    if (display === "tags" && Array.isArray(note.tags) && note.tags.length > 0)
      renderTags(note.tags, tagsContainer);
  }
  return item;
}

export { createNoteItem, renderTags };
