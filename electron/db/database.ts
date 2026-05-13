import { FTS5 } from "@electron/db/fts";
import {
  createNoteTransactions,
  type NoteTransactions,
} from "@electron/db/transactions";
import { Views } from "@electron/db/views";
import {
  CreateTransactionSchema,
  DBRowSchema,
  NoteTagNameRowsSchema,
  NoteTagRowsSchema,
  ToggleBookmarkSchema,
  TogglePinSchema,
  UpdateTransactionSchema,
  type CreateNotePayload,
  type Note,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { BatchExportData, NoteRow } from "@shared/types";
import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";

class NoteDB {
  private db: BetterSqlite.Database;
  private transactions: NoteTransactions;
  public search: FTS5;
  public views: Views;
  private getAllNotesStmt: BetterSqlite.Statement;
  private getNoteByIdStmt: BetterSqlite.Statement;
  private getAllTagsStmt: BetterSqlite.Statement;
  private getTagsByIdStmt: BetterSqlite.Statement;
  private toggleBookmarkStmt: BetterSqlite.Statement;
  private togglePinStmt: BetterSqlite.Statement;
  private searchByTagStmt: BetterSqlite.Statement;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    this.db = new BetterSqlite(dbPath);
    console.log(`Database initialized at: ${dbPath}`);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createTables();
    this.transactions = createNoteTransactions(this.db);
    this.search = new FTS5(this.db);
    this.views = new Views(this.db);
    this.search.setupFullTextSearch();
    this.search.populateInitialFTSIndex();
    // predefined statements to prevent parsing them for every transaction
    this.getAllNotesStmt = this.db.prepare(
      "SELECT * FROM notes ORDER BY created_at DESC",
    );
    this.getNoteByIdStmt = this.db.prepare(
      "SELECT * FROM notes WHERE id = @id",
    );
    this.getAllTagsStmt = this.db.prepare(
      "SELECT note_id, tag_name FROM note_tags",
    );
    this.getTagsByIdStmt = this.db.prepare(
      "SELECT tag_name FROM note_tags WHERE note_id = @id",
    );
    this.toggleBookmarkStmt = this.db.prepare(`
      UPDATE notes 
      SET bookmarked = NOT bookmarked, updated_at = @updated_at
      WHERE id = @id RETURNING bookmarked
    `);
    this.togglePinStmt = this.db.prepare(`
      UPDATE notes 
      SET pinned = NOT pinned, updated_at = @updated_at
      WHERE id = @id RETURNING pinned
    `);
    this.searchByTagStmt = this.db.prepare(`
      SELECT notes.* 
      FROM notes
      JOIN note_tags as t ON notes.id = t.note_id
      WHERE t.tag_name = @tag_name
      `);
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
        plainText TEXT NOT NULL DEFAULT '',
        bookmarked INTEGER NOT NULL DEFAULT 0,
        pinned INTEGER NOT NULL DEFAULT 0,
        todos_left INTEGER NOT NULL DEFAULT 0,
        snippet TEXT DEFAULT '',
        markdown TEXT NOT NULL DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE(note_id, tag_name)
      );
    `);
  }

  create(payload: CreateNotePayload): Note {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let { tags, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const rawContent = {
      id,
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      created_at: now,
      updated_at: now,
    };
    const dbContent = CreateTransactionSchema.parse(rawContent);
    return this.transactions.safeCreate(dbContent);
  }

  createMany(payloads: CreateNotePayload[]): Note[] {
    const now = new Date().toISOString();
    const dbContents = [];
    for (const payload of payloads) {
      const id = crypto.randomUUID();
      let { tags, content, ...rest } = payload;
      const stringifiedContent = JSON.stringify(content);
      const uniqueTags = [...new Set(tags)].slice(0, 3);
      const rawContent = {
        id,
        ...rest,
        content: stringifiedContent,
        tags: uniqueTags,
        created_at: now,
        updated_at: now,
      };
      const dbContent = CreateTransactionSchema.parse(rawContent);
      dbContents.push(dbContent);
    }
    return this.transactions.safeCreateMany(dbContents);
  }

  update(payload: UpdateNotePayload): Note {
    let { tags, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const now = new Date().toISOString();
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const rawContent = {
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      updated_at: now,
    };
    const dbContent = UpdateTransactionSchema.parse(rawContent);
    return this.transactions.safeUpdate(dbContent);
  }

  delete(id: string): void {
    const result = this.transactions.safeDelete(id);
    if (!result) throw new Error("NOT_FOUND");
  }

  getAll(): Note[] {
    const rows = this.getAllNotesStmt.all() as NoteRow[];
    if (rows.length === 0) return [];
    const rawResult = this.getAllTagsStmt.all();
    const allTags = NoteTagRowsSchema.parse(rawResult);
    const tagMap = new Map<string, string[]>();
    for (const { note_id, tag_name } of allTags) {
      const existingTags = tagMap.get(note_id) ?? [];
      existingTags.push(tag_name);
      tagMap.set(note_id, existingTags);
    }
    return rows.map((note) => {
      const noteTags = tagMap.get(note.id) ?? [];
      return DBRowSchema.parse({
        ...note,
        tags: noteTags,
      });
    });
  }

  getById(id: string): Note {
    const dbRow = this.getNoteByIdStmt.get({ id }) as NoteRow;
    if (!dbRow) {
      throw new Error("NOT_FOUND");
    }
    return DBRowSchema.parse({
      ...dbRow,
      tags: this.getTagsById(id),
    });
  }

  toggleBookmark(id: string): boolean {
    const now = new Date().toISOString();
    const rawResult = this.toggleBookmarkStmt.get({ updated_at: now, id });
    if (!rawResult) {
      throw new Error("NOT_FOUND");
    }
    return ToggleBookmarkSchema.parse(rawResult).bookmarked;
  }

  togglePin(id: string): boolean {
    const now = new Date().toISOString();
    const rawResult = this.togglePinStmt.get({ updated_at: now, id });
    if (!rawResult) {
      throw new Error("NOT_FOUND");
    }
    return TogglePinSchema.parse(rawResult).pinned;
  }

  getTagsById(id: string): string[] {
    const rawResult = this.getTagsByIdStmt.all({ id });
    const result = NoteTagNameRowsSchema.parse(rawResult);
    return result.map((row) => row.tag_name);
  }

  searchByTag(tagName: string): Note[] {
    const result = this.searchByTagStmt.all({ tag_name: tagName }) as NoteRow[];
    return result.map((note) =>
      DBRowSchema.parse({ ...note, tags: this.getTagsById(note.id) }),
    );
  }
  getPinnedNotes(): Note[] {
    const rows = this.views.getPinnedNotes();
    return rows.map((note) =>
      DBRowSchema.parse({
        ...note,
        tags: this.getTagsById(note.id),
      }),
    );
  }

  getBookMarkedNotes(): Note[] {
    const rows = this.views.getBookmarkedNotes();
    return rows.map((note) => {
      return DBRowSchema.parse({
        ...note,
        tags: this.getTagsById(note.id),
      });
    });
  }

  getNotesWithActionItems(): Note[] {
    const rows = this.views.getNotesWithActionItems();
    return rows.map((note) => {
      return DBRowSchema.parse({
        ...note,
        tags: this.getTagsById(note.id),
      });
    });
  }

  getUntaggedNotes(): Note[] {
    const rows = this.views.getUntaggedNotes();
    return rows.map((note) => {
      return DBRowSchema.parse({
        ...note,
        tags: this.getTagsById(note.id),
      });
    });
  }

  exportIterator(format: "json" | "md" | "txt") {
    let query: string;
    switch (format) {
      case "json":
        query = "SELECT id, title, content FROM notes";
        break;
      case "md":
        query = "SELECT id, title, markdown FROM notes";
        break;
      case "txt":
        query = "SELECT id, title, plainText FROM notes";
        break;
    }

    return this.db
      .prepare(query)
      .iterate() as IterableIterator<BatchExportData>;
  }
}

export default new NoteDB();
