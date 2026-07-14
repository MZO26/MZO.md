import AppDB from "@electron/db/database";
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
import { DatabaseSync, type StatementSync } from "node:sqlite";

class Transactions {
  private db: DatabaseSync;
  private createNoteStmt: StatementSync;
  private updateNoteStmt: StatementSync;
  private deleteNoteStmt: StatementSync;
  private deleteTagsStmt: StatementSync;
  private deleteLinksStmt: StatementSync;
  private insertManyTagsStmt: StatementSync;
  private insertManyLinksStmt: StatementSync;
  private deleteManyNotesStmt: StatementSync;
  constructor(dbConnection: DatabaseSync) {
    this.db = dbConnection;

    this.createNoteStmt = this.db.prepare(
      `INSERT INTO notes (id, title, content, plainText, snippet, pinned, created_at, updated_at) VALUES (@id, @title, @content, @plainText, @snippet, @pinned, @created_at, @updated_at) RETURNING *`,
    );
    this.updateNoteStmt = this.db
      .prepare(`UPDATE notes SET title = @title, content = @content, plainText = @plainText, snippet = @snippet, updated_at = @updated_at WHERE id = @id RETURNING *
    `);
    this.deleteNoteStmt = this.db.prepare("DELETE FROM notes WHERE id = @id");
    this.deleteManyNotesStmt = this.db.prepare(`
      DELETE FROM notes 
      WHERE id IN (SELECT value FROM json_each(@ids))
    `);
    this.deleteTagsStmt = this.db.prepare(
      "DELETE FROM note_tags WHERE note_id = @note_id",
    );
    this.deleteLinksStmt = this.db.prepare(
      "DELETE FROM note_links WHERE source_id = @source_id",
    );
    this.insertManyTagsStmt = this.db.prepare(`
      INSERT INTO note_tags (note_id, tag_name)
      SELECT @note_id, j.value
      FROM json_each(@tags) j
    `);
    this.insertManyLinksStmt = this.db.prepare(`
      INSERT INTO note_links (source_id, target_id)
      SELECT @source_id, j.value
      FROM json_each(@links) j
      WHERE EXISTS (SELECT 1 FROM notes WHERE id = j.value)
    `);
  }

  private savepointCounter = 0;

  private transaction<T>(fn: () => T extends Promise<any> ? never : T): T {
    if (this.db.isTransaction) {
      const savepoint = `sp_${++this.savepointCounter}`;
      this.db.exec(`SAVEPOINT ${savepoint}`);
      try {
        const result = fn();
        this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (error) {
        this.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
        throw error;
      }
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private runDeleteManyLogic(ids: string[]): boolean {
    if (ids.length === 0) return false;
    const result = this.deleteManyNotesStmt.run({
      ids: JSON.stringify(ids),
    });
    return result.changes > 0;
  }

  public safeDeleteMany(ids: string[]): boolean {
    const result = this.transaction(() => this.runDeleteManyLogic(ids));
    return result;
  }

  private runCreateManyLogic(paramsArr: CreateTransaction[]): {
    row: NoteRow;
    safeTags: string[];
    safeLinks: string[];
  }[] {
    const results = [];
    for (const params of paramsArr) {
      const { tags, links, ...noteParams } = params;
      const safeTags = tags ?? [];
      const safeLinks = links ?? [];
      const result = this.createNoteStmt.get(noteParams) as NoteRow | undefined;
      if (!result) {
        throw new AppBackendError(AppErrorCode.DBError);
      }
      if (safeLinks.length > 0) {
        this.insertManyLinksStmt.run({
          source_id: result.id,
          links: JSON.stringify(safeLinks),
        });
      }
      if (safeTags.length > 0) {
        this.insertManyTagsStmt.run({
          note_id: result.id,
          tags: JSON.stringify(safeTags),
        });
      }
      results.push({ row: result, safeTags, safeLinks });
    }
    return results;
  }

  safeCreateMany(paramsArr: CreateTransaction[]): Note[] {
    if (paramsArr.length === 0) return [];
    const dbResults = this.transaction(() => {
      return this.runCreateManyLogic(paramsArr);
    });
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
    const result = this.createNoteStmt.get(noteParams) as NoteRow | undefined;
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    if (safeLinks.length > 0) {
      this.insertManyLinksStmt.run({
        source_id: result.id,
        links: JSON.stringify(safeLinks ?? []),
      });
    }
    if (safeTags.length > 0) {
      this.insertManyTagsStmt.run({
        note_id: result.id,
        tags: JSON.stringify(safeTags ?? []),
      });
    }
    return result;
  }

  safeCreate(params: CreateTransaction): Note {
    const { tags, links, ...noteParams } = params;
    const safeTags = tags ?? [];
    const safeLinks = links ?? [];
    const result = this.transaction(() =>
      this.runCreateLogic(noteParams, safeTags, safeLinks),
    );
    const allLinks = AppDB.getLinksById(result.id) ?? [];
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
    return this.transaction(() => this.runDeleteLogic(id));
  }

  private runUpdateLogic(
    noteParams: Omit<UpdateTransaction, "tags" | "links">,
    safeTags: string[],
    safeLinks: string[],
  ): NoteRow {
    const result = this.updateNoteStmt.get(noteParams) as NoteRow | undefined;
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    this.deleteLinksStmt.run({ source_id: result.id });
    this.deleteTagsStmt.run({ note_id: result.id });
    if (safeLinks.length > 0) {
      this.insertManyLinksStmt.run({
        source_id: result.id,
        links: JSON.stringify(safeLinks ?? []),
      });
    }
    if (safeTags.length > 0) {
      this.insertManyTagsStmt.run({
        note_id: result.id,
        tags: JSON.stringify(safeTags ?? []),
      });
    }
    return result;
  }

  safeUpdate(params: UpdateTransaction): Note {
    const { tags, links, ...noteParams } = params;
    const safeTags = tags ?? [];
    const safeLinks = links ?? [];
    const result = this.transaction(() =>
      this.runUpdateLogic(noteParams, safeTags, safeLinks),
    );
    const allLinks = AppDB.getLinksById(result.id) ?? [];
    const validLinks = allLinks.filter((l) => l.id !== params.id);
    return validation(NoteFromDB, {
      ...result,
      tags: safeTags,
      links: validLinks,
    });
  }
}

export { Transactions };
