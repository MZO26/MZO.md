import { showContextMenu } from "@/api/electronAPI";
import { formatNoteDate } from "@/utils/date";
import type { Note } from "@shared/schemas/noteSchema";

// builds skeleton once

const baseNoteItem = document.createElement("div");
baseNoteItem.className = "noteItem";

const baseHeader = document.createElement("div");
baseHeader.className = "note-header";

const baseTitle = document.createElement("span");
baseTitle.className = "note-title";

const baseButton = document.createElement("button");
const dots = document.createElement("span");
dots.className = "dots";
baseButton.appendChild(dots);

baseHeader.append(baseTitle, baseButton);

const baseMetadata = document.createElement("div");
baseMetadata.className = "note-metadata";
const baseDate = document.createElement("div");
baseDate.className = "note-date";
baseMetadata.append(baseDate);

const baseContent = document.createElement("div");
baseContent.className = "note-content";

baseNoteItem.append(baseHeader, baseMetadata, baseContent);

function createNoteItem(note: Note): HTMLDivElement {
  // true to clone everything inside it too
  const item = baseNoteItem.cloneNode(true) as HTMLDivElement;
  item.dataset["id"] = note.id;
  item.dataset["pinned"] = String(note.pinned);
  item.dataset["bookmarked"] = String(note.bookmarked);
  item.querySelector(".note-title")!.textContent = note.title;
  item.querySelector(".note-date")!.textContent = formatNoteDate(
    note.updated_at,
  );
  item.querySelector(".note-content")!.textContent = note.snippet;
  return item;
}

async function createContextMenu(e: Event) {
  const target = e.target as HTMLElement;
  const item = target.closest<HTMLElement>(".noteItem");
  if (!item) return;
  e.preventDefault();
  const id = item.dataset["id"];
  const pinned = item.dataset["pinned"] === "true";
  const bookmarked = item.dataset["bookmarked"] === "true";
  if (!id) return;
  await showContextMenu(id, pinned, bookmarked);
}

export { createContextMenu, createNoteItem };
