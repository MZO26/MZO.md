import { noteStore } from "@/settings/app-state";
import {
  mergeAttributes,
  Node,
  nodeInputRule,
  nodePasteRule,
} from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const UUID_PATTERN = "([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})";
const INPUT_REGEX = new RegExp(`\\[\\[\\s*${UUID_PATTERN}\\s*\\]\\]$`, "i");
const PASTE_REGEX = new RegExp(
  `(?:\\[\\[)?\\s*${UUID_PATTERN}\\s*(?:\\]\\])?`,
  "gi",
);

export interface WikiLinkOptions {
  onClick: (id: string) => void | Promise<void>;
}

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
      nodeInputRule({
        find: INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => ({ id: match[1] }),
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
    ];
  },
});

export { WikiLink };
