import { getTodoStats } from "@shared/generators/note-metadata";
import type { Metadata } from "@shared/types";
import type { JSONContent } from "@tiptap/core";

function getMetadata(
  content: {
    type: "doc";
    content: JSONContent[];
  },
  plainText: unknown,
): Metadata {
  const { left } = getTodoStats(content);
  return {
    title: titleGenerator(plainText),
    snippet: snippetGenerator(plainText),
    todos_left: left,
    tags: tagsGenerator(plainText),
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

function titleGenerator(text: unknown): string {
  if (typeof text !== "string") return "New Note";

  for (let line of iterateLines(text)) {
    line = line.replace(/#[\p{L}\p{N}_]+/gu, "").trim();
    if (line) return line.length > 50 ? line.slice(0, 47) + "..." : line;
  }
  return "New Note";
}

function snippetGenerator(text: unknown) {
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

function tagsGenerator(input: unknown): string[] {
  if (typeof input !== "string") return [];
  const arr: string[] = [];
  const seen = new Set<string>();
  for (const tag of input.match(/#[\p{L}\p{N}_]+/gu) ?? []) {
    const t = tag.slice(1).trim().toLowerCase();
    if (t.length === 0 || t.length > 40) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    arr.push(t);
    if (arr.length === 3) break;
  }
  return arr;
}

function ftsQueryGenerator(searchTerm: unknown): string {
  if (typeof searchTerm !== "string") return "";
  const shortened = searchTerm.substring(0, 100).trim();
  if (!shortened) return "";
  const cleanSearch = shortened
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
  return `"${cleanSearch}"*`;
}

export {
  ftsQueryGenerator,
  getMetadata,
  snippetGenerator,
  tagsGenerator,
  titleGenerator,
};
