import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";
import { NoteFromDbSchema } from "../src/shared/schemas/noteSchema";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "../src/shared/types";
import { FTS5 } from "./fts";

class NoteDB {
  private db: BetterSqlite.Database;
  public search: FTS5;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    this.db = new BetterSqlite(dbPath);
    this.search = new FTS5(this.db);
    console.log(`Database initialized at: ${dbPath}`);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createTables();
    this.search.setupFullTextSearch();
    this.search.populateInitialFTSIndex();
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
    let { title, content, plainText, snippet, tags } = payload;
    const stringifiedContent = JSON.stringify(content);
    if (tags.length > 0) {
      tags = tags.slice(0, 3);
    }
    const createTransaction = this.db.transaction((): Note => {
      const result = this.db
        .prepare(
          "INSERT INTO notes (id, title, content, plainText, snippet, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(id, title, stringifiedContent, plainText, snippet, now, now);

      if (result.changes !== 1) {
        throw new Error("Failed to create note");
      }
      // Save the tags for the note
      const insertTag = this.db.prepare(
        "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
      );
      tags.forEach((tag) => {
        insertTag.run(id, tag);
      });

      return NoteFromDbSchema.parse({
        id,
        title,
        content: stringifiedContent,
        plainText,
        snippet,
        tags,
        created_at: now,
        updated_at: now,
      });
    });
    // Execute the transaction to insert the note and its tags into the database
    return createTransaction();
  }

  update(payload: UpdateNotePayload): Note {
    const now = new Date().toISOString();
    let { id, title, content, plainText, snippet, tags = [] } = payload;
    if (tags.length > 0) {
      tags = tags.slice(0, 3); // Limit to 3 tags per note
    }
    const stringifiedContent = JSON.stringify(content);
    const updateTransaction = this.db.transaction((): Note => {
      // Update the note's title and content
      const result = this.db
        .prepare(
          "UPDATE notes SET title = ?, content = ?, plainText = ?, snippet = ?, updated_at = ? WHERE id = ? RETURNING *",
        )
        .get(title, stringifiedContent, plainText, snippet, now, id) as Note;
      if (!result) {
        throw new Error(`Note not found: ${id}`);
      }
      this.db.prepare("DELETE FROM note_tags WHERE note_id = ? ").run(id);
      const insertTag = this.db.prepare(
        "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
      );
      tags.forEach((tag) => {
        insertTag.run(id, tag);
      });
      return NoteFromDbSchema.parse({
        ...result,
        content: stringifiedContent,
        tags,
      });
    });
    return updateTransaction();
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    return result.changes > 0;
  }

  getAll(): Note[] {
    const allNotes = this.db
      .prepare("SELECT * FROM notes ORDER BY created_at DESC")
      .all() as Note[];
    if (allNotes.length === 0) return [];
    const allTags = this.db
      .prepare("SELECT note_id, tag_name FROM note_tags")
      .all() as { note_id: string; tag_name: string }[];
    const tagMap = new Map<string, string[]>();
    for (const tag of allTags) {
      if (!tagMap.has(tag.note_id)) {
        tagMap.set(tag.note_id, []);
      }
      tagMap.get(tag.note_id)!.push(tag.tag_name);
    }
    const result = allNotes.map((note) => {
      return NoteFromDbSchema.parse({
        ...note,
        tags: tagMap.get(note.id) || [],
      });
    });
    return result;
  }

  getById(id: string): Note {
    const note = this.db
      .prepare("SELECT * FROM notes WHERE id = ?")
      .get(id) as Note;
    const tags = this.db
      .prepare("SELECT tag_name FROM note_tags WHERE note_id = ?")
      .all(id) as { tag_name: string }[];
    return NoteFromDbSchema.parse({
      ...note,
      tags: tags.map((t) => t.tag_name),
    });
  }
}

export default new NoteDB();
