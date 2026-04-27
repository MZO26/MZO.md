import { Editor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import TableOfContents from "@tiptap/extension-table-of-contents";
import TextAlign from "@tiptap/extension-text-align";
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
import {
  CustomCodeBlockLowlight,
  updateDetectCodeLanguage,
} from "../../extensions/languages";
import { lowlight } from "../../extensions/lowlight";
import { NoteTag } from "../../extensions/tag";
import { debouncedToDoUpdate } from "../../extensions/toDoBar";
import { Typography } from "../../extensions/typography";
import { getElement } from "../../utils/helpers";
import { renderIcons } from "../../utils/icons";
import { setupZoomBar, updateStats } from "./editorFooter";
import { setupToolbar } from "./editorHeader";

let editor: Editor | null = null;
let seenSlugs = new Map<string, number>();
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
    debouncedToDoUpdate(content);
    updateDetectCodeLanguage(editor);
    updateStats(editor);
  });
  renderIcons(bubbleMenuElement);
  bubbleMenuManager.attach(editor);
  setupToolbar(editor);
  setupZoomBar();
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
      types: [
        "heading",
        "paragraph",
        "blockquote",
        "listItem",
        "codeBlock",
        "details",
      ],
      alignments: ["start", "center", "end", "justify"],
      defaultAlignment: "start",
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
    TableOfContents.configure({
      getId: (textContent) => {
        const slug = textContent
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "");
        const count = seenSlugs.get(slug) || 0;
        seenSlugs.set(slug, count + 1);
        return count === 0 ? slug : `${slug}-${count}`;
      },
      onUpdate: (data) => {
        const container = getElement("#toc-list");
        container.innerHTML = "";

        data.forEach((heading) => {
          const item = document.createElement("button");
          item.className = `toc-item toc-level-${heading.level}`;
          item.innerText = heading.textContent;

          item.onclick = () => {
            if (!editor) return;
            heading.dom?.scrollIntoView({ behavior: "smooth", block: "start" });
            editor.commands.setTextSelection(heading.pos + 1);

            editor.commands.focus();
          };

          container.appendChild(item);
        });
        seenSlugs.clear();
      },
      anchorTypes: ["heading"],
      scrollParent: () => editor?.view.dom ?? window,
    }),
  ];
}

export { editor, getNoteEditorExtensions, initEditor };
