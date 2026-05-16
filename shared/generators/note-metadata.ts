import type { JSONContent } from "@tiptap/core";

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

function getLinks(jsonDoc: JSONContent): string[] {
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

function getTags(jsonDoc: JSONContent): string[] {
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

export { getLinks, getTags, getTodoStats };
