import { UNTITLED } from "@shared/constants";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import type { Metadata } from "@shared/types";
import type { JSONContent } from "@tiptap/core";

function getMetadata(content: EditorDoc): Metadata {
  return {
    snippet: snippetGenerator(content),
    todos_left: getTodoStats(content).left,
    links: getLinks(content),
    tags: getTags(content),
  };
}

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join("");
  }
  return "";
}

function titleGenerator(doc: EditorDoc): string {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return UNTITLED;
  }
  const firstBlock = doc.content[0];
  if (
    firstBlock &&
    (firstBlock.type === "heading" || firstBlock.type === "paragraph")
  ) {
    const text = extractText(firstBlock).trim();
    if (text) return truncateTitle(text);
  }
  for (const block of doc.content) {
    if (block.type === "paragraph" || block.type === "heading") {
      const text = extractText(block).trim();
      if (text) return truncateTitle(text);
    }
  }
  return UNTITLED;
}

function truncateTitle(text: string): string {
  return text.length > 50 ? text.slice(0, 47) + "..." : text;
}

function snippetGenerator(doc: EditorDoc | undefined): string {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return "";
  }
  let snippet = "";
  let skippedTitle = false;
  for (const block of doc.content) {
    if (block.type !== "paragraph" && block.type !== "heading") continue;
    const text = extractText(block).trim();
    if (!text) continue;
    if (!skippedTitle) {
      skippedTitle = true;
      continue;
    }
    snippet += (snippet.length > 0 ? " " : "") + text;
    if (snippet.length >= 50) break;
  }
  const cleaned = snippet.replace(/\s+/g, " ").trim();
  return cleaned.length > 50 ? cleaned.slice(0, 47) + "..." : cleaned;
}

function getTodoStats(doc: EditorDoc) {
  let total = 0;
  let completed = 0;
  if (!doc.content || !Array.isArray(doc.content)) {
    return { total, completed, left: 0 };
  }
  const stack: JSONContent[] = [...doc.content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "taskItem") {
      total++;
      if (node.attrs?.["checked"]) {
        completed++;
      }
    }
    if (node.content && Array.isArray(node.content)) {
      stack.push(...node.content);
    }
  }
  return {
    total,
    completed,
    left: total - completed,
  };
}

function getLinks(doc: EditorDoc) {
  if (!doc.content) return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [...doc.content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "wikilink" && node.attrs?.["id"]) {
      seen.add(node.attrs["id"]);
    }
    if (node.content) {
      for (const child of node.content) {
        stack.push(child);
      }
    }
  }
  return Array.from(seen);
}

function getTags(doc: EditorDoc) {
  if (!doc.content) return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [...doc.content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "noteTag" && node.attrs?.["id"]) {
      const tagText = node.attrs["id"].trim().toLowerCase();
      if (tagText.length > 0 && tagText.length <= 40) {
        seen.add(tagText);
      }
    }
    if (seen.size === 3) break;
    if (node.content) {
      for (const child of node.content) {
        stack.push(child);
      }
    }
  }
  return Array.from(seen);
}

// utility for clean txt content (avoiding too many whitespaces)

function textConverter(plainText: string) {
  if (!plainText) return undefined;
  const lines = plainText.split(/\r?\n/);
  const content: JSONContent[] = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }
  return content;
}

export {
  getMetadata,
  getTodoStats,
  snippetGenerator,
  textConverter,
  titleGenerator,
};
