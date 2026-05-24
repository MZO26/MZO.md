import { getManyById } from "@/api/api";
import { setSidebarState } from "@/components/sidebar/sidebar-state";
import { debounce } from "@/utils/async";
import { formatNoteDate } from "@/utils/date";
import { findElement, requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { DEBOUNCE_MS } from "@shared/constants";
import { getTodoStats } from "@shared/generators/generators";
import type { Note } from "@shared/schemas/note-schema";
import type { JSONContent } from "@tiptap/core";

function updateInfoHeader(date: Note["created_at"], title: Note["title"]) {
  const container = findElement<HTMLDivElement>(".info-sidebar-header");
  if (!container) return;
  container.replaceChildren();
  if (!date || !title) return;
  const formattedDate = formatNoteDate(date);
  const span = document.createElement("span");
  const h4 = document.createElement("h4");
  span.classList.add("info-span");
  span.textContent = formattedDate;
  h4.classList.add("note-title");
  h4.textContent = title.trim();
  h4.setAttribute("data-tippy-content", title.trim());
  container.append(span, h4);
}

function updateNoteTags(tags: Note["tags"]) {
  const container = findElement<HTMLDivElement>(".tag-container");
  if (!container) return;
  container.replaceChildren();
  if (!tags || tags.length === 0) return;
  for (const tag of tags) {
    const span = document.createElement("span");
    span.classList.add("tag", "searchTag");
    span.setAttribute("data-tippy-content", `Filter notes with: ${tag}`);
    span.setAttribute("data-tag", String(tag));
    span.textContent = `#${tag}`;
    container.append(span);
  }
}

async function updateNoteLinks(links: Note["links"]) {
  const container = findElement<HTMLDivElement>(".link-container");
  if (!container) return;
  container.replaceChildren();
  if (!links || links.length === 0) return;
  const ids: string[] = links.map((link) => link.id);
  const relatedNotes = await getManyById(ids);
  if (!relatedNotes.success) {
    console.error("Failed to fetch linked notes:", relatedNotes.error);
    return;
  }
  const linkMap = new Map<string, string>();
  for (const note of relatedNotes.data) {
    linkMap.set(note.id, note.title.trim());
  }
  for (const link of links) {
    const span = document.createElement("span");
    span.classList.add("link");
    span.setAttribute("data-link", link.id);
    span.textContent = `${link.dir}: ${linkMap.get(link.id) ?? link.id}`;
    container.append(span);
  }
}

async function updateStats(note: Note) {
  const editor = getAppItem("editor");
  const infoSidebar = findElement<HTMLDivElement>(".info-sidebar");
  const wordCountEl = findElement<HTMLSpanElement>("#word-count");
  const charCountEl = findElement<HTMLSpanElement>("#char-count");
  const readingTimeEl = findElement<HTMLSpanElement>("#reading-time");
  const charCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();
  if (!infoSidebar || !wordCountEl || !charCountEl || !readingTimeEl) return;
  charCountEl.textContent = charCount.toString();
  wordCountEl.textContent = wordCount === 1 ? "1 word" : `${wordCount} words`;
  readingTimeEl.textContent = estimateReadingTime(wordCount);
  showTodoProgress(note.content);
  updateNoteTags(note.tags);
  await updateNoteLinks(note.links);
  updateInfoHeader(note.created_at, note.title);
}

const debouncedUpdateStats = debounce(updateStats, DEBOUNCE_MS.slow);

function estimateReadingTime(wordCount: number, wpm = 238) {
  const s = Math.round((wordCount / wpm) * 60);
  const m = Math.floor(s / 60);
  return s < 30 ? "< 1 min read" : s < 60 ? "1 min read" : `${m} min read`;
}

function showTodoProgress(content: JSONContent) {
  const stats = getTodoStats(content);
  const container = requireElement<HTMLDivElement>(".todo-progress-container");
  if (stats.total === 0) {
    if (container.style.display !== "none") container.style.display = "none";
    return;
  }
  if (container.style.display !== "block") container.style.display = "block";
  const countLabel = requireElement<HTMLSpanElement>("#todo-count");
  const progressBar = requireElement<HTMLDivElement>("#todo-progress");
  if (countLabel) countLabel.innerText = `${stats.completed}/${stats.total}`;
  if (progressBar) {
    const percentage = (stats.completed / stats.total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor =
      percentage === 100 ? "var(--tag-color)" : "var(--text-muted)";
  }
}

function collapseInfoSidebar(infoSidebar: HTMLDivElement) {
  const collapsed = infoSidebar.classList.contains("collapsed");
  setSidebarState(infoSidebar, !collapsed);
}

export { collapseInfoSidebar, debouncedUpdateStats };
