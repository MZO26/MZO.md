import { rendererLogger } from "@/app";
import {
  applyView,
  restoreSidebarScope,
} from "@/components/sidebar/sidebar-views";
import { SelectionHighlight } from "@/extensions/active-highlight";
import { DropHandler } from "@/extensions/editor-handler/drop-handler";
import { MasterShortcuts } from "@/extensions/editor-handler/editor-shortcuts";
import {
  GoogleDocsCleanup,
  PasteHandler,
  SecurityCleanup,
  WordCleanup,
} from "@/extensions/editor-handler/paste-handler";
import {
  KbSelectionCommands,
  SelectionWrapper,
} from "@/extensions/editor-handler/selection-wrappers";
import { Highlight } from "@/extensions/highlight";
import { InputRules } from "@/extensions/input-rules";
import { NoteInfoWidget } from "@/extensions/note-info";
import { CodeblockHandler } from "@/extensions/overrides/codeblock/codeblock-handler";
import { lowlight } from "@/extensions/overrides/codeblock/lowlight";
import { CustomHeading } from "@/extensions/overrides/headings";
import { LinkWithTitle } from "@/extensions/overrides/link";
import {
  CustomBlockMath,
  CustomInlineMath,
} from "@/extensions/overrides/mathematics/mathematics";
import { handleMathClick } from "@/extensions/overrides/mathematics/mathematics-dialog";
import { CustomUnderline } from "@/extensions/overrides/underline";
import { Placeholder } from "@/extensions/placeholder";
import { DocSearch } from "@/extensions/search-replace";
import { NoteTagHandler } from "@/extensions/tag/tag-handler";
import { TextMetrics } from "@/extensions/text-metrics";
import { initTableOfContents } from "@/extensions/toc";
import {
  resolveGhostLink,
  WikilinkHandler,
} from "@/extensions/wikilink/wikilink-handler";
import {
  debouncedSaveNote,
  handleSelectNote,
  waitForFlush,
} from "@/notes/note-actions";
import { noteStore, stateStore } from "@/state/state";
import { NODE_BASELINE, SHARED_KATEX_OPTIONS } from "@/utils/constants";
import { requireElement } from "@/utils/dom";
import { useCore } from "@/utils/registry";
import { createGlobalSpinner } from "@/utils/ui";
import { isNoteID, type Id } from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import { ALLOWED_PROTOCOLS, MAX_CHARACTERS } from "@shared/shared-constants";
import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
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

function initEditor(settings: Partial<Readonly<AppSettings>>): Editor {
  const editorWrapper = requireElement<HTMLDivElement>("#editor");
  const editor = new Editor({
    element: editorWrapper,
    extensions: getNoteEditorExtensions(),
    editorProps: {
      attributes: {
        spellcheck: settings.spellcheck ? "true" : "false",
      },
    },
    parseOptions: { preserveWhitespace: "full" },
    autofocus: true,
    onFocus: () => {
      if (stateStore.get("hoverId") !== null) {
        rendererLogger.devLog("Resetting hover");
        stateStore.setState({ hoverId: null });
      }
    },
  });
  editor.on("update", ({ transaction }) => {
    if (!transaction.docChanged) return;
    const activeId = stateStore.get("activeId") as Id | null;
    if (!activeId) return;
    if (!stateStore.get("isDirty")) stateStore.setState({ isDirty: true });
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
    Markdown,
    MasterShortcuts,
    InputRules,
    CustomUnderline,
    Highlight,
    WikilinkHandler.configure({
      onClick: async (id, title) => {
        if (!id || !isNoteID(id)) {
          const activeId = stateStore.get("activeId") as Id | null;
          if (!activeId) return;
          // don't navigate right away to update
          // wikilink to an active one
          const noteId = await resolveGhostLink(title);
          if (!noteId) return;
          await handleSelectNote(noteId);
          restoreSidebarScope();
          return;
        }
        const noteExists = noteStore.get("noteIndex").has(id);
        if (!noteExists) {
          rendererLogger.devLog("[Wikilink configure]: Note not found.");
          return;
        }
        const loading = createGlobalSpinner();
        await loading.wrap(() => handleSelectNote(id));
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
    NoteTagHandler.configure({
      onClick: async (id: string) => {
        const normalizedTag = id?.trim().toLowerCase();
        const { activeId, isDirty } = stateStore.getState();
        if (!normalizedTag || !activeId) return;
        const saved = isDirty ? await waitForFlush(activeId) : true;
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
      codeBlock: false,
      heading: false,
      underline: false,
      undoRedo: {
        depth: 20,
      },
      link: false,
      dropcursor: {
        width: 2,
        class: "editor-dropcursor",
      },
    }),
    LinkWithTitle.configure({
      openOnClick: false,
      defaultProtocol: "https",
      shouldAutoLink: () => {
        const { editor } = useCore("editor");
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
    }),
    CodeBlockLowlight.configure({
      lowlight,
      enableTabIndentation: true,
      tabSize: 2,
      defaultLanguage: "plaintext",
      HTMLAttributes: {
        spellcheck: false,
      },
    }),
    CodeblockHandler,
    CustomInlineMath.configure({
      onClick: handleMathClick,
      katexOptions: SHARED_KATEX_OPTIONS,
    }),
    CustomBlockMath.configure({
      onClick: handleMathClick,
      katexOptions: SHARED_KATEX_OPTIONS,
    }),
    DocSearch,
    SelectionWrapper,
    KbSelectionCommands,
    SelectionHighlight,
    NoteInfoWidget,
  ];
}

function setupEditorListeners(editorWrapper: HTMLDivElement, editor: Editor) {
  editorWrapper.addEventListener("contextmenu", (event: MouseEvent) => {
    if (!(event.target instanceof HTMLElement)) return;
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
}

export { getNoteEditorExtensions, initEditor, setupEditorListeners };
