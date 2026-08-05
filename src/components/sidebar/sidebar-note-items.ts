import { formatNoteDate } from "@/utils/date";
import { createTemplateCloner, isDiv } from "@/utils/dom";
import { renderIcons } from "@/utils/icons";
import { DOMPURIFY_CONFIG } from "@shared/constants/config-constants";
import { UNTITLED } from "@shared/constants/renderer-constants";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { SnippetGenParams } from "@shared/types";
import DOMPurify from "dompurify";

const getNoteItemClone = createTemplateCloner("noteItemTemplate", isDiv);

function getSafeSnippet(snippetGenParams: SnippetGenParams) {
  const { item, note, snippets, display } = snippetGenParams;
  const contentEl = item.querySelector<HTMLDivElement>(".note-content");
  if (!contentEl) return;
  const searchSnippets = snippets || {};
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

function createNoteItem(
  note: Readonly<NoteListItem>,
  display: AppSettings["note_item_display"],
) {
  const item = getNoteItemClone();
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  const safeTitle = note.title.trim() || UNTITLED;
  item.title = safeTitle;
  if (note.pinned) renderIcons(item);
  const titleEl = item.querySelector<HTMLSpanElement>(".note-title");
  if (titleEl) titleEl.textContent = safeTitle;
  const dateEl = item.querySelector<HTMLDivElement>(".note-date");
  if (dateEl) dateEl.textContent = formatNoteDate(note.updated_at);
  const tagsContainer = item.querySelector<HTMLDivElement>(".note-tags");
  if (tagsContainer) {
    tagsContainer.replaceChildren();
    if (display === "tags" && Array.isArray(note.tags) && note.tags.length > 0)
      renderTags(note.tags, tagsContainer);
  }
  return item;
}

export { createNoteItem, getSafeSnippet, renderTags };
