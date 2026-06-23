import { selectAutoExportFolder, updateSettings } from "@/api/api";
import { syncNoteStore } from "@/settings/app-state";
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
    settings["code-theme"],
  );
  codeThemeSelect.value = settings["code-theme"];
  codeThemeSelect.addEventListener("change", () => {
    const baseTheme = resolveTheme(themeSelect.value as Theme);
    const codePref = setCodeTheme(baseTheme);
    updateSettings({ "code-theme": codePref });
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
        "code-theme": result.data.codeTheme,
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

  sidebar.setAttribute("data-noteItem", settings["note-item-display"]);
  noteItemSelect.value = settings["note-item-display"];
  noteItemSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      updateSettings({
        "note-item-display": target.value as NoteItemDisplay,
      });
      sidebar.setAttribute("data-noteItem", target.value);
      await syncNoteStore();
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

  applyFont(settings["font-family"]);
  fontFamilySelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const newFont = target.value;
    applyFont(newFont);
    updateSettings({ "font-family": newFont as FontFamily });
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

  applySize(settings["font-size"]);
  fontSizeSelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const newSize = target.value;
    applySize(newSize);
    updateSettings({ "font-size": String(newSize) as FontSize });
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

  applyLineHeight(settings["line-height"]);
  lineHeightSelect.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement | null;
    if (!target) return;
    const newHeight = target.value;
    applyLineHeight(newHeight);
    updateSettings({ "line-height": String(newHeight) as LineHeight });
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

function initExportSettings(settings: AppSettings, container: HTMLDivElement) {
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

  exportFormatSelect.value = settings["export-format"];
  exportFormatSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement | null;
      if (!target) return;
      const selectedExtension = target.value as ExportFormat;
      updateSettings({ "export-format": selectedExtension });
    }),
  );

  // auto export setting
  const autoExportPath = settings["auto-export-path"];
  autoExportSelect.setAttribute("data-tippy-dynamic", "");
  autoExportSelect.setAttribute(
    "data-tippy-content",
    autoExportPath ? `Path: ${autoExportPath}` : "No path selected.",
  );
  autoExportSelect.value = settings["auto-export"] ? "true" : "false";
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
            "auto-export": true,
            "auto-export-path": result.data,
          });
          autoExportSelect.setAttribute(
            "data-tippy-content",
            `Path: ${result.data}`,
          );
        } else {
          updateSettings({ "auto-export": false, "auto-export-path": null });
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
  initExportSettings(settings, container);
}

export { setSelectListeners };
