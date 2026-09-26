import { noteStore } from "@/state/state";
import { WIKILINK_REGEX } from "@/utils/constants";
import type { Metadata } from "@/utils/types";
import type { Id, Tag } from "@shared/schemas/note-schema";

const FRONTMATTER_REGEX =
  /^(?:\uFEFF)?---[ \t]*\r?\n(?<frontmatter>[\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const KEY_REGEX =
  /^(?<indent>[ \t]*)(?<key>[A-Za-z_][\w-]*)[ \t]*:[ \t]*(?<value>.*)$/;

const LIST_ITEM_REGEX = /^[ \t]+-[ \t]+(?<value>.+?)\s*$/;

function extractFrontmatter(source: string): {
  yaml: string;
  body: string;
} | null {
  const match = FRONTMATTER_REGEX.exec(source);
  if (!match) {
    return null;
  }
  const groups = match.groups;
  const yaml = groups?.["frontmatter"];
  if (!yaml) return null;
  return {
    yaml,
    body: source.slice(match[0].length),
  };
}

// for example tags: [workout, core]

function parseInlineArray(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return [
      ...trimmed
        .slice(1, -1)
        .split(",")
        .map((s) => unquote(s).trim())
        .filter((e) => !!e),
    ];
  }
  return trimmed === "" ? [] : [trimmed];
}

function unquote(value: string): string {
  if (value.length < 2) {
    return value;
  }
  const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.startsWith("'") && value.endsWith("'");
  if (isDoubleQuoted || isSingleQuoted) {
    return value.slice(1, -1);
  }
  return value;
}

function getFrontmatterMetadata(
  yaml: string,
): Pick<Metadata, "links" | "tags"> {
  const seenTags = new Set<Tag>();
  const seenLinks = new Set<Id>();
  const newTags: Tag[] = [];
  const newLinks: Id[] = [];
  const titleIndex = new Map(
    noteStore.get("notes").map((n) => [n.title, n.id] as const),
  );
  let activeKey: "links" | "tags" | null = null;
  function appendValue(key: "tags" | "links", rawValue: string) {
    if (key === "tags") {
      const tag = unquote(rawValue).trim().replace(/^#/, "");
      if (tag && !seenTags.has(tag)) {
        seenTags.add(tag);
        newTags.push(tag);
      }
      return;
    }
    const value = unquote(rawValue).trim();
    const linkMatch = WIKILINK_REGEX.exec(value);
    const title = linkMatch?.[1]?.trim();
    if (!title) return;
    const id = titleIndex.get(title);
    if (!id || seenLinks.has(id)) {
      return;
    }
    seenLinks.add(id);
    newLinks.push(id);
  }
  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = KEY_REGEX.exec(line);
    const groups = match?.groups;
    // if a line is a key process it
    // else see if it is a list item with an active key
    if (
      groups &&
      groups["indent"] === "" &&
      "key" in groups &&
      "value" in groups
    ) {
      const key = groups["key"].toLowerCase();
      const value = groups["value"].trim();
      if (key === "tags" || key === "links") {
        activeKey = key;
        if (value) {
          for (const link of parseInlineArray(value)) {
            appendValue(activeKey, link);
          }
        }
      } else {
        activeKey = null;
      }
      continue;
    }
    // check for list item with active key above it
    const listMatch = LIST_ITEM_REGEX.exec(line);
    // list value with active key
    const listValue = listMatch?.groups?.["value"];
    if (activeKey && listValue !== undefined) {
      appendValue(activeKey, listValue);
    }
  }
  return { tags: newTags, links: newLinks };
}

export { extractFrontmatter, getFrontmatterMetadata };
