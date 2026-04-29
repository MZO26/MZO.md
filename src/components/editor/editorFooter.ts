import type { Editor, JSONContent } from "@tiptap/core";
import type { AppSettings } from "../../../shared/schemas/storeSchema";
import { calculateToDos } from "../../extensions/toDoBar";
import { getSettings, setSettings } from "../../settings/settingsAPI";
import { debounce, getElement } from "../../utils/helpers";

function updateDateTime() {
  const displayElement = getElement<HTMLDivElement>("#datetime-display");

  if (displayElement) {
    const now = new Date();

    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const dateString = now.toLocaleDateString("de-DE", dateOptions);
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const timeString = now.toLocaleTimeString("de-DE", timeOptions);
    displayElement.textContent = `${dateString} - ${timeString}`;
  }
}

function estimateReadingTime(wordCount: number, wpm = 238): string {
  const s = Math.round((wordCount / wpm) * 60);
  const m = Math.floor(s / 60);
  return s < 30 ? "< 1 min read" : s < 60 ? "1 min read" : `${m} min read`;
}

const updateStats = debounce((editor: Editor, content: JSONContent) => {
  const charCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();

  const charCountEl = getElement("#char-count");
  charCountEl.innerText = charCount.toString();

  const wordCountEl = getElement("#word-count");
  if (wordCount === 1) {
    wordCountEl.innerText = "1 word";
  } else {
    wordCountEl.innerText = `${wordCount} words`;
  }
  const readingTimeEl = getElement("#reading-time");
  readingTimeEl.innerText = estimateReadingTime(wordCount);
  calculateToDos(content);
}, 1000);

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
  storageKey: keyof AppSettings; // single cache key
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

export { setUpEditorSettings, updateDateTime, updateStats };
