import { findElement } from "@/utils/dom";
import { getUIItem } from "@/utils/registry";
import { UNTAGGED } from "@shared/constants";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import type { Note, NoteListItem } from "@shared/schemas/note-schema";
import type { JSONContent } from "@tiptap/core";

function createNoteUpdater() {
  let element: HTMLDivElement | null = null;
  return function updateNoteCount(count: number) {
    const sidebarFooter = getUIItem("sidebarFooter");
    element ??= findElement<HTMLDivElement>(".note-count", sidebarFooter);
    if (!element) return;
    element.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
  };
}

const updateNoteCount = createNoteUpdater();

function getNotePriority(note: NoteListItem) {
  if (note.pinned) return 0; // highest priority
  return 1; // normal
}

// this function returns a number by which note items are being displayed in the sidebar. If it returns a negative number, a comes first, then b
function compareNotes(a: NoteListItem, b: NoteListItem) {
  const priorityDiff = getNotePriority(a) - getNotePriority(b);
  if (priorityDiff !== 0) return priorityDiff;
  // if priorities are equal, they get sorted by updated_at
  return String(b.updated_at).localeCompare(String(a.updated_at));
}

function addActiveTagToDoc(
  doc: EditorDoc,
  activeTag: string | null,
): EditorDoc {
  if (activeTag === null || activeTag === UNTAGGED) return doc;
  const normalizedTag = activeTag.trim();
  if (!normalizedTag) return doc;
  const content = Array.isArray(doc.content) ? [...doc.content] : [];
  if (hasNoteTag(doc, normalizedTag)) return doc;
  const tagParagraph = {
    type: "paragraph",
    content: [
      {
        type: "noteTag",
        attrs: {
          id: normalizedTag,
          label: normalizedTag,
        },
      },
      {
        type: "text",
        text: " ",
      },
    ],
  };
  const headingBlock = {
    type: "heading",
    attrs: { level: 1 },
  };
  const hrBlock = {
    type: "horizontalRule",
  };
  const spacerParagraph = {
    type: "paragraph",
  };
  const firstNode = content[0];
  const hasLeadingHeading = firstNode?.type === "heading";
  const rest = hasLeadingHeading ? content.slice(1) : content;
  const restWithoutDuplicateHeading =
    rest[0]?.type === "heading" ? rest.slice(1) : rest;
  return {
    ...doc,
    content: [
      hasLeadingHeading ? firstNode : headingBlock,
      hrBlock,
      tagParagraph,
      spacerParagraph,
      ...restWithoutDuplicateHeading,
    ],
  };
}

function hasNoteTag(doc: EditorDoc, tagId: string): boolean {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0)
    return false;
  const normalized = tagId.trim().toLowerCase();
  if (!normalized) return false;
  const stack: JSONContent[] = [...doc.content];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (node.type === "noteTag" && typeof node.attrs?.["id"] === "string") {
      const id = node.attrs["id"].trim().toLowerCase();
      if (id === normalized) return true;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        stack.push(child);
      }
    }
  }
  return false;
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

function toNoteListItem(note: Note): NoteListItem {
  return {
    id: note.id,
    title: note.title,
    snippet: note.snippet,
    plainText: note.plainText,
    created_at: note.created_at,
    updated_at: note.updated_at,
    pinned: note.pinned,
    tags: note.tags,
    links: note.links,
  };
}

export {
  addActiveTagToDoc,
  compareNotes,
  estimateReadingTime,
  getExtension,
  hasNoteTag,
  toNoteListItem,
  updateNoteCount,
};
