import { requireElement } from "@/utils/dom";
import { formatNoteDate } from "@/utils/format";
import { renderIcons } from "@/utils/icons";
import type { Note } from "@shared/schemas/note-schema";

const template = requireElement<HTMLTemplateElement>("#note-item-template");

const baseNoteItem = template.content.firstElementChild as HTMLDivElement;

function createNoteItem(note: Note): HTMLDivElement {
  // Deep clone with true
  const item = baseNoteItem.cloneNode(true) as HTMLDivElement;
  const tagsContainer = item.querySelector(".note-tags");
  item.dataset["id"] = note.id;
  item.dataset["pinned"] = String(note.pinned === true);
  item.dataset["bookmarked"] = String(note.bookmarked === true);
  if (note.pinned || note.bookmarked) {
    renderIcons(item);
  }
  item.querySelector(".note-title")!.textContent = note.title;
  item.setAttribute("data-tippy-content", note.title);
  item.querySelector(".note-date")!.textContent = formatNoteDate(
    note.updated_at,
  );
  item.querySelector(".note-content")!.textContent = note.snippet;
  if (tagsContainer && note.tags && note.tags.length > 0) {
    tagsContainer.innerHTML = "";
    for (const tag of note.tags) {
      const span = document.createElement("span");
      span.classList.add("tag");
      span.textContent = `#${tag}`;
      tagsContainer.append(span);
    }
  }
  return item;
}

export { createNoteItem };
