import { Transactions } from "@electron/db/transactions";
import { parseFilenameToDate } from "@electron/fs/fs-helpers";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  CreateTransactionSchema,
  LinksSchema,
  NoteFromDB,
  NoteListItemFromDB,
  OldNoteSchema,
  TagsSchema,
  ToggleManyPinsSchema,
  TogglePinSchema,
  UpdateTransactionSchema,
  type CreateNotePayload,
  type Link,
  type LinkRow,
  type Note,
  type NoteListItem,
  type NoteRow,
  type Tag,
  type TagNameRow,
  type TagRow,
  type UpdateNotePayload,
} from "@shared/schemas/note-schema";
import {
  StoreRowSchema,
  StoreToRowSchema,
  type AppSettings,
  type StoreRow,
} from "@shared/schemas/store-schema";
import { app } from "electron";
import { backup, DatabaseSync, type StatementSync } from "node:sqlite";
import path from "path";

class AppDB {
  private db: DatabaseSync | undefined;
  private readonly dbPath: string;
  public transactions: Transactions;
  private getAllNotesStmt: StatementSync;
  private getAllBackupStmt: StatementSync;
  private getNoteByIdStmt: StatementSync;
  private getManyNotesByIdStmt: StatementSync;
  private getAllTagsStmt: StatementSync;
  private getAllLinksStmt: StatementSync;
  private getTagsByIdStmt: StatementSync;
  private getLinksByIdStmt: StatementSync;
  private getManyTagsStmt: StatementSync;
  private getManyLinksStmt: StatementSync;
  private getOldTitleStmt: StatementSync;
  private togglePinStmt: StatementSync;
  private toggleManyPinStmt: StatementSync;
  private updateStoreStmt: StatementSync;
  private getAllSettingsStmt: StatementSync;
  private checkNoteStmt: StatementSync;
  constructor() {
    this.dbPath = path.join(app.getPath("userData"), "app.db");
    try {
      this.db = this.open();
      this.transactions = new Transactions(this.db);
      // predefined statements to prevent parsing them for every transaction
      this.getAllNotesStmt = this.db.prepare(
        `SELECT id, title, pinned, snippet, created_at, updated_at
      FROM notes 
      ORDER BY updated_at DESC`,
      );
      this.getAllBackupStmt = this.db.prepare(`
        SELECT * FROM notes ORDER BY updated_at DESC
        `);
      this.getNoteByIdStmt = this.db.prepare(
        `SELECT * FROM notes WHERE id = $id`,
      );
      this.getManyNotesByIdStmt = this.db.prepare(`
      SELECT * FROM notes WHERE id IN (SELECT value FROM json_each($ids))
    `);
      this.getAllTagsStmt = this.db.prepare(
        `SELECT note_id, tag_name FROM note_tags`,
      );
      this.getAllLinksStmt = this.db.prepare(
        `SELECT source_id, target_id FROM note_links`,
      );
      this.getTagsByIdStmt = this.db.prepare(
        `SELECT tag_name FROM note_tags WHERE note_id = $id`,
      );
      this.getLinksByIdStmt = this.db.prepare(`
      SELECT target_id AS id, 'out' AS dir FROM note_links WHERE source_id = $id UNION ALL SELECT source_id AS id, 'in' AS dir FROM note_links WHERE target_id = $id
      `);
      this.getManyTagsStmt = this.db.prepare(`
      SELECT note_id, tag_name FROM note_tags
      WHERE note_id IN  (SELECT value FROM json_each($ids))
      `);
      this.getManyLinksStmt = this.db.prepare(`
      SELECT source_id, target_id, 'out' AS dir
      FROM note_links
      WHERE source_id IN (SELECT value FROM json_each($ids))
      UNION ALL
      SELECT source_id, target_id, 'in' AS dir
      FROM note_links
      WHERE target_id IN (SELECT value FROM json_each($ids))
      `);
      this.togglePinStmt = this.db.prepare(`
      UPDATE notes 
      SET pinned = NOT pinned, updated_at = $updated_at
      WHERE id = $id RETURNING pinned
    `);
      this.toggleManyPinStmt = this.db.prepare(`
      UPDATE notes
      SET pinned = NOT pinned, updated_at = $updated_at
      WHERE id IN (SELECT value FROM json_each($ids))
      RETURNING id
      `);
      this.getOldTitleStmt = this.db.prepare(`
      SELECT created_at, title 
      FROM notes
      WHERE id IN (SELECT value FROM json_each($ids))
      `);
      this.updateStoreStmt = this.db.prepare(`
      UPDATE store SET
      "theme" = $theme,
      "font_family" = $font_family,
      "font_size" = $font_size,
      "line_height" = $line_height,
      "spellcheck" = $spellcheck,
      "auto_export" = $auto_export,
      "auto_export_path" = $auto_export_path,
      "export_format" = $export_format,
      "code_theme" = $code_theme,
      "highlight" = $highlight,
      "note_item_display" = $note_item_display,
      "toolbar_collapsed" = $toolbar_collapsed,
      "window_bounds" = $window_bounds,
      "active_tag" = $active_tag
      WHERE id = 1
      `);
      this.getAllSettingsStmt = this.db.prepare(`
        SELECT * FROM store WHERE id = 1
      `);
      this.checkNoteStmt = this.db.prepare(`
      SELECT 1 
      FROM notes 
      WHERE title = $title 
      AND created_at >= $start 
      AND created_at < $end 
      LIMIT 1;
      `);
      console.log(`Database initialized at: ${this.dbPath}`);
    } catch (error) {
      console.error("[AppDB]: Failed to initialize database:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const msg =
        `database to load on platform: ${process.platform}. ` +
        `Original error: ${errorMessage}`;
      throw new AppBackendError(AppErrorCode.DBError, msg);
    }
  }

  private createTables(db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        snippet TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE(note_id, tag_name)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS note_links (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        FOREIGN KEY(source_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY(target_id) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE(source_id, target_id)
      )
      `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS store (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      theme TEXT NOT NULL DEFAULT 'system',
      font_family TEXT NOT NULL DEFAULT 'system',
      font_size TEXT NOT NULL DEFAULT '18',
      line_height TEXT NOT NULL DEFAULT '1.5',
      spellcheck INTEGER NOT NULL DEFAULT 0,
      auto_export INTEGER NOT NULL DEFAULT 0,
      auto_export_path TEXT,
      export_format TEXT NOT NULL DEFAULT 'md',
      code_theme TEXT NOT NULL DEFAULT 'balanced',
      highlight TEXT NOT NULL DEFAULT 'context',
      note_item_display TEXT NOT NULL DEFAULT 'preview',
      toolbar_collapsed INTEGER NOT NULL DEFAULT 0,
      window_bounds TEXT NOT NULL DEFAULT '{"width":800,"height":500}',
      active_tag TEXT
    );
    INSERT OR IGNORE INTO store (id) VALUES (1);
    `);
  }

  private getTagMapAll(): Map<string, Tag[]> {
    const allTags = this.getAllTagsStmt.all() as TagRow[];
    const tagMap = new Map<string, Tag[]>();
    for (const { note_id, tag_name } of allTags) {
      const existingTags = tagMap.get(note_id) ?? [];
      existingTags.push(tag_name);
      tagMap.set(note_id, existingTags);
    }
    return tagMap;
  }

  private getTagMapMany(ids: string[]): Map<string, Tag[]> {
    const manyTags = this.getManyTagsStmt.all({
      $ids: JSON.stringify(ids),
    }) as TagRow[];
    const tagMap = new Map<string, Tag[]>();
    for (const { note_id, tag_name } of manyTags) {
      const existingTags = tagMap.get(note_id) ?? [];
      existingTags.push(tag_name);
      tagMap.set(note_id, existingTags);
    }
    return tagMap;
  }

  private getLinkMapAll(): Map<string, Link[]> {
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

  private getLinkMapMany(ids: string[]): Map<string, Link[]> {
    const allLinks = this.getManyLinksStmt.all({
      $ids: JSON.stringify(ids),
    }) as (LinkRow & { dir: "in" | "out" })[];
    const linkMap = new Map<string, Link[]>();
    for (const { source_id, target_id, dir } of allLinks) {
      const note_id = dir === "out" ? source_id : target_id;
      const id = dir === "out" ? target_id : source_id;
      const links = linkMap.get(note_id) ?? [];
      links.push({ id, dir });
      linkMap.set(note_id, links);
    }
    return linkMap;
  }

  public updateSettings(mergedSettings: AppSettings): void {
    const row = validation(StoreToRowSchema, mergedSettings);
    this.updateStoreStmt.run(row);
  }

  public getAllSettings(): AppSettings {
    const row = this.getAllSettingsStmt.get() as StoreRow | undefined;
    if (!row) throw new AppBackendError(AppErrorCode.DBError);
    return validation(StoreRowSchema, row);
  }

  public create(payload: CreateNotePayload): NoteListItem {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let { tags, links, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const uniqueTags = [...new Set(tags)].slice(0, 5);
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
    const result = this.transactions.safeCreate(dbContent);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
    return result;
  }

  public createMany(payloads: CreateNotePayload[]): NoteListItem[] {
    const now = new Date().toISOString();
    const dbContents = [];
    for (const payload of payloads) {
      const id = crypto.randomUUID();
      const { tags, links, content, ...rest } = payload;
      const stringifiedContent = JSON.stringify(content);
      const uniqueTags = [...new Set(tags)].slice(0, 5);
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
      dbContents.push(validation(CreateTransactionSchema, dbPayload));
    }
    const result = this.transactions.safeCreateMany(dbContents);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
    return result;
  }

  public update(payload: UpdateNotePayload): NoteListItem {
    let { tags, links, content, ...rest } = payload;
    const stringifiedContent = JSON.stringify(content);
    const now = new Date().toISOString();
    const uniqueTags = [...new Set(tags)].slice(0, 5);
    const uniqueLinks = [...new Set(links)];
    const dbPayload = {
      ...rest,
      content: stringifiedContent,
      tags: uniqueTags,
      links: uniqueLinks,
      updated_at: now,
    };
    const dbContent = validation(UpdateTransactionSchema, dbPayload);
    const result = this.transactions.safeUpdate(dbContent);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
    return result;
  }

  public delete(id: string) {
    const result = this.transactions.safeDelete(id);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
    return result;
  }

  public deleteMany(ids: string[]) {
    const result = this.transactions.safeDeleteMany(ids);
    if (!result) throw new AppBackendError(AppErrorCode.DBError);
    return result;
  }

  public getAll(): NoteListItem[] {
    const tagMap = this.getTagMapAll() ?? new Map();
    const linkMap = this.getLinkMapAll() ?? new Map();
    const results: NoteListItem[] = [];
    for (const row of this.getAllNotesStmt.iterate() as IterableIterator<NoteRow>) {
      const validatedNote = validation(NoteListItemFromDB, {
        ...row,
        tags: tagMap.get(row.id) ?? [],
        links: linkMap.get(row.id) ?? [],
      });
      results.push(validatedNote);
    }
    return results;
  }

  public getAllBackup(): Note[] {
    const results: Note[] = [];
    const tagMap = this.getTagMapAll() ?? new Map();
    const linkMap = this.getLinkMapAll() ?? new Map();
    for (const row of this.getAllBackupStmt.iterate() as IterableIterator<NoteRow>) {
      const validatedNote = validation(NoteFromDB, {
        ...row,
        tags: tagMap.get(row.id) ?? [],
        links: linkMap.get(row.id) ?? [],
      });
      results.push(validatedNote);
    }
    return results;
  }

  public getById(id: string): Note {
    const row = this.getNoteByIdStmt.get({ $id: id }) as NoteRow | undefined;
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
    const params = { $ids: JSON.stringify(ids) };
    const rows = this.getManyNotesByIdStmt.all(params) as NoteRow[];
    if (!rows) throw new AppBackendError(AppErrorCode.DBError);
    const tagMap = this.getTagMapMany(ids) ?? [];
    const linkMap = this.getLinkMapMany(ids) ?? [];
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
    const result = this.togglePinStmt.get({ $updated_at: now, $id: id });
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    return validation(TogglePinSchema, result).pinned;
  }

  public toggleManyPins(ids: string[]): boolean {
    if (ids.length === 0) return false;
    const now = new Date().toISOString();
    const result = this.toggleManyPinStmt.all({
      $updated_at: now,
      $ids: JSON.stringify(ids),
    });
    const rows = validation(ToggleManyPinsSchema, result);
    return rows.length > 0;
  }

  public getTagsById(id: string): Tag[] {
    const rows = this.getTagsByIdStmt.all({ $id: id }) as TagNameRow[];
    const tagArr = rows.map((row) => row.tag_name);
    return validation(TagsSchema, tagArr);
  }

  public getLinksById(id: string): Link[] {
    const rows = this.getLinksByIdStmt.all({ $id: id }) as LinkRow[];
    return validation(LinksSchema, rows);
  }

  public checkExistence(fileName: string): boolean {
    const parsedData = parseFilenameToDate(fileName);
    if (!parsedData) return false;
    const { title, date } = parsedData;
    // gets milliseconds for the parsed date
    const start = date.toISOString();
    // appends one second as buffer for creation date since ms are not in filenames
    const endDate = new Date(date.getTime() + 1000);
    const end = endDate.toISOString();
    return !!this.checkNoteStmt.get({
      $title: title,
      $start: start,
      $end: end,
    });
  }

  public getOldNotes(ids: string[]): Pick<Note, "created_at" | "title">[] {
    if (ids.length === 0) return [];
    const rows = this.getOldTitleStmt.all({
      $ids: JSON.stringify(ids),
    }) as Pick<Note, "created_at" | "title">[];
    if (rows.length !== ids.length) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    return validation(OldNoteSchema, rows);
  }

  public execPragma(name: string): void {
    if (!this.db) {
      throw new Error(
        `[Database Error]: Attempted to call execPragma("${name}") before the database was initialized.`,
      );
    }
    const sql = name.trim().toUpperCase().startsWith("PRAGMA ")
      ? name
      : `PRAGMA ${name}`;
    this.db.prepare(sql).run();
  }

  public queryPragma<T extends Record<string, unknown>>(
    sql: string,
    db: DatabaseSync,
  ): T | undefined {
    const command = sql.trim().toUpperCase().startsWith("PRAGMA ")
      ? sql
      : `PRAGMA ${sql}`;
    return db.prepare(command).get() as T | undefined;
  }

  public close() {
    if (!this.db) {
      return;
    }
    try {
      this.db.close();
    } catch (error) {
      console.error(
        "[Database Error]: Failed to close database connection:",
        error,
      );
    } finally {
      this.db = undefined;
    }
  }

  public open(): DatabaseSync {
    if (this.db) return this.db;
    const dbPath = this.pathDb();
    const db = new DatabaseSync(dbPath, {
      open: true,
      readOnly: false,
    });
    this.db = db;
    try {
      this.execPragma("journal_mode = WAL");
      this.execPragma("foreign_keys = ON");
      this.execPragma("busy_timeout = 5000");
      this.execPragma("synchronous = NORMAL");
      this.createTables(db);
      const integrity = this.queryPragma<{ quick_check: string }>(
        "quick_check",
        db,
      );
      if (integrity?.quick_check !== "ok") {
        throw new AppBackendError(AppErrorCode.DBError);
      }
      return this.db;
    } catch (error) {
      console.error("[Database Error]: Failed to open db", error);
      db.close();
      this.db = undefined;
      throw error;
    }
  }

  public pathDb(): string {
    return this.dbPath;
  }

  public async backupDb(destination: string, db?: DatabaseSync) {
    const targetDb = db ?? this.db;
    if (!targetDb) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    try {
      await backup(targetDb, destination, {
        progress: (info) => {
          console.log(`Backup progress: ${info.remainingPages} pages left.`);
        },
      });
    } catch (error) {
      console.error(
        `[Database Error]: Failed to backup to ${destination}`,
        error,
      );
      throw new AppBackendError(AppErrorCode.DBError);
    }
  }
}

export default new AppDB();
