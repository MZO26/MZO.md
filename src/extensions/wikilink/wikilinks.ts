import { noteStore } from "@/state/state";
import { isNoteID, type Id } from "@shared/schemas/note-schema";
import { UNTITLED } from "@shared/shared-constants";
import { InputRule, mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const UUID_PATTERN = "([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})";
const INPUT_REGEX = /(?<!!)\[\[([^\]]+)\]\]$/;
const PASTE_REGEX = /\[\[([^\]]+)\]\]/g;
const EXACT_UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`, "i");

export interface WikiLinkOptions {
  onClick: (id: Id | null, title: string) => void | Promise<void>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikiLink: (options: {
        from: number;
        to: number;
        id: Id | null;
        title: string;
      }) => ReturnType;
    };
  }
}

const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addOptions() {
    return {
      onClick: () => {},
    };
  },

  addAttributes: () => ({
    id: {
      default: null,
      parseHTML: (el) =>
        el
          .getAttribute("data-id")
          ?.replace(/[\[\]]/g, "")
          .trim() || "",
    },
    title: {
      default: null,
      parseHTML: (el) =>
        el.getAttribute("data-title") || el.textContent?.trim() || "",
    },
  }),
  parseHTML: () => [
    {
      tag: "span[data-wikilink]",
    },
  ],

  renderHTML({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    const title = node.attrs?.["title"] || "";
    const validId = isNoteID(id);
    const existingTitle = validId
      ? noteStore.get("noteIndex").get(id)?.title
      : undefined;
    const display = existingTitle || title || UNTITLED;
    return [
      "span",
      mergeAttributes({
        "data-wikilink": "",
        "data-id": id,
        "data-title": display,
        class: validId ? "wikilink" : "wikilink ghost-link",
      }),
      display ? `[[${display}]]` : "",
    ];
  },

  markdownTokenizer: {
    name: "wikilink",
    level: "inline",
    start(src: string) {
      return src.indexOf("[[");
    },
    tokenize(src: string) {
      const match = src.match(/^\[\[([^\]]+)\]\]/);
      if (!match) return undefined;
      const text = typeof match[1] === "string" ? match[1].trim() : "";
      if (!text) {
        return undefined;
      }
      return {
        type: "wikilink",
        raw: match[0],
        text: text,
      };
    },
  },

  parseMarkdown(token, _helpers) {
    const text = String(token.text ?? "").trim();
    if (!text) return { type: "text", text: token.raw || "" };
    if (EXACT_UUID_REGEX.test(text)) {
      const isNoteId = isNoteID(text);
      const display = isNoteId
        ? (noteStore.get("noteIndex").get(text)?.title ?? UNTITLED)
        : UNTITLED;
      return { type: "wikilink", attrs: { id: text as Id, title: display } };
    }
    const normalized = text.toLowerCase();
    const foundNote = noteStore
      .get("notes")
      .find((n) => n.title.toLowerCase() === normalized);
    if (foundNote && isNoteID(foundNote.id)) {
      return {
        type: "wikilink",
        attrs: { id: foundNote.id, title: foundNote.title },
      };
    }
    return { type: "wikilink", attrs: { id: null, title: text } };
  },

  renderText({ node }) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    const title = node.attrs?.["title"] || "";
    const existingTitle = isNoteID(id)
      ? noteStore.get("noteIndex").get(id)?.title
      : undefined;
    const display = existingTitle ?? title ?? UNTITLED;
    return display ? `[[${display}]]` : "";
  },

  renderMarkdown(node) {
    const id = String(node.attrs?.["id"] ?? "").trim();
    const title = node.attrs?.["title"] ?? "";
    const existingTitle = isNoteID(id)
      ? noteStore.get("noteIndex").get(id)?.title
      : undefined;
    const display = existingTitle || title || UNTITLED;
    return display ? `[[${display}]]` : "";
  },

  addCommands() {
    return {
      insertWikiLink:
        ({ from, to, id, title }) =>
        ({ tr, dispatch }) => {
          const node = this.type.create({ id, title });
          if (dispatch) {
            tr.replaceWith(from, to, node)
              .insertText(" ", from + node.nodeSize)
              .setSelection(
                TextSelection.create(tr.doc, from + node.nodeSize + 1),
              );
          }
          return true;
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: INPUT_REGEX,
        handler: ({ range, match, commands }) => {
          const rawTitle = typeof match[1] === "string" ? match[1].trim() : "";
          if (!rawTitle) return null;
          const normalizedTitle = rawTitle.toLowerCase();
          const targetNote = noteStore
            .get("notes")
            .find((n) => n.title.toLowerCase() === normalizedTitle);
          if (range.from < 0 || range.to < range.from) return null;
          commands.insertWikiLink({
            from: range.from,
            to: range.to,
            id: targetNote ? targetNote.id : null,
            title: targetNote ? targetNote.title : rawTitle || UNTITLED,
          });
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
        getAttributes: (match) => {
          const rawTitle = typeof match[1] === "string" ? match[1].trim() : "";
          if (!rawTitle) return false;
          const normalizedTitle = rawTitle.toLowerCase();
          const targetNote = noteStore
            .get("notes")
            .find((n) => n.title.toLowerCase() === normalizedTitle);
          return {
            id: targetNote ? targetNote.id : null,
            title: targetNote ? targetNote.title : rawTitle || UNTITLED,
          };
        },
      }),
    ];
  },
});

export { WikiLink };
