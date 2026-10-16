import { rendererLogger } from "@/app";
import { getMarkdownManager } from "@/components/editor/editor-actions";
import { Editor, getHTMLFromFragment } from "@tiptap/core";

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
    rendererLogger.appError(
      "[getHTMLContentBetween]: Failed to slice selection:",
      error,
    );
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
    rendererLogger.appError(
      "[getMarkdownContentBetween]: Failed to slice selection:",
      error,
    );
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

export { getEditorPos, getHTMLContentBetween, getMarkdownContentBetween };
