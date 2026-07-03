import { noteStore } from "@/settings/app-state";
import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface NoteTagOptions {
  onClick: (id: string) => void | Promise<void>;
}

interface TagAutocompleteState {
  from: number;
  to: number;
  autocompleteText: string;
  tagId: string;
}

const tagAutocompleteKey = new PluginKey<TagAutocompleteState>(
  "tagAutocomplete",
);
const tagClickHandlerKey = new PluginKey<null>("tagClickHandler");

const normalizeTagId = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const NoteTag = Node.create<NoteTagOptions>({
  name: "noteTag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions: () => ({
    onClick: () => {},
  }),

  addAttributes: () => ({
    id: {
      default: null,
      parseHTML: (el) => normalizeTagId(el.getAttribute("data-id")),
      renderHTML: (attrs) => ({
        "data-id": normalizeTagId(attrs["id"]),
      }),
    },
  }),
  parseHTML: () => [{ tag: 'span[data-type="noteTag"]' }],

  renderHTML({ node, HTMLAttributes }) {
    const id = normalizeTagId(node.attrs?.["id"] ?? "");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "noteTag",
        class: "tag-node",
      }),
      `#${id}`,
    ];
  },

  renderText({ node }) {
    const id = normalizeTagId(node.attrs?.["id"] ?? "");
    return id ? `#${id}` : "";
  },

  markdownTokenName: "noteTag",

  markdownTokenizer: {
    name: "noteTag",
    level: "inline" as const,
    start: "#",
    tokenize(src: string) {
      const match = src.match(/^#([\p{L}\p{N}_-]+)/u);
      const text = match?.[1]?.trim();
      if (!match || !text) return undefined;
      return { type: "noteTag", raw: match[0], text };
    },
  },

  parseMarkdown(token, helpers) {
    const id = normalizeTagId(token.text ?? "");
    if (!id) {
      return helpers.createTextNode(token.raw ?? "");
    }
    return helpers.createNode("noteTag", { id });
  },

  renderMarkdown(node) {
    const id = normalizeTagId(node.attrs?.["id"] ?? "");
    return id ? `#${id}` : "";
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)#([\p{L}\p{N}_-]+)\s$/u,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          // match[0] is the full text
          // match[1] is the text without the #
          const matchString = match[0];
          const tagText = normalizeTagId(match[1]);
          const prefixSpace = matchString.match(/^\s/) ? 1 : 0;
          const node = this.type.create({ id: tagText });
          tr.replaceWith(start + prefixSpace, end, node).insertText(" ");
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const state = tagAutocompleteKey.getState(editor.state);
        if (!state) return false;
        editor
          .chain()
          .focus()
          .insertContentAt({ from: state.from, to: state.to }, [
            {
              type: this.name,
              attrs: { id: normalizeTagId(state.tagId) },
            },
            {
              type: "text",
              text: " ",
            },
          ])
          .run();

        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const clickPlugin = new Plugin({
      key: tagClickHandlerKey,
      props: {
        handleClickOn: (_view, _pos, node, _nodePos, event) => {
          if (node.type.name !== this.name || !node.attrs["id"]) return false;
          event.preventDefault();
          event.stopPropagation();
          void this.options.onClick(node.attrs["id"]);
          return true;
        },
      },
    });
    const autoCompletePlugin = new Plugin({
      key: tagAutocompleteKey,
      state: {
        init: () => null,
        apply: (
          tr,
          pluginState,
          _oldEditorState,
          newEditorState,
        ): TagAutocompleteState | null => {
          if (!tr.docChanged && !tr.selectionSet) {
            return pluginState;
          }
          const { selection } = newEditorState;
          if (!selection.empty) return null;
          const $head = selection.$head;
          // tag max is 100 / not more because whitespaces create new tag instantly
          const lookbackStart = Math.max(0, $head.parentOffset - 100);
          const textBefore = $head.parent.textContent.slice(
            lookbackStart,
            $head.parentOffset,
          );
          const match = textBefore.match(/(?:^|\s)#([\p{L}\p{N}_-]+)$/u);
          if (!match) return null;
          const rawQuery = match[1];
          if (!rawQuery) return null;
          const normalizedQuery = rawQuery.trim().toLowerCase();
          let bestMatch: string | null = null;
          let exactMatchFound = false;
          for (const note of noteStore.get("notes")) {
            for (const tag of note.tags) {
              if (tag === normalizedQuery) {
                bestMatch = tag;
                exactMatchFound = true;
                break;
              }
              if (
                tag.startsWith(normalizedQuery) &&
                (bestMatch === null || tag.length < bestMatch.length)
              ) {
                bestMatch = tag;
              }
            }
            if (exactMatchFound) break;
          }
          if (!bestMatch) return null;
          return {
            from: $head.pos - rawQuery.length - 1,
            to: $head.pos,
            autocompleteText: bestMatch.slice(rawQuery.length),
            tagId: bestMatch,
          };
        },
      },
      props: {
        decorations(state) {
          const pluginState = tagAutocompleteKey.getState(state);
          if (!pluginState) return DecorationSet.empty;
          const span = document.createElement("span");
          span.className = "autocomplete";
          span.textContent = pluginState.autocompleteText;
          return DecorationSet.create(state.doc, [
            Decoration.widget(pluginState.to, span, { side: 1 }),
          ]);
        },
      },
    });
    return [clickPlugin, autoCompletePlugin];
  },
});

export { NoteTag };
