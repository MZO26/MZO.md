import { DOMPURIFY_CONFIG } from "@/utils/constants";
import { formatNoteDate } from "@/utils/date";
import { renderIcons } from "@/utils/icons";
import type { SnippetGenParams } from "@/utils/types";
import { createTemplateCloner, isDiv } from "@/utils/ui";
import type { NoteListItem } from "@shared/schemas/note-schema";
import { UNTITLED } from "@shared/shared-constants";
import DOMPurify from "dompurify";

const getNoteItemClone = createTemplateCloner("noteItemTemplate", isDiv);

function getSafeSnippet(snippetGenParams: SnippetGenParams) {
  const { item, note, snippets } = snippetGenParams;
  const contentEl = item.querySelector<HTMLDivElement>(".note-content");
  if (!contentEl) return;
  const searchSnippet = snippets?.[note.id];
  const displaySnippet = searchSnippet ?? note.snippet;
  const safe = DOMPurify.sanitize(displaySnippet, DOMPURIFY_CONFIG);
  item.classList.toggle("search", !!searchSnippet);
  contentEl.innerHTML = safe;
}

function createNoteItem(note: NoteListItem) {
  const item = getNoteItemClone();
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  const safeTitle = note.title.trim() || UNTITLED;
  item.title = safeTitle;
  if (note.pinned) renderIcons(item);
  const titleEl = item.querySelector<HTMLSpanElement>(".note-title");
  if (titleEl) titleEl.textContent = safeTitle;
  const dateEl = item.querySelector<HTMLDivElement>(".note-date");
  if (dateEl) dateEl.textContent = formatNoteDate(note.created_at);
  return item;
}

export { createNoteItem, getSafeSnippet };
