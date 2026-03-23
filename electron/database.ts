import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

class NoteDB {
  private db: BetterSqlite.Database;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db");
    this.db = new BetterSqlite(dbPath);
    console.log(`Database initialized at: ${dbPath}`);
    this.db.pragma("journal_mode = WAL");
    this.createTables();
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  create(title: string, content: string): string {
    const id = crypto.randomUUID();
    this.db
      .prepare("INSERT INTO notes (id, title, content) VALUES (?, ?, ?)")
      .run(id, title, content);
    return id;
  }

  update(id: string, title: string, content: string): boolean {
    const result = this.db
      .prepare("UPDATE notes SET title = ?, content = ? WHERE id = ?")
      .run(title, content, id);
    return (result.changes > 0) as boolean;
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    return (result.changes > 0) as boolean;
  }
  getAll(): Note[] {
    return this.db
      .prepare("SELECT * FROM notes ORDER BY created_at DESC")
      .all() as Note[];
  }

  getById(id: string): Note | undefined {
    return this.db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as
      | Note
      | undefined;
  }
}

export default new NoteDB();
