import type { Note } from "@shared/schemas/note-schema";
import { STOPWORDS } from "@shared/shared-constants";

function tokenize(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(/\p{L}+/gu);
  return matches ?? [];
}

function wordFrequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of tokenize(text)) {
    if (STOPWORDS.has(w) || w.length < 3) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return freq;
}

function suggestTags(note: Readonly<Note>): string[] {
  const frequencies = wordFrequencies(note.plain_text ?? "");
  const candidates = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([w]) => w);
  const merged = [...new Set([...note.tags, ...candidates])];
  return merged.slice(0, 5);
}

export { suggestTags, tokenize, wordFrequencies };
