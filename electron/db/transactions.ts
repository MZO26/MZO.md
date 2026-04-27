import type { Database as DatabaseType, Transaction } from "better-sqlite3";
import type { Note } from "../../shared/schemas/noteSchema";

export interface NoteTransactions {
  safeCreate: Transaction<(params: CreateTransactionParams) => Note>;
  safeDelete: Transaction<(id: string) => boolean>;
  safeUpdate: Transaction<(params: UpdateTransactionParams) => Note>;
}

export interface UpdateTransactionParams {
  id: string;
  title: string;
  stringifiedContent: string;
  plainText: string;
  snippet: string;
  bookmarked?: boolean;
  pinned?: boolean;
  todos_left: number;
  updated_at: string;
  tags: string[];
}

export interface CreateTransactionParams {
  id: string;
  title: string;
  stringifiedContent: string;
  plainText: string;
  todos_left?: number;
  bookmarked?: boolean;
  pinned?: boolean;
  snippet: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

function createNoteTransactions(db: DatabaseType): NoteTransactions {
  const createNoteStmt = db.prepare(
    "INSERT INTO notes (id, title, content, plainText, snippet, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
  );
  const selectNoteStmt = db.prepare("SELECT id FROM notes WHERE id = ?");
  const deleteNoteStmt = db.prepare("DELETE FROM notes WHERE id = ?");
  const deleteTagsStmt = db.prepare("DELETE FROM note_tags WHERE note_id = ?");
  const updateNoteStmt = db.prepare(
    "UPDATE notes SET title = ?, content = ?, plainText = ?, snippet = ?, todos_left = ?, updated_at = ? WHERE id = ? RETURNING *",
  );
  const insertTagsStmt = db.prepare(
    "INSERT INTO note_tags (note_id, tag_name) VALUES (?, ?)",
  );
  return {
    safeCreate: db.transaction((params: CreateTransactionParams) => {
      const id = crypto.randomUUID();
      const {
        title,
        stringifiedContent,
        plainText,
        snippet,
        created_at,
        updated_at,
        tags,
      } = params;
      const result = createNoteStmt.get(
        id,
        title,
        stringifiedContent,
        plainText,
        snippet,
        created_at,
        updated_at,
      );
      if (!result) {
        throw new Error("NOT_FOUND");
      }
      for (const tag of tags) {
        insertTagsStmt.run(id, tag);
      }
      return result;
    }),
    safeDelete: db.transaction((id: string) => {
      const exists = selectNoteStmt.get(id);
      if (!exists) return false;
      deleteTagsStmt.run(id);
      const result = deleteNoteStmt.run(id);
      return result.changes > 0;
    }),
    safeUpdate: db.transaction((params: UpdateTransactionParams) => {
      const {
        id,
        title,
        stringifiedContent,
        plainText,
        snippet,
        todos_left,
        updated_at,
        tags,
      } = params;
      // Update the note's title and content
      const result = updateNoteStmt.get(
        title,
        stringifiedContent,
        plainText,
        snippet,
        todos_left,
        updated_at,
        id,
      );
      if (!result) {
        throw new Error("NOT_FOUND");
      }
      deleteTagsStmt.run(id);
      for (const tag of tags) {
        insertTagsStmt.run(id, tag);
      }
      return result;
    }),
  };
}

export { createNoteTransactions };
