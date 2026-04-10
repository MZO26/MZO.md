import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";
import type {
  CreateNotePayload,
  Note,
  UpdateNotePayload,
} from "../src/shared/types";

class NoteDB {
  private db: BetterSqlite.Database;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    this.db = new BetterSqlite(dbPath);
    console.log(`Database initialized at: ${dbPath}`);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createTables();
    this.setupFullTextSearch();
    this.populateInitialFTSIndex();
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
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
    let { title, content, snippet, tags } = payload;
    if (tags.length > 0) {
      tags = tags.slice(0, 3);
    }
    const insertTransaction = this.db.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO notes (id, title, content, snippet, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(id, title, content, snippet, now, now);
      // Save the tags for the note
      const insertTag = this.db.prepare(
        "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
      );

      tags.forEach((tag) => {
        insertTag.run(id, tag);
      });
    });
    // Execute the transaction to insert the note and its tags into the database
    insertTransaction();
    return {
      id,
      title,
      content,
      snippet,
      tags,
      created_at: now,
      updated_at: now,
    };
  }

  update(payload: UpdateNotePayload): Note | undefined {
    const now = new Date().toISOString();
    let { id, title, content, snippet, tags = [] } = payload;
    if (tags && tags.length > 0) {
      tags = tags.slice(0, 3); // Limit to 3 tags per note
    }
    const updateTransaction = this.db.transaction(() => {
      // Update the note's title and content
      const updatedNote = this.db
        .prepare(
          "UPDATE notes SET title = ?, content = ?, snippet = ?, updated_at = ? WHERE id = ? RETURNING *",
        )
        .get(title, content, snippet, now, id) as Note | undefined;

      if (updatedNote) {
        this.db.prepare("DELETE FROM note_tags WHERE note_id = ? ").run(id);
        const insertTag = this.db.prepare(
          "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
        );
        tags.forEach((tag) => {
          insertTag.run(id, tag);
        });
        updatedNote.tags = tags;
        return updatedNote;
      }
      return undefined;
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
      return {
        ...note,
        tags: tagMap.get(note.id) || [],
      };
    });
    return result;
  }

  getById(id: string): Note | undefined {
    const note = this.db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as
      | Note
      | undefined;
    if (!note) {
      return undefined;
    }
    const tags = this.db
      .prepare("SELECT tag_name FROM note_tags WHERE note_id = ?")
      .all(id) as { tag_name: string }[];
    return { ...note, tags: tags.map((t) => t.tag_name) };
  }

  setupFullTextSearch() {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        id UNINDEXED,
        title,
        content,
        snippet,
        tags
      );`);
    this.db.exec(`
    DROP VIEW IF EXISTS notes_view;

    CREATE VIEW notes_view AS
    SELECT 
      notes.id AS id, 
      notes.title, 
      notes.content,
      notes.snippet,
      IFNULL(GROUP_CONCAT(note_tags.tag_name, ' '), '') as tags
    FROM notes
    LEFT JOIN note_tags ON notes.id = note_tags.note_id
    GROUP BY notes.id;
  `);

    this.db.exec(`
    -- on creation of note
    CREATE TRIGGER IF NOT EXISTS trg_notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(id, title, content, snippet, tags) 
      SELECT id, title, content, snippet, tags FROM notes_view WHERE id = new.id;
    END;

    -- on deletion of note
    CREATE TRIGGER IF NOT EXISTS trg_notes_ad AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE id = old.id;
    END;

    -- on update of text or title
    CREATE TRIGGER IF NOT EXISTS trg_notes_au AFTER UPDATE ON notes BEGIN
      DELETE FROM notes_fts WHERE id = old.id;
      INSERT INTO notes_fts(id, title, content, snippet, tags) 
      SELECT id, title, content, snippet, tags FROM notes_view WHERE id = new.id;
    END;

    -- on creation of tag
    CREATE TRIGGER IF NOT EXISTS trg_note_tags_ai AFTER INSERT ON note_tags BEGIN
      DELETE FROM notes_fts WHERE id = new.note_id;
      INSERT INTO notes_fts(id, title, content, snippet, tags) 
      SELECT id, title, content, snippet, tags FROM notes_view WHERE id = new.note_id;
    END;
    -- on delete of tag
    CREATE TRIGGER IF NOT EXISTS trg_note_tags_ad AFTER DELETE ON note_tags BEGIN
      DELETE FROM notes_fts WHERE id = old.note_id;
      INSERT INTO notes_fts(id, title, content, snippet, tags) 
      SELECT id, title, content, snippet, tags FROM notes_view WHERE id = old.note_id;
    END;
`);
  }

  populateInitialFTSIndex() {
    const count = this.db
      .prepare(`SELECT count(*) as count FROM notes_fts`)
      .get() as { count: number };
    if (count.count === 0) {
      this.db.exec(`
      INSERT INTO notes_fts (id, title, content, snippet, tags) 
      SELECT id, title, content, snippet, tags FROM notes_view;
    `);
    }
  }

  searchNotes(searchTerm: string) {
    const trimmed = searchTerm.trim();
    if (!trimmed) return [];
    const cleanSearch = trimmed.replace(/[^\p{L}\p{N}\s]/gu, " "); // Remove special FTS characters to avoid database errors if user types ^, NEAR, NOT, etc. This strips everything but letters, numbers and spaces
    const ftsQuery = cleanSearch
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => `${word}*`) // prefix matching
      .join(" AND ");
    if (!ftsQuery) return [];
    const stmt = this.db.prepare(`
    SELECT 
      fts.id, 
      highlight(notes_fts, 1, '<b>', '</b>') AS title,
      highlight(notes_fts, 2, '<b>', '</b>') AS content,
      snippet(notes_fts, 2, '<b>', '</b>', '...', 15) AS snippet,
      fts.tags,
      n.created_at,
      n.updated_at
    FROM notes_fts fts
    JOIN notes n ON fts.id = n.id
    WHERE notes_fts MATCH ? -- id(0), title(10), content(1), snippet(1), tags(5)
    ORDER BY bm25(notes_fts, 0.0, 10.0, 1.0, 1.0, 5.0)
  `);
    return stmt.all(ftsQuery);
  }
}

export default new NoteDB();
