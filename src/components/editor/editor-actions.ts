import { Highlight } from "@/extensions/highlight";
import {
  CustomBlockMath,
  CustomInlineMath,
} from "@/extensions/mathematics/mathematics";
import { NoteTag } from "@/extensions/tag/tag";
import { WikiLink } from "@/extensions/wikilink/wikilinks";
import type { Editor, JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ListKit } from "@tiptap/extension-list";
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
    ListKit.configure({
      taskItem: { nested: true },
    }),
    Highlight,
    WikiLink,
    Image,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    NoteTag,
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      listItem: false,
      listKeymap: false,
      orderedList: false,
      bulletList: false,
    }),
    CustomBlockMath,
    CustomInlineMath,
  ];
}

export { getCachedEditorExtensions, getMarkdownManager, recreateEditorState };
