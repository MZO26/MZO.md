import { debouncedStatUpdate } from "@/components/sidebar/info-sidebar-actions";
import { DragAutoScroll } from "@/extensions/autoscroll";
import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { lowlight } from "@/extensions/lowlight";
import { NoteTag } from "@/extensions/tag";
import { Typography } from "@/extensions/typography";
import { setGlobalEditor } from "@/services/state";
import { getElement } from "@/utils/helpers";
import { Editor } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  CharacterCount,
  Focus,
  Placeholder,
  Selection,
} from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

let editor: Editor | null = null;

function initEditor(selector: string): Editor {
  const element = document.querySelector(selector);
  if (editor) {
    return editor;
  }
  if (!element) {
    console.error(`(editor): element with "${selector}" was not found.`);
    throw new Error(`(editor): element with "${selector}" was not found.`);
  }

  editor = new Editor({
    element: element as HTMLElement,
    extensions: getNoteEditorExtensions(),
    editorProps: {
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
  editor.on("update", () => {
    if (!editor) return;
    debouncedStatUpdate(editor);
  });
  setGlobalEditor(editor);
  return editor;
}

function getNoteEditorExtensions() {
  return [
    MasterShortcuts,
    Typography,
    DragAutoScroll.configure({
      getScrollContainer: () => getElement(".editor-container"),
      edge: 60,
      maxSpeed: 10,
    }),
    Focus.configure({
      className: "has-focus",
      mode: "shallowest",
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
      link: false,
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
    Link.configure({
      openOnClick: true,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
      validate: (href) => !href.startsWith("appimg://"),
    }),
  ];
}

export { editor, getNoteEditorExtensions, initEditor };
