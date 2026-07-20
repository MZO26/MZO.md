import { selectAutoExportFolder, updateSettings } from "@/api/api";
import { noteStore } from "@/settings/app-state";
import { applyAppTheme, resolveTheme, setCodeTheme } from "@/settings/theme";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import type {
  AppSettings,
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  NoteItemDisplay,
  Theme,
} from "@shared/schemas/store-schema";
import type { ExportFormat } from "@shared/types";

import { refreshSidebar } from "@/components/sidebar/sidebar-note-items";
import { selectBuilder } from "@/settings/setting-factory";
import {
  AUTO_EXPORT_SETTINGS,
  CODE_THEME_SETTINGS,
  EXPORT_FORMAT_SETTINGS,
  FONT_FAMILY_SETTINGS,
  FONT_SIZE_SETTINGS,
  HIGHLIGHT_THEME_SETTINGS,
  LINE_HEIGHT_SETTINGS,
  NOTE_ITEM_DISPLAY_SETTINGS,
  SPELLCHECK_SETTINGS,
  THEME_SETTINGS,
} from "@shared/constants";

function buildSelects() {
  selectBuilder("theme", THEME_SETTINGS, "Appearance", "App-Theme");
  selectBuilder("code-theme", CODE_THEME_SETTINGS, "Appearance", "Code-Theme");
  selectBuilder(
    "highlight-theme",
    HIGHLIGHT_THEME_SETTINGS,
    "Appearance",
    "Highlight-Theme",
  );
  selectBuilder(
    "note-item-display",
    NOTE_ITEM_DISPLAY_SETTINGS,
    "Appearance",
    "Note-Item-Display",
  );
  selectBuilder("font-family", FONT_FAMILY_SETTINGS, "Editor", "Font-Family");
  selectBuilder("font-size", FONT_SIZE_SETTINGS, "Editor", "Font-Size");
  (selectBuilder("line-height", LINE_HEIGHT_SETTINGS, "Editor", "Line-Height"),
    selectBuilder("spellcheck", SPELLCHECK_SETTINGS, "Editor", "Spellcheck"),
    selectBuilder(
      "export-format",
      EXPORT_FORMAT_SETTINGS,
      "General",
      "Bulk Export-Format",
    ),
    selectBuilder(
      "auto-export",
      AUTO_EXPORT_SETTINGS,
      "General",
      "Auto-Export (.md)",
    ));
}

function initAppearanceSettings(
  settings: AppSettings,
  container: HTMLDivElement,
) {
  const themeSelect = findElement<HTMLSelectElement>("#theme", container);
  const codeThemeSelect = findElement<HTMLSelectElement>(
    "#code-theme",
    container,
  );
  const highlightSelect = findElement<HTMLSelectElement>(
    "#highlight-theme",
    container,
  );
  const noteItemSelect = findElement<HTMLSelectElement>(
    "#note-item-display",
    container,
  );
  const sidebar = getAppItem("sidebar");
  if (!codeThemeSelect || !themeSelect || !highlightSelect || !noteItemSelect) {
    return;
  }

  // code theme

  document.documentElement.setAttribute(
    "data-code-theme",
    settings["code_theme"],
  );
  codeThemeSelect.value = settings["code_theme"];
  codeThemeSelect.addEventListener("change", () => {
    const baseTheme = resolveTheme(themeSelect.value as Theme);
    const codePref = setCodeTheme(baseTheme);
    updateSettings({ code_theme: codePref });
  });

  // theme
  themeSelect.value = settings["theme"];
  themeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const result = await applyAppTheme(target.value as Theme);
      if (!result.success) {
        console.error("[applyAppTheme]: Failed to apply theme", result.error);
        return;
      }
      updateSettings({
        theme: result.data.theme,
        code_theme: result.data.codeTheme,
      });
    }),
  );

  // highlight

  document.documentElement.setAttribute(
    "data-highlight",
    settings["highlight"],
  );
  highlightSelect.value = settings["highlight"];
  highlightSelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    document.documentElement.setAttribute("data-highlight", target.value);
    updateSettings({
      highlight: target?.value as HighlightTheme,
    });
  });

  // note item display

  sidebar.setAttribute("data-noteItem", settings["note_item_display"]);
  noteItemSelect.value = settings["note_item_display"];
  noteItemSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      updateSettings({
        note_item_display: target.value as NoteItemDisplay,
      });
      sidebar.setAttribute("data-noteItem", target.value);
      refreshSidebar(noteStore.get("notes"));
    }),
  );
}

//--------------------------------------------------------------

