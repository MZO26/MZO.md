import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { processAndInsertImage } from "@/extensions/image/image";
import { lowlight } from "@/extensions/lowlight";
import { NoteTag } from "@/extensions/tag";
import { Typography } from "@/extensions/typography";
import { WikiLink } from "@/extensions/wikilinks";
import { handleSelectNote } from "@/features/note-actions";
import { findElement, requireElement } from "@/utils/dom";
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

function initEditor(): Editor {
  const editorWrapper = requireElement("#editor");
  if (editor) {
    return editor;
  }
  editor = new Editor({
    element: editorWrapper,
    extensions: getNoteEditorExtensions(),
    editorProps: {
      handleDrop(view, event, _slice, moved) {
        if (!editor) return false;
        if (!moved && event.dataTransfer?.files?.length) {
          event.preventDefault();
          const pos =
            view.posAtCoords({ left: event.clientX, top: event.clientY })
              ?.pos ?? view.state.doc.content.size;
          let handled = false;
          for (const file of event.dataTransfer.files) {
            if (file.type.startsWith("image/")) {
              processAndInsertImage(file, editor, pos);
              handled = true;
            }
          }
          return handled;
        }
        return false;
      },
      handlePaste(view, event) {
        if (!editor) return false;
        if (event.clipboardData?.files?.length) {
          const pos = view.state.selection.to;

          let handled = false;
          for (const file of event.clipboardData.files) {
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              processAndInsertImage(file, editor, pos);
              handled = true;
            }
          }
          return handled;
        }
        return false;
      },
      attributes: {
        spellcheck: "false",
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
        const noteItem = findElement<HTMLDivElement>(`div[data-id="${id}"]`);
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
        directions: ["top", "bottom", "left", "right"],
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

export { editor, getNoteEditorExtensions, initEditor };
