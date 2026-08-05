import { search } from "@/api/api";
import { rendererLogger } from "@/app";
import {
  matchesActiveTag,
  restoreSidebarScope,
} from "@/components/sidebar/sidebar-views";
import { noteStore, stateStore } from "@/state/state";
import { debounce } from "@/utils/async";
import {
  DEBOUNCE_MS,
  MAX_SEARCH_LENGTH,
} from "@shared/constants/renderer-constants";
import type { NoteListItem, SearchQuery } from "@shared/schemas/note-schema";
import type { MappedMatches } from "@shared/types";

async function handleSearch(searchInput: SearchQuery) {
  const nextQuery = searchInput.trim();
  if (nextQuery.length > MAX_SEARCH_LENGTH) return;
  const { searchQuery, activeTag } = stateStore.getState();
  if (nextQuery === searchQuery) {
    rendererLogger.devLog("Same query. Skipping search");
    return;
  }
  if (!nextQuery) {
    restoreSidebarScope();
    return;
  }
  stateStore.setState({ searchQuery: nextQuery });
  const result = await search(nextQuery);
  if (!result.success) {
    rendererLogger.appError("[handleSearch]: Failed to search:", result.error);
    return;
  }
  const data = result.data.map((row) => {
    const { search_match, ...rest } = row;
    return {
      ...rest,
      snippet: row.search_match,
    };
  });
  computeSearchResult(data, noteStore.get("noteIndex"), activeTag);
}

function computeSearchResult(
  matches: MappedMatches,
  noteIndex: Map<string, NoteListItem>,
  activeTag: string | null,
) {
  const searchSnippets: Record<string, string> = {};
  const visibleIds: string[] = [];
  for (const match of matches) {
    searchSnippets[match.id] = match.snippet;
    const note = noteIndex.get(match.id);
    if (note && matchesActiveTag(note, activeTag)) {
      visibleIds.push(match.id);
    }
  }
  noteStore.setState({
    visibleIds,
    searchSnippets,
  });
}

const debouncedSearch = debounce((e: Event) => {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;
  const value = (target.value ?? "").trim();
  handleSearch(value);
}, DEBOUNCE_MS.fast);

export { debouncedSearch };
