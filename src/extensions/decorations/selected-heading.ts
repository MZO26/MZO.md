import { Extension, type CommandProps } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface TocSelectedHeadingOptions {
  className: string;
  duration: number;
  updateSelection: boolean;
}

export interface TocSelectedHeadingStorage {
  highlightTimeout: ReturnType<typeof setTimeout> | null;
}

type PluginMeta = { clear: true } | { from: number; to: number; clear?: false };

export const tocSelectedHeadingKey = new PluginKey<DecorationSet>(
  "tocSelectedHeading",
);

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tocSelectedHeading: {
      highlightHeading: (pos: number) => ReturnType;
    };
  }
}

function resolveHeadingPos(
  doc: PMNode,
  pos: number,
): { from: number; to: number } | null {
  if (pos < 0 || pos > doc.content.size) return null;
  const $pos = doc.resolve(pos);
  if ($pos.nodeAfter?.type.name === "heading") {
    return {
      from: pos,
      to: pos + $pos.nodeAfter.nodeSize,
    };
  }
  for (let depth = $pos.depth; depth >= 1; depth--) {
    if ($pos.node(depth).type.name === "heading") {
      return {
        from: $pos.before(depth),
        to: $pos.after(depth),
      };
    }
  }
  return null;
}

export const TocSelectedHeading = Extension.create<
  TocSelectedHeadingOptions,
  TocSelectedHeadingStorage
>({
  name: "tocSelectedHeading",

  addOptions() {
    return {
      className: "toc-heading-highlight",
      duration: 1500,
      updateSelection: true,
    };
  },

  addStorage() {
    return {
      highlightTimeout: null,
    };
  },

  addCommands() {
    return {
      highlightHeading:
        (pos: number) =>
        ({ tr, dispatch, editor }: CommandProps) => {
          const $pos = resolveHeadingPos(tr.doc, pos);
          if (!$pos) return false;
          if (dispatch) {
            if (this.storage.highlightTimeout)
              clearTimeout(this.storage.highlightTimeout);
            tr.setMeta(tocSelectedHeadingKey, {
              from: $pos.from,
              to: $pos.to,
            }).setMeta("addToHistory", false);
            if (this.options.updateSelection) {
              const { from, to } = $pos;
              const endInsideHeading = Math.max(from + 1, to - 1);
              tr.setSelection(TextSelection.create(tr.doc, endInsideHeading));
            }
            this.storage.highlightTimeout = setTimeout(() => {
              editor.view.dispatch(
                editor.state.tr
                  .setMeta(tocSelectedHeadingKey, { clear: true })
                  .setMeta("addToHistory", false),
              );
            }, this.options.duration);
          }
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: tocSelectedHeadingKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, oldSet) => {
            const meta = tr.getMeta(tocSelectedHeadingKey) as
              | PluginMeta
              | undefined;
            if (meta?.clear) return DecorationSet.empty;
            if (meta && "from" in meta && "to" in meta) {
              const deco = Decoration.node(meta.from, meta.to, {
                class: this.options.className,
              });
              return DecorationSet.create(tr.doc, [deco]);
            }
            return tr.docChanged ? oldSet.map(tr.mapping, tr.doc) : oldSet;
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
