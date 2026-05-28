import { Transactions } from "@electron/db/transactions";
import { Views } from "@electron/db/views";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  CreateTransactionSchema,
  NoteFromDB,
  ToggleBookmarkSchema,
  TogglePinSchema,
  UpdateNotePayloadSchema,
  UpdateTransactionSchema,
  type CreateNotePayload,
  type GetByIdRow,
  type Link,
  type LinkRow,
  type MergeTransaction,
  type Note,
  type NoteRow,
  type Tag,
  type TagName,
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
  private toggleBookmarkStmt: BetterSqlite.Statement;
  private togglePinStmt: BetterSqlite.Statement;
  private searchByTagStmt: BetterSqlite.Statement;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    try {
      const BetterSqlite = require("better-sqlite3");
      this.db = new BetterSqlite(dbPath);
      console.log(`Database initialized at: ${dbPath}`);
    } catch (error) {
      console.error("[NoteDB]: Failed to initialize database:", error);

      const msg = error instanceof Error ? error.message : String(error);

      if (
        msg.includes("Cannot find module") ||
        msg.includes("compiled against a different Node.js") ||
        msg.includes("invalid ELF header") ||
        msg.includes("dlopen")
      ) {
        throw new Error(
          "better-sqlite3 native module failed to load. " +
            "Try: npm run rebuild && npm run pack:" +
            process.platform,
        );
      }
      throw error;
    }
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
      "SELECT n.*, (SELECT json_group_array(tag_name) FROM note_tags WHERE note_id = n.id) AS tags_json, (SELECT json_group_array(target_id) FROM note_links WHERE source_id = n.id) AS links_json FROM notes n WHERE n.id = @id;",
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

  public mergeNotes(params: MergeTransaction): Note {
    const now = new Date().toISOString();
    const { idA, idB } = params;
    const results = this.getManyById([idA, idB]);
    const recordsMap = new Map(results.map((row) => [row.id, row]));
    const resultA = recordsMap.get(idA);
    const resultB = recordsMap.get(idB);
    if (!resultA || !resultB) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    const mergedJSON = {
      type: "doc" as const,
      content: [resultA.content, { type: "horizontalRule" }, resultB.content],
    };
    const outgoingA = resultA.links
      .filter((l) => l.dir === "out")
      .map((l) => l.id);
    const outgoingB = resultB.links
      .filter((l) => l.dir === "out")
      .map((l) => l.id);
    const mergedOutgoingLinks = [...new Set([...outgoingA, ...outgoingB])];
    const mergedTags = [...new Set([...resultA.tags, ...resultB.tags])];
    const validatedData = validation(UpdateNotePayloadSchema, {
      ...resultA,
      content: mergedJSON,
      links: mergedOutgoingLinks,
      tags: mergedTags,
    });
    const dbContent = {
      ...validatedData,
      content: JSON.stringify(validatedData.content),
      updated_at: now,
    };
    return this.transactions.safeMerge(resultB.id, dbContent);
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

  public getAll(): Note[] {
    const rows = this.getAllNotesStmt.all() as NoteRow[];
    if (!rows || rows.length === 0) return [];
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
  }

  public getById(id: string): Note {
    const rows = this.getNoteByIdStmt.get({ id }) as GetByIdRow;
    if (!rows) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    const parsedTags = JSON.parse(rows.tags_json || "[]");
    const parsedLinks = JSON.parse(rows.links_json || "[]");
    const { tags_json, links_json, ...dbRow } = rows;
    return validation(NoteFromDB, {
      ...dbRow,
      tags: parsedTags,
      links: parsedLinks,
    });
  }

  public getManyById(ids: string[]): Note[] {
    if (ids.length === 0) return [];
    const params = { idsList: JSON.stringify(ids) };
    const rows = this.getManyNotesByIdStmt.all(params) as NoteRow[];
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return rows.map((row) => {
      return validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id) ?? [],
        links: linkMap.get(row.id) ?? [],
      });
    });
  }

  public toggleBookmark(id: string): boolean {
    const now = new Date().toISOString();
    const result = this.toggleBookmarkStmt.get({ updated_at: now, id });
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    return validation(ToggleBookmarkSchema, result).bookmarked;
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
    const result = this.getTagsByIdStmt.all({ id }) as TagName[];
    const tagArr = result.map((row) => row.tag_name);
    return tagArr;
  }

  public getLinksById(id: string): Link[] {
    const result = this.getLinksByIdStmt.all({ id }) as Link[];
    return result;
  }

  public searchByTag(tagName: string): Note[] {
    const result = this.searchByTagStmt.all({ tag_name: tagName }) as NoteRow[];
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return result.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
  }

  public getPinnedNotes(): Note[] {
    const rows = this.views.getPinnedNotes();
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
  }

  public getBookMarkedNotes(): Note[] {
    const rows = this.views.getBookmarkedNotes();
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
  }

  public getNotesWithActionItems(): Note[] {
    const rows = this.views.getNotesWithActionItems();
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
  }

  public getUntaggedNotes(): Note[] {
    const rows = this.views.getUntaggedNotes();
    const tagMap = this.getTagMap() ?? [];
    const linkMap = this.getLinkMap() ?? [];
    return rows.map((note) => {
      return validation(NoteFromDB, {
        ...note,
        tags: tagMap.get(note.id) ?? [],
        links: linkMap.get(note.id) ?? [],
      });
    });
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
