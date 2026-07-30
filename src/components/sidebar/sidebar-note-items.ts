import {
  handleSidebarEmptyState,
  renderNoteList,
} from "@/components/sidebar/sidebar-ui";
import { noteStore, settingsStore } from "@/state/state";
import { formatNoteDate } from "@/utils/date";
import { createTemplateCloner, findElement, isDiv } from "@/utils/dom";
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
  const contentEl = findElement<HTMLDivElement>(".note-content", item);
  if (!contentEl) return;
  const searchSnippets = noteStore.get("searchSnippets") || {};
  const displaySnippet = searchSnippets[note.id] || note.snippet;
  const safe = DOMPurify.sanitize(displaySnippet, DOMPURIFY_CONFIG);
  contentEl.innerHTML = display === "preview" ? safe : "";
}

function createNoteItem(note: Readonly<NoteListItem>) {
  const item = getNoteItemClone();
  const display = settingsStore.get("note_item_display");
  item.setAttribute("data-id", note.id);
  item.setAttribute("data-pinned", String(!!note.pinned));
  item.setAttribute("data-tippy-content", note.title);
  if (note.pinned) renderIcons(item);
  const titleEl = findElement<HTMLSpanElement>(".note-title", item);
  if (titleEl) titleEl.textContent = note.title.trim() || UNTITLED;
  const dateEl = findElement<HTMLDivElement>(".note-date", item);
  if (dateEl) dateEl.textContent = formatNoteDate(note.updated_at);
  getSafeSnippet(item, note, display);
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

function refreshSidebar(notes: Readonly<NoteListItem[]>) {
  renderNoteList(notes);
  handleSidebarEmptyState();
}

export { createNoteItem, refreshSidebar };
