import { debouncedSetSettings } from "@/api/settingsAPI";
import { findElement, requireElement } from "@/utils/dom";
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
  value: T | string;
  min?: number; // min and max optional so they don't appear on font-family setting / otherwise they set the min and max value possible
  max?: number;
  formatValue?: (value: T) => string; // formatValue is a little helper to set the correct css variable for editor
}

function clampValue<T extends number | string>(
  value: T | string,
  defaultValue: T,
  min?: number,
  max?: number,
): T {
  if (typeof defaultValue !== "number") return value as T;
  let num = Number(value);
  if (Number.isNaN(num)) num = defaultValue as number;
  if (min !== undefined) num = Math.max(min, num);
  if (max !== undefined) num = Math.min(num, max);
  return num as T;
}
function setUpEditorSettings<T extends number | string>({
  selectId,
  storageKey,
  cssVar,
  defaultValue,
  value,
  min,
  max,
  formatValue = String,
}: EditorStyleConfig<T>): void {
  const editorEl = requireElement(".ProseMirror");
  const select = findElement<HTMLSelectElement>(selectId);
  if (!select) return;
  let current = (
    typeof defaultValue === "number" ? Number(value) || defaultValue : value
  ) as T;

  const apply = (val: T | string): void => {
    current = clampValue(val, defaultValue, min, max);
    editorEl.style.setProperty(cssVar, formatValue(current));
    debouncedSetSettings({ [storageKey]: String(current) });
    syncUI(select, String(storageKey), String(current));
  };
  apply(current);
  select.addEventListener("change", () => apply(select.value));
}

export { setUpEditorSettings };
