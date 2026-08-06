import { rendererLogger } from "@/app";
import { initEditorSearch } from "@/components/editor/editor-search";
import {
  applyView,
  restoreSidebarScope,
} from "@/components/sidebar/sidebar-views";
import { ActiveCodeHighlight } from "@/extensions/codeblock-highlight";
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
import {
  CustomBlockMath,
  CustomInlineMath,
} from "@/extensions/mathematics/mathematics";
import { handleMathClick } from "@/extensions/mathematics/mathematics-dialog";
import { CustomHeading } from "@/extensions/overrides/headings";
import { CustomUnderline } from "@/extensions/overrides/underline";
import { Placeholder } from "@/extensions/placeholder";
import { DocSearch } from "@/extensions/search-replace";
import { NoteTagHandler } from "@/extensions/tag/tag-handler";
import { TextMetrics } from "@/extensions/text-metrics";
import { initTableOfContents } from "@/extensions/toc";
import { WikilinkHandler } from "@/extensions/wikilink/wikilink-handler";
import { WikiLinkPreview } from "@/extensions/wikilink/wikilink-preview";
import {
  debouncedSaveNote,
  handleSelectNote,
  waitForFlush,
} from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
import { requireElement } from "@/utils/dom";
import { getAppItem } from "@/utils/registry";
import { createGlobalSpinner } from "@/utils/ui";
import { SHARED_KATEX_OPTIONS } from "@shared/constants/config-constants";
import {
  ALLOWED_PROTOCOLS,
  MAX_CHARACTERS,
  NODE_BASELINE,
} from "@shared/constants/renderer-constants";
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

export const updateToc = initTableOfContents();

function initEditor(settings: Partial<AppSettings>): Editor {
  const editorWrapper = requireElement<HTMLDivElement>("#editor");
  const editor = new Editor({
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
    WikilinkHandler.configure({
      onClick: async (id) => {
        const noteExists = noteStore.get("noteIndex").has(id);
        if (!noteExists) {
          rendererLogger.devLog("[Wikilink configure]: Note not found.");
          return;
        }
        const loading = createGlobalSpinner();
        await loading.wrap(async () => {
          await handleSelectNote(id);
        });
        restoreSidebarScope();
      },
    }),
    WikiLinkPreview,
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
    NoteTagHandler.configure({
      onClick: async (id: string) => {
        const normalizedTag = id?.trim().toLowerCase();
        const activeId = stateStore.get("activeId");
        if (!normalizedTag || !activeId) return;
        const saved = await waitForFlush(activeId);
        if (!saved) return;
        await applyView(normalizedTag);
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
          const editor = getAppItem("editor");
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
            rendererLogger.appError("[link.configure]: Invalid URL");
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
    DocSearch,
  ];
}

function setupEditorListeners(editorWrapper: HTMLDivElement, editor: Editor) {
  editorWrapper.addEventListener("contextmenu", (event: MouseEvent) => {
    if (!(event.target instanceof HTMLImageElement)) return;
    if (event.target.closest(".selectedCell")) {
      event.preventDefault();
      window.electronAPI.showContextMenu("table");
    }
  });
  editorWrapper.addEventListener(
    "error",
    (event: ErrorEvent) => {
      if (!(event.target instanceof HTMLImageElement)) return;
      if (event.target.tagName === "IMG") {
        const pos = editor.view.posAtDOM(event.target, 0);
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
  initEditorSearch(editor);
}

export { getNoteEditorExtensions, initEditor, setupEditorListeners };
