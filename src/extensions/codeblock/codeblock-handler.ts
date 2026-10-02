import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const KEY_MAP = {
  "(": ")",
  "[": "]",
  "{": "}",
  "'": "'",
  '"': '"',
} as const;

const CLOSERS = Object.values(KEY_MAP) as string[];

const isOpener = (key: string): key is keyof typeof KEY_MAP => key in KEY_MAP;

export const CodeblockHandler = Extension.create({
  name: "codeblockHandler",

  addKeyboardShortcuts() {
    const indentBlock = (indentType: "forward" | "backward") => {
      if (!this.editor.isActive("codeBlock")) return false;
      return this.editor
        .chain()
        .command(({ tr, state, dispatch }) => {
          const { empty, $from, from, to } = state.selection;
          if (empty) {
            if (dispatch) {
              if (indentType === "forward") {
                // just indent 2 spaces
                tr.insertText("  ");
              } else {
                const start = Math.max(0, $from.parentOffset - 2);
                const textBefore = $from.parent.textBetween(
                  start,
                  $from.parentOffset,
                );
                if (textBefore === "  ") {
                  tr.delete(from - 2, from);
                } else if (textBefore.endsWith(" ")) {
                  tr.delete(from - 1, from);
                }
              }
            }
            return true;
          }
          let updated: string;
          const text = state.doc.textBetween(from, to, "\n");
          if (indentType === "forward") {
            updated = text
              .split("\n")
              .map((line) => "  " + line)
              .join("\n");
          } else {
            updated = text
              .split("\n")
              .map((line) => {
                if (line.startsWith("  ")) return line.slice(2);
                if (line.startsWith(" ")) return line.slice(1);
                return line;
              })
              .join("\n");
          }
          if (dispatch) {
            tr.insertText(updated, from, to).setSelection(
              TextSelection.create(tr.doc, from, updated.length),
            );
          }
          return true;
        })
        .run();
    };
    const handleKey = (key: string) => () => {
      if (!this.editor.isActive("codeBlock")) return false;
      return this.editor
        .chain()
        .command(({ tr, state, dispatch }) => {
          const { empty, from, to } = state.selection;
          const charAfter = state.doc.textBetween(from, from + 1);
          const isCloser = CLOSERS.includes(key);
          const opener = isOpener(key) ? key : undefined;
          const closeChar = opener ? KEY_MAP[opener] : "";
          // empty selection combined with input of
          // closer char and the char after also is a
          // closer -> skip char and move text-selection
          if (empty && isCloser && charAfter === key) {
            if (dispatch) {
              tr.setSelection(TextSelection.create(tr.doc, from + 1));
            }
            return true;
          }
          // no special logic to handle
          if (!opener || !closeChar) return false;
          if (!empty) {
            if (dispatch) {
              tr.insertText(closeChar, to)
                .insertText(key, from)
                .setSelection(TextSelection.create(tr.doc, from + 1, to + 1));
            }
            return true;
          }
          if (dispatch) {
            tr.insertText(key + closeChar, from).setSelection(
              TextSelection.create(tr.doc, from + 1),
            );
          }
          return true;
        })
        .run();
    };

    return {
      "(": handleKey("("),
      ")": handleKey(")"),
      "[": handleKey("["),
      "]": handleKey("]"),
      "{": handleKey("{"),
      "}": handleKey("}"),
      '"': handleKey('"'),
      "'": handleKey("'"),
      Backspace: () => {
        if (!this.editor.isActive("codeBlock")) return false;
        const { selection, doc } = this.editor.state;
        if (!selection.empty) return false;
        const absolutePos = selection.from;
        const charBefore =
          absolutePos > 0 ? doc.textBetween(absolutePos - 1, absolutePos) : "";
        const charAfter = doc.textBetween(absolutePos, absolutePos + 1);
        if (isOpener(charBefore) && KEY_MAP[charBefore] === charAfter) {
          this.editor.commands.deleteRange({
            from: absolutePos - 1,
            to: absolutePos + 1,
          });
          return true;
        }
        return false;
      },
      Tab: () => indentBlock("forward"),
      "Shift-Tab": () => indentBlock("backward"),
      Enter: () => {
        if (!this.editor.isActive("codeBlock")) return false;
        const { selection, doc } = this.editor.state;
        const { empty, from, to } = selection;
        if (!empty) return false;
        const charBefore = doc.textBetween(from - 1, from);
        const charAfter = doc.textBetween(to, to + 1);
        if (charBefore in KEY_MAP) {
          const isMatch =
            isOpener(charBefore) && charAfter === KEY_MAP[charBefore];
          if (isMatch) {
            this.editor.commands.insertContent("\n  \n");
            this.editor.commands.setTextSelection(from + 3);
            return true;
          }
          return this.editor.commands.insertContent("\n  ");
        }
        return false;
      },
    };
  },
});
