import db from "@electron/db/database";
import { validation } from "@electron/ipc/ipc-validation";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import {
  DbBoolCodec,
  NoteListItemFromDB,
  type CreateTransaction,
  type Id,
  type NoteListItem,
  type NoteRow,
  type UpdateTransaction,
} from "@shared/schemas/note-schema";
import { DatabaseSync, type StatementSync } from "node:sqlite";

type UpdateTransactionLogicArgs = {
  noteParams: Omit<UpdateTransaction, "tags" | "links" | "images">;
  safeTags: string[];
  safeLinks: string[];
  safeImages: string[];
};

type CreateTransactionLogicArgs = {
  noteParams: Omit<CreateTransaction, "tags" | "links" | "images">;
  safeTags: string[];
  safeLinks: string[];
  safeImages: string[];
};

class Transactions {
  private db: DatabaseSync;
  private createNoteStmt!: StatementSync;
  private updateNoteStmt!: StatementSync;
  private deleteNoteStmt!: StatementSync;
  private deleteTagsStmt!: StatementSync;
  private deleteLinksStmt!: StatementSync;
  private insertManyTagsStmt!: StatementSync;
  private insertManyLinksStmt!: StatementSync;
  private deleteManyNotesStmt!: StatementSync;
  private insertManyImagesStmt!: StatementSync;
  private deleteImagesStmt!: StatementSync;
  constructor(dbConnection: DatabaseSync) {
    this.db = dbConnection;
  }

  public init() {
    this.prepareStmts();
  }

  private prepareStmts() {
    this.createNoteStmt = this.db.prepare(`
      INSERT INTO notes (id, title, content, plain_text, snippet, pinned, created_at, updated_at) 
      VALUES ($id, $title, $content, $plain_text, $snippet, $pinned, $created_at, $updated_at) 
      RETURNING id, title, snippet, pinned, created_at, updated_at`);
    this.updateNoteStmt = this.db.prepare(`
      UPDATE notes 
      SET title = $title, content = $content, plain_text = $plain_text, snippet = $snippet, updated_at = $updated_at 
      WHERE id = $id 
      RETURNING id, title, snippet, pinned, created_at, updated_at
    `);
    this.deleteNoteStmt = this.db.prepare(`
      DELETE FROM notes 
      WHERE id = $id
    `);
    this.deleteManyNotesStmt = this.db.prepare(`
      DELETE FROM notes 
      WHERE id IN (SELECT value FROM json_each($ids))
    `);
    this.deleteTagsStmt = this.db.prepare(`
      DELETE FROM note_tags 
      WHERE note_id = $note_id
    `);
    this.deleteLinksStmt = this.db.prepare(`
      DELETE FROM note_links 
      WHERE source_id = $source_id
    `);
    this.deleteImagesStmt = this.db.prepare(`
      DELETE FROM note_images
      WHERE note_id = $note_id
      AND image_hash IN (
        SELECT j.value 
        FROM json_each($image_hash) j
      )
      `);
    this.insertManyTagsStmt = this.db.prepare(`
      INSERT INTO note_tags (note_id, tag_name)
      SELECT $note_id, j.value
      FROM json_each($tags) j
    `);
    this.insertManyLinksStmt = this.db.prepare(`
      INSERT INTO note_links (source_id, target_id)
      SELECT $source_id, j.value
      FROM json_each($links) j
      WHERE EXISTS (SELECT 1 FROM notes WHERE id = j.value)
    `);
    this.insertManyImagesStmt = this.db.prepare(`
      INSERT INTO note_images (note_id, image_hash)
      SELECT $note_id, j.value
      FROM json_each($image_hash) j
      `);
  }

  private savepointCounter = 0;

