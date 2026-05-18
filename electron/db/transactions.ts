import NoteDB from "@electron/db/database";
import { validation } from "@shared/ipc-helpers";
import {
  NoteFromDB,
  UpdateNotePayloadSchema,
  type CreateTransaction,
  type MergeTransaction,
  type Note,
  type NoteRow,
  type UpdateTransaction,
} from "@shared/schemas/note-schema";
import type { Database as DatabaseType } from "better-sqlite3";
import BetterSqlite from "better-sqlite3";

class Transactions {
  private db: DatabaseType;
  private createNoteStmt: BetterSqlite.Statement;
  private updateNoteStmt: BetterSqlite.Statement;
  private selectNoteStmt: BetterSqlite.Statement;
  private deleteNoteStmt: BetterSqlite.Statement;
  private deleteTagsStmt: BetterSqlite.Statement;
  private insertTagsStmt: BetterSqlite.Statement;
  private deleteLinksStmt: BetterSqlite.Statement;
  private insertLinksStmt: BetterSqlite.Statement;
  private checkNoteStmt: BetterSqlite.Statement;
  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;

    this.createNoteStmt = this.db.prepare(
      `INSERT INTO notes (id, title, content, plainText,markdown, snippet, pinned, bookmarked, todos_left, created_at, updated_at) VALUES (@id, @title, @content, @plainText, @markdown, @snippet, @pinned, @bookmarked, @todos_left, @created_at, @updated_at) RETURNING *`,
    );
    this.updateNoteStmt = this.db
      .prepare(`UPDATE notes SET title = @title, content = @content, plainText = @plainText, markdown = @markdown, snippet = @snippet, todos_left = @todos_left, updated_at = @updated_at WHERE id = @id RETURNING *
    `);
    this.selectNoteStmt = this.db.prepare(
      "SELECT id FROM notes WHERE id = @id",
    );
    this.deleteNoteStmt = this.db.prepare("DELETE FROM notes WHERE id = @id");
    this.deleteTagsStmt = this.db.prepare(
      "DELETE FROM note_tags WHERE note_id = @note_id",
    );
    this.insertTagsStmt = this.db.prepare(
      "INSERT INTO note_tags (note_id, tag_name) VALUES (@note_id, @tag_name)",
    );
    this.deleteLinksStmt = this.db.prepare(
      "DELETE FROM note_links WHERE source_id = @source_id",
    );
    this.insertLinksStmt = this.db.prepare(
      "INSERT INTO note_links (source_id, target_id) VALUES (@source_id, @target_id)",
    );
    this.checkNoteStmt = this.db.prepare("SELECT 1 FROM notes WHERE id = @id");
  }

  safeCreateMany(paramsArr: CreateTransaction[]): Note[] {
    const rows: Note[] = [];
    for (const params of paramsArr) {
      const { tags, links, ...noteParams } = params;
      const rawResult = this.createNoteStmt.get(noteParams) as NoteRow;
      if (!rawResult) {
        throw new Error("NOT_FOUND");
      }
      const noteId = rawResult.id;
      if (links && links.length > 0) {
        for (const link of links) {
          const exists = this.checkNoteStmt.get({ id: link });
          if (exists) {
            this.insertLinksStmt.run({ source_id: noteId, target_id: link });
          }
        }
      }
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          this.insertTagsStmt.run({ note_id: noteId, tag_name: tag });
        }
      }
      const createdNote = validation(NoteFromDB, {
        ...rawResult,
        tags: NoteDB.getTagsById(noteId),
        links: NoteDB.getLinksById(noteId),
      });
      rows.push(createdNote);
    }
    return rows;
  }

  safeCreate(params: CreateTransaction): Note {
    const { tags, links, ...noteParams } = params;
    const rawResult = this.createNoteStmt.get(noteParams) as NoteRow;
    if (!rawResult) {
      throw new Error("NOT_FOUND");
    }
    const noteId = rawResult.id;
    if (links && links.length > 0) {
      for (const link of links) {
        const exists = this.checkNoteStmt.get({ id: link });
        if (exists) {
          this.insertLinksStmt.run({ source_id: noteId, target_id: link });
        }
      }
    }
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        this.insertTagsStmt.run({ note_id: noteId, tag_name: tag });
      }
    }
    return validation(NoteFromDB, {
      ...rawResult,
      tags: NoteDB.getTagsById(noteId),
      links: NoteDB.getLinksById(noteId),
    });
  }

  safeDelete(id: string): boolean {
    const exists = this.selectNoteStmt.get({ id });
    if (!exists) return false;
    this.deleteTagsStmt.run({ note_id: id });
    this.deleteLinksStmt.run({ source_id: id });
    const result = this.deleteNoteStmt.run({ id });
    return result.changes > 0;
  }

  safeUpdate(params: UpdateTransaction): Note {
    const { tags, links, ...noteParams } = params;
    const rawResult = this.updateNoteStmt.get(noteParams) as NoteRow;
    if (!rawResult) {
      throw new Error("NOT_FOUND");
    }
    const noteId = rawResult.id;
    this.deleteLinksStmt.run({ source_id: noteId });
    if (links && links.length > 0) {
      for (const link of links) {
        const exists = this.checkNoteStmt.get({ id: link });
        if (exists) {
          this.insertLinksStmt.run({ source_id: noteId, target_id: link });
        }
      }
    }
    this.deleteTagsStmt.run({ note_id: noteId });
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        this.insertTagsStmt.run({ note_id: noteId, tag_name: tag });
      }
    }
    return validation(NoteFromDB, {
      ...rawResult,
      tags: NoteDB.getTagsById(noteId),
      links: NoteDB.getLinksById(noteId),
    });
  }

  safeMerge(params: MergeTransaction): Note {
    const { idA, idB } = params;
    const results = NoteDB.getManyById([idA, idB]);
    const recordsMap = new Map(results.map((row) => [row.id, row]));
    const resultA = recordsMap.get(idA);
    const resultB = recordsMap.get(idB);
    if (!resultA || !resultB) {
      throw new Error("NOT_FOUND");
    }
    const mergedJSON = {
      type: "doc" as const,
      content: [resultA.content, { type: "horizontalRule" }, resultB.content],
    };
    const outgoingA = [];
    for (const l of resultA.links) {
      if (l.dir === "out") outgoingA.push(l.id);
    }
    const outgoingB = [];
    for (const l of resultB.links) {
      if (l.dir === "out") outgoingB.push(l.id);
    }
    const mergedOutgoingLinks = [...new Set([...outgoingA, ...outgoingB])];
    NoteDB.delete(resultB.id);
    const validatedData = validation(UpdateNotePayloadSchema, {
      ...resultA,
      content: mergedJSON,
      links: mergedOutgoingLinks,
    });
    return NoteDB.update(validatedData);
  }
}

export { Transactions };
