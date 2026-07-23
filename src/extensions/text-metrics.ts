import { Editor, Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

type CountState = {
  characters: number;
  words: number;
};

export interface TextMetricsOptions {
  limit: number | null;
}

const key = new PluginKey<CountState>("textMetrics");

const countNode = (node: ProseMirrorNode): CountState => {
  if (node.textContent === "") return { characters: 0, words: 0 };
  const text = node.textBetween(0, node.content.size, "", "");
  const trimmed = text.trim();
  return {
    characters: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
  };
};

export const getTextMetrics = (editor: Editor): CountState =>
  key.getState(editor.state) ?? { characters: 0, words: 0 };

export const TextMetrics = Extension.create<TextMetricsOptions>({
  name: "textMetrics",

  addOptions() {
    return {
      limit: null,
    };
  },

  addProseMirrorPlugins() {
    const limit = this.options.limit;
    return [
      new Plugin<CountState>({
        key,
        state: {
          init: (_, state) => countNode(state.doc),
          apply: (tr, value, _oldEditorState, newEditorState) => {
            if (!tr.docChanged) return value;
            const cached = tr.getMeta(key) as CountState | undefined;
            return cached ?? countNode(newEditorState.doc);
          },
        },

        filterTransaction: (tr) => {
          if (!tr.docChanged || limit === null) return true;
          const nextCounts = countNode(tr.doc);
          tr.setMeta(key, nextCounts);
          return nextCounts.characters <= limit;
        },
      }),
    ];
  },
});
