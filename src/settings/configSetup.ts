import { getSettings, setSettings } from "@/api/settingsAPI";
import { applyAppTheme, setAppTheme, setCodeTheme } from "@/settings/theme";
import { createAsyncHandler, getElement, setActiveItem } from "@/utils/helpers";
import type { StyleKeys } from "@shared/schemas/storeSchema";
import { buildSelects } from "./settingItems";

function initAppSettings() {
  const buttonsContainer = getElement<HTMLDivElement>(".settings-buttons");
  const settingsContainer = getElement<HTMLDivElement>(".settings-content");
  const firstActiveBtn =
    buttonsContainer.querySelector<HTMLButtonElement>("button:first-child");
  if (firstActiveBtn) setActiveItem(firstActiveBtn, buttonsContainer);
  buildSelects(settingsContainer);

  setUpEditorSettings({
    selectId: "#font-family",
    storageKey: "font-family",
    cssVar: "--editor-font-family",
    defaultValue: "system",
  });

  setUpEditorSettings({
    selectId: "#line-height",
    storageKey: "line-height",
    cssVar: "--editor-line-height",
    defaultValue: 1.5,
    min: 1.2,
    max: 1.7,
  });

  setUpEditorSettings({
    selectId: "#font-size",
    storageKey: "font-size",
    cssVar: "--editor-font-size",
    defaultValue: 16,
    min: 12,
    max: 24,
    formatValue: (v) => `${v}px`,
  });

  buttonsContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target === buttonsContainer) return;
    const btn = target.closest(".selection-btn") as HTMLButtonElement | null;
    if (!btn) return;
    const targetTab = btn.dataset["category"];
    if (!targetTab) return;
    settingsContainer.dataset["activetab"] = targetTab;
    setActiveItem(btn, buttonsContainer);
  });
  const codeThemeSelect = getElement<HTMLSelectElement>("#code-theme");

  codeThemeSelect.addEventListener("change", async () => {
    setCodeTheme(codeThemeSelect);
  });

  const themeSelect = getElement<HTMLSelectElement>("#theme");
  themeSelect.addEventListener("change", createAsyncHandler(setAppTheme));
  applyAppTheme(themeSelect);
  // listen to OS theme changes
  const unsubscribeThemeChange = window.electronAPI.onThemeChanged(
    async (newTheme) => {
      await applyAppTheme(themeSelect, newTheme, true);
    },
  );

  window.addEventListener("beforeunload", () => {
    unsubscribeThemeChange();
  });
}

// sets select value and body value
function syncUI<K extends string>(
  select: HTMLSelectElement,
  key: K,
  value: string,
) {
  if (select.querySelector(`option[value="${value}"]`)) {
    select.value = value;
    document.documentElement.setAttribute(`data-${key}`, value);
  }
}

interface EditorStyleConfig<T extends number | string> {
  selectId: string; // uses the select for the settings
  storageKey: StyleKeys; // single cache key
  cssVar: string; // css variable that responds on select
  defaultValue: T; // line-height and font are numbers / font-family string
  min?: number; // min and max optional so they don't appear on font-family setting / otherwise they set the min and max value possible
  max?: number;
  formatValue?: (value: T) => string; // formatValue is a little helper to set the correct css variable for editor
}

async function setUpEditorSettings<T extends number | string>(
  config: EditorStyleConfig<T>,
) {
  const {
    selectId,
    storageKey,
    cssVar,
    defaultValue,
    min,
    max,
    formatValue = String,
  } = config;
  const editorEl = getElement("#editor .ProseMirror");
  const select = getElement<HTMLSelectElement>(selectId);
  const response = await getSettings(storageKey);
  let currentValue = response.success ? response.data : defaultValue;
  const apply = (newValue: T | string) => {
    if (typeof defaultValue === "number") {
      let num = Number(newValue);
      if (Number.isNaN(num)) num = defaultValue;
      if (min !== undefined) num = Math.max(min, num);
      if (max !== undefined) num = Math.min(num, max);
      currentValue = num as T;
    } else currentValue = newValue as T;
    editorEl.style.setProperty(cssVar, formatValue(currentValue));
    setSettings({ [storageKey]: String(currentValue) });
    syncUI(select, String(storageKey), String(currentValue));
  };
  apply(currentValue); // call function to represent current state
  select.addEventListener("change", () => apply(select.value));
}

export { initAppSettings };
