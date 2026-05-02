import { getSettings, setSettings } from "@/api/settingsAPI";
import { getElement } from "@/utils/helpers";
import type { StyleKeys } from "@shared/schemas/store-schema";

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

export { setUpEditorSettings };
