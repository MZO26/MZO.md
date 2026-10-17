import { Highlight } from "@/extensions/highlight";
import {
  CustomBlockMath,
  CustomInlineMath,
} from "@/extensions/overrides/mathematics/mathematics";
import { NoteTag } from "@/extensions/tag/tag";
import { WikiLink } from "@/extensions/wikilink/wikilinks";
import {
  getHTMLFromFragment,
  type Editor,
  type JSONContent,
} from "@tiptap/core";
import Image from "@tiptap/extension-image";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

let editorExtensions: ReturnType<typeof getRequestExtensions> | undefined;
let markdownManager: MarkdownManager | undefined;

function recreateEditorState(editor: Editor, doc: JSONContent) {
  editor
    .chain()
    .setMeta("addToHistory", false)
    .setContent(doc, {
      emitUpdate: false,
      errorOnInvalidContent: false,
      contentType: "json",
    })
    .focus("start")
    .run();
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
    Highlight,
    WikiLink,
    Image,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    NoteTag,
    StarterKit,
    CustomBlockMath,
    CustomInlineMath,
  ];
}

function getHTMLContentBetween(
  editor: Editor,
  from: number,
  to: number,
): string {
  const { doc } = editor.state;
  const safeFrom = Math.max(0, Math.min(from, doc.content.size));
  const safeTo = Math.max(safeFrom, Math.min(to, doc.content.size));
  try {
    const slice = doc.slice(safeFrom, safeTo);
    return getHTMLFromFragment(slice.content, editor.schema);
  } catch (error) {
    return "";
  }
}

function getMarkdownContentBetween(
  editor: Editor,
  from: number,
  to: number,
): string {
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

export {
  getCachedEditorExtensions,
  getEditorPos,
  getHTMLContentBetween,
  getMarkdownContentBetween,
  getMarkdownManager,
  recreateEditorState,
};
