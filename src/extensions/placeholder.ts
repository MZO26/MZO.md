import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface CustomPlaceholderOptions {
  placeholder: string;
}

export const Placeholder = Extension.create<CustomPlaceholderOptions>({
  name: "placeholder",
  addOptions() {
    return {
      placeholder: "Untitled",
    };
  },
  addProseMirrorPlugins() {
    const placeholder = this.options.placeholder;
    return [
      new Plugin({
        key: new PluginKey("placeholder"),
        props: {
          decorations(state: EditorState) {
            const { doc } = state;
            const first = doc.firstChild;
            if (!first) return DecorationSet.empty;
            if (!first.isTextblock) return DecorationSet.empty;
            const isH1 =
              first.type.name === "heading" &&
              typeof first.attrs?.["level"] === "number" &&
              first.attrs["level"] === 1;
            if (!isH1) return DecorationSet.empty;
            if (first.content.size > 0) return DecorationSet.empty;
            return DecorationSet.create(doc, [
              Decoration.node(0, first.nodeSize, {
                class: "is-empty",
                "data-placeholder": placeholder,
              }),
            ]);
          },
        },
      }),
    ];
  },
});
