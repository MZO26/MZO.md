import {
  dbMaintenance,
  exportManyNotes,
  showNotification,
  updateSettings,
} from "@/api/api";
import { reloadNoteList } from "@/components/sidebar/sidebar-actions";
import { getBatchExportContent } from "@/features/export-actions";
import {
  applyAppTheme,
  resolveTheme,
  setCodeTheme,
} from "@/settings/theme-actions";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import { getAppItem, setSettingsItems } from "@/utils/registry";
import type {
  AppSettings,
  EditorFocus,
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  NoteItemDisplay,
  Spellcheck,
  Theme,
} from "@shared/schemas/store-schema";
import type { DbOptimization, ExportFormat } from "@shared/types";

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
  themeSelect.value = settings["theme"];
  themeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      await applyAppTheme(target.value as Theme);
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

  setSettingsItems({
    codeThemeSelect,
    themeSelect,
    highlightSelect,
    noteItemSelect,
  });
}

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

  setSettingsItems({
    fontFamilySelect,
    fontSizeSelect,
    lineHeightSelect,
    focusSelect,
  });
}

function initAppSettings(settings: AppSettings) {
  const batchExportSelect = findElement<HTMLSelectElement>("#file-backup");
  const dbOptimizeSelect = findElement<HTMLSelectElement>("#db-optimization");
  const spellcheckSelect = findElement<HTMLSelectElement>("#spellcheck");
  if (!batchExportSelect || !dbOptimizeSelect || !spellcheckSelect) return;

  batchExportSelect.value = "";
  batchExportSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement;
      const selectedExtension = target.value as ExportFormat;
      const exportContent = await getBatchExportContent(selectedExtension);
      if (!exportContent.success) {
        console.error("Failed to get export content:", exportContent.error);
        return;
      }
      const result = await exportManyNotes(exportContent.data);
      target.value = "";
      if (!result.success) {
        console.error(
          "Export failed or Operation got cancelled:",
          result.error,
        );
        return;
      }
      const count = result.data.length;
      await showNotification(
        "Export Successful",
        `${count} files exported to .${selectedExtension}`,
      );
    }),
  );

  dbOptimizeSelect.value = "";
  dbOptimizeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement;
      const selectedOpt = target.value as DbOptimization;
      const result = await dbMaintenance(selectedOpt);
      target.value = "";
      if (!result.success) {
        console.error("Database maintenance failed:", result.error);
        return;
      }
      if (selectedOpt === "backup-db" && result.success) {
        await showNotification("Backup saved.", "");
        return;
      }
      await showNotification(`Optimized db in ${result.data} ms.`, "");
    }),
  );

  spellcheckSelect.value = settings["spellcheck"] ? "true" : "false";
  spellcheckSelect.addEventListener("change", (e: Event) => {
    const editor = getAppItem("editor");
    const target = e.target as HTMLSelectElement;
    const enabled = target.value === "true";
    editor.view.dom.spellcheck = enabled;
    editor.commands.focus();
    updateSettings({ spellcheck: enabled as Spellcheck });
  });

  setSettingsItems({
    spellcheckSelect,
    batchExportSelect,
    dbOptimizeSelect,
  });
}

function setSelectListeners(settings: AppSettings) {
  initAppearanceSettings(settings);
  initEditorSettings(settings);
  initAppSettings(settings);
}

export { setSelectListeners };
