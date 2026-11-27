import { Callout } from "@/extensions/callouts";
import { Placeholder } from "@/extensions/decorations/placeholder";
import { Highlight } from "@/extensions/highlight";
import { CustomBlockquote } from "@/extensions/overrides/blockquote";
import { CodeblockHandler } from "@/extensions/overrides/codeblock/codeblock-handler";
import { lowlight } from "@/extensions/overrides/codeblock/lowlight";
import { CustomHeading, TitleEnforcer } from "@/extensions/overrides/headings";
import { LinkWithTitle } from "@/extensions/overrides/link";
import { CustomBlockMath, CustomInlineMath } from "@/extensions/overrides/mathematics/mathematics";
import { CustomUnderline } from "@/extensions/overrides/underline";
import { NoteTag } from "@/extensions/tag/tag";
import { WikiLink } from "@/extensions/wikilink/wikilinks";
import { localStore } from "@/state/state";
import { clearAllMemoizedCaches, rendererLogger } from "@/utils/helpers";
import type { Id } from "@shared/schemas/note-schema";
import { ALLOWED_PROTOCOLS } from "@shared/shared-constants";
import { createDocument, getHTMLFromFragment, type Editor, type JSONContent } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { ListKit } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { EditorState } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

// actions that don't require dom
// (have to be compatible with worker)

let editorExtensions: ReturnType<typeof getRequestExtensions> | undefined;
let markdownManager: MarkdownManager | undefined;

function recreateEditorState(editor: Editor, doc: JSONContent) {
  const newDoc = createDocument(doc, editor.schema, editor.options.parseOptions, {
    errorOnInvalidContent: false,
  });
  const newState = EditorState.create({
    schema: editor.schema,
    doc: newDoc,
    plugins: editor.state.plugins,
  });
  editor.view.updateState(newState);
  editor.commands.focus("end");
  clearAllMemoizedCaches();
}

function getCachedEditorExtensions() {
  return (editorExtensions ??= getRequestExtensions());
}

function getMarkdownManager() {
  return (markdownManager ??= new MarkdownManager({
    extensions: getCachedEditorExtensions(),
  }));
}

function getRequestExtensions() {
  return [
    Markdown,
    CustomUnderline,
    Highlight,
    Placeholder,
    WikiLink,
    NoteTag,
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
      blockquote: false,
      undoRedo: {
        depth: 20,
      },
      link: false,
      dropcursor: {
        width: 2,
        class: "editor-dropcursor",
      },
    }),
    ListKit.configure({
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      taskItem: {
        nested: false,
      },
    }),
    LinkWithTitle.configure({
      openOnClick: false,
      defaultProtocol: "https",
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
      isAllowedUri: (url, ctx) => {
        if (!ctx.defaultValidate(url)) return false;
        return true;
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      enableTabIndentation: true,
      tabSize: 2,
      defaultLanguage: "text",
      HTMLAttributes: {
        spellcheck: false,
      },
    }),
    CodeblockHandler,
    CustomInlineMath,
    CustomBlockMath,
    CustomBlockquote,
    TitleEnforcer,
    Callout,
  ];
}

function getHTMLContentBetween(editor: Editor, from: number, to: number) {
  const { doc } = editor.state;
  const safeFrom = Math.max(0, Math.min(from, doc.content.size));
  const safeTo = Math.max(safeFrom, Math.min(to, doc.content.size));
  try {
    const slice = doc.slice(safeFrom, safeTo);
    return getHTMLFromFragment(slice.content, editor.schema);
  } catch (error) {
    rendererLogger.appError(
      "[getHTMLContentBetween]: Failed to get HTML from json fragment:",
      error,
    );
    return "";
  }
}

function getMarkdownContentBetween(editor: Editor, from: number, to: number) {
  const { doc } = editor.state;
  const safeFrom = Math.max(0, Math.min(from, doc.content.size));
  const safeTo = Math.max(safeFrom, Math.min(to, doc.content.size));
  try {
    const slice = doc.slice(safeFrom, safeTo);
    const json = {
      type: "doc",
      content: slice.content.toJSON() ?? [],
    };
    return getMarkdownManager().serialize(json);
  } catch (error) {
    rendererLogger.appError("[getMarkdownContentBetween]: Failed to serialize json:", error);
    return "";
  }
}

function getEditorPos(editor: Editor, container: HTMLDivElement) {
  const { from } = editor.state.selection;
  const docSize = editor.state.doc.content.size;
  const safePos = Math.max(1, Math.min(from, docSize));
  const scrollPos = container.scrollTop ?? 0;
  return { cursorPos: safePos, scrollPos: scrollPos };
}

