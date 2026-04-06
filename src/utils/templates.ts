import type { Note } from "../shared/types";
import { truncate } from "./helpers";

const noteItemTemplate = (note: Note) => {
  const { title, created_at, tags } = note;
  const truncatedTitle = truncate(title, 30);
  const dateObject = new Date(created_at);
  const formattedDate = dateObject.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `<div class="note-header">
                <span class="note-title">${truncatedTitle}</span>
                <button class="delete-btn">
                <i data-lucide="trash-2"></i>
                </button>
              </div>
                <div class="note-date">${formattedDate}</div>
                <div class="note-tags">
                  ${tags?.map((tag) => `<span class="tag">#${tag}</span>`).join("")}
                </div>
              </div>
              `;
};

export { noteItemTemplate };
