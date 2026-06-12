import { handleSearchInput } from "@/components/sidebar/sidebar-features";
import {
  CustomTableCell,
  CustomTableHeader,
} from "@/extensions/custom-overrides";
import { SearchAndReplace } from "@/extensions/docSearch";
import { MasterShortcuts } from "@/extensions/editor-shortcuts";
import { processAndInsertImage } from "@/extensions/image/image";
import { lowlight } from "@/extensions/lowlight";
import { NoteTag } from "@/extensions/tag";
import { Typography } from "@/extensions/typography";
import { WikiLink } from "@/extensions/wikilinks";
import { debouncedSaveNote, handleSelectNote } from "@/notes/note-actions";
import { isMirrorEnabled } from "@/notes/note-conflict";
import { noteStore, stateStore } from "@/settings/app-state";
import { sleep } from "@/utils/async";
import { requireElement } from "@/utils/dom";
import { useDelayedSpinner } from "@/utils/ui";
import { DOMPURIFY_CONFIG } from "@shared/constants";
import { processWithLimit } from "@shared/limiter";
import type { EditorDoc } from "@shared/schemas/editor-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import { Editor, generateText } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { ListKit } from "@tiptap/extension-list";
import { Table, TableRow } from "@tiptap/extension-table";
import {
  CharacterCount,
  Focus,
  Placeholder,
  Selection,
} from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorState } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";

let editor: Editor | null = null;

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
      handleDrop(view, event, _slice, moved) {
        if (!editor || !event.dataTransfer?.files?.length || moved)
          return false;
        const images = Array.from(event.dataTransfer.files).filter((f: File) =>
          f.type.startsWith("image/"),
        );
        if (images.length === 0) return false;
        event.preventDefault();
        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (coordinates) {
          editor.commands.setTextSelection(coordinates.pos);
        }
        const stopSpinner = useDelayedSpinner();
        void processWithLimit(images, 1, async (file) => {
          await sleep(1000);
          await processAndInsertImage(file, editor!);
        }).finally(() => {
          if (stopSpinner) stopSpinner();
        });

        return true;
      },
      handlePaste(_view, event) {
        if (!editor || !event.clipboardData?.files?.length) return false;
        const images = Array.from(event.clipboardData.files).filter((f: File) =>
          f.type.startsWith("image/"),
        );
        if (images.length === 0) return false;
        event.preventDefault();
        const stopSpinner = useDelayedSpinner();
        void processWithLimit(images, 1, async (file) => {
          await sleep(1000);
          await processAndInsertImage(file, editor!);
        }).finally(() => {
          if (stopSpinner) stopSpinner();
        });
        return true;
      },
    },
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    autofocus: true,
  });
  editor.on("update", ({ editor, transaction }) => {
    if (!transaction.docChanged) return;
    const activeId = stateStore.getState().activeId;
    if (!activeId) return;
    const content = editor?.getJSON();
    const markdown = isMirrorEnabled() ? editor.getMarkdown() : undefined;
    debouncedSaveNote(activeId, content, markdown, false);
  });
  inEditorSearch(editor);
  return editor;
}

function getNoteEditorExtensions() {
  return [
    SearchAndReplace,
    Markdown.configure({ markedOptions: { gfm: true } }),
    MasterShortcuts,
    Typography,
    ListKit.configure({
      taskItem: { nested: true },
    }),
    WikiLink.configure({
      onClick: async (id) => {
        const noteExists = noteStore.get("notes").some((n) => n.id === id);
        if (!noteExists) {
          console.error("[Wikilink configure]: Note not found.");
          return;
        }
        handleSelectNote(id);
      },
      getLabel: (id) => {
        const note = noteStore.get("notes").find((n) => n.id === id);
        return note?.title ?? id;
      },
    }),
    Focus.configure({
      className: "has-focus",
      mode: "all",
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
        const searchInput = requireElement<HTMLInputElement>(".search-input");
        searchInput.value = `#${id}`;
        searchInput.focus();
        handleSearchInput(searchInput.value);
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
    CustomTableHeader.configure({
      HTMLAttributes: { class: "th" },
    }),
    CustomTableCell.configure({
      HTMLAttributes: { class: "td" },
    }),
    Highlight.configure({ multicolor: true }),
    StarterKit.configure({
      codeBlock: false,
      underline: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      bulletList: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
        validate: (href) => {
          const protocolMatch = href.match(/^([a-zA-Z0-9\+\-\.]+):/);
          if (!protocolMatch) {
            return true;
          }
          const protocol = protocolMatch[0].toLowerCase();
          const allowedProtocols = [
            "http:",
            "https:",
            "mailto:",
            "tel:",
            "appimg:",
          ];
          return allowedProtocols.includes(protocol);
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
    const target = e.target as HTMLElement;
    if (target.closest(".ProseMirror") && target.closest("table")) {
      e.preventDefault();
      window.electronAPI.showContextMenu("table");
    }
  });
  editorWrapper.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const target = event.target as HTMLImageElement;
      if (target && target.tagName === "IMG") {
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

function resetEditorHistory(editor: Editor) {
  const newState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
  });
  editor.view.updateState(newState);
}

function getPlainTextFromJson(json: EditorDoc): string {
  return generateText(json, getNoteEditorExtensions(), {
    blockSeparator: "\n",
  });
}

function inEditorSearch(editor: Editor) {
  const bar = requireElement<HTMLDivElement>(".input-wrapper-editor");
  const input = requireElement<HTMLInputElement>(".search-input-editor");
  function updateButtons() {
    const disabled = input.value.trim() === "";
    bar
      .querySelectorAll<HTMLButtonElement>(".search-prev, .search-next")
      .forEach((button) => {
        button.disabled = disabled;
      });
  }

  function scrollToSelection(editor: Editor) {
    const { node } = editor.view.domAtPos(editor.state.selection.anchor);

    if (node instanceof Element) {
      node.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });
    }
  }

  function open() {
    bar.classList.remove("invisible");
    input.focus();
    input.select();
    updateButtons();
  }

  function close() {
    input.value = "";
    bar.classList.add("invisible");
    editor.commands.clearSearch();
    updateButtons();
  }

  function goPrev() {
    editor.commands.findPrev();
    scrollToSelection(editor);
  }

  function goNext() {
    editor.commands.findNext();
    scrollToSelection(editor);
  }

  bar.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".search-prev")) {
      event.preventDefault();
      goPrev();
      return;
    }

    if (target?.closest(".search-next")) {
      event.preventDefault();
      goNext();
      return;
    }

    if (target?.closest(".search-close")) {
      event.preventDefault();
      close();
    }
  });

  bar.addEventListener("input", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(".search-input-editor")) return;
    editor.commands.setSearchTerm({
      searchTerm: input.value,
    });
    updateButtons();
    goNext();
  });

  bar.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(".search-input-editor")) return;
    if (event.repeat) return;
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      goPrev();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      goNext();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  window.addEventListener("keydown", (event) => {
    const isFind =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
    if (!isFind) return;
    event.preventDefault();
    open();
  });
  updateButtons();
  return { open, close };
}

export {
  editor,
  getNoteEditorExtensions,
  getPlainTextFromJson,
  initEditor,
  resetEditorHistory,
  setupEditorListeners,
};
