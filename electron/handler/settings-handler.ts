import db from "@electron/db/database";
import type { AppSettings } from "@shared/schemas/store-schema";
import { DEFAULT_SETTINGS } from "@shared/shared-constants";

/**
 * In-memory settings cache backed by the database.
 *
 * Call {@link initialize} once at startup to load persisted settings.
 * Subsequent reads are served from memory; writes go through to `db`
 * immediately.
 */

class SettingsService {
  private cache: Readonly<AppSettings> = DEFAULT_SETTINGS;

  /**
   * Loads all settings from the database into the in-memory cache.
   *
   * @returns The loaded settings.
   */

  public initialize(): Readonly<AppSettings> {
    this.cache = db.getAllSettings();
    return this.cache;
  }

  /**
   * Reads a single setting by key.
   *
   * @param key - The setting name.
   * @returns The current value.
   *
   * @example
   * settings.get("theme"); // "dark"
   */

  public get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.cache[key];
  }

  /**
   * Returns the full settings object (read-only reference).
   *
   * @returns The current settings.
   */

  public getSettings(): Readonly<AppSettings> {
    return this.cache;
  }

  /**
   * Merges partial settings into the cache and persists to the database.
   *
   * @param newSettings - The fields to update.
   *
   * @example
   * settings.updateSettings({ theme: "light" });
   */

  public updateSettings(newSettings: Partial<Readonly<AppSettings>>): void {
    const updated: Readonly<AppSettings> = { ...this.cache, ...newSettings };
    db.updateSettings(updated);
    this.cache = updated;
  }
}

export const settingsService = new SettingsService();
