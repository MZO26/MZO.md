import {
  getPlainTextFromJson,
  inEditorSearch,
  resetEditorHistory,
} from "@/components/editor/editor-features";
import { applyTagView } from "@/components/sidebar/sidebar-features";
import { Annotation } from "@/extensions/annotation";
import { DetailsBlock } from "@/extensions/details";
import { SearchAndReplace } from "@/extensions/docSearch";
import { DropHandler } from "@/extensions/editor-handler/dropHandler";
import { PasteHandler } from "@/extensions/editor-handler/pasteHandler";
import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { Highlight } from "@/extensions/highlight";
import { lowlight } from "@/extensions/lowlight";
import { CustomHeading } from "@/extensions/overrides/headings";
import { CustomUnderline } from "@/extensions/overrides/underline";
import {
  getTableOfContents,
  initTableOfContents,
} from "@/extensions/tableOfContents";
import { NoteTag } from "@/extensions/tag";
import { Typography } from "@/extensions/typography";
import { WikiLinkPreview } from "@/extensions/wikilinks/wikilink-preview";
import { WikiLink } from "@/extensions/wikilinks/wikilinks";
import {
  debouncedSaveNote,
  handleSelectNote,
  isAutoExportEnabled,
} from "@/notes/note-actions";
import { noteStore, stateStore } from "@/settings/app-state";
import { requireElement } from "@/utils/dom";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import type { AppSettings } from "@shared/schemas/store-schema";
import { Editor } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { ListKit } from "@tiptap/extension-list";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import {
  CharacterCount,
  Focus,
  Placeholder,
  TrailingNode,
} from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";

let editor: Editor | null = null;

export const updateToc = initTableOfContents();

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
    },
    autofocus: true,
  });
  editor.on("update", ({ editor, transaction }) => {
    if (!transaction.docChanged) return;
    const activeId = stateStore.get("activeId");
    const activeNote = noteStore.get("activeNote");
    if (!activeId || !activeNote) return;
    const content = editor.getJSON();
    const text = editor.getText();
    const markdown = isAutoExportEnabled() ? editor.getMarkdown() : undefined;
    debouncedSaveNote(activeId, content, text, markdown, false);
    const currentHeadings = getTableOfContents(editor);
    updateToc(currentHeadings);
  });

  inEditorSearch(editor);
  return editor;
}

function getNoteEditorExtensions() {
  return [
    SearchAndReplace,
    PasteHandler,
    DropHandler,
    Markdown.configure({ markedOptions: { gfm: true } }),
    MasterShortcuts,
    Typography,
    ListKit.configure({
      taskItem: { nested: true },
    }),
    CustomUnderline,
    DetailsBlock,
    Annotation,
    Highlight,
    WikiLinkPreview,
    WikiLink.configure({
      onClick: async (id) => {
        const noteExists = noteStore.get("notes").some((n) => n.id === id);
        if (!noteExists) {
          console.error("[Wikilink configure]: Note not found.");
          return;
        }
        handleSelectNote(id);
      },
    }),
    Focus.configure({
      className: "has-focus",
      mode: "all",
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return "Untitled";
        }
        return "Start writing...";
      },
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
    NoteTag.configure({
      onClick: (id: string) => {
        applyTagView(id);
      },
    }),
    Table.configure({
      resizable: true,
      allowTableNodeSelection: true,
      lastColumnResizable: true,
      handleWidth: 5,
      HTMLAttributes: { class: "table" },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: { class: "th" },
    }),
    TableCell.configure({
      HTMLAttributes: { class: "td" },
    }),
    CustomHeading.configure({
      levels: [1, 2, 3, 4, 5, 6],
    }),
    TrailingNode.configure({
      node: "paragraph",
      notAfter: ["paragraph"],
    }),
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      bulletList: false,
      underline: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
        isAllowedUri: (url, ctx) => {
          if (!ctx.defaultValidate(url)) {
            return false;
          }
          const protocolMatch = url.match(/^([a-zA-Z0-9+.-]+):/);
          if (!protocolMatch) {
            return true;
          }
          const protocol = protocolMatch[1]?.toLowerCase();
          return protocol === "https" || protocol === "appimg";
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
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(".ProseMirror") && target.closest("table")) {
      e.preventDefault();
      window.electronAPI.showContextMenu("table");
    }
  });
  editorWrapper.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const target = event.target as HTMLImageElement | null;
      if (!target) return;
      if (target.tagName === "IMG") {
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

export {
  editor,
  getNoteEditorExtensions,
  getPlainTextFromJson,
  initEditor,
  resetEditorHistory,
  setupEditorListeners,
};
