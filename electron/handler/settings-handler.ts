import db from "@electron/db/database";
import type { AppSettings } from "@shared/schemas/store-schema";
import { DEFAULT_SETTINGS } from "@shared/shared-constants";

class SettingsService {
  private cache: Readonly<AppSettings> = DEFAULT_SETTINGS;

  public initialize(): Readonly<AppSettings> {
    this.cache = db.getAllSettings();
    return this.cache;
  }

  public get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.cache[key];
  }

  public getSettings(): Readonly<AppSettings> {
    return this.cache;
  }

  public updateSettings(newSettings: Partial<Readonly<AppSettings>>): void {
    const updated: Readonly<AppSettings> = { ...this.cache, ...newSettings };
    db.updateSettings(updated);
    this.cache = updated;
  }
}

export const settingsService = new SettingsService();
