import { debouncedSetSettings } from "@/api/settingsAPI";
import { setUpEditorSettings } from "@/settings/editor-settings";
import {
  resolveTheme,
  setAppTheme,
  setCodeTheme,
} from "@/settings/setting-theme";
import { createAsyncHandler } from "@/utils/async";
import { findElement } from "@/utils/dom";
import type {
  AppSettings,
  CloseWindowMode,
  MinimizeWindowMode,
  OpenWindowMode,
  StyleKeys,
  Theme,
} from "@shared/schemas/store-schema";

function initEditorSettings(settings: Pick<AppSettings, StyleKeys>) {
  setUpEditorSettings({
    selectId: "#font-family",
    storageKey: "font-family",
    cssVar: "--editor-font-family",
    defaultValue: "system",
    value: settings["font-family"],
  });

  setUpEditorSettings({
    selectId: "#line-height",
    storageKey: "line-height",
    cssVar: "--editor-line-height",
    defaultValue: 1.5,
    value: settings["line-height"],
    min: 1.2,
    max: 1.7,
  });

  setUpEditorSettings({
    selectId: "#font-size",
    storageKey: "font-size",
    cssVar: "--editor-font-size",
    defaultValue: 16,
    value: settings["font-size"],
    min: 12,
    max: 24,
    formatValue: (v) => `${v}px`,
  });
}

function initAppearanceSettings() {
  const themeSelect = findElement<HTMLSelectElement>("#theme");
  const codeThemeSelect = findElement<HTMLSelectElement>("#code-theme");
  if (!codeThemeSelect || !themeSelect) return;
  codeThemeSelect.addEventListener(
    "change",
    createAsyncHandler(async () => {
      const baseTheme = resolveTheme(themeSelect.value as Theme);
      const codePref = setCodeTheme(baseTheme);
      debouncedSetSettings({ "code-theme": codePref });
    }),
  );
  themeSelect.addEventListener("change", createAsyncHandler(setAppTheme));
}

function initWindowSettings() {
  const openWindowSelect = findElement<HTMLSelectElement>("#open-window-mode");
  const closeWindowSelect =
    findElement<HTMLSelectElement>("#close-window-mode");
  const minimizeWindowSelect =
    findElement<HTMLSelectElement>("#open-window-mode");
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
  minimizeWindowSelect?.addEventListener(
    "change",
    createAsyncHandler(async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      minimizeWindowSelect.value = target.value;
      debouncedSetSettings({
        "minimize-window-mode": target.value as MinimizeWindowMode,
      });
    }),
  );
}

function setSelectListeners(settings: AppSettings) {
  initAppearanceSettings();
  initEditorSettings(settings);
  initWindowSettings();
}

export { setSelectListeners };
