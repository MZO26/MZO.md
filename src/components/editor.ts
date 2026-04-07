import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { FileHandler } from "@tiptap/extension-file-handler";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import PlaceHolder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";

import { compressImage } from "../extensions/image";
import { lowlight } from "../extensions/lowlight";
import { NoteTag } from "../extensions/tag";
import { setupZoomBar, updateStats } from "./editorFooter";
import { setupToolbar } from "./editorHeader";

export let editor: Editor | null = null;

const initEditor = (selector: string): Editor => {
  const element = document.querySelector(selector);
  if (editor) {
    return editor;
  }
  if (!element) {
    console.error(`element with "${selector}" was not found.`);
    throw new Error(`element with "${selector}" was not found.`);
  }

  editor = new Editor({
    element: element as HTMLElement,
    extensions: [
      PlaceHolder.configure({
        placeholder: "Start writing your note...",
      }),
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

      FileHandler.configure({
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        onDrop: async (editor, files) => {
          for (const file of files) {
            const src = await compressImage(file);
            editor.chain().setImage({ src }).focus().run();
          }
        },
        onPaste: async (editor, files) => {
          for (const file of files) {
            const src = await compressImage(file);
            editor.chain().setImage({ src }).focus().run();
          }
        },
      }),
    ],
    editorProps: {
      handleDOMEvents: {
        dragover: (view, event) => {
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
      },
    },
    content: "",
    autofocus: true,
  });
  editor.on("update", async () => {
    if (!editor) return;
    const text = editor.getText();
    updateStats(text);
  });
  setupToolbar(editor);
  setupZoomBar();
  return editor;
};

window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

export { initEditor };
