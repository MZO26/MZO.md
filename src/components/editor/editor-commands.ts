import { toggleSingleCodeBlock } from "@/extensions/overrides/codeblock/codeblock-handler";
import { promptImageUpload } from "@/extensions/overrides/image/image";
import { openMathDialog } from "@/extensions/overrides/mathematics/mathematics-dialog";
import type { Action } from "@/utils/types";
import {
  appEvents,
  type CommandEventMap,
  type EditorEventStrings,
  type ListenerMap,
} from "@shared/event-emitter";
import type { EditorCommands } from "@shared/shared-types";
import type { Editor } from "@tiptap/core";

const editorCommands: Record<EditorEventStrings, EditorCommands> = {
  "editor:undo": {
    run: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
  },
  "editor:redo": {
    run: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
  },
  "editor:bold": {
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  "editor:italic": {
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  "editor:strike": {
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
  },
  "editor:underline": {
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
  },
  "editor:highlight": {
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor.isActive("highlight"),
  },
  "editor:math-inline": {
    run: toggleMathInline,
    isActive: (editor) => editor.isActive("inlineMath"),
  },
  "editor:heading1": {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
  },
  "editor:heading2": {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  "editor:heading3": {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
  },
  "editor:bullet-list": {
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  "editor:ordered-list": {
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  "editor:block-quote": {
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  "editor:inline-code": {
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
  },
  "editor:code-block": {
    run: (editor) => editor && toggleSingleCodeBlock(editor),
    isActive: (editor) => editor.isActive("codeBlock"),
  },
  "editor:math-block": {
    run: toggleMathBlock,
    isActive: (editor) => editor.isActive("blockMath"),
  },
  "editor:horizontal-rule": {
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor.isActive("hr"),
  },
  "editor:link": {
    run: toggleLink,
    isActive: (editor) => editor.isActive("link"),
  },
  "editor:image": {
    run: async (editor) => editor && (await setImageUploadPrompt(editor)),
    isActive: (editor) => editor.isActive("image"),
  },
  "editor:table": {
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    isActive: (editor) => editor.isActive("table"),
  },
};

function registerCommands(
  editor: Editor,
  commands: Record<EditorEventStrings, EditorCommands>,
) {
  const listenerMap: ListenerMap<CommandEventMap> = {};
  for (const key of Object.keys(commands) as EditorEventStrings[]) {
    const cmd = commands[key];
    listenerMap[key] = () => {
      if (cmd.isDisabled?.(editor)) return;
      cmd.run(editor);
    };
  }
  return appEvents.onMany(listenerMap);
}

function getCommandState(editor: Editor, action: Action["action"]) {
  if (!(action in editorCommands)) {
    return { isActive: false, isDisabled: false };
  }
  const cmd = editorCommands[action as EditorEventStrings];
  return {
    isActive: cmd?.isActive?.(editor) ?? false,
    isDisabled: cmd?.isDisabled?.(editor) ?? false,
  };
}

function toggleMathInline(editor: Editor) {
  if (!editor) return false;
  const { from, to, empty } = editor.state.selection;
  const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, "");
  openMathDialog(editor, {
    mode: "insert",
    type: "inline",
    initialValue: selectedText,
  });
  return true;
}

function toggleMathBlock(editor: Editor) {
  if (!editor) return false;
  openMathDialog(editor, {
    mode: "insert",
    type: "block",
    initialValue: "",
  });
  return true;
}

function toggleLink(editor: Editor) {
  if (!editor) return false;
  if (editor.isActive("link")) {
    return editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }
  return editor.chain().focus().setLink({ href: "" }).run();
}

async function setImageUploadPrompt(editor: Editor) {
  if (!editor) return false;
  await promptImageUpload(editor);
  return true;
}

export { editorCommands, getCommandState, registerCommands };
