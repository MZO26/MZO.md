import { showNotification } from "@/api/api";
import { MAX_TEXT_LENGTH } from "@shared/constants";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export const MaxContentGuard = Extension.create({
  name: "maxContentGuard",

  addOptions() {
    return {
      maxChars: MAX_TEXT_LENGTH,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            const currentChars = view.state.doc.textContent.length;
            const nextChars = currentChars + text.length;
            if (nextChars > this.options.maxChars) {
              void showNotification("Content too large", "");
              event.preventDefault();
              return true;
            }
            return false;
          },

          handleDrop: (view, event) => {
            const text = event.dataTransfer?.getData("text/plain") ?? "";
            const currentChars = view.state.doc.textContent.length;
            const nextChars = currentChars + text.length;
            if (nextChars > this.options.maxChars) {
              void showNotification("Content too large", "");
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
