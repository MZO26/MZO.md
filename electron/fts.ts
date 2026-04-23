import type { Database as DatabaseType } from "better-sqlite3";
import { generateFtsQuery } from "../shared/generationHelpers.ts/ftsQuery";
import { NoteFromDbSchema } from "../shared/schemas/noteSchema";
import type { FTSRows, Note } from "../shared/types";

class FTS5 {
  private db: DatabaseType;

  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;
  }

  populateInitialFTSIndex() {
    const count = this.db
      .prepare(`SELECT count(*) as count FROM notes_fts`)
      .get() as { count: number };
    if (count.count === 0) {
      this.db.exec(`
      INSERT INTO notes_fts (id, title, plainText) 
      SELECT id, title, plainText FROM notes_view;
    `);
    }
  }

  setupFullTextSearch() {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        id UNINDEXED,
        title,
        plainText
      );`);
    this.db.exec(`
    DROP VIEW IF EXISTS notes_view;

    CREATE VIEW notes_view AS
    SELECT 
      n.id,
      n.title, 
      n.content,
      n.plainText,
      n.snippet,
      (
        SELECT json_group_array(tag_name) 
        FROM note_tags 
        WHERE note_id = n.id
      ) AS tags
    FROM notes n
  `);

    this.db.exec(`
    -- on creation of note
    CREATE TRIGGER IF NOT EXISTS trg_notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(id, title, plainText) 
      VALUES (new.id, new.title, new.plainText);
    END;

    -- on deletion of note
    CREATE TRIGGER IF NOT EXISTS trg_notes_ad AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE id = old.id;
    END;

    -- on update of text or title
    CREATE TRIGGER IF NOT EXISTS trg_notes_au AFTER UPDATE ON notes BEGIN
      DELETE FROM notes_fts WHERE id = old.id;
      INSERT INTO notes_fts(id, title, plainText) 
      VALUES (new.id, new.title, new.plainText);
    END;
`);
  }

  searchNotes(searchTerm: string, limit: number): Note[] {
    const ftsQuery = generateFtsQuery(searchTerm);
    const stmt = this.db.prepare<unknown[], FTSRows>(`
    SELECT 
      n.id, 
      highlight(notes_fts, 1, '<b>', '</b>') AS title, 
      --index 1 -> second column
      n.content,
      snippet(notes_fts, 2, '<b class="search-highlight">', '</b>', '...', 50) as plainText,
      (
        SELECT json_group_array(tag_name)
        FROM note_tags
        WHERE note_id = n.id
      ) AS tags,
      n.created_at,
      n.updated_at
    FROM notes_fts
    JOIN notes n ON notes_fts.id = n.id
    WHERE notes_fts MATCH ? -- id(0), title(10), plainText(1))
    ORDER BY bm25(notes_fts, 0.0, 10.0, 1.0)
    LIMIT ?
  `);
    const result = stmt.all(ftsQuery, limit);
    return result.map((note) => {
      const noteData = {
        ...note,
        tags: JSON.parse(note.tags),
      };
      return NoteFromDbSchema.parse(noteData);
    });
  }
}

export { FTS5 };
