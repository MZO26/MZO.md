import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { processAndInsertImage } from "@/extensions/image/image";
import { lowlight } from "@/extensions/lowlight";
import { NoteTag } from "@/extensions/tag";
import { Typography } from "@/extensions/typography";
import { WikiLink } from "@/extensions/wikilinks";
import { handleSelectNote } from "@/features/note-actions";
import { sleep } from "@/utils/async";
import { findElement, requireElement } from "@/utils/dom";
import { useDelayedSpinner } from "@/utils/ui";
import { processWithLimit } from "@shared/limiter";
import type { AppSettings } from "@shared/schemas/store-schema";
import { Editor } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  CharacterCount,
  Focus,
  Placeholder,
  Selection,
} from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

let editor: Editor | null = null;

function initEditor(settings: AppSettings["spellcheck"]): Editor {
  const editorWrapper = requireElement<HTMLDivElement>("#editor");
  if (editor) {
    return editor;
  }
  editor = new Editor({
    element: editorWrapper,
    extensions: getNoteEditorExtensions(),
    editorProps: {
      attributes: {
        spellcheck: settings ? "true" : "false",
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
        const stopSpinner = useDelayedSpinner(100);
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
        const stopSpinner = useDelayedSpinner(100);
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
  return editor;
}

function getNoteEditorExtensions() {
  return [
    Markdown,
    MasterShortcuts,
    Typography,
    WikiLink.configure({
      onClick: async (id) => {
        const noteItem = findElement<HTMLDivElement>(
          `.note-item[data-id="${id}"]`,
        );
        if (!noteItem) return;
        handleSelectNote(noteItem);
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
    TableKit.configure({
      table: {
        resizable: true,
        allowTableNodeSelection: true,
        lastColumnResizable: true,
        handleWidth: 5,
        HTMLAttributes: { class: "table" },
      },
      tableHeader: {
        HTMLAttributes: { class: "th" },
      },
      tableCell: {
        HTMLAttributes: { class: "td" },
      },
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
