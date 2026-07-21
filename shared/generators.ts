import { BLOCK_TYPES, UNTITLED } from "@shared/constants";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import type { Metadata } from "@shared/types";
import { type JSONContent } from "@tiptap/core";

function getMetadata(content: EditorDoc): Metadata {
  return {
    snippet: snippetGenerator(content),
    links: getLinks(content),
    tags: getTags(content),
  };
}

function extractText(node: JSONContent): string {
  const parts: string[] = [];
  function walk(n: JSONContent) {
    if (!n || typeof n !== "object") return;
    if (n.type === "text" && typeof n.text === "string") {
      parts.push(n.text);
      return;
    }
    if (n.type === "image" && typeof n.attrs?.["alt"] === "string") {
      parts.push(n.attrs["alt"]);
      parts.push(" ");
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child);
      }
    }
    if (typeof n.type === "string" && BLOCK_TYPES.has(n.type)) {
      parts.push(" ");
    }
  }
  walk(node);
  return parts.join("").replace(/\s+/g, " ").trim();
}

function textConverter(plainText: string): JSONContent[] | undefined {
  if (!plainText) return undefined;
  const cleanText = plainText
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleanText
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));
}

function wrapAsDoc(content: unknown): EditorDoc | undefined {
  if (Array.isArray(content)) {
    return { type: "doc", content };
  }
  return undefined;
}

function titleGenerator(doc: EditorDoc): string {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return UNTITLED;
  }
  const topBlocks = doc.content.slice(0, 3);
  const firstHeading = topBlocks.find((block) => block?.type === "heading");
  if (firstHeading) {
    const text = extractText(firstHeading).trim();
    if (text) return truncateTitle(text);
  }
  const firstParagraph = topBlocks.find((block) => block.type === "paragraph");
  if (firstParagraph) {
    const text = extractText(firstParagraph).trim();
    if (text) {
      const firstSentence = text.split(/[.?!]/)[0]?.trim();
      if (firstSentence) return truncateTitle(firstSentence);
    }
  }
  return UNTITLED;
}

function truncateTitle(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  const targetLength = maxLength - 3;
  const slice = text.slice(0, targetLength);
  const lastSpace = slice.lastIndexOf(" ");
  const safeText = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return safeText.replace(/[.,:;!\-?]+$/, "").trim() + "...";
}

function snippetGenerator(doc: EditorDoc | undefined): string {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return "";
  }
  let snippet = "";
  let skippedTitle = false;
  for (const block of doc.content) {
    if (!block || typeof block !== "object") continue;
    if (block.type !== "paragraph" && block.type !== "heading") continue;
    const text = extractText(block).trim();
    if (!text) continue;
    if (!skippedTitle) {
      skippedTitle = true;
      continue;
    }
    snippet += (snippet.length > 0 ? " " : "") + text;
    if (snippet.length >= 100) break;
  }
  const cleaned = snippet.replace(/\s+/g, " ").trim();
  return cleaned.length > 100 ? cleaned.slice(0, 97) + "..." : cleaned;
}

function getLinks(doc: EditorDoc) {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0)
    return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [...doc.content];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (node.type === "wikilink" && typeof node.attrs?.["id"] === "string") {
      seen.add(node.attrs["id"]);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        stack.push(child);
      }
    }
  }
  return Array.from(seen);
}

function getTags(doc: EditorDoc) {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0)
    return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [...doc.content];
  while (stack.length > 0) {
    if (seen.size === 5) break;
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (node.type === "noteTag" && typeof node.attrs?.["id"] === "string") {
      const tagText = node.attrs["id"].trim().toLowerCase();
      if (tagText.length > 0 && tagText.length <= 100) {
        seen.add(tagText);
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        stack.push(child);
      }
    }
  }
  return Array.from(seen);
}

export {
  extractText,
  getMetadata,
  snippetGenerator,
  textConverter,
  titleGenerator,
  wrapAsDoc,
};
