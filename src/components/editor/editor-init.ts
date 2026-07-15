import {
  getPlainTextFromJson,
  resetEditorHistory,
} from "@/components/editor/editor-features";
import { applyTagView } from "@/components/sidebar/sidebar-features";
import { Callout } from "@/extensions/callout";
import { SearchAndReplace } from "@/extensions/docSearch";
import { DropHandler } from "@/extensions/editor-handler/dropHandler";
import {
  GoogleDocsCleanup,
  PasteHandler,
  SecurityCleanup,
  WordCleanup,
} from "@/extensions/editor-handler/pasteHandler";
import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { Highlight } from "@/extensions/highlight";
import { DateInputRules, InputRules } from "@/extensions/input-rules";
import { lowlight } from "@/extensions/lowlight";
import { CustomHeading } from "@/extensions/overrides/headings";
import { handleMathClick } from "@/extensions/overrides/mathematics";
import { CustomUnderline } from "@/extensions/overrides/underline";
import { initTableOfContents } from "@/extensions/tableOfContents";
import { NoteTag } from "@/extensions/tag";
import { WikiLinkPreview } from "@/extensions/wikilinks/wikilink-preview";
import { WikiLink } from "@/extensions/wikilinks/wikilinks";
import { debouncedSaveNote, handleSelectNote } from "@/notes/note-actions";
import {
  noteStore,
  restoreSidebarScope,
  stateStore,
} from "@/settings/app-state";
import { requireElement } from "@/utils/dom";
import { KATEX_MACROS } from "@shared/constants";
import type { AppSettings } from "@shared/schemas/store-schema";
import { Editor } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { ListKit } from "@tiptap/extension-list";
import Mathematics from "@tiptap/extension-mathematics";
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
import "katex/dist/katex.min.css";

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
    },
    autofocus: true,
  });
  editor.on("update", ({ transaction }) => {
    if (!transaction.docChanged) return;
    const activeId = stateStore.get("activeId");
    if (!activeId) return;
    debouncedSaveNote(activeId, false);
  });
  return editor;
}

function getNoteEditorExtensions() {
  return [
    SearchAndReplace,
    PasteHandler,
    GoogleDocsCleanup,
    WordCleanup,
    SecurityCleanup,
    DropHandler,
    Markdown.configure({ markedOptions: { gfm: true } }),
    MasterShortcuts,
    InputRules,
    DateInputRules,
    ListKit.configure({
      taskItem: { nested: true },
    }),
    Callout,
    CustomUnderline,
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
        restoreSidebarScope();
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
      textCounter: (text) => text.length,
      wordCounter: (text) => {
        text = text.trim();
        return text ? text.split(/\s+/).length : 0;
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
          try {
            // google as base path for relative path parsing
            const parsed = new URL(url, "https://google.com");
            return ["https:", "appimg:"].includes(parsed.protocol);
          } catch (error: unknown) {
            console.error("[link.configure]: Invalid URL");
            return false;
          }
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
    Mathematics.configure({
      inlineOptions: {
        onClick: handleMathClick,
      },
      blockOptions: {
        onClick: handleMathClick,
      },
      katexOptions: {
        output: "htmlAndMathml",
        maxExpand: 500,
        maxSize: 12,
        trust: false,
        throwOnError: false,
        macros: { ...KATEX_MACROS },
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
