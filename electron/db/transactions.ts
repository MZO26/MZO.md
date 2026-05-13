import {
  DBRowSchema,
  type CreateTransaction,
  type Note,
  type UpdateTransaction,
} from "@shared/schemas/note-schema";
import type { Database as DatabaseType, Transaction } from "better-sqlite3";

export interface NoteTransactions {
  safeCreateMany: Transaction<(params: CreateTransaction[]) => Note[]>;
  safeCreate: Transaction<(params: CreateTransaction) => Note>;
  safeDelete: Transaction<(id: string) => boolean>;
  safeUpdate: Transaction<(params: UpdateTransaction) => Note>;
}

function createNoteTransactions(db: DatabaseType): NoteTransactions {
  const createNoteStmt = db.prepare(
    "INSERT INTO notes (id, title, content, plainText,markdown, snippet, pinned, bookmarked, todos_left, created_at, updated_at) VALUES (@id, @title, @content, @plainText, @markdown, @snippet, @pinned, @bookmarked, @todos_left, @created_at, @updated_at) RETURNING *",
  );
  const selectNoteStmt = db.prepare("SELECT id FROM notes WHERE id = @id");
  const deleteNoteStmt = db.prepare("DELETE FROM notes WHERE id = @id");
  const deleteTagsStmt = db.prepare(
    "DELETE FROM note_tags WHERE note_id = @note_id",
  );
  const updateNoteStmt =
    db.prepare(`UPDATE notes SET title = @title, content = @content, plainText = @plainText, markdown = @markdown, snippet = @snippet, todos_left = @todos_left, updated_at = @updated_at WHERE id = @id RETURNING *
`);
  const insertTagsStmt = db.prepare(
    "INSERT INTO note_tags (note_id, tag_name) VALUES (@note_id, @tag_name)",
  );
  return {
    safeCreateMany: db.transaction((paramsArr) => {
      const results = [];
      for (const params of paramsArr) {
        const { tags, ...noteParams } = params;
        const rawResult = createNoteStmt.get(noteParams);
        if (!rawResult) {
          throw new Error("NOT_FOUND");
        }
        const result = DBRowSchema.parse({
          ...rawResult,
          tags,
        });
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            insertTagsStmt.run({ note_id: result.id, tag_name: tag });
          }
        }
        results.push(result);
      }
      return results;
    }),

    safeCreate: db.transaction((params) => {
      const { tags, ...noteParams } = params;
      const rawResult = createNoteStmt.get(noteParams);
      if (!rawResult) {
        throw new Error("NOT_FOUND");
      }
      const result = DBRowSchema.parse({
        ...rawResult,
        tags,
      });
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          insertTagsStmt.run({ note_id: result.id, tag_name: tag });
        }
      }
      return result;
    }),
    safeDelete: db.transaction((id: string) => {
      const exists = selectNoteStmt.get({ id });
      if (!exists) return false;
      deleteTagsStmt.run({ note_id: id });
      const result = deleteNoteStmt.run({ id });
      return result.changes > 0;
    }),
    safeUpdate: db.transaction((params) => {
      const { tags, ...noteParams } = params;
      const rawResult = updateNoteStmt.get(noteParams);
      if (!rawResult) {
        throw new Error("NOT_FOUND");
      }
      const result = DBRowSchema.parse({ ...rawResult, tags: params.tags });
      console.log(result);
      deleteTagsStmt.run({ note_id: result.id });
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          insertTagsStmt.run({ note_id: result.id, tag_name: tag });
        }
      }
      return result;
    }),
  };
}

export { createNoteTransactions };
