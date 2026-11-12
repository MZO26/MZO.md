import {
  databaseBackup,
  databaseBackupRestore,
  openAppPath,
  setSettings,
  setTheme,
  showNotification,
} from "@/api/api";
import { triggerSingleExport } from "@/components/sidebar/sidebar-triggers";
import { localStore, settingsStore, stateStore } from "@/state/state";
import {
  CODE_THEME_MAP,
  EDITOR_WIDTH,
  EDITOR_WIDTH_LABELS,
  EXPORT_LABELS,
  THEME_MAP,
} from "@/utils/constants";
import { rendererLogger } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import { isFocusActive } from "@/utils/shortcuts";
import type { ExportFormat } from "@/utils/types";
import type { Id } from "@shared/schemas/note-schema";
import type {
  AppSettings,
  CodeTheme,
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  NoteItemDisplay,
  Theme,
} from "@shared/schemas/store-schema";
import type { SETTING_EVENTS } from "@shared/shared-constants";
import type { ResolvedTheme, Result } from "@shared/shared-types";

const THEME_VALUES = [
  "system",
  "light",
  "light_warm",
  "dark",
  "dark_warm",
  "oled",
] as const;

const CODE_THEME_VALUES = ["focus", "balanced", "colorless"] as const;

const HIGHLIGHT_THEME_VALUES = ["context", "insight", "action"] as const;

const FONT_FAMILY_VALUES = ["system", "arial", "serif"] as const;

const FONT_SIZE_VALUES = ["16", "18", "20"] as const;

const LINE_HEIGHT_VALUES = ["1.4", "1.5", "1.6"] as const;

const NOTE_ITEM_DISPLAY_VALUES = ["preview", "minimal"] as const;

function isValid<T extends readonly string[]>(
  value: unknown,
  validValues: T,
): value is T[number] {
  return (
    typeof value === "string" &&
    (validValues as readonly string[]).includes(value)
  );
}

const EXPORT_FORMATS = ["markdown", "text", "html", "pdf"] as const;

const EXPORT_KEYS = EXPORT_FORMATS.map((f) => `setting:export-${f}`);

function exportCommand(format: ExportFormat) {
  return {
    run: () => {
      const activeId = stateStore.get("activeId") as Id | null;
      if (!activeId) return;
      triggerSingleExport(activeId, format);
    },
    isActive: () => false,
    label: EXPORT_LABELS[format],
  };
}

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system"
    ? darkQuery.matches
      ? "dark"
      : "light"
    : THEME_MAP[theme];
}

async function applyAppTheme(
  preference: Theme,
): Promise<Result<{ theme: Theme; codeTheme: CodeTheme }>> {
  const result = await setTheme(preference, isFocusActive());
  if (!result.success) {
    rendererLogger.appError(
      "[applyAppTheme]: Failed to apply theme:",
      result.error,
    );
    return result;
  }
  document.documentElement.dataset["theme"] = result.data;
  const codePreference = settingsStore.get("code_theme");
  const resolvedTheme = resolveTheme(preference);
  const codeTheme = CODE_THEME_MAP[codePreference][resolvedTheme];
  document.documentElement.dataset["codetheme"] = codeTheme;
  return {
    success: true,
    data: { theme: preference, codeTheme: codePreference },
  };
}

async function updateTheme(newTheme: Theme, options?: { skipUpdate: boolean }) {
  if (!isValid(newTheme, THEME_VALUES)) return;
  const result = await applyAppTheme(newTheme);
  if (!result.success) {
    rendererLogger.appError(
      "[applyAppTheme]: Failed to apply theme",
      result.error,
    );
    return;
  }
  if (!options?.skipUpdate)
    await handleUpdateSettings({
      theme: result.data.theme,
      code_theme: result.data.codeTheme,
    });
}

async function updateCodeTheme(
  newTheme: CodeTheme,
  options?: { skipUpdate: boolean },
) {
  if (!isValid(newTheme, CODE_THEME_VALUES)) return;
  const resolvedTheme = resolveTheme(settingsStore.get("theme"));
  rendererLogger.devLog(resolvedTheme);
  const mappedCodeTheme = CODE_THEME_MAP[newTheme][resolvedTheme];
  document.documentElement.dataset["codetheme"] = mappedCodeTheme;
  if (!options?.skipUpdate)
    await handleUpdateSettings({ code_theme: newTheme });
}

async function updateHighlightTheme(
  newTheme: HighlightTheme,
  options?: { skipUpdate: boolean },
) {
  if (!isValid(newTheme, HIGHLIGHT_THEME_VALUES)) return;
  document.documentElement.setAttribute("data-highlight", newTheme);
  if (!options?.skipUpdate)
    await handleUpdateSettings({
      highlight: newTheme,
    });
}

async function updateFontFamily(
  newValue: FontFamily,
  options?: { skipUpdate: boolean },
) {
  if (!isValid(newValue, FONT_FAMILY_VALUES)) return;
  const { editorWrapper } = useCore("editorWrapper");
  const current = newValue || "system";
  editorWrapper.style.setProperty("--editor-font-family", current);
  editorWrapper.setAttribute("data-font-family", current);
  if (!options?.skipUpdate)
    await handleUpdateSettings({ font_family: newValue });
}

