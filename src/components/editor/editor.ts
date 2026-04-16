import { Editor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import Focus from "@tiptap/extension-focus";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { DragAutoScroll } from "../../extensions/autoScroll";
import BubbleMenuManager from "../../extensions/bubbleMenu";
import { lowlight } from "../../extensions/lowlight";
import { Placeholder } from "../../extensions/placeholder";
import { NoteTag } from "../../extensions/tag";
import { Typography } from "../../extensions/typography";
import { getElement } from "../../utils/helpers";
import { updateStats } from "./editorFooter";
import { PositionManager } from "./editorHandlers";

let editor: Editor | null = null;
const bubbleMenuElement = getElement(".bubble-menu");
const positionManager = new PositionManager();
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
      handleDOMEvents: {
        dragover: (view, event) => {
          if (event.dataTransfer?.types?.includes("Files")) {
            event.dataTransfer.dropEffect = "none";
            event.preventDefault();

            return true;
          }
          const editorBounds = view.dom.getBoundingClientRect();
          const mouseNextToTop = event.clientY - editorBounds.top;
          if (mouseNextToTop < 40) {
            const scrollContainer = view.dom.parentElement;
            scrollContainer?.scrollBy({
              top: -10,
              behavior: "auto",
            });
          }
          return false;
        },
        dragenter: (_view, event) => {
          if (event.dataTransfer?.types?.includes("Files")) {
            event.dataTransfer.dropEffect = "none";
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    autofocus: true,
  });
  editor.on("update", async () => {
    if (!editor) return;
    const text = editor.getText();
    updateStats(text);
  });
  bubbleMenuManager.attach(editor);
  return editor;
}

function getNoteEditorExtensions() {
  return [
    Typography,
    Details,
    DetailsSummary,
    DetailsContent,
    DragAutoScroll.configure({
      getScrollContainer: () => getElement(".editor-container"),
      edge: 60,
      maxSpeed: 10,
    }),
    TextAlign.configure({
      types: ["heading", "paragraph", "blockquote", "listItem", "codeBlock"],
      alignments: ["start", "center", "end", "justify"],
      defaultAlignment: "start",
    }),
    BubbleMenu.configure({
      element: document.querySelector(".bubble-menu") as HTMLElement,
      options: {
        placement: "top",
        offset: 15,
        flip: true,
        shift: true,
      },
      shouldShow: ({ from, to }) => from !== to,
    }),
    Focus.configure({
      className: "has-focus",
      mode: "shallowest",
    }),
    Placeholder,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Image.configure({
      allowBase64: true,
      resize: {
        enabled: true,
        directions: ["right"],
        minWidth: 100,
        alwaysPreserveAspectRatio: true,
      },
    }),
    NoteTag,
    Table.configure({
      resizable: true,
      allowTableNodeSelection: true,
      lastColumnResizable: true,
      handleWidth: 5,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Highlight.configure({ multicolor: true }),
    StarterKit.configure({
      codeBlock: false,
      link: false,
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
    }),
  ];
}

window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

export { editor, getNoteEditorExtensions, initEditor, positionManager };
