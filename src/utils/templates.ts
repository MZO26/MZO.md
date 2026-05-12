import { requireElement } from "@/utils/dom";
import { formatNoteDate } from "@/utils/format";
import { renderIcons } from "@/utils/icons";
import type { Note } from "@shared/schemas/note-schema";

const templateElement =
  requireElement<HTMLTemplateElement>("#noteItem-template");
const baseNoteItem = templateElement.content
  .firstElementChild as HTMLDivElement;

function createNoteItem(note: Note): HTMLDivElement {
  // Deep clone with true
  const item = baseNoteItem.cloneNode(true) as HTMLDivElement;
  console.log(note);
  item.dataset["id"] = note.id;
  item.dataset["pinned"] = String(note.pinned === true);
  item.dataset["bookmarked"] = String(note.bookmarked === true);
  if (note.pinned || note.bookmarked) {
    renderIcons(item);
  }
  item.querySelector(".note-title")!.textContent = note.title;
  item.querySelector(".note-date")!.textContent = formatNoteDate(
    note.updated_at,
  );
  item.querySelector(".note-content")!.textContent = note.snippet;

  return item;
}

export { createNoteItem };
