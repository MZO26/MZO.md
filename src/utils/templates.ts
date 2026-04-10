import type { Note } from "../shared/types";
import { formatNoteDate } from "./helpers";

const noteItemTemplate = (note: Omit<Note, "id" | "created_at">) => {
  const { title, snippet, updated_at, tags } = note;
  const formattedDate = formatNoteDate(updated_at);
  return `<div class="note-header">
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
};

export { noteItemTemplate };
