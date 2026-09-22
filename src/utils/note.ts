import { rendererLogger } from "@/app";
import { sleep } from "@/utils/async";
import { NODE_BASELINE, UNTAGGED, YIELD_MS } from "@/utils/constants";
import { getUIItem } from "@/utils/registry";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";
import type { JSONContent } from "@tiptap/core";
import { getTags } from "./generators";
import { hasDocLink } from "@/extensions/wikilink/wikilink-handler";

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

function findTagParagraphIdx(content: JSONContent[]): number {
  return content.findIndex(
    (node) =>
      node.type === "paragraph" &&
      Array.isArray(node.content) &&
      node.content.some((child) => child.type === "noteTag"),
  );
}

function addActiveTagToDoc(
  doc: JSONContent,
  activeTag: string | null,
): JSONContent {
  if (activeTag === null || activeTag === UNTAGGED) return doc;
  const normalizedTag = activeTag.trim();
  if (!normalizedTag) return doc;
  if (hasNoteTag(doc, normalizedTag)) return doc;
  const content = Array.isArray(doc.content) ? [...doc.content] : [];
  const tagNode = {
    type: "noteTag",
    attrs: { id: normalizedTag, label: normalizedTag },
  };
  const spaceNode = { type: "text", text: " " };
  const tagPIdx = findTagParagraphIdx(content);
  if (tagPIdx !== -1) {
    const existingPara = content[tagPIdx];
    const updatedPara = {
      ...existingPara,
      content: [...(existingPara?.content ?? []), tagNode, spaceNode],
    };
    const newContent = [...content];
    newContent[tagPIdx] = updatedPara;
    return { ...doc, content: newContent };
  }
  const tagParagraph = { type: "paragraph", content: [tagNode, spaceNode] };
  const headingBlock = { type: "heading", attrs: { level: 1 } };
  const hrBlock = { type: "horizontalRule" };
  const spacerParagraph = { type: "paragraph" };
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

function addActiveLinkToDoc(
  doc: JSONContent,
  activeLink: Id | null,
): JSONContent {
  if (!activeLink) return doc;
  if (hasDocLink(doc, activeLink)) return doc;
  rendererLogger.devLog("Not found");
  const content = Array.isArray(doc.content) ? [...doc.content] : [];
  const linkNode = {
    type: "wikilink",
    attrs: { id: activeLink },
  };
  const firstIdx = findFirstParagraphIdx(content);
  rendererLogger.devLog(firstIdx);
  if (firstIdx !== -1) {
    const para = content[firstIdx];
    const newParaContent = para?.content
      ? [...para.content, linkNode, { type: "text", text: " " }]
      : [linkNode, { type: "text", text: " " }];
    const newContent = [...content];
    newContent[firstIdx] = { ...para, content: newParaContent };
    return { ...doc, content: newContent };
  }
  const linkParagraph = {
    type: "paragraph",
    content: [linkNode, { type: "text", text: " " }],
  };
  const headingBlock = { type: "heading", attrs: { level: 1 } };
  const hrBlock = { type: "horizontalRule" };
  const spacerParagraph = { type: "paragraph" };
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
      linkParagraph,
      spacerParagraph,
      ...restWithoutDuplicateHeading,
    ],
  };
}

function findFirstParagraphIdx(content: JSONContent[]): number {
  for (let i = 0; i < content.length; i++) {
    const n = content[i];
    if (n?.type === "paragraph") return i;
  }
  return -1;
}

function hasNoteTag(doc: JSONContent, tag: string): boolean {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return false;
  return getTags(doc).some((t) => t === normalized);
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
  addActiveLinkToDoc,
  addActiveTagToDoc,
  checkNoteSize,
  compareNotes,
  estimateReadingTime,
  getExtension,
  hasNoteTag,
  updateNoteCount,
};
