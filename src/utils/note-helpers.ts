import { rendererLogger } from "@/app";
import { sleep } from "@/utils/async";
import { NODE_BASELINE, YIELD_MS } from "@/utils/constants";
import { getUIItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";
import type { JSONContent } from "@tiptap/core";

function createNoteUpdater() {
  let element: HTMLDivElement | null = null;
  return function updateNoteCount(count: number) {
    const sidebarFooter = getUIItem("sidebarFooter");
    element ??= sidebarFooter.querySelector<HTMLDivElement>(".note-count");
    if (!element) return;
    element.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
  };
}

const updateNoteCount = createNoteUpdater();

// this function returns a number by which note items
//  are being displayed in the sidebar. If it returns
//  a negative number, a comes first, then b
function compareNotes(a: NoteListItem, b: NoteListItem) {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }
  if (a.created_at > b.created_at) return -1;
  if (a.created_at < b.created_at) return 1;

  // 3. Fallback to Title
  return a.title.localeCompare(b.title, undefined, {
    sensitivity: "accent",
    numeric: true,
  });
}

function estimateReadingTime(wordCount: number, wpm = 238) {
  const s = Math.round((wordCount / wpm) * 60);
  const m = Math.round(s / 60);
  return s < 30 ? "< 1 min read" : s < 60 ? "1 min read" : `${m} min read`;
}

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index + 1).toLowerCase() : "";
}

async function checkNoteSize(doc: JSONContent) {
  rendererLogger.devLog(`Node amount: ${doc.content?.length}`);
  if (doc.content && doc.content.length > NODE_BASELINE) {
    await sleep(YIELD_MS);
  }
}

export {
  checkNoteSize,
  compareNotes,
  estimateReadingTime,
  getExtension,
  updateNoteCount,
};
