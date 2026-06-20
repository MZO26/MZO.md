import { Transactions } from "@electron/db/transactions";
import { Views } from "@electron/db/views";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import { extractText } from "@shared/generators";
import {
  CreateTransactionSchema,
  NoteFromDB,
  TogglePinSchema,
  UpdateTransactionSchema,
  type CreateNotePayload,
  type Link,
  type LinkRow,
  type Note,
  type NoteListItem,
  type NoteRow,
  type Tag,
  type TagRow,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import type { DBBackupResult } from "@shared/types";
import type BetterSqlite from "better-sqlite3";
import { app } from "electron";
import { createRequire } from "module";
import path from "path";
const require = createRequire(import.meta.url);

class NoteDB {
  private db: BetterSqlite.Database;
  public transactions: Transactions;
  public views: Views;
  private getAllNotesStmt: BetterSqlite.Statement;
  private getNoteByIdStmt: BetterSqlite.Statement;
  private getManyNotesByIdStmt: BetterSqlite.Statement;
  private getAllTagsStmt: BetterSqlite.Statement;
  private getAllLinksStmt: BetterSqlite.Statement;
  private getTagsByIdStmt: BetterSqlite.Statement;
  private getLinksByIdStmt: BetterSqlite.Statement;
  private getOldTitleStmt: BetterSqlite.Statement;
  private togglePinStmt: BetterSqlite.Statement;
  private searchByTagStmt: BetterSqlite.Statement;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    try {
      const BetterSqlite = require("better-sqlite3");
      this.db = new BetterSqlite(dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
      this.createTables();
      this.views = new Views(this.db);
      this.transactions = new Transactions(this.db);
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
      this.getOldTitleStmt = this.db.prepare(
        `SELECT title FROM notes WHERE id = @id`,
      );
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
      console.log(`Database initialized at: ${dbPath}`);
    } catch (error) {
      console.error("[NoteDB]: Failed to initialize database:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const msg =
        `better-sqlite3 native module failed to load on platform: ${process.platform}. ` +
        `Try running: npm run rebuild && npm run pack. Original error: ${errorMessage}`;
      throw new AppBackendError(AppErrorCode.DBError, msg);
    }
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
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

  private getTagMap(): Map<string, Tag[]> {
    const allTags = this.getAllTagsStmt.all() as TagRow[];
    const tagMap = new Map<string, Tag[]>();
    for (const { note_id, tag_name } of allTags) {
      const existingTags = tagMap.get(note_id) ?? [];
      existingTags.push(tag_name);
      tagMap.set(note_id, existingTags);
    }
    return tagMap;
  }

  private getLinkMap(): Map<string, Link[]> {
    const allLinks = this.getAllLinksStmt.all() as LinkRow[];
    const linkMap = new Map<string, Link[]>();
    for (const { source_id, target_id } of allLinks) {
      const sourceLinks = linkMap.get(source_id) ?? [];
      sourceLinks.push({ id: target_id, dir: "out" });
      linkMap.set(source_id, sourceLinks);
      const targetLinks = linkMap.get(target_id) ?? [];
      targetLinks.push({ id: source_id, dir: "in" });
      linkMap.set(target_id, targetLinks);
    }
    return linkMap;
  }

  public create(payload: CreateNotePayload): Note {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let { tags, links, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const uniqueLinks = [...new Set(links)];
    const dbPayload = {
      id,
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      links: uniqueLinks,
      created_at: now,
      updated_at: now,
    };
    const dbContent = validation(CreateTransactionSchema, dbPayload);
    return this.transactions.safeCreate(dbContent);
  }

  public createMany(payloads: CreateNotePayload[]): Note[] {
    const now = new Date().toISOString();
    const dbContents = new Array(payloads.length);
    let i = 0;
    for (const payload of payloads) {
      const id = crypto.randomUUID();
      const { tags, links, content, ...rest } = payload;
      const stringifiedContent = JSON.stringify(content);
      const uniqueTags = [...new Set(tags)].slice(0, 3);
      const uniqueLinks = [...new Set(links)];
      const dbPayload = {
        id,
        ...rest,
        content: stringifiedContent,
        tags: uniqueTags,
        links: uniqueLinks,
        created_at: now,
        updated_at: now,
      };
      dbContents[i] = validation(CreateTransactionSchema, dbPayload);
      i++;
    }
    return this.transactions.safeCreateMany(dbContents);
  }

  public update(payload: UpdateNotePayload): Note {
    let { tags, links, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const now = new Date().toISOString();
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    const uniqueLinks = [...new Set(links)];
    const dbPayload = {
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      links: uniqueLinks,
      updated_at: now,
    };
    const dbContent = validation(UpdateTransactionSchema, dbPayload);
    return this.transactions.safeUpdate(dbContent);
  }

  public delete(id: string) {
    const result = this.transactions.safeDelete(id);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
  }

  public deleteMany(ids: string[]) {
    const result = this.transactions.safeDeleteMany(ids);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
  }

  public getAll(): NoteListItem[] {
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    const results: NoteListItem[] = [];
    for (const row of this.getAllNotesStmt.iterate() as IterableIterator<NoteRow>) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id),
        links: linkMap.get(row.id),
      });
      const plainText = extractText(validatedNote.content);
      const { content, ...lightweightNote } = validatedNote;
      results.push({ ...lightweightNote, plainText });
    }
    return results;
  }

  public getAllBackup(): Note[] {
    const results: Note[] = [];
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    for (const row of this.getAllNotesStmt.iterate() as IterableIterator<NoteRow>) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id),
        links: linkMap.get(row.id),
      });
      results.push(validatedNote);
    }
    return results;
  }

  public getById(id: string): Note {
    const row = this.getNoteByIdStmt.get({ id }) as NoteRow;
    if (!row) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    return validation(NoteFromDB, {
      ...row,
      tags: this.getTagsById(id) ?? [],
      links: this.getLinksById(id) ?? [],
    });
  }

  public getManyById(ids: string[]): Note[] {
    if (ids.length === 0) return [];
    const params = { idsList: JSON.stringify(ids) };
    const rows = this.getManyNotesByIdStmt.all(params) as NoteRow[];
    if (!Array.isArray(rows)) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    return rows.map((row) => {
      return validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id) ?? [],
        links: linkMap.get(row.id) ?? [],
      });
    });
  }

  public togglePin(id: string): boolean {
    const now = new Date().toISOString();
    const result = this.togglePinStmt.get({ updated_at: now, id });
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    return validation(TogglePinSchema, result).pinned;
  }

  public getTagsById(id: string): Tag[] {
    const rows = this.getTagsByIdStmt.all({ id });
    if (!Array.isArray(rows)) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    const tagArr = rows.map((row) => (row as { tag_name: string }).tag_name);
    return tagArr as Tag[];
  }

  public getLinksById(id: string): Link[] {
    const rows = this.getLinksByIdStmt.all({ id });
    if (!Array.isArray(rows)) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    return rows as Link[];
  }

  public searchByTag(tagName: string): Note[] {
    const result = this.searchByTagStmt.all({ tag_name: tagName }) as NoteRow[];
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    return result.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
  }

  public getNotesWithActionItems(): NoteListItem[] {
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    const results: NoteListItem[] = [];
    for (const row of this.views.getNotesWithActionItems()) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id),
        links: linkMap.get(row.id),
      });
      const plainText = extractText(validatedNote.content);
      const { content, ...lightweightNote } = validatedNote;
      results.push({ ...lightweightNote, plainText });
    }
    return results;
  }

  public getUntaggedNotes(): NoteListItem[] {
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    const results: NoteListItem[] = [];
    for (const row of this.views.getUntaggedNotes()) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id),
        links: linkMap.get(row.id),
      });
      const plainText = extractText(validatedNote.content);
      const { content, ...lightweightNote } = validatedNote;
      results.push({ ...lightweightNote, plainText });
    }
    return results;
  }

  public getUnlinkedNotes(): NoteListItem[] {
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    const results: NoteListItem[] = [];
    for (const row of this.views.getUnlinkedNotes()) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id),
        links: linkMap.get(row.id),
      });
      const plainText = extractText(validatedNote.content);
      const { content, ...lightweightNote } = validatedNote;
      results.push({ ...lightweightNote, plainText });
    }
    return results;
  }

  public getNotesWithMostLinks(): NoteListItem[] {
    const tagMap = this.getTagMap() ?? new Map();
    const linkMap = this.getLinkMap() ?? new Map();
    const results: NoteListItem[] = [];
    for (const row of this.views.getMostLinkedNotes()) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id),
        links: linkMap.get(row.id),
      });
      const plainText = extractText(validatedNote.content);
      const { content, ...lightweightNote } = validatedNote;
      results.push({ ...lightweightNote, plainText });
    }
    return results;
  }

  public getOldNotes(
    ids: string[],
  ): Array<{ id: string; title: Note["title"] }> {
    const notes: Array<{ id: string; title: Note["title"] }> = [];
    for (const id of ids) {
      const row = this.getOldTitleStmt.get({ id }) as
        | { title: Note["title"] }
        | undefined;
      if (!row) {
        throw new AppBackendError(AppErrorCode.DBError);
      }
      notes.push({ id, title: row.title });
    }
    return notes;
  }

  optimizeDb() {
    this.db.exec(`PRAGMA optimize`);
  }

  vacuumDb() {
    this.db.exec("VACUUM");
  }

  async backupDb(destination: string): Promise<DBBackupResult> {
    return this.db.backup(destination);
  }
}

export default new NoteDB();
