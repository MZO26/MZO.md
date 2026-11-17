import { search } from "@/api/api";
import { noteStore } from "@/state/state";
import { DEBOUNCE_MS } from "@/utils/constants";
import { debounce, rendererLogger, withLatestGuard } from "@/utils/helpers";
import type { MappedMatches } from "@/utils/types";
import { type Id, type SearchQuery } from "@shared/schemas/note-schema";
import { MAX_SEARCH_LENGTH } from "@shared/shared-constants";
import type { Node as PMNode } from "@tiptap/pm/model";

const handleSearch = withLatestGuard(async (isStale, searchInput: SearchQuery) => {
  const nextQuery = searchInput.trim();
  if (nextQuery.length > MAX_SEARCH_LENGTH) return;
  if (!nextQuery) {
    return [];
  }
  const result = await search(nextQuery);
  if (isStale()) return;
  if (!result.success) {
    rendererLogger.appError("[handleSearch]: Failed to search:", result.error);
    return;
  }
  const data: MappedMatches[] = result.data.map((row) => ({
    id: row.id,
    title: row.title,
    snippet: row.search_match,
    rank: row.rank,
  }));
  return data;
});

function findExactMatch(id: Id, doc: PMNode, snippet?: string) {
  const raw = snippet ?? noteStore.get("searchSnippets")[id];
  if (!raw) return null;
  const marks: string[] = [];
  for (const [, text] of raw.matchAll(/<mark[^>]*>(.*?)<\/mark>/g)) {
    if (text) marks.push(text);
  }
  if (marks.length === 0) return null;
  const searchTerm = marks.reduce((a, b) => (b.length < a.length ? b : a));
  let foundPos = null as number | null;
  doc.descendants((node, pos): boolean => {
    if (foundPos !== null) return false;
    if (!node.isTextblock) return true;
    const blockText = node.textBetween(0, node.content.size, "", " ");
    const index = blockText.indexOf(searchTerm);
    if (index !== -1) {
      foundPos = pos + 1 + index;
    }
    return false;
  });
  return foundPos;
}

const debouncedSearch = debounce((e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  const value = e.target.value.trim();
  void handleSearch(value).catch(rendererLogger.appError);
}, DEBOUNCE_MS.very_fast);

export { debouncedSearch, findExactMatch, handleSearch };
