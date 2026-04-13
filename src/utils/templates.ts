import DOMPurify from "dompurify";

import type { Note } from "../shared/types";
import { formatNoteDate } from "./helpers";
import { renderIcons } from "./icons";

function generateSnippet(plainText: string) {
  return plainText
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function noteItemTemplate(note: Omit<Note, "id" | "created_at">) {
  const { title, snippet, plainText, updated_at, tags } = note;
  const preview = snippet ? snippet : generateSnippet(plainText);
  const formattedDate = formatNoteDate(updated_at);
  const htmlString = `<div class="note-header">
                <span class="note-title">${title}</span>
                <button class="delete-btn">
                <i data-lucide="trash-2"></i>
                </button>
              </div>
              <div class="note-metadata">
                <div class="note-date">${formattedDate}</div>
                <div class="note-tags">
                  ${tags?.map((tag) => `<span class="tag">#${tag}</span>`).join("")}
                </div>
              </div>
                <div class="note-content">${preview}</div>
              `;
  return DOMPurify.sanitize(htmlString);
}

function getNoteItemUI(note: Note) {
  const noteElement = document.createElement("div");
  noteElement.classList.add("noteItem");
  noteElement.dataset["id"] = note.id;
  noteElement.innerHTML = noteItemTemplate(note);
  renderIcons(noteElement);
  return noteElement;
}

export { generateSnippet, getNoteItemUI, noteItemTemplate };
