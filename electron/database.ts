import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";
import { NoteFromDbSchema } from "../shared/schemas/noteSchema";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "../shared/types";
import { FTS5 } from "./fts";
import { getNoteData } from "./generators";
import { createNoteTransactions, type NoteTransactions } from "./transactions";

class NoteDB {
  private db: BetterSqlite.Database;
  private transactions: NoteTransactions;
  public search: FTS5;
  private getAllNotesStmt: BetterSqlite.Statement;
  private getNoteByIdStmt: BetterSqlite.Statement;
  private getAllTagsStmt: BetterSqlite.Statement;
  private getTagsById: BetterSqlite.Statement;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    this.db = new BetterSqlite(dbPath);
    this.search = new FTS5(this.db);
    console.log(`Database initialized at: ${dbPath}`);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createTables();
    this.transactions = createNoteTransactions(this.db);
    this.search.setupFullTextSearch();
    this.search.populateInitialFTSIndex();
    // predefined statements to prevent parsing them for every transaction
    this.getAllNotesStmt = this.db.prepare(
      "SELECT * FROM notes ORDER BY created_at DESC",
    );
    this.getNoteByIdStmt = this.db.prepare("SELECT * FROM notes WHERE id = ?");
    this.getAllTagsStmt = this.db.prepare(
      "SELECT note_id, tag_name FROM note_tags",
    );
    this.getTagsById = this.db.prepare(
      "SELECT tag_name FROM note_tags WHERE note_id = ?",
    );
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
        plainText TEXT,
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
  }

  create(payload: CreateNotePayload): Note {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let { content, plainText } = payload;
    const noteData = getNoteData(content, plainText);
    const result = this.transactions.safeCreate({
      id,
      title: noteData.title,
      stringifiedContent: noteData.stringifiedContent,
      snippet: noteData.snippet,
      tags: noteData.tags,
      plainText,
      created_at: now,
      updated_at: now,
    });
    return NoteFromDbSchema.parse({
      ...result,
      content: noteData.stringifiedContent,
      tags: noteData.tags,
    });
  }

  update(payload: UpdateNotePayload): Note {
    let { id, content, plainText } = payload;
    const noteData = getNoteData(content, plainText);
    const now = new Date().toISOString();
    const result = this.transactions.safeUpdate({
      id,
      title: noteData.title,
      stringifiedContent: noteData.stringifiedContent,
      snippet: noteData.snippet,
      tags: noteData.tags,
      plainText,
      updated_at: now,
    });
    return NoteFromDbSchema.parse({
      ...result,
      content: noteData.stringifiedContent,
      tags: noteData.tags,
    });
  }

  delete(id: string): void {
    const result = this.transactions.safeDelete(id);
    if (!result) throw new Error("NOT_FOUND");
  }

  getAll(): Note[] {
    const result = this.getAllNotesStmt.all() as Note[];
    if (result.length === 0) return [];
    const allTags = this.getAllTagsStmt.all() as {
      note_id: string;
      tag_name: string;
    }[];
    const tagMap = new Map<string, string[]>();
    for (const tag of allTags) {
      const existingTags = tagMap.get(tag.note_id) || [];
      existingTags.push(tag.tag_name);
      tagMap.set(tag.note_id, existingTags);
    }
    return result.map((note) => {
      const noteTags = tagMap.get(note.id) || [];
      return NoteFromDbSchema.parse({
        ...note,
        tags: noteTags,
      });
    });
  }

  getById(id: string): Note {
    const note = this.getNoteByIdStmt.get(id) as Note;
    const tags = this.getTagsById.all(id) as { tag_name: string }[];
    if (!note) {
      throw new Error("NOT_FOUND");
    }
    return NoteFromDbSchema.parse({
      ...note,
      tags: tags.map((t) => t.tag_name),
    });
  }
}

export default new NoteDB();
