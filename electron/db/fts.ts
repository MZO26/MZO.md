import NoteDB from "@electron/db/database";
import { ftsQueryGenerator } from "@shared/generators/generators";
import { validation } from "@shared/ipc-helpers";
import {
  NoteFromDB,
  NoteRowSchema,
  type Note,
  type NoteRow,
} from "@shared/schemas/note-schema";
import type { Database as DatabaseType } from "better-sqlite3";
import BetterSqlite from "better-sqlite3";

class FTS5 {
  private db: DatabaseType;
  private searchStmt: BetterSqlite.Statement;

  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;
    this.searchStmt = this.db.prepare(`
    WITH matched_notes AS (
    SELECT id, bm25(notes_fts, 0.0, 10.0, 1.0) as rank FROM notes_fts WHERE notes_fts MATCH @ftsQuery
    ORDER BY rank ASC 
    LIMIT @limit)
    SELECT n.id, n.title, n.content, n.snippet, n.bookmarked, n.pinned, 
    n.todos_left, n.plainText, n.created_at, n.updated_at
    FROM matched_notes m
    JOIN notes n ON m.id = n.id
  `);
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
        plainText,
        tokenize="trigram"
      );`);
    this.db.exec(`
      DROP VIEW IF EXISTS notes_view;
      CREATE VIEW notes_view AS
      SELECT n.id, n.title, n.content, n.plainText, n.snippet, (SELECT json_group_array(tag_name) FROM note_tags WHERE note_id = n.id) AS tags
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
    const ftsQuery = ftsQueryGenerator(searchTerm);
    if (ftsQuery === "") return [];

    const result = this.searchStmt.all({
      ftsQuery,
      limit,
    }) as NoteRow[];
    return result.map((note) => {
      const validatedRow = validation(NoteRowSchema, note);
      return validation(NoteFromDB, {
        ...validatedRow,
        tags: NoteDB.getTagsById(validatedRow.id),
        links: NoteDB.getLinksById(validatedRow.id),
      });
    });
  }
}

export { FTS5 };
