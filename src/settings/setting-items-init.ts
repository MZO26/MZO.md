import { selectAutoExportFolder, updateSettings } from "@/api/api";
import { rendererLogger } from "@/app";
import {
  applyAppTheme,
  resolveTheme,
  setCodeTheme,
} from "@/settings/theme-actions";
import { createAsyncHandler } from "@/utils/async";
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
  codeThemeSelect.addEventListener("change", () => {
    const baseTheme = resolveTheme(themeSelect.value as Theme);
    const codePref = setCodeTheme(baseTheme);
    updateSettings({ code_theme: codePref });
  });
  themeSelect.value = settings["theme"];
  themeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const result = await applyAppTheme(target.value as Theme);
      if (!result.success) {
        rendererLogger.appError(
          "[applyAppTheme]: Failed to apply theme",
          result.error,
        );
        return;
      }
      updateSettings({
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
  highlightSelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    document.documentElement.setAttribute("data-highlight", target.value);
    updateSettings({
      highlight: target.value as HighlightTheme,
    });
  });

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

  const applyFont = (val: string) => {
    const current = val || "system";
    editorWrapper.style.setProperty("--editor-font-family", current);
    if (
      fontFamilySelect.querySelector<HTMLOptionElement>(
        `option[value="${CSS.escape(current)}"]`,
      )
    ) {
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

  const applySize = (val: string | number) => {
    let current = Number(val) || 18;
    current = Math.max(16, Math.min(current, 20));
    const strCurrent = String(current);
    editorWrapper.style.setProperty("--editor-font-size", `${strCurrent}px`);
    if (
      fontSizeSelect.querySelector<HTMLOptionElement>(
        `option[value="${CSS.escape(strCurrent)}"]`,
      )
    ) {
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

  const applyLineHeight = (val: string | number) => {
    let current = Number(val) || 1.5;
    current = Math.max(1.4, Math.min(current, 1.6));
    const strCurrent = String(current);
    editorWrapper.style.setProperty("--editor-line-height", strCurrent);
    if (
      lineHeightSelect.querySelector<HTMLOptionElement>(
        `option[value="${CSS.escape(strCurrent)}"]`,
      )
    ) {
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
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const selectedExtension = target.value as ExportFormat;
      updateSettings({ export_format: selectedExtension });
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
          autoExportSelect.title = `Path: ${result.data}`;
        } else {
          updateSettings({ auto_export: false, auto_export_path: null });
          autoExportSelect.title = "No path selected.";
        }
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
