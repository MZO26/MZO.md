import { findElement } from "@/utils/dom";
import { extractText } from "@shared/generators";
import type { Note, NoteListItem } from "@shared/schemas/note-schema";

function createNoteUpdater() {
  let element: HTMLDivElement | null = null;
  return function updateNoteCount(count: number) {
    element ??= findElement<HTMLDivElement>(".note-count");
    if (!element) return;
    element.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
  };
}

const updateNoteCount = createNoteUpdater();

function getNotePriority(note: NoteListItem) {
  if (note.pinned && note.bookmarked) return 0; // top priority if it happens
  if (note.pinned) return 1; // highest priority
  if (note.bookmarked) return 2; // middle
  return 3; // normal
}

// this function returns a number by which note items are being displayed in the sidebar. If it returns a negative number, a comes first, then b
function compareNotes(a: NoteListItem, b: NoteListItem) {
  const priorityDiff = getNotePriority(a) - getNotePriority(b); // example: pinned note a (1) - regular note b(3) = -2, which means a comes before b
  if (priorityDiff !== 0) return priorityDiff;
  // if priorities are equal, they get sorted by updated_at
  return String(b.updated_at).localeCompare(String(a.updated_at));
}

function estimateReadingTime(wordCount: number, wpm = 238) {
  const s = Math.round((wordCount / wpm) * 60);
  const m = Math.floor(s / 60);
  return s < 30 ? "< 1 min read" : s < 60 ? "1 min read" : `${m} min read`;
}

function toNoteListItem(note: Note): NoteListItem {
  return {
    id: note.id,
    title: note.title,
    snippet: note.snippet,
    plainText: extractText(note.content),
    todos_left: note.todos_left,
    created_at: note.created_at,
    updated_at: note.updated_at,
    pinned: note.pinned,
    bookmarked: note.bookmarked,
    tags: note.tags,
    links: note.links,
  };
}

export { compareNotes, estimateReadingTime, toNoteListItem, updateNoteCount };
