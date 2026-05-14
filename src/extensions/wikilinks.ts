import {
  mergeAttributes,
  Node,
  nodeInputRule,
  nodePasteRule,
} from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

function normalizeWikiId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\[\]]/g, "").trim();
}

export interface WikiLinkOptions {
  onClick: (id: string) => void | Promise<void>;
}

export const WikiLink = Node.create<WikiLinkOptions>({
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
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          normalizeWikiId(element.getAttribute("data-id")),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-wikilink]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const id = normalizeWikiId(node.attrs["id"]);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wikilink": "",
        "data-id": id,
        class: "wikilink",
      }),
      id,
    ];
  },
  renderText({ node }) {
    return `[[${normalizeWikiId(node.attrs["id"])}]]`;
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: /\[{2,}([^[\]]+)\]{2,}$/,
        type: this.type,
        getAttributes: (match) => ({
          id: normalizeWikiId(match[1]),
        }),
      }),
    ];
  },
  addPasteRules() {
    return [
      nodePasteRule({
        find: /\[{2,}([^[\]]+)\]{2,}/g,
        type: this.type,
        getAttributes: (match) => ({
          id: normalizeWikiId(match[1]),
        }),
      }),
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wikilinkClickHandler"),
        props: {
          handleClickOn: (_view, _pos, node, _nodePos, event) => {
            if (node.type.name !== this.name) return false;

            const id = normalizeWikiId(node.attrs["id"]);
            if (!id) return false;

            event.preventDefault();
            event.stopPropagation();

            void this.options.onClick(id);
            return true;
          },
        },
      }),
    ];
  },
});
