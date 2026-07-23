import { resetEditorHistory } from "@/components/editor/editor-features";
import { applyTagView } from "@/components/sidebar/sidebar-features";
import { ActiveCodeHighlight } from "@/extensions/codeblock-highlight";
import { SearchAndReplace } from "@/extensions/doc-search";
import { DropHandler } from "@/extensions/editor-handler/dropHandler";
import {
  GoogleDocsCleanup,
  PasteHandler,
  SecurityCleanup,
  WordCleanup,
} from "@/extensions/editor-handler/pasteHandler";
import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { Highlight } from "@/extensions/highlight";
import { InputRules } from "@/extensions/input-rules";
import { CustomHeading } from "@/extensions/overrides/headings";
import {
  CustomBlockMath,
  CustomInlineMath,
  handleMathClick,
} from "@/extensions/overrides/mathematics";
import { CustomUnderline } from "@/extensions/overrides/underline";
import { Placeholder } from "@/extensions/placeholder";
import { NoteTag } from "@/extensions/tag";
import { TextMetrics } from "@/extensions/text-metrics";
import { initTableOfContents } from "@/extensions/toc";
import { WikiLinkPreview } from "@/extensions/wikilinks/wikilink-preview";
import { WikiLink } from "@/extensions/wikilinks/wikilinks";
import { debouncedSaveNote, handleSelectNote } from "@/notes/note-actions";
import {
  noteStore,
  restoreSidebarScope,
  stateStore,
} from "@/settings/app-state";
import { requireElement } from "@/utils/dom";
import { createGlobalSpinner } from "@/utils/ui";
import {
  ALLOWED_PROTOCOLS,
  MAX_CHARACTERS,
  NODE_BASELINE,
  SHARED_KATEX_OPTIONS,
} from "@shared/constants";
import type { AppSettings } from "@shared/schemas/store-schema";
import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ListKit } from "@tiptap/extension-list";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
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
    Markdown.configure({ markedOptions: { gfm: true, pedantic: false } }),
    MasterShortcuts,
    InputRules,
    ListKit.configure({
      taskItem: { nested: true },
    }),
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
        const loading = createGlobalSpinner();
        await loading.wrap(async () => {
          await handleSelectNote(id);
        });
        restoreSidebarScope();
      },
    }),
    Placeholder,
    TextMetrics.configure({
      limit: MAX_CHARACTERS,
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
      HTMLAttributes: { loading: "lazy" },
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
    StarterKit.configure({
      codeBlock: {
        enableTabIndentation: true,
        HTMLAttributes: {
          spellcheck: false,
        },
      },
      heading: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      bulletList: false,
      underline: false,
      undoRedo: {
        depth: 20,
      },
      link: {
        openOnClick: false,
        defaultProtocol: "https",
        shouldAutoLink: () => {
          if (!editor) return true;
          return editor.state.doc.childCount <= NODE_BASELINE;
        },
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
        isAllowedUri: (url, ctx) => {
          if (!ctx.defaultValidate(url)) return false;
          try {
            // google as base path for relative path parsing
            const parsed = new URL(url, "https://google.com");
            return ALLOWED_PROTOCOLS.includes(parsed.protocol);
          } catch (error: unknown) {
            console.error("[link.configure]: Invalid URL");
            return false;
          }
        },
      },
      dropcursor: {
        width: 2,
        class: "editor-dropcursor",
      },
    }),
    ActiveCodeHighlight,
    CustomInlineMath.configure({
      onClick: handleMathClick,
      katexOptions: SHARED_KATEX_OPTIONS,
    }),
    CustomBlockMath.configure({
      onClick: handleMathClick,
      katexOptions: SHARED_KATEX_OPTIONS,
    }),
  ];
}

function getRequestExtensions() {
  return [
    ListKit.configure({
      taskItem: { nested: true },
    }),
    CustomUnderline,
    Highlight,
    WikiLink,
    Image,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    NoteTag,
    CustomHeading.configure({
      levels: [1, 2, 3, 4, 5, 6],
    }),
    StarterKit.configure({
      heading: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      bulletList: false,
      underline: false,
      trailingNode: false,
    }),
  ];
}

function setupEditorListeners(editorWrapper: HTMLDivElement, editor: Editor) {
  editorWrapper.addEventListener("contextmenu", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const cell = target.closest(".ProseMirror table .selectedCell");
    if (cell) {
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
  getRequestExtensions,
  initEditor,
  resetEditorHistory,
  setupEditorListeners,
};
