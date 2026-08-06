import { selectAutoExportFolder } from "@/api/api";
import { rendererLogger } from "@/app";
import {
  applyAppTheme,
  applyFontFamily,
  applyFontSize,
  applyLineHeight,
  handleUpdateSettings,
  resolveTheme,
} from "@/settings/setting-actions";
import { settingsStore } from "@/state/state";
import { createAsyncHandler } from "@/utils/async";
import { getAppItem } from "@/utils/registry";
import { CODE_THEME_MAP } from "@shared/constants/renderer-constants";
import {
  CODE_THEME_SETTINGS,
  EXPORT_FORMAT_SETTINGS,
  FONT_FAMILY_SETTINGS,
  FONT_SIZE_SETTINGS,
  HIGHLIGHT_THEME_SETTINGS,
  LINE_HEIGHT_SETTINGS,
  NOTE_ITEM_DISPLAY_SETTINGS,
  THEME_SETTINGS,
} from "@shared/constants/setting-constants";
import type { AppSettings } from "@shared/schemas/store-schema";

function initAppearanceSettings(
  settings: AppSettings,
  container: HTMLDivElement,
) {
  const themeSelect = container.querySelector<HTMLSelectElement>("#theme");
  const codeThemeSelect =
    container.querySelector<HTMLSelectElement>("#code-theme");
  const highlightSelect =
    container.querySelector<HTMLSelectElement>("#highlight-theme");
  const noteItemSelect =
    container.querySelector<HTMLSelectElement>("#note-item-display");
  const sidebar = getAppItem("sidebar");
  if (!codeThemeSelect || !themeSelect || !highlightSelect || !noteItemSelect) {
    return;
  }

  document.documentElement.setAttribute(
    "data-code-theme",
    settings["code_theme"],
  );
  codeThemeSelect.value = settings["code_theme"];
  codeThemeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newCodeTheme = e.target.value;
      const match = CODE_THEME_SETTINGS.find((s) => s.value === newCodeTheme);
      if (!match) return;
      const resolvedTheme = resolveTheme(settingsStore.get("theme"));
      rendererLogger.devLog(resolvedTheme);
      const mappedCodeTheme = CODE_THEME_MAP[match.value][resolvedTheme];
      document.documentElement.dataset["codetheme"] = mappedCodeTheme;
      await handleUpdateSettings({ code_theme: match.value });
    }),
  );
  themeSelect.value = settings["theme"];
  themeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newTheme = e.target.value;
      const match = THEME_SETTINGS.find((s) => s.value === newTheme);
      if (!match) return;
      const result = await applyAppTheme(match.value);
      if (!result.success) {
        rendererLogger.appError(
          "[applyAppTheme]: Failed to apply theme",
          result.error,
        );
        return;
      }
      await handleUpdateSettings({
        theme: result.data.theme,
        code_theme: result.data.codeTheme,
      });
    }),
  );

  document.documentElement.setAttribute(
    "data-highlight",
    settings["highlight"],
  );
  highlightSelect.value = settings["highlight"];
  highlightSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newDisplay = e.target.value;
      const match = HIGHLIGHT_THEME_SETTINGS.find(
        (s) => s.value === newDisplay,
      );
      if (!match) return;
      document.documentElement.setAttribute("data-highlight", match.value);
      await handleUpdateSettings({
        highlight: match.value,
      });
    }),
  );

  sidebar.setAttribute("data-noteItem", settings["note_item_display"]);
  noteItemSelect.value = settings["note_item_display"];
  noteItemSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newDisplay = e.target.value;
      const match = NOTE_ITEM_DISPLAY_SETTINGS.find(
        (s) => s.value === newDisplay,
      );
      if (!match) return;
      await handleUpdateSettings({
        note_item_display: match.value,
      });
      sidebar.setAttribute("data-noteItem", match.value);
    }),
  );
}