function setSelection(editor: Editor, editorWrapper: HTMLDivElement, id: Id) {
  const { cursorPos, scrollTop } = localStore.getState();
  try {
    editor.commands.setTextSelection(cursorPos[id] ?? 0);
    editorWrapper.scrollTo({
      top: scrollTop[id] ?? 0,
      behavior: "auto",
    });
  } catch (error) {
    rendererLogger.appError(
      `[setSelection]: Failed to setSelection on cursor pos: ${cursorPos[id]}`,
      error,
    );
  }
}

function isSafeExternalUrl(url: string) {
  const parsed = URL.parse(url);
  if (!parsed) return false;
  return ALLOWED_PROTOCOLS.has(parsed.protocol);
}

const EXCLUSIVE_MARK = new Set(["code"]);

function resolveMarkConflicts(nodes: JSONContent[]): JSONContent[] {
  return nodes.flatMap((node) => {
    if (node.type === "text" && !node.text) return [];
    if (node.type === "text" && node.marks?.length) {
      const exclusive = node.marks.find((m) => EXCLUSIVE_MARK.has(m.type));
      if (exclusive) {
        return [{ ...node, marks: [exclusive] }];
      }
    }
    if (node.content) {
      return [{ ...node, content: resolveMarkConflicts(node.content) }];
    }
    return [node];
  });
}

function isNode(val: unknown): val is JSONContent {
  return (
    typeof val === "object" &&
    val !== null &&
    !Array.isArray(val) &&
    "type" in val &&
    typeof val.type === "string"
  );
}

function isNodeArray(val: unknown): val is JSONContent[] {
  return Array.isArray(val) && (val.length === 0 || isNode(val[0]));
}

function ensureEditorDoc(input: unknown): JSONContent | undefined {
  if (isNodeArray(input)) {
    return { type: "doc", content: input };
  }
  if (isNode(input)) {
    if (input.type === "doc") {
      return {
        ...input,
        type: "doc",
        content: isNodeArray(input.content) ? input.content : [],
      };
    }
    return { type: "doc", content: [input] };
  }
  return undefined;
}

function looksLikeMarkdown(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (strongSignals.some((pattern) => pattern.test(trimmed))) return true;
  let matchCount = 0;
  for (const pattern of inlinePatterns) {
    const matches = trimmed.match(pattern);
    if (matches) matchCount += matches.length;
    if (matchCount >= 2) return true;
  }
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    for (const pattern of blockPatterns) {
      if (pattern.test(line)) {
        matchCount++;
        if (matchCount >= 2) return true;
        break;
      }
    }
  }
  return false;
}

const strongSignals = [
  /^#{1,6}\s+\S/m,
  /^```|~~~/m,
  /!\[[^\]\n]*\]\([^)\n]+\)/,
  /\[[^\]\n]+\]\([^)\n]+\)/,
  /^\S[^\r\n]*\r?\n(?:={3,}|-{3,})$/m,
  /^---\r?\n(?:\w[\w-]*:\s?.*\r?\n)+---$/m,
  /^\s*(?:[-*+]|\d{1,3}[.)])\s+\[[ xX]\]\s+\S/m,
  /\$\$.+?\$\$/s,
  /\[\[[^\]\n]+\]\]/,
  /^>[ \t]*\[!(?:note|tip|warning|danger|info)\]/im,
];

const inlinePatterns = [
  /\*\*[^*\n]+\*\*/g,
  /__[^_\n]+__/g,
  /(?:^|[^\w*])\*[^*\n]+\*(?!\w)/g,
  /(?:^|[^\w_])_[^_\n]+_(?!\w)/g,
  /~~[^~\n]+~~/g,
  /`[^`\n]+`/g,
  /(?<!\$)\$(?!\s)[^$\n]+(?<!\s)\$(?!\$)/g,
  /==(?!\s)[^=\n]+(?<!\s)==/g,
  /\+\+(?!\s)[^+\n]+(?<!\s)\+\+/g,
];

const blockPatterns = [
  /^>\s?\S/,
  /^\s*[-*+]\s+\S/,
  /^\s*\d{1,3}[.)]\s+\S/,
  /^\|.+\|$/,
  /^(?:-{3,}|\*{3,}|_{3,})$/,
];

export {
  ensureEditorDoc,
  getCachedEditorExtensions,
  getEditorPos,
  getHTMLContentBetween,
  getMarkdownContentBetween,
  getMarkdownManager,
  isSafeExternalUrl,
  looksLikeMarkdown,
  recreateEditorState,
  resolveMarkConflicts,
  setSelection,
};