async function updateFontSize(
  newValue: FontSize,
  options?: { skipUpdate: boolean },
) {
  if (!isValid(newValue, FONT_SIZE_VALUES)) return;
  let current = Number(newValue) || 18;
  current = Math.max(16, Math.min(current, 20));
  const strCurrent = String(current);
  const { editorWrapper } = useCore("editorWrapper");
  editorWrapper.style.setProperty("--editor-font-size", `${strCurrent}px`);
  editorWrapper.setAttribute("data-font-size", strCurrent);
  if (!options?.skipUpdate) await handleUpdateSettings({ font_size: newValue });
}

async function updateLineHeight(
  newValue: LineHeight,
  options?: { skipUpdate: boolean },
) {
  if (!isValid(newValue, LINE_HEIGHT_VALUES)) return;
  let current = Number(newValue) || 1.5;
  current = Math.max(1.4, Math.min(current, 1.6));
  const strCurrent = String(current);
  const { editorWrapper } = useCore("editorWrapper");
  editorWrapper.style.setProperty("--editor-line-height", strCurrent);
  editorWrapper.setAttribute("data-line-height", strCurrent);
  if (!options?.skipUpdate)
    await handleUpdateSettings({ line_height: newValue });
}

async function updateNoteListItemDisplay(
  newValue: NoteItemDisplay,
  options?: { skipUpdate: boolean },
) {
  if (!isValid(newValue, NOTE_ITEM_DISPLAY_VALUES)) return;
  const { sidebar } = useCore("sidebar");
  sidebar.setAttribute("data-noteItem", newValue);
  if (!options?.skipUpdate)
    await handleUpdateSettings({ note_item_display: newValue });
}

async function updateSpellcheck(
  newValue: boolean,
  options?: { skipUpdate: boolean },
) {
  const { editor } = useCore("editor");
  const enabled = newValue === true;
  editor.view.dom.spellcheck = enabled;
  editor.commands.focus();
  if (!options?.skipUpdate) await handleUpdateSettings({ spellcheck: enabled });
}

async function backupDb() {
  const dbBackup = await databaseBackup();
  if (!dbBackup.success) {
    rendererLogger.appError(
      "[Backup-db]: Failed to backup db:",
      dbBackup.error,
    );
    await showNotification("Failed to save Backup", "");
    return;
  }
  await showNotification("Backup saved", "");
}

async function restoreDbBackup() {
  const restore = await databaseBackupRestore();
  if (!restore.success) {
    rendererLogger.appError(
      "[Backup-db-restore]: Failed to restore db:",
      restore.error,
    );
    await showNotification("Failed to restore Backup", "");
    return;
  }
  await showNotification("Backup restored", "");
}

async function openPath() {
  const open = await openAppPath();
  if (!open.success) {
    rendererLogger.appError(
      "[Open-path]: Failed to open app path:",
      open.error,
    );
  }
}

function setEditorWidth(width: (typeof EDITOR_WIDTH)[number]) {
  return {
    run: () => {
      const { appContainer } = useCore("appContainer");
      localStore.setState({ editorWidth: width });
      appContainer.setAttribute("data-width", width);
    },
    isActive: () => localStore.get("editorWidth") === width,
    label: EDITOR_WIDTH_LABELS[width] as keyof typeof SETTING_EVENTS,
  };
}

function setFocusMode(focus: boolean) {
  const { appContainer } = useCore("appContainer");
  appContainer.classList.toggle("focus", focus);
}

function setToolbarCollapsed(collapsed: boolean) {
  const { appContainer } = useCore("appContainer");
  appContainer.classList.toggle("toolbar-collapsed", collapsed);
}

async function applySettings(settings: AppSettings) {
  const { editor, sidebar, editorWrapper, appContainer } = useCore(
    "editor",
    "sidebar",
    "editorWrapper",
    "appContainer",
  );
  await applyAppTheme(settings["theme"]);
  document.documentElement.setAttribute(
    "data-highlight",
    settings["highlight"],
  );
  sidebar.setAttribute("data-noteItem", settings["note_item_display"]);
  editorWrapper.style.setProperty(
    "--editor-font-family",
    settings["font_family"],
  );
  editorWrapper.setAttribute("data-font-family", settings["font_family"]);
  editorWrapper.style.setProperty(
    "--editor-line-height",
    settings["line_height"],
  );
  editorWrapper.setAttribute("data-font-size", settings["font_size"]);
  editorWrapper.style.setProperty(
    "--editor-font-size",
    `${String(settings["font_size"])}px`,
  );
  editorWrapper.setAttribute("data-line-height", settings["line_height"]);
  editor.view.dom.spellcheck = settings["spellcheck"] === true;
  appContainer.setAttribute(
    "data-width",
    localStore.get("editorWidth") ?? "normal",
  );
}

async function handleUpdateSettings(settings: Partial<Readonly<AppSettings>>) {
  const result = await setSettings(settings);
  if (!result.success) {
    rendererLogger.appError(
      "[handleUpdateSettings]: Failed to update settings:",
      result.error,
    );
    return;
  }
  rendererLogger.devLog("New settings update:", settings);
  settingsStore.setState(settings);
}

export {
  applySettings,
  backupDb,
  EXPORT_KEYS,
  exportCommand,
  handleUpdateSettings,
  openPath,
  restoreDbBackup,
  setEditorWidth,
  setFocusMode,
  setToolbarCollapsed,
  updateCodeTheme,
  updateFontFamily,
  updateFontSize,
  updateHighlightTheme,
  updateLineHeight,
  updateNoteListItemDisplay,
  updateSpellcheck,
  updateTheme,
};
