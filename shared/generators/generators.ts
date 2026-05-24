import type { Metadata } from "@shared/types";
import type { JSONContent } from "@tiptap/core";

function getMetadata(
  content: {
    type: "doc";
    content: JSONContent[];
  },
  plainText: string,
): Metadata {
  const { left } = getTodoStats(content);
  return {
    title: titleGenerator(plainText),
    snippet: snippetGenerator(plainText),
    todos_left: left,
    links: getLinks(content),
    tags: getTags(content),
  };
}

function* iterateLines(text: string): IterableIterator<string> {
  let start = 0;
  while (start < text.length) {
    let end = text.indexOf("\n", start);
    if (end === -1) end = text.length;
    yield text.slice(start, end);
    start = end + 1;
  }
}

function titleGenerator(text: string) {
  if (typeof text !== "string") return "New Note";
  for (let line of iterateLines(text)) {
    line = line.replace(/#[\p{L}\p{N}_]+/gu, "").trim();
    if (line) return line.length > 50 ? line.slice(0, 47) + "..." : line;
  }
  return "New Note";
}

function snippetGenerator(text: string) {
  if (typeof text !== "string") return "";
  let snippet = "";
  let validLineCount = 0;
  for (let line of iterateLines(text)) {
    line = line.replace(/#[\p{L}\p{N}_]+/gu, "").trim();
    if (!line) continue;
    validLineCount++;
    if (validLineCount === 1) continue;
    snippet += (snippet.length > 0 ? " " : "") + line;
    if (snippet.length >= 50) break;
  }
  return snippet
    .replace(/\s{2,}/g, " ")
    .substring(0, 50)
    .trim();
}

function ftsQueryGenerator(searchTerm: string) {
  if (typeof searchTerm !== "string") return "";
  const shortened = searchTerm.substring(0, 100).trim();
  if (!shortened) return "";
  const cleanSearch = shortened
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
  return `"${cleanSearch}"*`;
}

function getTodoStats(content: JSONContent) {
  let total = 0;
  let completed = 0;
  if (!content) {
    return { total, completed, left: 0 };
  }
  const stack: JSONContent[] = [content];
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

function getLinks(jsonDoc: JSONContent) {
  if (!jsonDoc) return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [jsonDoc];
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

function getTags(jsonDoc: JSONContent) {
  if (!jsonDoc) return [];
  const seen = new Set<string>();
  const stack: JSONContent[] = [jsonDoc];
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

export {
  ftsQueryGenerator,
  getMetadata,
  getTodoStats,
  snippetGenerator,
  titleGenerator,
};
