import { isNoteID, type Id } from "@shared/schemas/note-schema";
import { UNTITLED } from "@shared/shared-constants";
import { type JSONContent } from "@tiptap/core";

function extractText(doc: JSONContent): string {
  const parts: string[] = [];
  const stack: JSONContent[] = [doc];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    switch (node.type) {
      case "text": {
        if (typeof node.text === "string") {
          parts.push(node.text);
        }
        continue;
      }
      case "hardBreak": {
        parts.push(" ");
        continue;
      }
      case "wikilink": {
        const title = node.attrs?.["title"] ?? "";
        if (typeof title === "string" && title.length > 0) {
          parts.push(" ", title, " ");
        }
        continue;
      }
      case "noteTag": {
        const tag = node.attrs?.["label"] ?? node.attrs?.["id"];
        if (typeof tag === "string" && tag.length > 0) {
          parts.push(" ", tag, " ");
        }
        continue;
      }
      case "image": {
        const alt = node.attrs?.["alt"];
        if (typeof alt === "string" && alt.length > 0) {
          parts.push(" ", alt, " ");
        }
        continue;
      }
    }
    if (Array.isArray(node.content)) {
      parts.push(" ");
      for (let i = node.content.length - 1; i >= 0; i--) {
        const child = node.content[i];
        if (child) stack.push(child);
      }
    }
  }
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

function wrapAsDoc(content: unknown): JSONContent | undefined {
  if (Array.isArray(content)) {
    return { type: "doc" as const, content };
  }
  return undefined;
}

function titleGenerator(doc: JSONContent) {
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

function truncateTitle(text: string, maxLength: number = 50) {
  if (text.length <= maxLength) return text;
  const targetLength = maxLength - 3;
  const slice = text.slice(0, targetLength);
  const lastSpace = slice.lastIndexOf(" ");
  const safeText = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return safeText.replace(/[.,:;!\-?]+$/, "").trim() + "...";
}

function snippetGenerator(doc: JSONContent) {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return "";
  }
  let snippet = "";
  let skippedTitle = false;
  for (const block of doc.content) {
    if (!block) continue;
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

function walkDoc(doc: JSONContent) {
  const links = new Set<Id>();
  const tags = new Set<string>();
  const images = new Set<string>();
  const stack: JSONContent[] = [doc];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    switch (node.type) {
      case "wikilink": {
        const id = node.attrs?.["id"];
        if (typeof id === "string" && isNoteID(id)) {
          links.add(id);
        }
        continue;
      }
      case "noteTag": {
        const name = node.attrs?.["id"];
        if (typeof name === "string") {
          const normalized = name.trim().toLowerCase();
          if (normalized.length > 0 && normalized.length <= 100) {
            tags.add(normalized);
          }
        }
        continue;
      }
      case "image": {
        const src = node.attrs?.["src"];
        if (typeof src === "string" && src.startsWith("appimg:///")) {
          const hash = src.slice("appimg:///".length).trim();
          if (hash.length > 0) images.add(hash);
        }
        continue;
      }
    }
    if (Array.isArray(node.content)) {
      for (let i = node.content.length - 1; i >= 0; i--) {
        const child = node.content[i];
        if (child) stack.push(child);
      }
    }
  }
  return {
    links: Array.from(links),
    tags: Array.from(tags),
    images: Array.from(images),
  };
}

export {
  extractText,
  snippetGenerator,
  textConverter,
  titleGenerator,
  truncateTitle,
  walkDoc,
  wrapAsDoc,
};
