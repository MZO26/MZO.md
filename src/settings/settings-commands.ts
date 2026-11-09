import {
  backupDb,
  exportCommand,
  openPath,
  restoreDbBackup,
  updateCodeTheme,
  updateFontFamily,
  updateFontSize,
  updateHighlightTheme,
  updateLineHeight,
  updateNoteListItemDisplay,
  updateSpellcheck,
  updateTheme,
} from "@/settings/setting-actions";
import { settingsStore } from "@/state/state";
import type { SETTING_EVENTS } from "@shared/shared-constants";
import type { SettingCommands } from "@shared/shared-types";

export type SettingEventStrings =
  (typeof SETTING_EVENTS)[keyof typeof SETTING_EVENTS];

const settingsCommands: Record<SettingEventStrings, SettingCommands> = {
  "setting:theme-system": {
    run: () => updateTheme("system"),
    isActive: () => settingsStore.get("theme") === "system",
    label: "THEME_SYSTEM",
  },
  "setting:theme-light": {
    run: () => updateTheme("light"),
    isActive: () => settingsStore.get("theme") === "light",
    label: "THEME_LIGHT",
  },
  "setting:theme-dark": {
    run: () => updateTheme("dark"),
    isActive: () => settingsStore.get("theme") === "dark",
    label: "THEME_DARK",
  },
  "setting:theme-dark-warm": {
    run: () => updateTheme("dark_warm"),
    isActive: () => settingsStore.get("theme") === "dark_warm",
    label: "THEME_DARK_WARM",
  },
  "setting:theme-light-warm": {
    run: () => updateTheme("light_warm"),
    isActive: () => settingsStore.get("theme") === "light_warm",
    label: "THEME_LIGHT_WARM",
  },
  "setting:theme-oled": {
    run: () => updateTheme("oled"),
    isActive: () => settingsStore.get("theme") === "oled",
    label: "THEME_OLED",
  },
  "setting:code-theme-balanced": {
    run: () => updateCodeTheme("balanced"),
    isActive: () => settingsStore.get("code_theme") === "balanced",
    label: "CODE_THEME_BALANCED",
  },
  "setting:code-theme-focus": {
    run: () => updateCodeTheme("focus"),
    isActive: () => settingsStore.get("code_theme") === "focus",
    label: "CODE_THEME_FOCUS",
  },
  "setting:code-theme-colorless": {
    run: () => updateCodeTheme("colorless"),
    isActive: () => settingsStore.get("code_theme") === "colorless",
    label: "CODE_THEME_COLORLESS",
  },
  "setting:font-family-system": {
    run: () => updateFontFamily("system"),
    isActive: () => settingsStore.get("font_family") === "system",
    label: "FONT_FAMILY_SYSTEM",
  },
  "setting:font-family-arial": {
    run: () => updateFontFamily("arial"),
    isActive: () => settingsStore.get("font_family") === "arial",
    label: "FONT_FAMILY_ARIAL",
  },
  "setting:font-family-serif": {
    run: () => updateFontFamily("serif"),
    isActive: () => settingsStore.get("font_family") === "serif",
    label: "FONT_FAMILY_SERIF",
  },
  "setting:font-size-small": {
    run: () => updateFontSize("16"),
    isActive: () => settingsStore.get("font_size") === "16",
    label: "FONT_SIZE_SMALL",
  },
  "setting:font-size-medium": {
    run: () => updateFontSize("18"),
    isActive: () => settingsStore.get("font_size") === "18",
    label: "FONT_SIZE_MEDIUM",
  },
  "setting:font-size-large": {
    run: () => updateFontSize("20"),
    isActive: () => settingsStore.get("font_size") === "20",
    label: "FONT_SIZE_LARGE",
  },
  "setting:line-height-small": {
    run: () => updateLineHeight("1.4"),
    isActive: () => settingsStore.get("line_height") === "1.4",
    label: "LINE_HEIGHT_SMALL",
  },
  "setting:line-height-medium": {
    run: () => updateLineHeight("1.5"),
    isActive: () => settingsStore.get("line_height") === "1.5",
    label: "LINE_HEIGHT_MEDIUM",
  },
  "setting:line-height-large": {
    run: () => updateLineHeight("1.6"),
    isActive: () => settingsStore.get("line_height") === "1.6",
    label: "LINE_HEIGHT_LARGE",
  },
  "setting:spellcheck": {
    run: () => updateSpellcheck(!settingsStore.get("spellcheck")),
    isActive: () => settingsStore.get("spellcheck") === true,
    label: "SPELLCHECK",
  },
  "setting:highlight-context": {
    run: () => updateHighlightTheme("context"),
    isActive: () => settingsStore.get("highlight") === "context",
    label: "HIGHLIGHT_CONTEXT",
  },
  "setting:highlight-insight": {
    run: () => updateHighlightTheme("insight"),
    isActive: () => settingsStore.get("highlight") === "insight",
    label: "HIGHLIGHT_INSIGHT",
  },
  "setting:highlight-action": {
    run: () => updateHighlightTheme("action"),
    isActive: () => settingsStore.get("highlight") === "action",
    label: "HIGHLIGHT_ACTION",
  },
  "setting:note-item-display-preview": {
    run: () => updateNoteListItemDisplay("preview"),
    isActive: () => settingsStore.get("note_item_display") === "preview",
    label: "NOTE_ITEM_DISPLAY_PREVIEW",
  },
  "setting:note-item-display-minimal": {
    run: () => updateNoteListItemDisplay("minimal"),
    isActive: () => settingsStore.get("note_item_display") === "minimal",
    label: "NOTE_ITEM_DISPLAY_MINIMAL",
  },
  "setting:backup-db": {
    run: () => backupDb(),
    isActive: () => false,
    label: "BACKUP_DB",
  },
  "setting:restore-db-backup": {
    run: () => restoreDbBackup(),
    isActive: () => false,
    label: "RESTORE_DB_BACKUP",
  },
  "setting:open-app-path": {
    run: () => openPath(),
    isActive: () => false,
    label: "OPEN_APP_PATH",
  },
  "setting:export-markdown": exportCommand("md"),
  "setting:export-text": exportCommand("txt"),
  "setting:export-html": exportCommand("html"),
  "setting:export-pdf": exportCommand("pdf"),
};

export { settingsCommands };
