import { Editor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
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
import { DragAutoScroll } from "../../extensions/autoScroll";
import BubbleMenuManager from "../../extensions/bubbleMenu";
import { CustomCodeBlockLowlight } from "../../extensions/languages";
import { lowlight } from "../../extensions/lowlight";
import { NoteTag } from "../../extensions/tag";
import { Typography } from "../../extensions/typography";
import { getElement } from "../../utils/helpers";
import { renderIcons } from "../../utils/icons";
import { updateStats } from "./editorFooter";

let editor: Editor | null = null;
const bubbleMenuElement = getElement(".bubble-menu");
const bubbleMenuManager = new BubbleMenuManager(bubbleMenuElement);

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
    const content = editor.getJSON();
    updateStats(editor, content);
  });
  renderIcons(bubbleMenuElement);
  bubbleMenuManager.attach(editor);
  return editor;
}

function getNoteEditorExtensions() {
  return [
    Typography,
    DragAutoScroll.configure({
      getScrollContainer: () => getElement(".editor-container"),
      edge: 60,
      maxSpeed: 10,
    }),
    BubbleMenu.configure({
      element: getElement(".bubble-menu") as HTMLElement,
      options: {
        placement: "top",
        offset: 15,
        flip: true,
        shift: true,
      },
      shouldShow: ({ editor, from, to }) => {
        if (from === to) return false;
        if (editor.isActive("image")) return false;
        const isDetails = editor.isActive("details");
        const isParagraph = editor.isActive("paragraph");
        const isCodeBlock = editor.isActive("codeBlock");
        const isInlineCode = editor.isActive("code");
        const isHeading = editor.isActive("heading");
        if (isDetails) {
          if (isParagraph || isCodeBlock || isHeading || isInlineCode) {
            return true;
          }
          return false;
        }
        return true;
      },
    }),
    Focus.configure({
      className: "has-focus",
      mode: "deepest",
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
    CustomCodeBlockLowlight.configure({
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
