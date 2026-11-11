import { renderIcons } from "@/utils/icons";
import { InputRule, Node, PasteRule, mergeAttributes } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

export type CalloutType = keyof typeof CALLOUT_CONFIG;

const CALLOUT_REGEX =
  /^>[ \t]*\[!(note|tip|warning|danger|info)\][ \t]*\n((?:>[ \t]?.*(?:\n|$))*)/i;
const CALLOUT_INPUT_REGEX =
  /^(?:>\s?)?\[!(note|tip|warning|danger|info)\][\s\n]$/i;
const CALLOUT_PASTE_REGEX =
  /^(?:>\s?)?\[!(note|tip|warning|danger|info)\][ \t]*/gim;
const CALLOUT_PREFIX_REGEX = /^>\s*\[!(?:note|tip|warning|danger|info)\]/im;

const CALLOUT_CONFIG = {
  note: { label: "Note", icon: "Pencil" },
  tip: { label: "Tip", icon: "Flame" },
  warning: { label: "Warning", icon: "TriangleAlert" },
  danger: { label: "Danger", icon: "Zap" },
  info: { label: "Info", icon: "Info" },
} as const;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (el) => el.getAttribute("data-callout-type") || "note",
        renderHTML: (attrs) => ({ "data-callout-type": attrs["type"] }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout-type]",
        contentElement: ".callout-content",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs["type"] as CalloutType) || "note";
    const config = CALLOUT_CONFIG[type] || CALLOUT_CONFIG.note;
    const iconWrapper = document.createElement("span");
    iconWrapper.className = "callout-icon";
    const iconPlaceholder = document.createElement("i");
    iconPlaceholder.setAttribute("data-lucide", config.icon);
    iconWrapper.appendChild(iconPlaceholder);
    renderIcons(iconWrapper);
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout" }),
      [
        "div",
        { class: "callout-header", contenteditable: "false" },
        iconWrapper,
        ["span", { class: "callout-title" }, config.label],
      ],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attributes),
      toggleCallout:
        (attributes) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attributes),
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: CALLOUT_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          const type =
            typeof match[1] === "string"
              ? match[1].toLowerCase()
              : ("note" as CalloutType);
          const { tr } = state;
          const $from = state.doc.resolve(range.from);
          const isInsideBlockquote =
            $from.depth >= 2 &&
            $from.node($from.depth - 1).type.name === "blockquote";
          tr.delete(range.from, range.to);
          if (isInsideBlockquote) {
            const blockquotePos = $from.before($from.depth - 1);
            tr.setNodeMarkup(blockquotePos, this.type, { type });
          } else {
            const blockRange = tr.doc.resolve(range.from).blockRange();
            if (blockRange) {
              tr.wrap(blockRange, [{ type: this.type, attrs: { type } }]);
            }
          }
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: CALLOUT_PASTE_REGEX,
        handler: ({ state, range, match }) => {
          const type =
            typeof match[1] === "string"
              ? (match[1].toLowerCase() as CalloutType)
              : ("note" as CalloutType);
          const { tr } = state;
          const from = tr.mapping.map(range.from);
          const to = tr.mapping.map(range.to);
          const $from = tr.doc.resolve(from);
          const isInsideBlockquote =
            $from.depth >= 2 &&
            $from.node($from.depth - 1).type.name === "blockquote";
          tr.delete(from, to);
          if (isInsideBlockquote) {
            const blockquotePos = $from.before($from.depth - 1);
            tr.setNodeMarkup(blockquotePos, this.type, { type });
          } else {
            const blockRange = tr.doc.resolve(from).blockRange();
            if (blockRange) {
              tr.wrap(blockRange, [{ type: this.type, attrs: { type } }]);
            }
          }
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    const isBetweenCallouts = (state: EditorState) => {
      const $pos = state.selection.$anchor;
      if (
        $pos.parent.type.name !== "paragraph" ||
        $pos.parent.content.size > 0
      ) {
        return false;
      }
      const parent = $pos.node($pos.depth - 1);
      const index = $pos.index($pos.depth - 1);
      const prev = parent?.maybeChild(index - 1);
      const next = parent?.maybeChild(index + 1);
      return prev?.type.name === this.name && next?.type.name === this.name;
    };
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $anchor, empty } = selection;
        if (!empty) return false;
        if (isBetweenCallouts(editor.state)) return true;
        if ($anchor.parentOffset !== 0) return false;
        for (let depth = $anchor.depth; depth > 0; depth--) {
          const node = $anchor.node(depth);
          if (node.type.name === this.name) {
            const isAtFirstChild = $anchor.index(depth - 1) === 0;
            if (isAtFirstChild) {
              return editor.commands.lift(this.name);
            }
          }
        }
        return false;
      },
    };
  },
  markdownTokenizer: {
    name: "callout",
    level: "block",
    start: (src) => src.search(CALLOUT_PREFIX_REGEX),
    tokenize: (src, _tokens, lexer) => {
      const match = CALLOUT_REGEX.exec(src);
      if (!match) return undefined;
      const calloutType = match[1]?.toLowerCase();
      const innerMarkdown = match[2]?.replace(/^>[ \t]?/gm, "").trim();
      return {
        type: "callout",
        raw: match[0],
        calloutType,
        tokens: innerMarkdown ? lexer.blockTokens(innerMarkdown) : [],
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const content = helpers.parseChildren(token.tokens || []);
    return {
      type: "callout",
      attrs: { type: token["calloutType"] || "note" },
      content: content.length ? content : [{ type: "paragraph" }],
    };
  },

  renderMarkdown: (node, helpers) => {
    const type = (node.attrs?.["type"] || "note").toUpperCase();
    const children = helpers.renderChildren(node.content || [], "\n\n").trim();
    const body = children ? `\n${children}` : "";
    return `${helpers.wrapInBlock("> ", `[!${type}]${body}`)}\n\n`;
  },
});
