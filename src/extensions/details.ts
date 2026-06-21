import { Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    detailsBlock: {
      insertDetailsBlock: (summary?: string, open?: boolean) => ReturnType;
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
    return {
      insertDetailsBlock:
        (summary = "Details", open = false) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { summary, open },
            content: [{ type: "paragraph" }],
          }),
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
      summary.setAttribute(
        "aria-label",
        String(currentNode.attrs["summary"] || "Details"),
      );
      const content = document.createElement("div");
      content.className = "details-content";
      const updateAttrs = (attrs: Record<string, unknown>) => {
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

      summary.addEventListener("click", (event) => {
        event.preventDefault();
        updateAttrs({ open: !currentNode.attrs["open"] });
      });

      summary.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          updateAttrs({ open: !currentNode.attrs["open"] });
        }
      });
      dom.append(summary, content);

      return {
        dom, // details node
        contentDOM: content, // nested content inside the details node
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          dom.open = !!currentNode.attrs["open"];
          summary.setAttribute(
            "aria-label",
            String(currentNode.attrs["summary"] || "Details"),
          );
          return true;
        },
      };
    };
  },

  markdownTokenName: "detailsBlock",

  markdownTokenizer: {
    name: "detailsBlock",
    level: "block" as const,
    start(src) {
      return src.indexOf("<details");
    },
    tokenize(src, _tokens, lexer) {
      const rule =
        /^<details(?: open)?>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)\s*<\/details>/;
      // don't include open attribute so toggles don't trigger file saves
      const match = rule.exec(src);
      if (match) {
        const raw = match[0];
        const summary = match[1]?.trim();
        const innerContent = match[2];
        return {
          type: "detailsBlock",
          raw,
          summary: summary,
          tokens: lexer.blockTokens(innerContent ?? ""),
        };
      }
      return undefined;
    },
  },

  parseMarkdown: (token, helpers) => {
    return {
      type: "detailsBlock",
      attrs: {
        summary: token["summary"] || "Details",
      },
      content: helpers.parseBlockChildren?.(token.tokens || []) || [],
    };
  },

  renderMarkdown(node, helpers) {
    const summary = String(node.attrs?.["summary"] || "Details");
    const content = helpers.renderChildren(node.content || []);
    return content.trim().length > 0
      ? `<details>\n<summary>${summary}</summary>\n\n${content}\n\n</details>\n`
      : `<details>\n<summary>${summary}</summary>\n</details>\n`;
  },
});
