import { debouncedSetSettings } from "@/api/settingsAPI";
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
  FontFamily,
  FontSize,
  HighlightTheme,
  LineHeight,
  MinimizeWindowMode,
  OpenWindowMode,
  Theme,
} from "@shared/schemas/store-schema";

function initEditorSettings(settings: AppSettings) {
  const editorWrapper = getAppItem("editorWrapper");
  const fontFamilySelect = findElement<HTMLSelectElement>("#font-family");
  const fontSizeSelect = findElement<HTMLSelectElement>("#font-size");
  const lineHeightSelect = findElement<HTMLSelectElement>("#line-height");
  if (!fontFamilySelect || !fontSizeSelect || !lineHeightSelect) return;

  const applyFont = (val: string) => {
    const current = val || "system";

    editorWrapper.style.setProperty("--editor-font-family", current);
    debouncedSetSettings({ "font-family": current as FontFamily });

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
    debouncedSetSettings({ "font-size": strCurrent as FontSize });

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
    debouncedSetSettings({ "line-height": strCurrent as LineHeight });

    if (lineHeightSelect.querySelector(`option[value="${strCurrent}"]`)) {
      lineHeightSelect.value = strCurrent;
      document.documentElement.setAttribute("data-line-height", strCurrent);
    }
  };

  applyLineHeight(settings["line-height"]);
  lineHeightSelect.addEventListener("change", () =>
    applyLineHeight(lineHeightSelect.value),
  );

  setSettingsItem({
    fontFamilySelect,
    fontSizeSelect,
    lineHeightSelect,
  });
}

function initAppearanceSettings() {
  const themeSelect = findElement<HTMLSelectElement>("#theme");
  const codeThemeSelect = findElement<HTMLSelectElement>("#code-theme");
  const highlightSelect = findElement<HTMLSelectElement>("#highlight-theme");
  if (!codeThemeSelect || !themeSelect || !highlightSelect) {
    return;
  }
  codeThemeSelect.addEventListener(
    "change",
    createAsyncHandler(async () => {
      const baseTheme = resolveTheme(themeSelect.value as Theme);
      const codePref = setCodeTheme(baseTheme);
      debouncedSetSettings({ "code-theme": codePref });
    }),
  );
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

  highlightSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    highlightSelect.value = target.value;
    document.documentElement.setAttribute("data-highlight", target.value);
    debouncedSetSettings({
      highlight: target.value as HighlightTheme,
    });
  });

  setSettingsItem({
    codeThemeSelect,
    themeSelect,
    highlightSelect,
  });
}

function initWindowSettings() {
  const openWindowSelect = findElement<HTMLSelectElement>("#open-window-mode");
  const closeWindowSelect =
    findElement<HTMLSelectElement>("#close-window-mode");
  const minimizeWindowSelect = findElement<HTMLSelectElement>(
    "#minimize-window-mode",
  );
  if (!openWindowSelect || !closeWindowSelect || !minimizeWindowSelect) return;
  openWindowSelect.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      openWindowSelect.value = target.value;
      debouncedSetSettings({
        "open-window-mode": target.value as OpenWindowMode,
      });
    }),
  );
  closeWindowSelect.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      closeWindowSelect.value = target.value;
      debouncedSetSettings({
        "close-window-mode": target.value as CloseWindowMode,
      });
    }),
  );
  minimizeWindowSelect.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      minimizeWindowSelect.value = target.value;
      debouncedSetSettings({
        "minimize-window-mode": target.value as MinimizeWindowMode,
      });
    }),
  );

  setSettingsItem({
    openWindowSelect,
    closeWindowSelect,
    minimizeWindowSelect,
  });
}

function initStorageSettings() {
  const mirrorModeSelect = findElement<HTMLSelectElement>("#mirror-mode");
  if (!mirrorModeSelect) return;
  mirrorModeSelect.addEventListener(
    "change",
    createAsyncHandler(async (e) => {
      const target = e.target as HTMLSelectElement;
      mirrorModeSelect.value = target.value;
      if (target.value === "fs") {
        const folderPath = await window.fileAPI.selectFolder();
        if (folderPath) {
          debouncedSetSettings({
            "mirror-mode": "fs",
            "mirror-path": folderPath,
          });
          showToast(`Mirorring activated. Saving to ${folderPath}`);
        } else {
          showToast("Folder selection cancelled. Reverting to db mode");
          mirrorModeSelect.value = "db";
        }
      } else if (target.value === "db") {
        debouncedSetSettings({ "mirror-mode": "db" });
      }
    }),
  );
  setSettingsItem({
    mirrorModeSelect,
  });
}

function setSelectListeners(settings: AppSettings) {
  initAppearanceSettings();
  initEditorSettings(settings);
  initWindowSettings();
  initStorageSettings();
}

export { setSelectListeners };
