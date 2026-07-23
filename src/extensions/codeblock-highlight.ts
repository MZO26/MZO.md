import { lowlight } from "@/extensions/lowlight";
import { MAX_CODE_BLOCK_HIGHLIGHT_LENGTH } from "@shared/constants";
import { Extension } from "@tiptap/core";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Selection,
  type Transaction,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { RootContent } from "hast";

type HighlightPluginState = {
  decos: DecorationSet;
  pos: number | null;
  text: string | null;
};

type CodeBlockInfo = {
  pos: number;
  text: string;
  textStart: number;
};

const highlightKey = new PluginKey<HighlightPluginState>("activeCodeHighlight");

const emptyState = (): HighlightPluginState => ({
  decos: DecorationSet.empty,
  pos: null,
  text: null,
});

function getActiveCodeBlock(selection: Selection): CodeBlockInfo | null {
  const { $from } = selection;
  if ($from.parent.type.name !== "codeBlock") {
    return null;
  }
  const pos = $from.before();
  return {
    pos,
    text: $from.parent.textContent,
    textStart: pos + 1,
  };
}

function buildDecorations(text: string, textStart: number): Decoration[] {
  if (
    text.trim().length === 0 ||
    text.length > MAX_CODE_BLOCK_HIGHLIGHT_LENGTH
  ) {
    return [];
  }
  const decorations: Decoration[] = [];
  // how far the codeblock has been walked
  let offset = 0;
  const walk = (
    nodes: RootContent[],
    classes: readonly string[] = [],
  ): void => {
    for (const node of nodes) {
      if (node.type === "text") {
        const value = node.value;
        const from = textStart + offset;
        const to = from + value.length;
        if (classes.length > 0 && from < to) {
          decorations.push(
            Decoration.inline(from, to, {
              class: classes.join(" "),
            }),
          );
        }
        offset += value.length;
        continue;
      }
      if (node.type === "element") {
        const className = node.properties?.className;
        let filtered: string[] = [];
        if (Array.isArray(className)) {
          filtered = className.filter(
            (value): value is string => typeof value === "string",
          );
        }
        walk(node.children, [...classes, ...filtered]);
      }
    }
  };
  try {
    const tree = lowlight.highlightAuto(text);
    walk(tree.children);
  } catch {
    return [];
  }
  return decorations;
}

export const ActiveCodeHighlight = Extension.create({
  name: "activeCodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<HighlightPluginState>({
        key: highlightKey,
        state: {
          init(_, state: EditorState): HighlightPluginState {
            const info = getActiveCodeBlock(state.selection);
            if (!info) return emptyState();
            return {
              decos: DecorationSet.create(
                state.doc,
                buildDecorations(info.text, info.textStart),
              ),
              pos: info.pos,
              text: info.text,
            };
          },

          apply(
            tr: Transaction,
            pluginState: HighlightPluginState,
            _oldEditorState: EditorState,
            newEditorState: EditorState,
          ): HighlightPluginState {
            if (!tr.docChanged && !tr.selectionSet) {
              return pluginState;
            }
            const info = getActiveCodeBlock(newEditorState.selection);
            if (!info) return emptyState();
            // tr.doc is new state of doc after transaction. pluginState.decos is current deco set for old state. .map(tr.mapping, tr.doc) shifts decos into new doc positions
            const mappedDecos = pluginState.decos.map(tr.mapping, tr.doc);
            const mappedPos =
              pluginState.pos === null ? null : tr.mapping.map(pluginState.pos);
            if (mappedPos === info.pos && pluginState.text === info.text) {
              return {
                decos: mappedDecos,
                pos: info.pos,
                text: info.text,
              };
            }
            return {
              decos: DecorationSet.create(
                tr.doc,
                buildDecorations(info.text, info.textStart),
              ),
              pos: info.pos,
              text: info.text,
            };
          },
        },
        props: {
          decorations(state: EditorState): DecorationSet {
            return highlightKey.getState(state)?.decos ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
