import { ftsQueryGenerator } from "@shared/generators/generators";
import { type NoteRow } from "@shared/schemas/note-schema";
import type BetterSqlite from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

class FTS5 {
  private db: DatabaseType;
  private searchStmt: BetterSqlite.Statement;
  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;
    this.setupFullTextSearch();
    this.populateInitialFTSIndex();
    this.searchStmt = this.db.prepare(`
    WITH matched_notes AS (
    SELECT rowid, bm25(notes_fts, 10.0, 1.0) as rank FROM notes_fts WHERE notes_fts MATCH @ftsQuery
    ORDER BY rank ASC 
    LIMIT @limit)
    SELECT n.id, n.title, n.content, n.snippet, n.bookmarked, n.pinned, 
    n.todos_left, n.plainText, n.created_at, n.updated_at
    FROM matched_notes m
    JOIN notes n ON m.rowid = n.rowid
  `);
  }

  private setupFullTextSearch() {
    const fts5Available = this.db
      .prepare("SELECT 1 FROM pragma_module_list WHERE name = 'fts5'")
      .get();

    if (!fts5Available) {
      throw new Error(
        "SQLite FTS5 extension not available. " +
          "better-sqlite3 may not be properly compiled for this system.",
      );
    }
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        plainText,
        tokenize='trigram',
        content='notes',
        content_rowid='rowid'
      );`);

    this.db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, plainText) 
      VALUES (new.rowid, new.title, new.plainText);
    END;

    CREATE TRIGGER IF NOT EXISTS trg_notes_ad AFTER DELETE ON notes BEGIN
       INSERT INTO notes_fts(notes_fts, rowid, title, plainText) 
      VALUES ('delete', old.rowid, old.title, old.plainText);
    END;

    CREATE TRIGGER IF NOT EXISTS trg_notes_au AFTER UPDATE OF title, plainText ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, title, plainText) 
      VALUES ('delete', old.rowid, old.title, old.plainText);
      INSERT INTO notes_fts(rowid, title, plainText) 
      VALUES (new.rowid, new.title, new.plainText);
    END;
  `);
  }

  public populateInitialFTSIndex() {
    const count = this.db
      .prepare(`SELECT count(*) as count FROM notes_fts`)
      .get() as { count: number };
    if (count.count === 0) {
      this.db.exec(`
      INSERT INTO notes_fts (rowid, title, plainText) 
      SELECT rowid, title, plainText FROM notes;
    `);
    }
  }

  public query(searchTerm: string, limit?: number): NoteRow[] {
    const ftsQuery = ftsQueryGenerator(searchTerm);
    if (ftsQuery === "") return [];

    return this.searchStmt.all({
      ftsQuery,
      limit,
    }) as NoteRow[];
  }
}

export { FTS5 };
