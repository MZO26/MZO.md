import {
  CustomTableCell,
  CustomTableHeader,
} from "@/extensions/custom-overrides";
import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { processAndInsertImage } from "@/extensions/image/image";
import { lowlight } from "@/extensions/lowlight";
import { CustomSearchHighlight } from "@/extensions/searchHighlight";
import { NoteTag } from "@/extensions/tag";
import { Typography } from "@/extensions/typography";
import { WikiLink } from "@/extensions/wikilinks";
import { debouncedSaveNote, handleSelectNote } from "@/notes/note-actions";
import { noteStore, stateStore } from "@/settings/app-state";
import { sleep } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { useDelayedSpinner } from "@/utils/ui";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import { processWithLimit } from "@shared/limiter";
import type { AppSettings } from "@shared/schemas/store-schema";
import { Editor } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableRow } from "@tiptap/extension-table";
import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  CharacterCount,
  Focus,
  Placeholder,
  Selection,
} from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { getEditorContent } from "./editor-features";

let editor: Editor | null = null;

function initEditor(settings: Partial<AppSettings>): Editor {
  const editorWrapper = requireElement<HTMLDivElement>("#editor");
  if (editor) {
    return editor;
  }
  editor = new Editor({
    element: editorWrapper,
    extensions: getNoteEditorExtensions(),
    editorProps: {
      attributes: {
        spellcheck: settings.spellcheck ? "true" : "false",
      },
      transformPastedHTML(html) {
        return DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
      },
      handleDrop(view, event, _slice, moved) {
        if (!editor || !event.dataTransfer?.files?.length || moved)
          return false;
        const images = Array.from(event.dataTransfer.files).filter((f: File) =>
          f.type.startsWith("image/"),
        );
        if (images.length === 0) return false;
        event.preventDefault();
        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (coordinates) {
          editor.commands.setTextSelection(coordinates.pos);
        }
        const stopSpinner = useDelayedSpinner();
        void processWithLimit(images, 1, async (file) => {
          await sleep(1000);
          await processAndInsertImage(file, editor!);
        }).finally(() => {
          if (stopSpinner) stopSpinner();
        });

        return true;
      },
      handlePaste(_view, event) {
        if (!editor || !event.clipboardData?.files?.length) return false;
        const images = Array.from(event.clipboardData.files).filter((f: File) =>
          f.type.startsWith("image/"),
        );
        if (images.length === 0) return false;
        event.preventDefault();
        const stopSpinner = useDelayedSpinner();
        void processWithLimit(images, 1, async (file) => {
          await sleep(1000);
          await processAndInsertImage(file, editor!);
        }).finally(() => {
          if (stopSpinner) stopSpinner();
        });
        return true;
      },
    },
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    autofocus: true,
  });
  editor.on("update", () => {
    const activeId = stateStore.getState().activeId;
    if (!activeId) return;
    const editorContent = getEditorContent();
    debouncedSaveNote(activeId, editorContent, false);
  });
  return editor;
}

function getNoteEditorExtensions() {
  return [
    CustomSearchHighlight,
    Markdown.configure({ markedOptions: { gfm: true } }),
    MasterShortcuts,
    Typography,
    WikiLink.configure({
      onClick: async (id) => {
        const noteExists = noteStore.get("notes").some((n) => n.id === id);
        if (!noteExists) {
          console.error("[Wikilink configure]: Note not found.");
          return;
        }
        handleSelectNote(id);
      },
      getLabel: (id) => {
        const note = noteStore.get("notes").find((n) => n.id === id);
        return note?.title ?? id;
      },
    }),
    Focus.configure({
      className: "has-focus",
      mode: "all",
    }),
    Placeholder.configure({
      placeholder: "Start writing...",
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
      includeChildren: false,
    }),
    CharacterCount.configure({
      textCounter: (text) => {
        const chars = text.match(/[\p{L}\p{N}]/gu);
        return chars ? chars.length : 0;
      },
      wordCounter: (text) => {
        const words = text.match(/[\p{L}\d]+(?:['’]\p{L}+)*/gu);
        return words ? words.length : 0;
      },
    }),
    Selection.configure({
      className: "editor-selection-blur",
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Image.configure({
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ["bottom-right"],
        minWidth: 50,
        minHeight: 50,
        alwaysPreserveAspectRatio: true,
      },
    }),
    NoteTag,
    TextStyleKit.configure({
      fontSize: {
        types: ["textStyle", "paragraph", "heading", "code", "codeBlock"],
      },
      backgroundColor: false,
    }),
    Table.configure({
      resizable: true,
      allowTableNodeSelection: true,
      lastColumnResizable: true,
      handleWidth: 5,
      HTMLAttributes: { class: "table" },
    }),
    TableRow,
    CustomTableHeader.configure({
      HTMLAttributes: { class: "th" },
    }),
    CustomTableCell.configure({
      HTMLAttributes: { class: "td" },
    }),
    Highlight.configure({ multicolor: true }),
    StarterKit.configure({
      codeBlock: false,
      link: {
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
        validate: (href) => {
          const protocolMatch = href.match(/^([a-zA-Z0-9\+\-\.]+):/);
          if (!protocolMatch) {
            return true;
          }
          const protocol = protocolMatch[0].toLowerCase();
          const allowedProtocols = [
            "http:",
            "https:",
            "mailto:",
            "tel:",
            "appimg:",
          ];
          return allowedProtocols.includes(protocol);
        },
      },
      dropcursor: {
        color: "var(--accent-primary)",
        width: 2,
        class: "editor-dropcursor",
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      enableTabIndentation: true,
      HTMLAttributes: {
        spellcheck: "false",
      },
    }),
  ];
}

function setupEditorListeners(editorWrapper: HTMLDivElement, editor: Editor) {
  editorWrapper.addEventListener("contextmenu", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".ProseMirror") && target.closest("table")) {
      e.preventDefault();
      window.electronAPI.showContextMenu("table");
    }
  });
  editorWrapper.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const target = event.target as HTMLImageElement;
      if (target && target.tagName === "IMG") {
        const pos = editor.view.posAtDOM(target, 0);
        if (pos !== null) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: pos, to: pos + 1 })
            .run();
        }
      }
    },
    true,
  );
}

export { editor, getNoteEditorExtensions, initEditor, setupEditorListeners };
