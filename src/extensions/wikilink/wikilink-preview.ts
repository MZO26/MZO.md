import { renderTags } from "@/components/sidebar/sidebar-note-items";
import { noteStore, stateStore } from "@/state/state";
import { formatNoteDate } from "@/utils/date";
import { createInfoSpan } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import type { NoteListItem } from "@shared/schemas/note-schema";
import { Extension } from "@tiptap/core";

function buildPreviewCard(
  updated_at: NoteListItem["updated_at"],
  tags: NoteListItem["tags"],
) {
  const cardContent = document.createElement("div");
  cardContent.className = "wikilink-preview-content";
  const dateVal = new Date(updated_at).getTime();
  if (!updated_at || isNaN(dateVal)) {
    cardContent.appendChild(createInfoSpan("Failed to load note metadata"));
    return cardContent;
  }
  if (Array.isArray(tags) && tags.length > 0) {
    const tagsContainer = document.createElement("div");
    tagsContainer.classList.add("note-tags");
    renderTags(tags, tagsContainer);
    cardContent.appendChild(tagsContainer);
  }
  const isoToDate = formatNoteDate(updated_at);
  cardContent.appendChild(createInfoSpan(`Last updated: ${isoToDate}`));
  return cardContent;
}

type PreviewHandlers = {
  over: (e: PointerEvent) => void;
  out: (e: PointerEvent) => void;
  down: (e: PointerEvent) => void;
};

export const WikiLinkPreview = Extension.create({
  name: "wikilinkPreview",

  addStorage() {
    return {
      wikilink: null as HTMLDivElement | null,
      timer: undefined as number | undefined,
      activeId: "",
      handlers: null as PreviewHandlers | null,
    };
  },

  onCreate() {
    const editor = getAppItem("editorWrapper");
    const element = document.createElement("div");
    element.className = "wikilink-preview hidden";
    document.body.appendChild(element);
    this.storage.wikilink = element;
    const hide = () => {
      this.storage.activeId = "";
      element.classList.add("hidden");
      element.replaceChildren();
    };
    const show = (wikilink: HTMLElement) => {
      const id = wikilink.dataset["id"];
      if (
        !id ||
        id === stateStore.get("activeId") ||
        this.storage.activeId === id
      )
        return;
      const targetNote = noteStore.get("noteIndex").get(id);
      if (!targetNote) {
        element.textContent = "Note not found";
      } else {
        const duplicates = noteStore
          .get("notes")
          .filter(
            (n) => n.title.toLowerCase() === targetNote.title.toLowerCase(),
          );
        if (duplicates.length > 1) {
          element.textContent = `Warning: ${duplicates.length} notes named "${targetNote.title}".`;
        } else {
          element.replaceChildren(
            buildPreviewCard(targetNote.updated_at, targetNote.tags),
          );
        }
      }
      this.storage.activeId = id;
      const rect = wikilink.getBoundingClientRect();
      element.style.left = `${rect.left + window.scrollX}px`;
      element.style.top = `${rect.bottom + window.scrollY + 8}px`;
      element.classList.remove("hidden");
    };
    const handlers: PreviewHandlers = {
      over: (e: PointerEvent) => {
        window.clearTimeout(this.storage.timer);
        if (!(e.target instanceof HTMLElement)) return;
        const linkEl = e.target.closest<HTMLElement>("[data-wikilink]");
        if (linkEl && this.storage.activeId !== linkEl.dataset["id"]) {
          this.storage.timer = window.setTimeout(() => show(linkEl), 300);
        }
      },
      out: (e: PointerEvent) => {
        if (!(e.relatedTarget instanceof HTMLElement)) return;
        const next = e.relatedTarget;
        if (next && (element.contains(next) || next.closest("[data-wikilink]")))
          return;
        window.clearTimeout(this.storage.timer);
        this.storage.timer = window.setTimeout(hide, 200);
      },
      down: () => {
        window.clearTimeout(this.storage.timer);
        hide();
      },
    };
    this.storage.handlers = handlers;
    editor.addEventListener("pointerover", handlers.over);
    editor.addEventListener("pointerout", handlers.out);
    editor.addEventListener("pointerdown", handlers.down);
    element.addEventListener("pointerover", handlers.over);
    element.addEventListener("pointerout", handlers.out);
  },

  onDestroy() {
    const editor = getAppItem("editorWrapper");
    const { wikilink, timer, handlers } = this.storage;
    window.clearTimeout(timer);
    if (handlers) {
      editor.removeEventListener("pointerover", handlers.over);
      editor.removeEventListener("pointerout", handlers.out);
      editor.removeEventListener("pointerdown", handlers.down);
      if (wikilink) {
        wikilink.removeEventListener("pointerover", handlers.over);
        wikilink.removeEventListener("pointerout", handlers.out);
      }
    }
    wikilink?.remove();
  },
});
