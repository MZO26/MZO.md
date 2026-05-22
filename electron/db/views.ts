import type { NoteRow } from "@shared/schemas/note-schema";
import type BetterSqlite from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

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

  public getBookmarkedNotes(): NoteRow[] {
    return this.getBookmarkedNotesStmt.all() as NoteRow[];
  }

  public getPinnedNotes(): NoteRow[] {
    return this.getPinnedNotesStmt.all() as NoteRow[];
  }

  public getNotesWithActionItems(): NoteRow[] {
    return this.getNotesWithActionItemsStmt.all() as NoteRow[];
  }

  public getUntaggedNotes(): NoteRow[] {
    return this.getUntaggedNotesStmt.all() as NoteRow[];
  }
}

export { Views };
