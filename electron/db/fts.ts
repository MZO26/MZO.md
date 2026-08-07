import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";
import type { SearchQuery, SearchResult } from "@shared/schemas/note-schema";
import { MIN_SEARCH_LENGTH } from "@shared/shared-constants";
import type { DatabaseSync, StatementSync } from "node:sqlite";

class NotesSearch {
  private db: DatabaseSync;
  public searchStmt: StatementSync;
  constructor(db: DatabaseSync) {
    this.db = db;
    this.createVirtualTable(this.db);
    this.buildIndex(this.db);
    this.searchStmt = this.db.prepare(`
    WITH matched_notes AS (
        SELECT
        rowid,
        rank,
        snippet(notes_fts, 1, '<mark class="active-search-highlight">', '</mark>', '...', 8) AS search_match
        FROM notes_fts
        WHERE notes_fts MATCH $ftsQuery
        ORDER BY rank
        LIMIT 20
    )
    SELECT
        n.id,
        n.title,
        m.search_match,
        m.rank
    FROM matched_notes m
    JOIN notes n ON n.rowid = m.rowid
    ORDER BY m.rank
    `);
  }

  public createVirtualTable(db: DatabaseSync) {
    const available = db
      .prepare(`SELECT 1 FROM pragma_module_list WHERE name = 'fts5'`)
      .get();

    if (!available) {
      const msg =
        "SQLite FTS5 extension not available. Ensure your SQLite build includes FTS5.";
      throw new AppBackendError(AppErrorCode.DBError, msg);
    }
    mainLogger.devLog("[FTS5]: Creating Virtual Table");
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        plain_text,
        content='notes',
        content_rowid='rowid',
        prefix='2 3 4',
        tokenize='unicode61 remove_diacritics 2'
      );`);
  }

  public buildIndex(db: DatabaseSync) {
    mainLogger.devLog("[FTS5]: Building Index");
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_notes_ai
      AFTER INSERT ON notes
      BEGIN
        INSERT INTO notes_fts(rowid, title, plain_text)
        VALUES (new.rowid, new.title, new.plain_text);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_notes_ad
      AFTER DELETE ON notes
      BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, plain_text)
        VALUES ('delete', old.rowid, old.title, old.plain_text);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_notes_au
      AFTER UPDATE OF title, plain_text ON notes
      BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, plain_text)
        VALUES ('delete', old.rowid, old.title, old.plain_text);
        INSERT INTO notes_fts(rowid, title, plain_text)
        VALUES (new.rowid, new.title, new.plain_text);
      END;
    `);
  }

  private isRebuilding = false;
  private hasRebuilt = false;

  public rebuildIndex(db: DatabaseSync) {
    db.exec(`
      INSERT INTO notes_fts(notes_fts) VALUES ('rebuild');
      INSERT INTO notes_fts(notes_fts) VALUES ('optimize');
    `);
    mainLogger.devLog(
      "[FTS5]: Search index rebuilt and optimized successfully.",
    );
  }

  public search(query: SearchQuery) {
    const ftsQuery = this.normalizeFTSQuery(query);
    if (!ftsQuery) return [];
    if (this.isRebuilding) return [];
    try {
      return this.searchStmt.all({
        $ftsQuery: ftsQuery,
      }) as SearchResult[];
    } catch (error) {
      if (this.hasRebuilt) {
        mainLogger.appError("[FTS5]: Search failed again and is now disabled.");
        return [];
      }
      mainLogger.appError(
        "[FTS5]: Search failed. Desynchronized index. Rebuilding...",
        error,
      );
      this.isRebuilding = true;
      try {
        this.rebuildIndex(this.db);
      } catch (error) {
        mainLogger.appError("[FTS5]: Error during rebuild process:", error);
      } finally {
        this.isRebuilding = false;
        this.hasRebuilt = true;
      }
      return [];
    }
  }

  public normalizeFTSQuery(input: SearchQuery) {
    const trimmed = input.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) return "";
    const words: string[] = [];
    for (const raw of trimmed.split(/\s+/)) {
      const clean = raw.replace(/"/g, "");
      if (clean) words.push(clean);
    }
    if (words.length === 0) return "";
    return words
      .map((word, index) =>
        index === words.length - 1 ? `"${word}"*` : `"${word}"`,
      )
      .join(" AND ");
  }
}

export { NotesSearch };
