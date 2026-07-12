import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    detailsBlock: {
      setDetailsBlock: (summary?: string, open?: boolean) => ReturnType;
      unsetDetailsBlock: (summary?: string, open?: boolean) => ReturnType;
      toggleDetailsBlock: (summary?: string, open?: boolean) => ReturnType;
    };
  }
}

export const DetailsBlock = Node.create({
  name: "detailsBlock",
  group: "block",
  content: "block*",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      summary: {
        default: "Details",
        parseHTML: (el) =>
          el.querySelector("summary")?.textContent?.trim() || "Details",
      },
      open: {
        default: false,
        parseHTML: (el) => el.hasAttribute("open"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { summary, open, ...attrs } = HTMLAttributes;

    return [
      "details",
      mergeAttributes(attrs, open ? { open: "" } : {}),
      ["summary", summary || "Details"],
      ["div", { "data-details-content": "" }, 0], // 0 for render all nested children
    ];
  },

  addCommands() {
    const findDetailsBlock = (state: CommandProps["state"]) => {
      const { $from } = state.selection;
      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === this.name) {
          return {
            node,
            depth,
            pos: $from.before(depth),
          };
        }
      }

      return null;
    };
    return {
      setDetailsBlock:
        (summary = "Details", open = false) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { summary, open },
            content: [{ type: "paragraph" }],
          }),

      unsetDetailsBlock:
        () =>
        ({ state, dispatch }: CommandProps) => {
          const found = findDetailsBlock(state);
          if (!found) return false;
          const from = found.pos;
          const to = from + found.node.nodeSize;
          const content = found.node.content;
          if (dispatch) {
            dispatch(state.tr.replaceWith(from, to, content));
          }
          return true;
        },

      toggleDetailsBlock:
        (summary = "Details", open = false) =>
        ({ state, commands }: CommandProps) => {
          const found = findDetailsBlock(state);
          if (found) {
            return commands.unsetDetailsBlock();
          }
          return commands.setDetailsBlock(summary, open);
        },
    };
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      let currentNode: ProseMirrorNode = node;
      const dom = document.createElement("details");
      dom.className = "details-root";
      dom.open = !!currentNode.attrs["open"];
      const summary = document.createElement("summary");
      summary.className = "details-summary";
      summary.contentEditable = "false";
      const content = document.createElement("div");
      content.className = "details-content";
      const updateAttrs = (attrs: Record<string, unknown>) => {
        if (typeof getPos !== "function") return false;
        const pos = getPos();
        if (typeof pos !== "number") return false;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            ...attrs,
          }),
        );
        return true;
      };
      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        updateAttrs({ open: !currentNode.attrs["open"] });
      };

      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          updateAttrs({ open: !currentNode.attrs["open"] });
        }
      };

      summary.addEventListener("click", handleClick);

      summary.addEventListener("keydown", handleKeydown);
      dom.append(summary, content);

      return {
        dom, // details node
        contentDOM: content, // nested content inside the details node
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          dom.open = !!currentNode.attrs["open"];
          return true;
        },
        destroy() {
          summary.removeEventListener("click", handleClick);
          summary.removeEventListener("keydown", handleKeydown);
        },
      };
    };
  },

  markdownTokenName: "detailsBlock",

  markdownTokenizer: {
    name: "detailsBlock",
    level: "block",
    start(src) {
      return src.indexOf("<details");
    },
    tokenize(src, _tokens, lexer) {
      const rule =
        /^<details[^>]*>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)\s*<\/details>/;
      // don't include open attribute so toggles don't trigger file saves
      const match = rule.exec(src);
      if (!match) return undefined;
      const raw = typeof match[0] === "string" ? match[0] : "";
      const summary = typeof match[1] === "string" ? match[1].trim() : "";
      const innerContent = typeof match[2] === "string" ? match[2] : "";
      if (!raw || !summary) return undefined;
      return {
        type: "detailsBlock",
        raw,
        summary: summary,
        tokens: lexer.blockTokens(innerContent),
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    return {
      type: "detailsBlock",
      attrs: {
        summary: token["summary"] || "Details",
      },
      content: helpers.parseChildren(token.tokens || []),
    };
  },

  renderMarkdown(node, helpers) {
    const summary = String(node?.attrs?.["summary"] || "Details");
    const rawContent = helpers.renderChildren(node?.content || []);
    const content =
      typeof rawContent === "string" ? rawContent : String(rawContent || "");
    const trimmedContent = content.trim();
    return trimmedContent
      ? `<details>\n<summary>${summary}</summary>\n\n${content}\n\n</details>\n`
      : `<details>\n<summary>${summary}</summary>\n</details>\n`;
  },
});
