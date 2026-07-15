import { InputRule, Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "note" | "tip" | "important" | "warning" | "caution";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type: CalloutType }) => ReturnType;
      toggleCallout: (attributes?: { type: CalloutType }) => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-callout"),
        renderHTML: (attributes) => ({
          "data-callout": attributes["type"],
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs["type"] as CalloutType;
    const icons: Record<CalloutType, string> = {
      note: "📝",
      tip: "✨",
      important: "📌",
      warning: "🚧",
      caution: "❗",
    };

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `callout callout-${type}`,
      }),
      [
        "div",
        { contenteditable: "false", class: "callout-header" },
        ["span", { class: "callout-icon" }, icons[type] || "📝"],
        ["span", { class: "callout-title" }, type.toUpperCase()],
      ],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s$/i,
        handler: ({ state, range, match, chain }) => {
          const type =
            typeof match[1] === "string"
              ? match[1].toLowerCase()
              : ("note" as CalloutType);
          if (range.from < 0 || range.to < range.from) return;
          const $from = state.doc.resolve(range.from);
          const parent = $from.node($from.depth - 1);
          if (parent && parent.type.name === "blockquote") {
            const blockquotePos = $from.before($from.depth - 1);
            chain()
              .deleteRange({ from: range.from, to: range.to })
              .command(({ tr }) => {
                tr.setNodeMarkup(blockquotePos, this.type, { type });
                return true;
              })
              .run();
          } else {
            chain()
              .deleteRange({ from: range.from, to: range.to })
              .wrapIn(this.type, { type })
              .run();
          }
        },
      }),
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
    };
  },

  markdownTokenizer: {
    name: "callout",
    level: "block",
    start: (src) => src.search(/^>\s*\[!/im),
    tokenize(src, _tokens, lexer) {
      const rule =
        /^(?:>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$))(?:>[ \t]*[^\n]*(?:\n|$))*/i;
      const match = rule.exec(src);
      if (!match) return undefined;
      const raw = match[0];
      const type =
        typeof match[1] === "string" ? match[1].toLowerCase() : "note";
      const lines = raw.split("\n");
      lines.shift();
      const content = lines
        .map((line) => line.replace(/^>[ \t]*/, ""))
        .join("\n")
        .trim();
      return {
        type: "callout",
        raw,
        calloutType: type,
        tokens: lexer.blockTokens(content),
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const parsedContent = helpers.parseChildren(token.tokens || []);
    return {
      type: "callout",
      attrs: {
        type: token["calloutType"],
      },
      content:
        parsedContent.length > 0 ? parsedContent : [{ type: "paragraph" }],
    };
  },

  renderMarkdown: (node, helpers) => {
    const type = (node.attrs?.["type"] || "note").toUpperCase();
    const content = helpers.renderChildren(node.content || []);
    const lines = typeof content === "string" ? content.trim().split("\n") : [];
    const blockquoteLines = lines.map((line: string) =>
      line ? `> ${line}` : ">",
    );
    return `> [!${type}]\n${blockquoteLines.join("\n")}\n\n`;
  },
});
