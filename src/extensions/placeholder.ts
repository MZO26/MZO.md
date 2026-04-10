import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

const Placeholder = Extension.create({
  name: "placeholder",

  addOptions() {
    return {
      placeholder: "Write something...",
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          attributes: (state) => {
            const isEditorEmpty = state.doc.content.size <= 2;

            return {
              class: isEditorEmpty ? "is-editor-empty" : "",
              "data-placeholder": this.options.placeholder,
            };
          },
        },
      }),
    ];
  },
});

export { Placeholder };