function initEditorSettings(settings: AppSettings, container: HTMLDivElement) {
  const editorWrapper = getAppItem("editorWrapper");
  const fontFamilySelect = findElement<HTMLSelectElement>(
    "#font-family",
    container,
  );
  const fontSizeSelect = findElement<HTMLSelectElement>(
    "#font-size",
    container,
  );
  const lineHeightSelect = findElement<HTMLSelectElement>(
    "#line-height",
    container,
  );
  const spellcheckSelect = findElement<HTMLSelectElement>(
    "#spellcheck",
    container,
  );
  if (
    !fontFamilySelect ||
    !fontSizeSelect ||
    !lineHeightSelect ||
    !spellcheckSelect
  )
    return;

  // editor font family

  const applyFont = (val: string) => {
    const current = val || "system";
    editorWrapper.style.setProperty("--editor-font-family", current);
    if (findElement(`option[value="${current}"]`, fontFamilySelect)) {
      editorWrapper.setAttribute("data-font-family", current);
      fontFamilySelect.value = current;
    }
  };

  applyFont(settings["font_family"]);
  fontFamilySelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const newFont = target.value;
    applyFont(newFont);
    updateSettings({ font_family: newFont as FontFamily });
  });

  // editor font size

  const applySize = (val: string | number) => {
    let current = Number(val) || 18;
    current = Math.max(16, Math.min(current, 20));
    const strCurrent = String(current);
    editorWrapper.style.setProperty("--editor-font-size", `${strCurrent}px`);
    if (findElement(`option[value="${strCurrent}"]`, fontSizeSelect)) {
      editorWrapper.setAttribute("data-font-size", strCurrent);
      fontSizeSelect.value = strCurrent;
    }
  };

  applySize(settings["font_size"]);
  fontSizeSelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const newSize = target.value;
    applySize(newSize);
    updateSettings({ font_size: String(newSize) as FontSize });
  });

  // editor line height

  const applyLineHeight = (val: string | number) => {
    let current = Number(val) || 1.5;
    current = Math.max(1.4, Math.min(current, 1.6));
    const strCurrent = String(current);
    editorWrapper.style.setProperty("--editor-line-height", strCurrent);
    if (findElement(`option[value="${strCurrent}"]`, lineHeightSelect)) {
      editorWrapper.setAttribute("data-line-height", strCurrent);
      lineHeightSelect.value = strCurrent;
    }
  };

  applyLineHeight(settings["line_height"]);
  lineHeightSelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const newHeight = target.value;
    applyLineHeight(newHeight);
    updateSettings({ line_height: String(newHeight) as LineHeight });
  });

  // spellcheck

  const enabled = settings["spellcheck"] === true;
  const editor = getAppItem("editor");
  editor.view.dom.spellcheck = enabled;
  spellcheckSelect.value = enabled ? "true" : "false";
  spellcheckSelect.addEventListener("change", (e) => {
    const editor = getAppItem("editor");
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const enabled = target.value === "true";
    editor.view.dom.spellcheck = enabled;
    editor.commands.focus();
    updateSettings({ spellcheck: enabled });
  });
}

//--------------------------------------------------------------

function initGeneralSettings(settings: AppSettings, container: HTMLDivElement) {
  const exportFormatSelect = findElement<HTMLSelectElement>(
    "#export-format",
    container,
  );
  const autoExportSelect = findElement<HTMLSelectElement>(
    "#auto-export",
    container,
  );
  if (!exportFormatSelect || !autoExportSelect) return;

  // file backup

  exportFormatSelect.value = settings["export_format"];
  exportFormatSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const selectedExtension = target.value as ExportFormat;
      updateSettings({ export_format: selectedExtension });
    }),
  );

  // auto export setting
  const autoExportPath = settings["auto_export_path"];
  autoExportSelect.setAttribute("data-tippy-dynamic", "");
  autoExportSelect.setAttribute(
    "data-tippy-content",
    autoExportPath ? `Path: ${autoExportPath}` : "No path selected.",
  );
  autoExportSelect.value = settings["auto_export"] ? "true" : "false";
  autoExportSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      if (target.value) {
        const enabled = target.value === "true";
        if (enabled) {
          const result = await selectAutoExportFolder();
          if (!result.success) {
            target.value = "false";
            return;
          }
          updateSettings({
            auto_export: true,
            auto_export_path: result.data,
          });
          autoExportSelect.setAttribute(
            "data-tippy-content",
            `Path: ${result.data}`,
          );
        } else {
          updateSettings({ auto_export: false, auto_export_path: null });
          autoExportSelect.setAttribute(
            "data-tippy-content",
            "No path selected.",
          );
        }
      }
    }),
  );
}

//--------------------------------------------------------------

// init function

function setSelectListeners(settings: AppSettings, container: HTMLDivElement) {
  initAppearanceSettings(settings, container);
  initEditorSettings(settings, container);
  initGeneralSettings(settings, container);
}

export { buildSelects, setSelectListeners };
