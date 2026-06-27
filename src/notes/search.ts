import { FUSE_OPTIONS } from "@shared/constants";
import type { NoteListItem, NoteSearchDoc } from "@shared/schemas/note-schema";
import type { Expression, FuseResult, FuseResultMatch } from "fuse.js";
import Fuse from "fuse.js";

export interface SearchMatchResult {
  item: NoteListItem;
  matches?: readonly FuseResultMatch[];
}

class NoteSearch {
  private fuse: Fuse<NoteSearchDoc>;
  private lastQuery: string = "";
  private lastResults: FuseResult<NoteSearchDoc>[] = [];

  constructor(initialNotes: NoteListItem[] = []) {
    this.fuse = new Fuse<NoteSearchDoc>(
      initialNotes.map((note) => ({
        id: note.id,
        snippet: note.snippet,
        title: note.title,
        plainText: note.plainText,
        tags: note.tags,
      })),
      FUSE_OPTIONS,
    );
  }

  private resetSearchCache() {
    this.lastQuery = "";
    this.lastResults = [];
  }

  public bulkLoad(notes: NoteListItem[]) {
    this.fuse.setCollection(
      notes.map((note) => ({
        id: note.id,
        snippet: note.snippet,
        title: note.title,
        plainText: note.plainText,
        tags: note.tags,
      })),
    );
    this.resetSearchCache();
  }

  public addMany(notes: NoteListItem[]) {
    if (notes.length === 0) return;
    const mappedNotes = notes.map((note) => ({
      id: note.id,
      snippet: note.snippet,
      title: note.title,
      plainText: note.plainText,
      tags: note.tags,
    }));
    for (const note of mappedNotes) {
      this.fuse.add(note);
    }
    this.resetSearchCache();
  }

  public upsertNote(note: NoteListItem) {
    this.fuse.remove((doc) => doc.id === note.id);
    this.fuse.add({
      id: note.id,
      snippet: note.snippet,
      title: note.title,
      plainText: note.plainText,
      tags: note.tags,
    });
    this.resetSearchCache();
  }

  public removeNote(id: string) {
    this.fuse.remove((doc) => doc.id === id);
    this.resetSearchCache();
  }

  public removeMany(ids: string[]) {
    const deletedIds = new Set(ids);
    this.fuse.remove((doc) => deletedIds.has(doc.id));
    this.resetSearchCache();
  }

  public search(query: string | Expression): FuseResult<NoteSearchDoc>[] {
    const cacheKey =
      typeof query === "string" ? query.trim() : JSON.stringify(query);
    if (!cacheKey) {
      this.resetSearchCache();
      return [];
    }
    if (cacheKey === this.lastQuery) {
      return this.lastResults;
    }
    const results = this.fuse.search(query, { limit: 50 });
    this.lastQuery = cacheKey;
    this.lastResults = results;
    return results;
  }
}

export { NoteSearch };