  private transaction<T>(fn: () => T extends Promise<unknown> ? never : T): T {
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

  private runDeleteManyLogic(ids: Id[]): boolean {
    if (ids.length === 0) return false;
    const result = this.deleteManyNotesStmt.run({
      $ids: JSON.stringify(ids),
    });
    return result.changes > 0;
  }

  public safeDeleteMany(ids: Id[]): boolean {
    const result = this.transaction(() => this.runDeleteManyLogic(ids));
    return result;
  }

  private runCreateManyLogic(paramsArr: CreateTransaction[]) {
    const results = [];
    for (const params of paramsArr) {
      const { tags, links, images, ...noteParams } = params;
      const safeTags = tags ?? [];
      const safeLinks = links ?? [];
      const safeImages = images ?? [];
      const result = this.createNoteStmt.get(noteParams) as
        | Omit<NoteRow, "content" | "plain_text">
        | undefined;
      if (!result) {
        throw new AppBackendError(AppErrorCode.DBError);
      }
      if (safeImages.length > 0) {
        this.insertManyImagesStmt.run({
          $note_id: result.id,
          $image_hash: JSON.stringify(safeImages),
        });
      }
      if (safeLinks.length > 0) {
        this.insertManyLinksStmt.run({
          $source_id: result.id,
          $links: JSON.stringify(safeLinks),
        });
      }
      if (safeTags.length > 0) {
        this.insertManyTagsStmt.run({
          $note_id: result.id,
          $tags: JSON.stringify(safeTags),
        });
      }
      results.push({ row: result, safeTags, safeLinks, safeImages });
    }
    return results;
  }

  public safeCreateMany(paramsArr: CreateTransaction[]): NoteListItem[] {
    if (paramsArr.length === 0) return [];
    const dbResults = this.transaction(() => {
      return this.runCreateManyLogic(paramsArr);
    });
    return dbResults.map((result) =>
      validation(NoteListItemFromDB, {
        ...result.row,
        pinned: DbBoolCodec.decode(result.row.pinned),
        images: result.safeImages,
        tags: result.safeTags,
        links: result.safeLinks
          .filter((id) => id !== result.row.id)
          .map((id) => ({ id, dir: "out" })),
      }),
    );
  }

  private runCreateLogic({
    noteParams,
    safeImages,
    safeLinks,
    safeTags,
  }: CreateTransactionLogicArgs) {
    const result = this.createNoteStmt.get(noteParams) as
      | Omit<NoteRow, "content" | "plain_text">
      | undefined;
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    if (safeImages.length > 0) {
      this.insertManyImagesStmt.run({
        $note_id: result.id,
        $image_hash: JSON.stringify(safeImages),
      });
    }
    if (safeLinks.length > 0) {
      this.insertManyLinksStmt.run({
        $source_id: result.id,
        $links: JSON.stringify(safeLinks),
      });
    }
    if (safeTags.length > 0) {
      this.insertManyTagsStmt.run({
        $note_id: result.id,
        $tags: JSON.stringify(safeTags),
      });
    }
    return result;
  }

  public safeCreate(params: CreateTransaction): NoteListItem {
    const { tags, links, images, ...noteParams } = params;
    const safeTags = tags ?? [];
    const safeLinks = links ?? [];
    const safeImages = images ?? [];
    const result = this.transaction(() =>
      this.runCreateLogic({ noteParams, safeTags, safeLinks, safeImages }),
    );
    const allLinks = db.getLinksById(result.id) ?? [];
    const validLinks = allLinks.filter((l) => l.id !== params.id);
    return validation(NoteListItemFromDB, {
      ...result,
      pinned: DbBoolCodec.decode(result.pinned),
      tags: safeTags,
      links: validLinks,
      images: safeImages,
    });
  }

  private runDeleteLogic(id: Id): boolean {
    const result = this.deleteNoteStmt.run({ $id: id });
    return result.changes > 0;
  }

  public safeDelete(id: Id): boolean {
    return this.transaction(() => this.runDeleteLogic(id));
  }

  private runUpdateLogic({
    noteParams,
    safeImages,
    safeLinks,
    safeTags,
  }: UpdateTransactionLogicArgs) {
    const result = this.updateNoteStmt.get(noteParams) as
      | Omit<NoteRow, "content" | "plain_text">
      | undefined;
    if (!result) {
      throw new AppBackendError(AppErrorCode.DBError);
    }
    this.deleteLinksStmt.run({ $source_id: result.id });
    this.deleteTagsStmt.run({ $note_id: result.id });
    if (safeLinks.length > 0) {
      this.insertManyLinksStmt.run({
        $source_id: result.id,
        $links: JSON.stringify(safeLinks ?? []),
      });
    }
    if (safeTags.length > 0) {
      this.insertManyTagsStmt.run({
        $note_id: result.id,
        $tags: JSON.stringify(safeTags ?? []),
      });
    }
    const images = db.getUsedImages(noteParams.id);
    if (images.length === 0 && safeImages.length === 0)
      return { result, diff: new Set() };
    const seen = new Set<string>(images);
    const hashes = [];
    for (const image of safeImages) {
      if (!seen.has(image)) hashes.push(image);
    }
    if (hashes.length > 0) {
      this.insertManyImagesStmt.run({
        $note_id: noteParams.id,
        $image_hash: JSON.stringify(hashes),
      });
    }
    const diff = seen.difference(new Set<string>(safeImages));
    if (diff.size > 0) {
      this.deleteImagesStmt.run({
        $note_id: noteParams.id,
        $image_hash: JSON.stringify([...diff]),
      });
    }
    return { result, diff: diff ?? new Set() };
  }

  public safeUpdate(params: UpdateTransaction): {
    result: NoteListItem;
    imageDiff: string[];
  } {
    const { tags, links, images, ...noteParams } = params;
    const safeTags = tags ?? [];
    const safeLinks = links ?? [];
    const safeImages = images ?? [];
    const { result, diff } = this.transaction(() =>
      this.runUpdateLogic({ noteParams, safeTags, safeLinks, safeImages }),
    );
    const allLinks = db.getLinksById(result.id) ?? [];
    const validLinks = allLinks.filter((l) => l.id !== result.id);
    const validHashes = Array.from(diff).filter((h) => typeof h === "string");
    return {
      result: validation(NoteListItemFromDB, {
        ...result,
        pinned: DbBoolCodec.decode(result.pinned),
        tags: safeTags,
        links: validLinks,
        images: safeImages,
      }),
      imageDiff: validHashes,
    };
  }
}

export { Transactions };
