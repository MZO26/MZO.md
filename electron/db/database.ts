import { FTS5 } from "@electron/db/fts";
import { Transactions } from "@electron/db/transactions";
import { Views } from "@electron/db/views";
import { validation } from "@shared/ipc-helpers";
import {
  CreateTransactionSchema,
  LinkRowsSchema,
  NoteFromDB,
  TagRowsSchema,
  ToggleBookmarkSchema,
  TogglePinSchema,
  UpdateTransactionSchema,
  type CreateNotePayload,
  type Link,
  type Note,
  type NoteRow,
  type Tag,
  type TagName,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { DBBackupResult } from "@shared/types";
import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";

class NoteDB {
  private db: BetterSqlite.Database;
  public transactions: Transactions;
  public search: FTS5;
  public views: Views;
  private getAllNotesStmt: BetterSqlite.Statement;
  private getNoteByIdStmt: BetterSqlite.Statement;
  private getManyNotesByIdStmt: BetterSqlite.Statement;
  private getAllTagsStmt: BetterSqlite.Statement;
  private getAllLinksStmt: BetterSqlite.Statement;
  public getTagsByIdStmt: BetterSqlite.Statement;
  public getLinksByIdStmt: BetterSqlite.Statement;
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
    this.search = new FTS5(this.db);
    this.views = new Views(this.db);
    this.transactions = new Transactions(this.db);
    this.search.setupFullTextSearch();
    this.search.populateInitialFTSIndex();
    // predefined statements to prevent parsing them for every transaction
    this.getAllNotesStmt = this.db.prepare(
      "SELECT * FROM notes ORDER BY created_at DESC",
    );
    this.getNoteByIdStmt = this.db.prepare(
      "SELECT * FROM notes WHERE id = @id",
    );
    this.getManyNotesByIdStmt = this.db.prepare(`
      SELECT * FROM notes WHERE id IN (SELECT value FROM json_each(@idsList))
    `);
    this.getAllTagsStmt = this.db.prepare(
      "SELECT note_id, tag_name FROM note_tags",
    );
    this.getAllLinksStmt = this.db.prepare(
      "SELECT source_id, target_id FROM note_links",
    );
    this.getTagsByIdStmt = this.db.prepare(
      "SELECT tag_name FROM note_tags WHERE note_id = @id",
    );
    this.getLinksByIdStmt = this.db.prepare(`
      SELECT target_id AS id, 'out' AS dir FROM note_links WHERE source_id = @id UNION ALL SELECT source_id AS id, 'in' AS dir FROM note_links WHERE target_id = @id
      `);
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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS note_links (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        FOREIGN KEY(source_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY(target_id) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE(source_id, target_id)
      )
      `);
  }

  create(payload: CreateNotePayload): Note {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let { tags, links, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const uniqueLinks = [...new Set(links)];
    const rawContent = {
      id,
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      links: uniqueLinks,
      created_at: now,
      updated_at: now,
    };
    const dbContent = validation(CreateTransactionSchema, rawContent);
    return this.transactions.safeCreate(dbContent);
  }

  createMany(payloads: CreateNotePayload[]): Note[] {
    const now = new Date().toISOString();
    const dbContents = [];
    for (const payload of payloads) {
      const id = crypto.randomUUID();
      let { tags, links, content, ...rest } = payload;
      const stringifiedContent = JSON.stringify(content);
      const uniqueTags = [...new Set(tags)].slice(0, 3);
      const uniqueLinks = [...new Set(links)];
      const rawContent = {
        id,
        ...rest,
        content: stringifiedContent,
        tags: uniqueTags,
        links: uniqueLinks,
        created_at: now,
        updated_at: now,
      };
      const dbContent = validation(CreateTransactionSchema, rawContent);
      dbContents.push(dbContent);
    }
    return this.transactions.safeCreateMany(dbContents);
  }

  update(payload: UpdateNotePayload): Note {
    let { tags, links, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const now = new Date().toISOString();
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const uniqueLinks = [...new Set(links)];
    const rawContent = {
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      links: uniqueLinks,
      updated_at: now,
    };
    const dbContent = validation(UpdateTransactionSchema, rawContent);
    return this.transactions.safeUpdate(dbContent);
  }

  delete(id: string): void {
    const result = this.transactions.safeDelete(id);
    if (!result) throw new Error("NOT_FOUND");
  }

  getAll(): Note[] {
    const rows = this.getAllNotesStmt.all() as NoteRow[];
    if (!rows || rows.length === 0) return [];
    const tagResult = this.getAllTagsStmt.all();
    const allTags = TagRowsSchema.parse(tagResult);
    const tagMap = new Map<string, string[]>();
    for (const { note_id, tag_name } of allTags) {
      const existingTags = tagMap.get(note_id) ?? [];
      existingTags.push(tag_name);
      tagMap.set(note_id, existingTags);
    }
    const linkResult = this.getAllLinksStmt.all();
    const allLinks = LinkRowsSchema.parse(linkResult);
    const linkMap = new Map<string, Link[]>();
    for (const { source_id, target_id } of allLinks) {
      const sourceLinks = linkMap.get(source_id) ?? [];
      sourceLinks.push({ id: target_id, dir: "out" });
      linkMap.set(source_id, sourceLinks);
      const targetLinks = linkMap.get(target_id) ?? [];
      targetLinks.push({ id: source_id, dir: "in" });
      linkMap.set(target_id, targetLinks);
    }
    return rows.map((note) => {
      const noteTags = tagMap.get(note.id) ?? [];
      const noteLinks = linkMap.get(note.id) ?? [];
      return validation(NoteFromDB, {
        ...note,
        tags: noteTags,
        links: noteLinks,
      });
    });
  }

  getById(id: string): Note {
    const dbRow = this.getNoteByIdStmt.get({ id }) as NoteRow;
    if (!dbRow) {
      throw new Error("NOT_FOUND");
    }
    return validation(NoteFromDB, {
      ...dbRow,
      tags: this.getTagsById(id) ?? [],
      links: this.getLinksById(id) ?? [],
    });
  }

  getManyById(ids: string[]): Note[] {
    if (ids.length === 0) return [];
    const params = { idsList: JSON.stringify(ids) };
    const rows = this.getManyNotesByIdStmt.all(params) as NoteRow[];
    return rows.map((row) => {
      return validation(NoteFromDB, {
        ...row,
        tags: this.getTagsById(row.id) ?? [],
        links: this.getLinksById(row.id) ?? [],
      });
    });
  }

  toggleBookmark(id: string): boolean {
    const now = new Date().toISOString();
    const rawResult = this.toggleBookmarkStmt.get({ updated_at: now, id });
    if (!rawResult) {
      throw new Error("NOT_FOUND");
    }
    return validation(ToggleBookmarkSchema, rawResult).bookmarked;
  }

  togglePin(id: string): boolean {
    const now = new Date().toISOString();
    const rawResult = this.togglePinStmt.get({ updated_at: now, id });
    if (!rawResult) {
      throw new Error("NOT_FOUND");
    }
    return validation(TogglePinSchema, rawResult).pinned;
  }

  getTagsById(id: string): Tag[] {
    const rawResult = this.getTagsByIdStmt.all({ id }) as TagName[];
    const tagArr = rawResult.map((row) => row.tag_name);
    return tagArr;
  }

  getLinksById(id: string): Link[] {
    const rawResult = this.getLinksByIdStmt.all({ id }) as Link[];
    return rawResult;
  }

  searchByTag(tagName: string): Note[] {
    const result = this.searchByTagStmt.all({ tag_name: tagName }) as NoteRow[];
    return result.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: this.getTagsById(note.id) ?? [],
        links: this.getLinksById(note.id) ?? [],
      });
    });
  }

  getPinnedNotes(): Note[] {
    const rows = this.views.getPinnedNotes();
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: this.getTagsById(note.id) ?? [],
        links: this.getLinksById(note.id) ?? [],
      });
    });
  }

  getBookMarkedNotes(): Note[] {
    const rows = this.views.getBookmarkedNotes();
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: this.getTagsById(note.id) ?? [],
        links: this.getLinksById(note.id) ?? [],
      });
    });
  }

  getNotesWithActionItems(): Note[] {
    const rows = this.views.getNotesWithActionItems();
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: this.getTagsById(note.id) ?? [],
        links: this.getLinksById(note.id) ?? [],
      });
    });
  }

  getUntaggedNotes(): Note[] {
    const rows = this.views.getUntaggedNotes();
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: this.getTagsById(note.id) ?? [],
        links: this.getLinksById(note.id) ?? [],
      });
    });
  }

  optimizeDb() {
    this.db.exec(`
    INSERT INTO notes_fts(notes_fts) VALUES('rebuild');
    PRAGMA optimize;
    `);
  }

  vacuumDb() {
    this.db.exec("VACUUM");
  }

  async backupDb(destination: string): Promise<DBBackupResult> {
    return this.db.backup(destination);
  }
}

export default new NoteDB();
