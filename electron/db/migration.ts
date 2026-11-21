import { AppBackendError, AppErrorCode } from "@shared/errors";
import type { DatabaseSync, StatementSync } from "node:sqlite";

type Migration = (db: DatabaseSync) => void;

class Migrations {
  private db: DatabaseSync;
  private pragmaVersionStmt!: StatementSync;
  private storeTableInfoStmt!: StatementSync;
  constructor(db: DatabaseSync) {
    this.db = db;
  }
  public init() {
    this.prepareStmt();
    this.migrate(this.db);
  }
  private prepareStmt() {
    this.pragmaVersionStmt = this.db.prepare(`PRAGMA user_version`);
    this.storeTableInfoStmt = this.db.prepare(`PRAGMA table_info(store)`);
  }

  private migrations: Migration[] = [
    // v1
    () => {},
    // v2: welcome_note_seeded
    (db) => {
      const cols = this.storeTableInfoStmt.all() as { name: string }[];
      if (cols.some((c) => c.name === "welcome_note_seeded")) return;
      db.exec(`
        ALTER TABLE store
        ADD COLUMN welcome_note_seeded INTEGER NOT NULL DEFAULT 0;
    `);
    },
  ];

  private migrate(db: DatabaseSync) {
    const row = this.pragmaVersionStmt.get() as { user_version: number };
    const current = row.user_version;
    const target = this.migrations.length;
    if (current >= target) return;
    db.exec("BEGIN");
    try {
      for (let v = current; v < target; v++) {
        const nv = this.migrations[v];
        if (!nv)
          throw new AppBackendError(
            AppErrorCode.DBError,
            `[Migrations]: migration ${v + 1} is missing.`,
          );
        nv(db);
      }
      db.exec(`PRAGMA user_version = ${target}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export { Migrations };
