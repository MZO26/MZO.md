import { mainLogger } from "@electron/handler/permission-handler";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import type { SearchQuery, SearchResult } from "@shared/schemas/note-schema";
import { MIN_SEARCH_LENGTH } from "@shared/shared-constants";
import type { DatabaseSync, StatementSync } from "node:sqlite";

class NotesSearch {
  private db: DatabaseSync;
  private searchStmt!: StatementSync;
  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public init() {
    this.createVirtualTable();
    this.buildIndex();
    this.prepareStmt();
    setTimeout(() => this.optimizeFts(), 5000).unref();
  }

  private prepareStmt() {
    this.searchStmt = this.db.prepare(`
    SELECT n.id, n.title, 
    CASE WHEN octet_length(n.plain_text) <= 100000 
      THEN snippet(notes_fts, 1, '<mark class="active-search-highlight">', '</mark>', '...', 12)
      ELSE NULL
    END AS search_match,
    CASE WHEN octet_length(n.plain_text) > 100000 
      THEN n.plain_text 
      ELSE NULL 
    END AS raw_text,
    notes_fts.rank AS rank
    FROM notes_fts
    JOIN notes n ON n.rowid = notes_fts.rowid
    WHERE notes_fts MATCH $ftsQuery
    ORDER BY notes_fts.rank ASC
    LIMIT 15;
  `);
  }

  private createVirtualTable() {
    const available = this.db
      .prepare(`SELECT 1 FROM pragma_module_list WHERE name = 'fts5'`)
      .get();

    if (!available) {
      const msg =
        "SQLite FTS5 extension not available. Ensure your SQLite build includes FTS5.";
      throw new AppBackendError(AppErrorCode.DBError, msg);
    }
    mainLogger.devLog("[FTS5]: Creating Virtual Table");
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        plain_text,
        content='notes',
        content_rowid='rowid',
        prefix='2 3 4',
        tokenize='unicode61 remove_diacritics 2'
      );`);
  }

  private buildIndex() {
    mainLogger.devLog("[FTS5]: Building Index");
    this.db.exec(`
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

      INSERT INTO notes_fts(notes_fts, rank) VALUES('rank', 'bm25(10.0, 1.0)');

      INSERT INTO notes_fts(notes_fts, rank) VALUES('automerge', 8);
    `);
  }

  private isRebuilding = false;
  private hasRebuilt = false;

  private optimizeFts() {
    if (!this.db?.isOpen) return;
    try {
      mainLogger.devLog("[FTS5]: Optimizing...");
      this.db.exec(`
      INSERT INTO notes_fts(notes_fts) VALUES('optimize');
    `);
    } catch (error) {
      mainLogger.devLog("[FTS5]: Optimize skipped or failed", error);
    }
  }

  private rebuildIndex() {
    this.db.exec(`
      INSERT INTO notes_fts(notes_fts) VALUES ('rebuild');
      INSERT INTO notes_fts(notes_fts) VALUES ('optimize');
    `);
    mainLogger.devLog(
      "[FTS5]: Search index rebuilt and optimized successfully.",
    );
  }

  public search(query: SearchQuery) {
    const parsed = this.normalizeFTSQuery(query);
    if (!parsed) return [];
    if (this.isRebuilding) return [];
    const { ftsQuery, words } = parsed;
    try {
      const rows = this.searchStmt.all({
        $ftsQuery: ftsQuery,
      }) as (SearchResult & { raw_text: string })[];
      const matches: SearchResult[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const finalSnippet =
          row.search_match ??
          this.buildManualSnippet(row.raw_text ?? "", words);
        matches.push({
          id: row.id,
          title: row.title,
          search_match: finalSnippet,
          rank: row.rank,
        });
      }
      return matches;
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
        this.rebuildIndex();
      } catch (error) {
        mainLogger.appError("[FTS5]: Error during rebuild process:", error);
      } finally {
        this.isRebuilding = false;
        this.hasRebuilt = true;
      }
      return [];
    }
  }

  private buildManualSnippet(text: string, words: string[]) {
    if (words.length === 0) return text.slice(0, 120) + "...";
    const escaped = words.map(RegExp.escape).join("|");
    const firstMatchRegex = new RegExp(`(${escaped})`, "i");
    const match = firstMatchRegex.exec(text);
    if (!match) return text.slice(0, 120) + "...";
    const matchIndex = match.index;
    const start = Math.max(0, matchIndex - 60);
    const end = Math.min(text.length, matchIndex + 80);
    const snippet =
      (start > 0 ? "..." : "") +
      text.slice(start, end) +
      (end < text.length ? "..." : "");
    const highlightRegex = new RegExp(`(${escaped})`, "gi");
    return snippet.replace(
      highlightRegex,
      '<mark class="active-search-highlight">$1</mark>',
    );
  }

  private normalizeFTSQuery(input: SearchQuery) {
    const trimmed = input.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) return "";
    const words: string[] = [];
    for (const raw of trimmed.split(/\s+/)) {
      const clean = raw.replace(/"/g, "");
      if (clean) words.push(clean);
    }
    const l = words.length;
    if (l === 0) return "";
    const ftsQuery = words
      .map((word, i) => {
        if (i === l - 1 && word.length >= 3) return `"${word}"*`;
        return `"${word}"`;
      })
      .join(" AND ");

    return { ftsQuery, words };
  }
}

export { NotesSearch };
