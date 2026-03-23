import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
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
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import js from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml"; // HTML ist in highlight.js unter 'xml'
import { createLowlight } from "lowlight";
import { FileHandler } from "../../node_modules/@tiptap/extension-file-handler/src/fileHandler";
import { compressImage } from "../utils/image";
import { setupZoomBar, updateStats } from "./editorFooter";
import { setupToolbar } from "./editorHeader";

let editor: Editor | null = null;

const lowlight = createLowlight();

lowlight.register("css", css);
lowlight.register("javascript", js);
lowlight.register("typescript", ts);
lowlight.register("html", html);
lowlight.register("python", python);
lowlight.register("java", java);
lowlight.registerAlias("javascript", "js");
lowlight.registerAlias("typescript", "ts");

const initEditor = (selector: string): Editor | null => {
  const element = document.querySelector(selector);
  if (editor) {
    return editor;
  }
  if (!element) {
    console.error(`element with "${selector}" was not found.`);
    return null;
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

// document.addEventListener("keydown", async (e) => {
//   if ((e.ctrlKey || e.metaKey) && e.key === "s") {
//     e.preventDefault();
//     const id = getSavedItemId();
//     if (id) {
//       const notes = await window.notesAPI.getAll();
//       const note = notes.find((n) => n.id === id);
//       updateNote(note.id, note.title, note.content);
//       console.log(`Note with ID ${note.id} successfully saved.`);
//     } else {
//       console.warn("No note found to save.");
//     }
//   }
// });
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

export { initEditor };
