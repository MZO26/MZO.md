import { NoteFromDbSchema, type Note } from "@shared/schemas/note-schema";
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

  getBookmarkedNotes(): Note[] {
    const result = this.getBookmarkedNotesStmt.all();
    return result.map((note) => NoteFromDbSchema.parse(note));
  }
  getPinnedNotes(): Note[] {
    const result = this.getPinnedNotesStmt.all();
    return result.map((note) => NoteFromDbSchema.parse(note));
  }

  getNotesWithActionItems(): Note[] {
    const result = this.getNotesWithActionItemsStmt.all();
    return result.map((note) => NoteFromDbSchema.parse(note));
  }

  getUntaggedNotes(): Note[] {
    const result = this.getUntaggedNotesStmt.all() as Note[];
    return result.map((note) => {
      return NoteFromDbSchema.parse({
        ...note,
      });
    });
  }
}

export { Views };
