import { Editor, Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type CountState = {
  characters: number;
  words: number;
};

export interface TextMetricsOptions {
  limit: number | null;
}

const key = new PluginKey<CountState>("textMetrics");

const countNode = (
  node: ProseMirrorNode,
  from = 0,
  to = node.content.size,
): CountState => {
  const text = node.textBetween(from, to, "\n", "");
  const trimmed = text.trim();
  return {
    characters: text.replace("/\n/g", "").length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
  };
};

const getTextMetrics = (editor: Editor): CountState =>
  key.getState(editor.state) ?? { characters: 0, words: 0 };

const TextMetrics = Extension.create<TextMetricsOptions>({
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

const selectionMetricsKey = new PluginKey<DecorationSet>("selectionMetrics");

function getSelectionMetrics(state: EditorState) {
  const { from, to } = state.selection;
  const { characters, words } = countNode(state.doc, from, to);
  const widgetKey = `metrics-${words}-${characters}`;
  return {
    words,
    characters,
    widgetKey,
  };
}

function getSelectionDecoration(state: EditorState): DecorationSet {
  const { selection } = state;
  if (selection.empty) return DecorationSet.empty;
  const { $to } = selection;
  const { characters, words, widgetKey } = getSelectionMetrics(state);
  if (characters === 0) return DecorationSet.empty;
  return DecorationSet.create(state.doc, [
    Decoration.widget(
      $to.end(),
      () => {
        const dom = document.createElement("span");
        dom.className = "selection-metrics-widget";
        dom.contentEditable = "false";
        const wordLabel = words === 1 ? "word" : "words";
        const charLabel = characters === 1 ? "char" : "chars";
        dom.textContent = `${words} ${wordLabel} · ${characters} ${charLabel}`;
        return dom;
      },
      {
        side: 1,
        key: widgetKey,
        ignoreSelection: true,
      },
    ),
  ]);
}

const SelectionMetrics = Extension.create({
  name: "selectionMetrics",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: selectionMetricsKey,
        state: {
          init: (_, state) => getSelectionDecoration(state),
          apply: (tr, oldSet, _oldState, newState) => {
            if (tr.docChanged || tr.selectionSet) {
              return getSelectionDecoration(newState);
            }
            return oldSet;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export { getTextMetrics, SelectionMetrics, TextMetrics };
