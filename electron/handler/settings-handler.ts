import db from "@electron/db/database";
import { AppBackendError } from "@electron/ipc/ipc-error-handler";
import { AppErrorCode } from "@shared/errors";
import type { AppSettings } from "@shared/schemas/store-schema";

class SettingsService {
  private cache: AppSettings | undefined = undefined;

  public async initialize(): Promise<void> {
    this.cache = db.getAllSettings();
  }

  public getSettings(): AppSettings {
    if (!this.cache) throw new AppBackendError(AppErrorCode.InvalidData);
    return this.cache;
  }

  public updateSettings(newSettings: AppSettings): void {
    db.updateSettings(newSettings);
    this.cache = { ...this.cache, ...newSettings };
  }
}

export const settingsService = new SettingsService();
