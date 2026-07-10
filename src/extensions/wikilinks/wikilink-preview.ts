import { getNoteById } from "@/api/api";
import { getNoteEditorExtensions } from "@/components/editor/editor-init";
import { noteStore, stateStore } from "@/settings/app-state";
import { getAppItem } from "@/utils/registry";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import type { Note } from "@shared/schemas/note-schema";
import { Extension, generateHTML } from "@tiptap/core";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import { delegate, type DelegateInstance, type Instance } from "tippy.js";

function highlightCodeBlocks(root: ParentNode) {
  root.querySelectorAll("pre code").forEach((el) => {
    hljs.highlightElement(el as HTMLElement);
  });
}

type PreviewInstance = Instance & {
  state: { isDataFetched?: boolean; isFetching?: boolean };
};

function buildPreviewCard(content: Note["content"]) {
  const card = document.createElement("div");
  card.className = "wikilink-preview";
  const cardContent = document.createElement("div");
  cardContent.className = "wikilink-preview-content";
  const html = generateHTML(content, getNoteEditorExtensions());
  const sanitized = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
  if (sanitized) {
    cardContent.innerHTML = sanitized;
    highlightCodeBlocks(cardContent);
  }
  const hasText = (cardContent.textContent || "").trim().length > 0;
  const hasMedia = cardContent.querySelectorAll("img, hr").length > 0;
  if (!hasText && !hasMedia) {
    cardContent.replaceChildren();
    cardContent.textContent = "Empty Note";
    card.classList.add("is-empty");
  } else card.classList.remove("is-empty");
  card.append(cardContent);
  return card;
}

export const WikiLinkPreview = Extension.create({
  name: "wikilinkPreview",

  addStorage() {
    return {
      tippyDelegate: null as DelegateInstance | null,
    };
  },

  onCreate() {
    const editorElement = getAppItem("editorWrapper");
    this.storage.tippyDelegate = delegate(editorElement, {
      target: "[data-wikilink]",
      interactive: true,
      delay: [300, 50],
      theme: "preview-theme",
      appendTo: () => document.body,
      placement: "bottom-start",
      maxWidth: "none",
      content: "",
      onShow: (instance: PreviewInstance) => {
        if (instance.state.isDataFetched || instance.state.isFetching) {
          console.log("Doesn't need re-fetch.");
          return;
        }
        const el = instance.reference as HTMLElement | null;
        const id = (el?.getAttribute("data-id") || "").trim();
        if (!id) return false;
        const notes = noteStore.get("notes");
        const targetNote = notes.find((n) => n.id === id);
        if (!targetNote) return false;
        const activeId = stateStore.get("activeId");
        if (targetNote.id === activeId) {
          instance.setContent("Can't reference the same note.");
          return;
        }
        const matchingNotes = notes.filter(
          (n) => n.title.toLowerCase() === targetNote.title.toLowerCase(),
        );
        if (matchingNotes.length > 1) {
          instance.setContent(
            `Warning: There are ${matchingNotes.length} notes named "${targetNote.title}".`,
          );
          return;
        }
        instance.state.isFetching = true;
        const loadPreviewData = async () => {
          try {
            const result = await getNoteById(id);
            if (instance.state.isDestroyed) return;
            if (!result.success) {
              instance.setContent("Note not found");
              instance.state.isDataFetched = true;
              return;
            }
            const activeId = stateStore.get("activeId");
            if (result.data.id === activeId) {
              instance.state.isDataFetched = true;
              instance.hide();
              return;
            }
            instance.setContent(buildPreviewCard(result.data.content));
            instance.state.isDataFetched = true;
          } finally {
            if (!instance.state.isDestroyed) {
              instance.state.isFetching = false;
            }
          }
        };
        loadPreviewData();
        return;
      },
    });
  },
  onDestroy() {
    this.storage.tippyDelegate?.destroy();
    this.storage.tippyDelegate = null;
  },
});
