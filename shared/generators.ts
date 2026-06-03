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
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return { total, completed, left: 0 };
  }
  const stack: JSONContent[] = [doc.content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "taskItem") {
      total++;
      if (node.attrs?.["checked"]) {
        completed++;
      }
    }
    const content = node.content;
    if (content) {
      for (let i = 0, len = content.length; i < len; i++) {
        const child = content[i];
        if (child) {
          stack.push(child);
        }
      }
    }
  }
  return {
    total,
    completed,
    left: total - completed,
  };
}

function getLinks(doc: EditorDoc) {
  if (!doc) return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [doc];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.content) {
      for (let i = node.content.length - 1; i >= 0; i--) {
        stack.push(node.content[i] as JSONContent);
      }
    }
    if (node.type !== "wikilink" || !node.attrs?.["id"]) continue;
    const linkId = node.attrs["id"];
    if (seen.has(linkId)) continue;
    seen.add(linkId);
  }
  return Array.from(seen);
}

function getTags(doc: EditorDoc) {
  if (!doc) return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [doc.content];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.content) {
      for (let i = node.content.length - 1; i >= 0; i--) {
        stack.push(node.content[i] as JSONContent);
      }
    }
    if (node.type !== "noteTag" || !node.attrs?.["id"]) continue;
    const tagText = node.attrs["id"].trim().toLowerCase();
    if (tagText.length === 0 || tagText.length > 40) continue;
    if (seen.has(tagText)) continue;
    seen.add(tagText);
    if (seen.size === 3) break;
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
