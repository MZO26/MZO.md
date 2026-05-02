import { calculateToDos } from "@/extensions/toDoBar";
import { debounce, getElement } from "@/utils/helpers";
import type { Editor, JSONContent } from "@tiptap/core";

function getContent(editor: Editor) {
  const plainText = editor.getText();
  const content = editor.getJSON();
  return { content, plainText };
}

function estimateReadingTime(wordCount: number, wpm = 238): string {
  const s = Math.round((wordCount / wpm) * 60);
  const m = Math.floor(s / 60);
  return s < 30 ? "< 1 min read" : s < 60 ? "1 min read" : `${m} min read`;
}

function updateStats(editor: Editor, content: JSONContent) {
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
}

const debouncedStatUpdate = debounce(updateStats, 1000);

export { debouncedStatUpdate, getContent };
