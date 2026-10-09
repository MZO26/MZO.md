import db from "@electron/db/database";
import { AppBackendError, AppErrorCode } from "@shared/errors";
import type { AppSettings } from "@shared/schemas/store-schema";

class SettingsService {
  private cache: Readonly<AppSettings> | undefined = undefined;

  public async initialize() {
    this.cache = db.getAllSettings();
  }

  public getSettings(): Readonly<AppSettings> {
    if (!this.cache) throw new AppBackendError(AppErrorCode.InvalidData);
    return this.cache;
  }

  public updateSettings(newSettings: Readonly<AppSettings>): void {
    db.updateSettings(newSettings);
    this.cache = { ...this.cache, ...newSettings };
  }
}

export const settingsService = new SettingsService();
