import type { NoteRow } from "@shared/types";
import type { Database as DatabaseType } from "better-sqlite3";
import BetterSqlite from "better-sqlite3";

class Views {
  private db: DatabaseType;
  private getBookmarkedNotesStmt: BetterSqlite.Statement;
  private getPinnedNotesStmt: BetterSqlite.Statement;
  private getNotesWithActionItemsStmt: BetterSqlite.Statement;
  private getUntaggedNotesStmt: BetterSqlite.Statement;
  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;
    this.getBookmarkedNotesStmt = this.db.prepare(
      `SELECT * FROM notes 
      WHERE bookmarked = 1
      ORDER BY updated_at DESC`,
    );

    this.getPinnedNotesStmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE pinned = 1
      ORDER BY updated_at DESC
    `);

    this.getNotesWithActionItemsStmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE todos_left > 0
      ORDER BY updated_at DESC
    `);

    this.getUntaggedNotesStmt = this.db.prepare(`
      SELECT notes.*
      FROM notes
      LEFT JOIN note_tags as t ON notes.id = t.note_id
      WHERE t.note_id IS NULL
      `);
  }

  getBookmarkedNotes(): NoteRow[] {
    return this.getBookmarkedNotesStmt.all() as NoteRow[];
  }

  getPinnedNotes(): NoteRow[] {
    return this.getPinnedNotesStmt.all() as NoteRow[];
  }

  getNotesWithActionItems(): NoteRow[] {
    return this.getNotesWithActionItemsStmt.all() as NoteRow[];
  }

  getUntaggedNotes(): NoteRow[] {
    return this.getUntaggedNotesStmt.all() as NoteRow[];
  }
}

export { Views };
