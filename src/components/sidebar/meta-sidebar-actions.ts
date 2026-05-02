import { calculateToDos } from "@/extensions/todo-bar";
import { debounce, getElement } from "@/utils/helpers";
import type { Note } from "@shared/schemas/note-schema";
import type { Editor } from "@tiptap/core";

function updateNoteTags(tags: Note["tags"]) {
  const container = getElement(".tag-container");
  container.innerHTML = "";
  if (!tags || tags.length === 0) return;
  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.classList.add("tag", "searchTag");
    span.dataset["tag"] = String(tag);
    span.textContent = `#${tag}`;
    container.append(span);
  });
}

function updateStats(editor: Editor) {
  const content = editor.getJSON();
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

function estimateReadingTime(wordCount: number, wpm = 238): string {
  const s = Math.round((wordCount / wpm) * 60);
  const m = Math.floor(s / 60);
  return s < 30 ? "< 1 min read" : s < 60 ? "1 min read" : `${m} min read`;
}

const debouncedStatUpdate = debounce(updateStats, 300);

const debouncedTagUpdate = debounce(updateNoteTags, 300);

export { debouncedStatUpdate, debouncedTagUpdate };
