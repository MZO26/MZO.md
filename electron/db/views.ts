import type { NoteRow } from "@shared/schemas/note-schema";
import type BetterSqlite from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

class Views {
  private db: DatabaseType;
  private getMostLinkedStmt: BetterSqlite.Statement;
  private getNotesWithActionItemsStmt: BetterSqlite.Statement;
  private getUntaggedStmt: BetterSqlite.Statement;
  private getUnlinkedStmt: BetterSqlite.Statement;
  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;
    this.getNotesWithActionItemsStmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE todos_left > 0
      ORDER BY updated_at DESC
    `);
    this.getUntaggedStmt = this.db.prepare(`
      SELECT notes.*
      FROM notes
      LEFT JOIN note_tags AS t ON notes.id = t.note_id
      WHERE t.note_id IS NULL
      `);
    this.getMostLinkedStmt = this.db.prepare(`
      SELECT notes.*, COUNT(l.source_id) AS link_count
      FROM notes
      JOIN note_links AS l ON notes.id = l.source_id
      GROUP BY notes.id
      ORDER BY link_count DESC
      LIMIT 20
      `);
    this.getUnlinkedStmt = this.db.prepare(`
      SELECT notes.*
      FROM notes
      LEFT JOIN note_links AS l ON notes.id = l.source_id
      WHERE l.source_id IS NULL
    `);
  }

  public getNotesWithActionItems(): IterableIterator<NoteRow> {
    return this.getNotesWithActionItemsStmt.iterate() as IterableIterator<NoteRow>;
  }

  public getUntaggedNotes(): IterableIterator<NoteRow> {
    return this.getUntaggedStmt.iterate() as IterableIterator<NoteRow>;
  }

  public getUnlinkedNotes(): IterableIterator<NoteRow> {
    return this.getUnlinkedStmt.iterate() as IterableIterator<NoteRow>;
  }

  public getMostLinkedNotes(): IterableIterator<NoteRow> {
    return this.getMostLinkedStmt.iterate() as IterableIterator<NoteRow>;
  }
}

export { Views };
