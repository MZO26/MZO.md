import { noteStore } from "@/settings/app-state";
import type { NoteListItem, NoteSearchDoc } from "@shared/schemas/note-schema";
import MiniSearch, { type Options } from "minisearch";

const MINI_SEARCH_OPTIONS: Options<NoteSearchDoc> = {
  fields: ["title", "plainText", "snippet", "tags"],
  storeFields: ["id"],
  autoVacuum: true,
  extractField: (document, fieldName) => {
    const value = document[fieldName as keyof NoteSearchDoc];
    if (Array.isArray(value)) return value.join(" ");
    return String(value ?? "");
  },
  searchOptions: {
    boost: { title: 4, tags: 2, snippet: 1.5, plainText: 1 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: "AND",
  },
};

export interface SearchMatchResult {
  item: NoteListItem;
  queryTerms: readonly string[];
}

export class NoteSearch {
  private miniSearch: MiniSearch<NoteSearchDoc>;

  constructor() {
    // initialize empty
    this.miniSearch = this.createIndex();
  }

  private createIndex() {
    return new MiniSearch<NoteSearchDoc>(MINI_SEARCH_OPTIONS);
  }

  private toDoc(note: NoteListItem): NoteSearchDoc {
    return {
      id: String(note.id),
      title: note.title ?? "",
      snippet: note.snippet ?? "",
      plainText: note.plainText ?? "",
      tags: Array.isArray(note.tags) ? note.tags : [],
    };
  }

  public bulkLoad(notes: NoteListItem[]) {
    const updatedMinisearch = this.createIndex();
    const docs = notes.map((note) => this.toDoc(note));
    updatedMinisearch.addAll(docs);
    this.miniSearch = updatedMinisearch;
  }

  public addMany(notes: NoteListItem[]) {
    for (const note of notes) {
      this.upsertNote(note);
    }
  }

  public upsertNote(note: NoteListItem) {
    const doc = this.toDoc(note);
    if (this.miniSearch.has(doc.id)) {
      this.miniSearch.replace(doc);
    } else {
      this.miniSearch.add(doc);
    }
  }

  public removeNote(id: string) {
    if (!this.miniSearch.has(id)) return;
    this.miniSearch.discard(id);
  }

  public removeMany(ids: string[]) {
    for (const id of ids) {
      if (!this.miniSearch.has(id)) continue;
      this.miniSearch.discard(id);
    }
  }

  private toMatches(
    results: {
      id: string;
      terms?: string[];
    }[],
  ): SearchMatchResult[] {
    const mapped: SearchMatchResult[] = [];
    for (const result of results) {
      const item = noteStore.get("noteIndex").get(result.id);
      if (!item) continue;
      mapped.push({
        item,
        queryTerms: result.terms ?? [],
      });
    }
    return mapped;
  }

  public search(query: string): SearchMatchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const results = this.miniSearch.search(trimmed).slice(0, 50);
    return this.toMatches(results);
  }

  public searchTags(query: string): SearchMatchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const results = this.miniSearch
      .search(trimmed, { fields: ["tags"] })
      .slice(0, 50);
    return this.toMatches(results);
  }
}