function initEditorSettings(settings: AppSettings, container: HTMLDivElement) {
  const editorWrapper = getAppItem("editorWrapper");
  const fontFamilySelect =
    container.querySelector<HTMLSelectElement>("#font-family");
  const fontSizeSelect =
    container.querySelector<HTMLSelectElement>("#font-size");
  const lineHeightSelect =
    container.querySelector<HTMLSelectElement>("#line-height");
  const spellcheckSelect =
    container.querySelector<HTMLSelectElement>("#spellcheck");
  if (
    !fontFamilySelect ||
    !fontSizeSelect ||
    !lineHeightSelect ||
    !spellcheckSelect
  )
    return;

  applyFontFamily(editorWrapper, fontFamilySelect, settings["font_family"]);
  fontFamilySelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newFont = e.target.value;
      const match = FONT_FAMILY_SETTINGS.find((s) => s.value === newFont);
      if (!match) return;
      applyFontFamily(editorWrapper, fontFamilySelect, match.value);
      await handleUpdateSettings({ font_family: match.value });
    }),
  );

  applyFontSize(editorWrapper, fontSizeSelect, settings["font_size"]);
  fontSizeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newSize = e.target.value;
      const match = FONT_SIZE_SETTINGS.find((s) => s.value === newSize);
      if (!match) return;
      applyFontSize(editorWrapper, fontSizeSelect, match.value);
      await handleUpdateSettings({ font_size: match.value });
    }),
  );

  applyLineHeight(editorWrapper, lineHeightSelect, settings["line_height"]);
  lineHeightSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const newHeight = e.target.value;
      const match = LINE_HEIGHT_SETTINGS.find((s) => s.value === newHeight);
      if (!match) return;
      applyLineHeight(editorWrapper, lineHeightSelect, match.value);
      await handleUpdateSettings({ line_height: match.value });
    }),
  );

  const enabled = settings["spellcheck"] === true;
  const editor = getAppItem("editor");
  editor.view.dom.spellcheck = enabled;
  spellcheckSelect.value = enabled ? "true" : "false";
  spellcheckSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const enabled = e.target.value === "true";
      editor.view.dom.spellcheck = enabled;
      editor.commands.focus();
      await handleUpdateSettings({ spellcheck: enabled });
    }),
  );
}

function initGeneralSettings(settings: AppSettings, container: HTMLDivElement) {
  const exportFormatSelect =
    container.querySelector<HTMLSelectElement>("#export-format");
  const autoExportSelect =
    container.querySelector<HTMLSelectElement>("#auto-export");
  if (!exportFormatSelect || !autoExportSelect) return;
  exportFormatSelect.value = settings["export_format"];
  exportFormatSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const selectedExtension = e.target.value;
      const match = EXPORT_FORMAT_SETTINGS.find(
        (s) => s.value === selectedExtension,
      );
      if (!match) return;
      await handleUpdateSettings({ export_format: match.value });
    }),
  );

  const autoExportPath = settings["auto_export_path"];
  ((autoExportSelect.title = autoExportPath
    ? `Path: ${autoExportPath}`
    : "No path selected."),
    (autoExportSelect.value = settings["auto_export"] ? "true" : "false"));
  autoExportSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      if (!(e.target instanceof HTMLSelectElement)) return;
      const enabled = e.target.value === "true";
      if (enabled) {
        const result = await selectAutoExportFolder();
        if (!result.success) {
          e.target.value = "false";
          return;
        }
        await handleUpdateSettings({
          auto_export: true,
          auto_export_path: result.data,
        });
        autoExportSelect.title = `Path: ${result.data}`;
      } else {
        await handleUpdateSettings({
          auto_export: false,
          auto_export_path: null,
        });
        autoExportSelect.title = "No path selected.";
      }
    }),
  );
}

function setSelectListeners(settings: AppSettings, container: HTMLDivElement) {
  initAppearanceSettings(settings, container);
  initEditorSettings(settings, container);
  initGeneralSettings(settings, container);
}

export { setSelectListeners };
