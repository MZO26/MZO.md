import { exportManyNotes } from "@/api/fileAPI";
import { dbMaintenance } from "@/api/noteAPI";
import { updateSettings } from "@/api/settingsAPI";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { getExportContent } from "@/features/export-actions";
import {
  applyAppTheme,
  currentDomTheme,
  resolveTheme,
  setCodeTheme,
} from "@/settings/theme-actions";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import { getAppItem, setSettingsItem } from "@/utils/registry";
import { showToast } from "@/utils/toast";
import { THEME_MAP } from "@shared/constants";
import type {
  AppSettings,
  CloseWindowMode,
  EditorFocus,
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  MinimizeWindowMode,
  NoteItemDisplay,
  OpenWindowMode,
  Spellcheck,
  Theme,
} from "@shared/schemas/store-schema";
import type { DbOptimization, ExportFormat } from "@shared/types";

function initEditorSettings(settings: AppSettings) {
  const editorWrapper = getAppItem("editorWrapper");
  const fontFamilySelect = findElement<HTMLSelectElement>("#font-family");
  const fontSizeSelect = findElement<HTMLSelectElement>("#font-size");
  const lineHeightSelect = findElement<HTMLSelectElement>("#line-height");
  const focusSelect = findElement<HTMLSelectElement>("#editor-focus");
  if (!fontFamilySelect || !fontSizeSelect || !lineHeightSelect || !focusSelect)
    return;

  const applyFont = (val: string) => {
    const current = val || "system";

    editorWrapper.style.setProperty("--editor-font-family", current);
    updateSettings({ "font-family": current as FontFamily });
    if (fontFamilySelect.querySelector(`option[value="${current}"]`)) {
      fontFamilySelect.value = current;
      document.documentElement.setAttribute("data-font-family", current);
    }
  };

  applyFont(settings["font-family"]);
  fontFamilySelect.addEventListener("change", () =>
    applyFont(fontFamilySelect.value),
  );

  const applySize = (val: string | number) => {
    let current = Number(val) || 16;
    current = Math.max(12, Math.min(current, 24));
    const strCurrent = String(current);

    editorWrapper.style.setProperty("--editor-font-size", `${strCurrent}px`);
    updateSettings({ "font-size": strCurrent as FontSize });

    if (fontSizeSelect.querySelector(`option[value="${strCurrent}"]`)) {
      fontSizeSelect.value = strCurrent;
      document.documentElement.setAttribute("data-font-size", strCurrent);
    }
  };

  applySize(settings["font-size"]);
  fontSizeSelect.addEventListener("change", () =>
    applySize(fontSizeSelect.value),
  );

  const applyLineHeight = (val: string | number) => {
    let current = Number(val) || 1.5;
    current = Math.max(1.2, Math.min(current, 2.5));
    const strCurrent = String(current);

    editorWrapper.style.setProperty("--editor-line-height", strCurrent);
    updateSettings({ "line-height": strCurrent as LineHeight });

    if (lineHeightSelect.querySelector(`option[value="${strCurrent}"]`)) {
      lineHeightSelect.value = strCurrent;
      document.documentElement.setAttribute("data-line-height", strCurrent);
    }
  };

  applyLineHeight(settings["line-height"]);
  lineHeightSelect.addEventListener("change", () =>
    applyLineHeight(lineHeightSelect.value),
  );

  focusSelect.value = settings["editor-focus"];
  focusSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const editor = getAppItem("editor");
    const editorDom = editor.view.dom;
    if (target.value === "on") {
      editorDom.classList.add("focus-mode-active");
    } else {
      editorDom.classList.remove("focus-mode-active");
    }
    updateSettings({
      "editor-focus": target.value as EditorFocus,
    });
  });

  setSettingsItem({
    fontFamilySelect,
    fontSizeSelect,
    lineHeightSelect,
    focusSelect,
  });
}

