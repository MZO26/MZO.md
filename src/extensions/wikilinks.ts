import { noteStore } from "@/settings/app-state";
import type { NoteListItem } from "@shared/schemas/note-schema";
import { InputRule, mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const UUID_PATTERN = "([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})";
const INPUT_REGEX = /(?<!!)\[\[([^\]]+)\]\]$/;
const PASTE_REGEX = new RegExp(
  `(?:\\[\\[)?\\s*${UUID_PATTERN}\\s*(?:\\]\\])?`,
  "gi",
);

export interface WikiLinkOptions {
  onClick: (id: string) => void | Promise<void>;
}

type AutocompleteState = {
  from: number;
  to: number;
  autocompleteText: string;
  noteId: string;
};

const autocompleteKey = new PluginKey<AutocompleteState>(
  "wikilinkAutocomplete",
);

const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addOptions: () => ({
    onClick: () => {},
  }),

  addAttributes: () => ({
    id: {
      default: null,
      parseHTML: (el) =>
        el
          .getAttribute("data-id")
          ?.replace(/[\[\]]/g, "")
          .trim() || "",
    },
  }),

  parseHTML: () => [{ tag: "span[data-wikilink]" }],
  renderHTML({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    const title = noteStore.get("notes").find((n) => n.id === id)?.title;
    const display = title || id;
    return [
      "span",
      mergeAttributes({
        "data-wikilink": "",
        "data-id": id,
        class: "wikilink",
      }),
      display ? `[[${display}]]` : "",
    ];
  },
  markdownTokenizer: {
    name: "wikilink",
    level: "inline" as const,
    start: "[[",
    tokenize(src: string) {
      const match = src.match(/^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/);
      const id = match?.[1]?.trim();
      if (!match || !id) return undefined;
      return {
        type: "wikilink",
        raw: match[0],
        text: id,
      };
    },
  },

  parseMarkdown(token, helpers) {
    const id = String(token.text ?? "").trim();
    if (!id) {
      return helpers.createTextNode(token.raw || "");
    }
    return helpers.createNode("wikilink", { id });
  },
  renderText({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    if (!id) return "";
    const title = noteStore.get("notes").find((n) => n.id === id)?.title;
    return title ? `[[${id}|${title}]]` : `[[${id}]]`;
  },
  renderMarkdown(node) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    if (!id) return "";
    const title = noteStore.get("notes").find((n) => n.id === id)?.title;
    return title ? `[[${id}|${title}]]` : `[[${id}]]`;
  },
  addInputRules() {
    return [
      new InputRule({
        find: INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const typedTitle = match[1]?.trim();
          if (!typedTitle) return null;
          const targetNote = noteStore
            .get("notes")
            .find((n) => n.title.toLowerCase() === typedTitle.toLowerCase());
          if (!targetNote) return null;
          const nodeType = state.schema.nodes[this.name];
          if (!nodeType) return null;
          const node = nodeType.create({
            id: targetNote.id,
            label: targetNote.title,
          });
          const tr = state.tr;
          tr.replaceWith(range.from, range.to, node);
          tr.insertText(" ", range.from + node.nodeSize);
          return;
        },
      }),
    ];
  },
  addPasteRules() {
    return [
      nodePasteRule({
        find: PASTE_REGEX,
        type: this.type,
        getAttributes: (match) => ({ id: match[1] }),
      }),
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wikilinkClickHandler"),
        props: {
          handleClickOn: (_view, _pos, node, _nodePos, event) => {
            if (node.type.name !== this.name || !node.attrs["id"]) return false;
            event.preventDefault();
            event.stopPropagation();
            void this.options.onClick(node.attrs["id"]);
            return true;
          },
        },
      }),
      new Plugin({
        key: autocompleteKey,
        state: {
          init: () => null,
          apply: (
            _tr,
            _value,
            _oldState,
            newState,
          ): AutocompleteState | null => {
            const { selection } = newState;
            if (!selection.empty) return null;
            const $head = selection.$head;
            const textBefore = $head.parent.textContent.slice(
              0,
              $head.parentOffset,
            );
            const match = textBefore.match(/\[\[([^\]]*)$/);
            if (!match) return null;
            const rawQuery = match[1];
            if (!rawQuery) return null;
            const normalizedQuery = rawQuery.trim().toLowerCase();
            const notes = noteStore.get("notes");
            let bestMatch: NoteListItem | null = null;
            for (const note of notes) {
              const normalizedTitle = note.title.toLowerCase();
              if (normalizedTitle === normalizedQuery) {
                bestMatch = note;
                break;
              }
              if (
                normalizedTitle.startsWith(normalizedQuery) &&
                (bestMatch === null ||
                  note.title.length < bestMatch.title.length)
              ) {
                bestMatch = note;
              }
            }
            if (!bestMatch) return null;
            return {
              from: $head.pos - rawQuery.length - 2,
              to: $head.pos,
              autocompleteText: bestMatch.title.slice(rawQuery.length) + "]]",
              noteId: bestMatch.id,
            };
          },
        },
        props: {
          decorations(state) {
            const pluginState = autocompleteKey.getState(state);
            if (!pluginState) return DecorationSet.empty;
            const span = document.createElement("span");
            span.className = "autocomplete";
            span.textContent = pluginState.autocompleteText;
            return DecorationSet.create(state.doc, [
              Decoration.widget(pluginState.to, span, { side: 1 }),
            ]);
          },
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const state = autocompleteKey.getState(editor.state);
        if (!state) return false;
        editor
          .chain()
          .focus()
          .insertContentAt({ from: state.from, to: state.to }, [
            {
              type: this.name,
              attrs: { id: state.noteId },
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
});

export { WikiLink };
