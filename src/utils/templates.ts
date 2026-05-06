import type { Note } from "@shared/schemas/note-schema";
import { requireElement } from "./dom";
import { formatNoteDate } from "./format";
import { renderIcons } from "./icons";

const templateElement =
  requireElement<HTMLTemplateElement>("#noteItem-template");
const baseNoteItem = templateElement.content
  .firstElementChild as HTMLDivElement;

function createNoteItem(note: Note): HTMLDivElement {
  // Deep clone with true
  const item = baseNoteItem.cloneNode(true) as HTMLDivElement;
  const pinned = note.pinned === true;
  const bookmarked = note.bookmarked === true;
  item.dataset["id"] = note.id;
  item.dataset["pinned"] = String(pinned);
  item.dataset["bookmarked"] = String(bookmarked);
  const pinIcon = item.querySelector<HTMLElement>(".pin");
  const bookmarkIcon = item.querySelector<HTMLElement>(".bookmark");
  if (!pinned && pinIcon) {
    pinIcon.style.display = "none";
  }
  if (!bookmarked && bookmarkIcon) {
    bookmarkIcon.style.display = "none";
  }
  if (pinned || bookmarked) {
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