function initAppearanceSettings(settings: AppSettings) {
  const themeSelect = findElement<HTMLSelectElement>("#theme");
  const codeThemeSelect = findElement<HTMLSelectElement>("#code-theme");
  const highlightSelect = findElement<HTMLSelectElement>("#highlight-theme");
  const noteItemSelect = findElement<HTMLSelectElement>("#note-item-display");
  const sidebar = getAppItem("sidebar");
  if (!codeThemeSelect || !themeSelect || !highlightSelect || !noteItemSelect) {
    return;
  }
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
  document.documentElement.setAttribute("data-theme", settings["theme"]);
  themeSelect.value = settings["theme"];
  themeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      themeSelect.value = target.value;
      const validTheme =
        target.value in THEME_MAP ? (target.value as Theme) : "system";
      if (validTheme === currentDomTheme) return;
      await applyAppTheme(validTheme, false);
    }),
  );
  document.documentElement.setAttribute(
    "data-highlight",
    settings["highlight"],
  );
  highlightSelect.value = settings["highlight"];
  highlightSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    document.documentElement.setAttribute("data-highlight", target.value);
    updateSettings({
      highlight: target.value as HighlightTheme,
    });
  });
  sidebar.setAttribute("data-noteItem", settings["note-item-display"]);
  noteItemSelect.value = settings["note-item-display"];
  noteItemSelect.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      updateSettings({
        "note-item-display": target.value as NoteItemDisplay,
      });
      sidebar.setAttribute("data-noteItem", target.value);
      await reloadNoteList();
    }),
  );

  setSettingsItem({
    codeThemeSelect,
    themeSelect,
    highlightSelect,
    noteItemSelect,
  });
}

function initWindowSettings(settings: AppSettings) {
  const openWindowSelect = findElement<HTMLSelectElement>("#open-window-mode");
  const closeWindowSelect =
    findElement<HTMLSelectElement>("#close-window-mode");
  const minimizeWindowSelect = findElement<HTMLSelectElement>(
    "#minimize-window-mode",
  );
  const spellcheckSelect = findElement<HTMLSelectElement>("#spellcheck");
  if (
    !openWindowSelect ||
    !closeWindowSelect ||
    !minimizeWindowSelect ||
    !spellcheckSelect
  )
    return;
  openWindowSelect.value = settings["open-window-mode"];
  openWindowSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    updateSettings({
      "open-window-mode": target.value as OpenWindowMode,
    });
  });
  closeWindowSelect.value = settings["close-window-mode"];
  closeWindowSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    updateSettings({
      "close-window-mode": target.value as CloseWindowMode,
    });
  });
  minimizeWindowSelect.value = settings["minimize-window-mode"];
  minimizeWindowSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    updateSettings({
      "minimize-window-mode": target.value as MinimizeWindowMode,
    });
  });
  spellcheckSelect.value = settings["spellcheck"] ? "true" : "false";
  spellcheckSelect.addEventListener("change", (e: Event) => {
    const editor = getAppItem("editor");
    const target = e.target as HTMLSelectElement;
    const enabled = target.value === "true";
    editor.view.dom.spellcheck = enabled;
    editor.commands.focus();
    updateSettings({ spellcheck: enabled as Spellcheck });
  });

  setSettingsItem({
    openWindowSelect,
    closeWindowSelect,
    minimizeWindowSelect,
    spellcheckSelect,
  });
}

function initStorageSettings() {
  const batchExportSelect = findElement<HTMLSelectElement>("#file-backup");
  const dbOptimizeSelect = findElement<HTMLSelectElement>("#db-optimization");
  if (!batchExportSelect || !dbOptimizeSelect) return;
  batchExportSelect.value = "";
  (batchExportSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement;
      const selectedExtension = target.value as ExportFormat;
      const exportContent = await getExportContent(selectedExtension);
      if (!exportContent.success) {
        showToast(exportContent.message);
        return;
      }
      const result = await exportManyNotes(exportContent.data);
      target.value = "";
      if (!result.success) {
        showToast(result.message);
        return;
      }
      showToast(`Successfully exported all files to ${selectedExtension}`);
    }),
  ),
    (dbOptimizeSelect.value = ""));
  dbOptimizeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement;
      const selectedOpt = target.value as DbOptimization;
      const result = await dbMaintenance(selectedOpt);
      target.value = "";
      if (!result.success) {
        showToast(result.message);
        return;
      }
      if (selectedOpt === "backup-db" && result.success) {
        showToast("Backup saved.");
        return;
      }
      showToast(`Optimized db in ${result.data} ms.`);
    }),
  );
  setSettingsItem({
    batchExportSelect,
    dbOptimizeSelect,
  });
}

function setSelectListeners(settings: AppSettings) {
  initAppearanceSettings(settings);
  initEditorSettings(settings);
  initWindowSettings(settings);
  initStorageSettings();
}

export { setSelectListeners };
