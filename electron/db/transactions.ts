import NoteDB from "@electron/db/database";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { validation } from "@electron/ipc/ipc-validation";
import { AppErrorCode } from "@shared/errors";
import {
  NoteFromDB,
  type CreateTransaction,
  type Note,
  type NoteRow,
  type UpdateTransaction,
} from "@shared/schemas/note-schema";
import type BetterSqlite from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";

class Transactions {
  private db: DatabaseType;
  private createNoteStmt: BetterSqlite.Statement;
  private updateNoteStmt: BetterSqlite.Statement;
  private deleteNoteStmt: BetterSqlite.Statement;
  private deleteTagsStmt: BetterSqlite.Statement;
  private insertTagsStmt: BetterSqlite.Statement;
  private deleteLinksStmt: BetterSqlite.Statement;
  private insertLinksStmt: BetterSqlite.Statement;
  constructor(dbConnection: DatabaseType) {
    this.db = dbConnection;

    this.createNoteStmt = this.db.prepare(
      `INSERT INTO notes (id, title, content, snippet, pinned, todos_left, created_at, updated_at) VALUES (@id, @title, @content, @snippet, @pinned, @todos_left, @created_at, @updated_at) RETURNING *`,
    );
    this.updateNoteStmt = this.db
      .prepare(`UPDATE notes SET title = @title, content = @content, snippet = @snippet, todos_left = @todos_left, updated_at = @updated_at WHERE id = @id RETURNING *
    `);
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
      "INSERT INTO note_links (source_id, target_id) SELECT @source_id, @target_id WHERE EXISTS (SELECT 1 FROM notes WHERE id = @target_id)",
    );
  }

  private runDeleteManyLogic(ids: string[]): boolean {
    let deleted = false;
    for (const id of ids) {
      const result = this.deleteNoteStmt.run({ id });
      if (result.changes > 0) {
        deleted = true;
      }
    }
    return deleted;
  }

  public safeDeleteMany(ids: string[]): boolean {
    const transactionRunner = this.db.transaction(
      this.runDeleteManyLogic.bind(this),
    );
    return transactionRunner(ids);
  }

  private runCreateManyLogic(paramsArr: CreateTransaction[]): {
    row: NoteRow;
    safeTags: string[];
    safeLinks: string[];
  }[] {
    const results = new Array(paramsArr.length);
    let i = 0;
    for (const params of paramsArr) {
      const { tags, links, ...noteParams } = params;
      const safeTags = tags ?? [];
      const safeLinks = links ?? [];
      const result = this.createNoteStmt.get(noteParams) as NoteRow;
      if (!result) {
        throw new AppBackendError(AppErrorCode.DBError);
      }
      for (const targetId of safeLinks) {
        this.insertLinksStmt.run({
          source_id: result.id,
          target_id: targetId,
        });
      }
      for (const tag of safeTags) {
        this.insertTagsStmt.run({ note_id: result.id, tag_name: tag });
      }
      results[i] = { row: result, safeTags, safeLinks };
      i++;
    }
    return results;
  }

  safeCreateMany(paramsArr: CreateTransaction[]): Note[] {
    if (paramsArr.length === 0) return [];
    const transactionRunner = this.db.transaction(
      this.runCreateManyLogic.bind(this),
    );
    const dbResults = transactionRunner(paramsArr);
    return dbResults.map((result) =>
      validation(NoteFromDB, {
        ...result.row,
        tags: result.safeTags,
        links: result.safeLinks
          .filter((id) => id !== result.row.id)
          .map((id) => ({ id, dir: "out" as const })),
      }),
    );
  }

  private runCreateLogic(
    noteParams: Omit<CreateTransaction, "tags" | "links">,
    safeTags: string[],
    safeLinks: string[],
  ): NoteRow {
    const result = this.createNoteStmt.get(noteParams) as NoteRow;
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    for (const link of safeLinks) {
      this.insertLinksStmt.run({ source_id: result.id, target_id: link });
    }
    for (const tag of safeTags) {
      this.insertTagsStmt.run({ note_id: result.id, tag_name: tag });
    }
    return result;
  }

  safeCreate(params: CreateTransaction): Note {
    const { tags, links, ...noteParams } = params;
    const safeTags = tags ?? [];
    const safeLinks = links ?? [];
    const transactionRunner = this.db.transaction(
      this.runCreateLogic.bind(this),
    );
    const result = transactionRunner(noteParams, safeTags, safeLinks);
    const allLinks = NoteDB.getLinksById(result.id) ?? [];
    const validLinks = allLinks.filter((l) => l.id !== params.id);
    return validation(NoteFromDB, {
      ...result,
      tags: safeTags,
      links: validLinks,
    });
  }

  private runDeleteLogic(id: string): boolean {
    const result = this.deleteNoteStmt.run({ id });
    return result.changes > 0;
  }

  public safeDelete(id: string): boolean {
    const transactionRunner = this.db.transaction(
      this.runDeleteLogic.bind(this),
    );
    return transactionRunner(id);
  }

  private runUpdateLogic(
    noteParams: Omit<UpdateTransaction, "tags" | "links">,
    safeTags: string[],
    safeLinks: string[],
  ): NoteRow {
    const result = this.updateNoteStmt.get(noteParams) as NoteRow;
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    this.deleteLinksStmt.run({ source_id: result.id });
    this.deleteTagsStmt.run({ note_id: result.id });
    for (const link of safeLinks) {
      this.insertLinksStmt.run({ source_id: result.id, target_id: link });
    }
    for (const tag of safeTags) {
      this.insertTagsStmt.run({ note_id: result.id, tag_name: tag });
    }
    return result;
  }

  safeUpdate(params: UpdateTransaction): Note {
    const { tags, links, ...noteParams } = params;
    const safeTags = tags ?? [];
    const safeLinks = links ?? [];
    const transactionRunner = this.db.transaction(
      this.runUpdateLogic.bind(this),
    );
    const result = transactionRunner(noteParams, safeTags, safeLinks);
    const allLinks = NoteDB.getLinksById(result.id) ?? [];
    const validLinks = allLinks.filter((l) => l.id !== params.id);
    return validation(NoteFromDB, {
      ...result,
      tags: safeTags,
      links: validLinks,
    });
  }
}

export { Transactions };
