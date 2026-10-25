import { toggleSingleCodeBlock } from "@/extensions/overrides/codeblock/codeblock-handler";
import { promptImageUpload } from "@/extensions/overrides/image/image";
import { openMathDialog } from "@/extensions/overrides/mathematics/mathematics-dialog";
import { appEvents, type ListenerMap } from "@shared/event-emitter";
import type { AppEvent } from "@shared/shared-types";
import type { Editor } from "@tiptap/core";

interface EditorActions {
  run: (args: Editor) => boolean | Promise<boolean>;
  isActive?: (args: Editor) => boolean;
  isDisabled?: (args: Editor) => boolean;
}

type EditorActionKey = keyof typeof editorCommands;

type CommandEventMap = {
  [K in EditorActionKey]: void;
};

const editorCommands = {
  undo: {
    run: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
  },
  redo: {
    run: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
  },
  bold: {
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  italic: {
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  strike: {
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
  },
  underline: {
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
  },
  highlight: {
    run: (editor) => editor.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor.isActive("highlight"),
  },
  mathInline: {
    run: toggleMathInline,
    isActive: (editor) => editor.isActive("inlineMath"),
  },
  heading1: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
  },
  heading2: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  heading3: {
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
  },
  bulletList: {
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  orderedList: {
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  blockQuote: {
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  inlineCode: {
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
  },
  codeBlock: {
    run: (editor) => editor && toggleSingleCodeBlock(editor),
    isActive: (editor) => editor.isActive("codeBlock"),
  },
  mathBlock: {
    run: toggleMathBlock,
    isActive: (editor) => editor.isActive("blockMath"),
  },
  horizontalRule: {
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    isActive: (editor) => editor.isActive("hr"),
  },
  link: {
    run: toggleLink,
    isActive: (editor) => editor.isActive("link"),
  },
  image: {
    run: async (editor) => editor && (await setImageUploadPrompt(editor)),
    isActive: (editor) => editor.isActive("image"),
  },
  table: {
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    isActive: (editor) => editor.isActive("table"),
  },
} satisfies Record<string, EditorActions>;

function registerCommands(editor: Editor, commands: typeof editorCommands) {
  const listenerMap: ListenerMap<CommandEventMap> = {};
  for (const key of Object.keys(commands) as EditorActionKey[]) {
    const cmd: EditorActions = commands[key];
    listenerMap[key] = () => {
      if (cmd.isDisabled?.(editor)) return;
      cmd.run(editor);
    };
  }
  return appEvents.onMany(listenerMap);
}

function getCommandState(editor: Editor, action: AppEvent) {
  if (!(action in editorCommands)) {
    return { isActive: false, isDisabled: false };
  }
  const cmd: EditorActions = editorCommands[action as EditorActionKey];
  return {
    isActive: cmd.isActive?.(editor) ?? false,
    isDisabled: cmd.isDisabled?.(editor) ?? false,
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

export {
  editorCommands,
  getCommandState,
  registerCommands,
  type EditorActionKey,
  type EditorActions,
};
