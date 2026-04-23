import DOMPurify from "dompurify";
import type { Note } from "../../shared/schemas/noteSchema";
import { formatNoteDate } from "./helpers";
import { renderIcons } from "./icons";

function noteItemTemplate(note: Omit<Note, "id" | "created_at">) {
  const { title, snippet, updated_at, tags } = note;
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
                <div class="note-content">${snippet}</div>
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

export { getNoteItemUI, noteItemTemplate };
