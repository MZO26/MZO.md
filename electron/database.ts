import BetterSqlite from "better-sqlite3";
import { app } from "electron";
import path from "path";
import type { Note } from "../src/shared/types";

class NoteDB {
  private db: BetterSqlite.Database; // private for encapsulation so only this class can access it
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "notes.db"); // Searches for standard folder for AppData and then appends notes.db to the path
    this.db = new BetterSqlite(dbPath);
    console.log(`Database initialized at: ${dbPath}`);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.createTables(); // After initializing the database, tables get created if they don't exist yet
  }
  //db.exec is used to execute SQL statements that don't return data, like CREATE TABLE. It runs the provided SQL command directly on the database. In this case, it creates a table named "notes" if it doesn't already exist, with columns for id, title, content, created_at, and tags.
  // The "notes" table has the following columns:
  // - id: A unique identifier for each note, set as the primary key.
  // - title: The title of the note, which cannot be null and must have a length greater than 0.
  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(title) > 0),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // The "note_tags" table is created to manage the many-to-many relationship between notes and tags. It has the following columns:
    // - note_id: A foreign key that references the id of a note in the "notes" table. It cannot be null. On delete of a note, all associated tags in this table will also be deleted due to the ON DELETE CASCADE constraint.
    // - tag_name: The name of the tag associated with the note. It cannot be null. This doesn't mean that has to exist for a note, but if it exists, it cannot be null.
    // The UNIQUE constraint on (note_id, tag_name) ensures that a specific tag can only be associated with a note once, preventing duplicate tags for the same note.
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE(note_id, tag_name)
      );
    `);
  }
  // prepare is used to create a prepared statement, which is a way to execute the same SQL statement repeatedly with different parameters. It helps prevent SQL injection and can improve performance. In this case, it prepares an INSERT statement to add a new note to the "notes" table, with placeholders for the id, title, and content. The run method is then called on the prepared statement to execute it with the actual values for id, title, and content.
  // Run executes the prepared statement but doesn't return any data. It returns an object containing information about the execution, such as the number of rows affected. In this case, it runs the prepared statement to insert a new note into the database with the provided id, title, content, and tags (converted to a JSON string). You use run when you want to execute a statement that modifies the database (like INSERT, UPDATE, DELETE) and you don't need to retrieve any data from it.

  // run() for inserting a new note into the database. It executes the prepared statement with the provided parameters (id, title, content, and tags) to add a new record to the "notes" table. The run() method is used for executing SQL statements that modify the database but do not return any data, such as INSERT, UPDATE, or DELETE statements.
  // get() is used to retrieve a single row of data from the database. It executes a prepared statement and returns the first row that matches the query. The get() method is used for executing SQL statements that return a single row of data, such as SELECT statements that are expected to return only one result. If searching for a single ID and it is not found, get() will return undefined, which is why the return type of getById is Note | undefined.
  // all() is used to retrieve multiple rows of data from the database. It executes a prepared statement and returns an array of all rows that match the query. The all() method is used for executing SQL statements that return multiple rows of data, such as SELECT statements that are expected to return more than one result. In the getAll() method, all() is used to retrieve all notes from the "notes" table, and then for each note, it retrieves the associated tags using another prepared statement and all() again to get all tags for that note. The result is an array of Note objects, each containing its associated tags. If nothing is found, all() will return an empty array, which is why the return type of getAll is Note[].
  create(title: string, content: string, tags: string[] = []): string {
    const id = crypto.randomUUID();
    // Using a transaction to ensure that both the note and its tags are inserted together, maintaining data integrity. If any part of the transaction fails, the entire transaction will be rolled back, preventing partial data from being saved.
    if (tags.length > 0) {
      tags = tags.slice(0, 3); // Limit to 3 tags per note
    }
    const insertTransaction = this.db.transaction(() => {
      // Save the note itself
      this.db
        .prepare("INSERT INTO notes (id, title, content) VALUES (?, ?, ?)")
        .run(id, title, content);
      // Save the tags for the note
      const insertTag = this.db.prepare(
        "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
      );

      tags.forEach((tag) => {
        insertTag.run(id, tag);
      });
    });
    // Execute the transaction to insert the note and its tags into the database
    insertTransaction();
    return id;
  }

  update(
    id: string,
    title: string,
    content: string,
    tags: string[] = [],
  ): boolean {
    let isSuccess = false;
    if (tags.length > 0) {
      tags = tags.slice(0, 3); // Limit to 3 tags per note
    }
    const updateTransaction = this.db.transaction(() => {
      // Update the note's title and content
      const result = this.db
        .prepare("UPDATE notes SET title = ?, content = ? WHERE id = ?")
        .run(title, content, id);
      if (result.changes > 0) {
        isSuccess = true;
      }
      this.db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(id);
      const insertTag = this.db.prepare(
        "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
      );
      tags.forEach((tag) => {
        insertTag.run(id, tag);
      });
    });
    updateTransaction();
    return isSuccess;
  }

  delete(id: string): boolean {
    // Delete the note itself
    // Delete tags associated with the note (handled by ON DELETE CASCADE)
    // No transaction because ON DELETE CASCADE ensures that tags are automatically deleted when the note is deleted, so we only need to execute one statement to delete the note. If the note is successfully deleted, the associated tags will also be removed from the database without needing a separate transaction.
    const result = this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    return result.changes > 0;
  }

  getAll(): Note[] {
    // no transaction because it is only critical for writing and updating. Reading operations don't need it
    const result = this.db
      .prepare("SELECT * FROM notes ORDER BY created_at DESC")
      .all() as Note[];
    const getTags = this.db.prepare(
      "SELECT tag_name FROM note_tags WHERE note_id = ?",
    );
    result.forEach((note) => {
      const tagsObject = getTags.all(note.id) as { tag_name: string }[];
      return { ...note, tags: tagsObject.map((t) => t.tag_name) };
    });
    return result;
  }

  getById(id: string): Note | undefined {
    const note = this.db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as
      | Note
      | undefined;
    if (!note) {
      return undefined;
    }
    const tags = this.db
      .prepare("SELECT tag_name FROM note_tags WHERE note_id = ?")
      .all(id) as { tag_name: string }[];
    return { ...note, tags: tags.map((t) => t.tag_name) };
  }
}

export default new NoteDB();
