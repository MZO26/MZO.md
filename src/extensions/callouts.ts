import { renderIcons } from "@/utils/icons";
import { InputRule, Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const CALLOUT_TYPES = ["note", "tip", "warning", "danger", "info"] as const;

export type CalloutType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_CONFIG = {
  note: { label: "Note", icon: "Pencil" },
  tip: { label: "Tip", icon: "Flame" },
  warning: { label: "Warning", icon: "TriangleAlert" },
  danger: { label: "Danger", icon: "Zap" },
  info: { label: "Info", icon: "Info" },
} satisfies Record<CalloutType, { label: string; icon: string }>;

const typePattern = CALLOUT_TYPES.join("|");

const CALLOUT_INPUT_REGEX = new RegExp(`^(?:>\\s?)?\\[!(${typePattern})\\][\\s\\n]$`, "i");

const CALLOUT_PREFIX_REGEX = new RegExp(`^>[ \\t]*\\[!(?:${typePattern})\\]`, "im");

const CALLOUT_REGEX = new RegExp(
  `^>[ \\t]*\\[!(${typePattern})\\][ \\t]*(?:\\n((?:>[ \\t]?.*(?:\\n|$))*)|$)`,
  "i",
);

function toCalloutType(value: unknown): CalloutType {
  const type = typeof value === "string" ? value.toLowerCase() : "";
  return CALLOUT_TYPES.find((t) => t === type) ?? "note";
}

function getCalloutConfig(type: unknown) {
  return CALLOUT_CONFIG[toCalloutType(type)];
}

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
  content: "(paragraph | bulletList | orderedList | taskList)+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => toCalloutType(element.getAttribute("data-callout-type")),
        renderHTML: ({ type }) => ({
          "data-callout-type": type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout-type]",
        contentElement: (element) => element.querySelector(".callout-content") ?? element,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { label, icon } = getCalloutConfig(node.attrs["type"]);

    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout" }),
      [
        "div",
        { class: "callout-header", contenteditable: "false" },
        createIcon(icon),
        ["span", { class: "callout-title" }, label],
      ],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { type: toCalloutType(attributes?.type) },
            content: [{ type: "paragraph" }],
          }),
      toggleCallout:
        (attributes) =>
        ({ editor, tr, commands }) => {
          const type = toCalloutType(attributes?.type);
          if (editor.isActive(this.name, { type })) {
            return commands.lift(this.name);
          }
          if (editor.isActive(this.name)) {
            return commands.updateAttributes(this.name, { type });
          }
          if (tr.selection.empty) {
            return commands.setCallout({ type });
          }
          return commands.wrapIn(this.name, { type });
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: CALLOUT_INPUT_REGEX,
        handler: ({ state, range, match, commands }) => {
          const { $from } = state.selection;
          if ($from.depth !== 1 || $from.parent.type.name !== "paragraph") return;
          commands.insertContentAt(range, {
            type: this.name,
            attrs: { type: toCalloutType(match[1]) },
            content: [{ type: "paragraph" }],
          });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size > 0) {
          return false;
        }
        const calloutDepth = $from.depth - 1;
        if (calloutDepth < 1 || $from.node(calloutDepth).type.name !== this.name) {
          return false;
        }
        const calloutNode = $from.node(calloutDepth);
        const isLastChild = $from.index(calloutDepth) === calloutNode.childCount - 1;
        if (!isLastChild) {
          return false;
        }
        const emptyP = state.schema.nodes["paragraph"];
        if (!emptyP) return false;
        return editor.commands.command(({ tr, dispatch }) => {
          if (!dispatch) return true;
          const afterCallout = $from.after(calloutDepth);
          if (calloutNode.childCount > 1) {
            tr.delete($from.before($from.depth), $from.after($from.depth));
          }
          const insertPos = tr.mapping.map(afterCallout);
          tr.insert(insertPos, emptyP.create());
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
          tr.scrollIntoView();
          return true;
        });
      },
    };
  },

  markdownTokenizer: {
    name: "callout",
    level: "block",
    start: (source) => source.search(CALLOUT_PREFIX_REGEX),
    tokenize: (source, _tokens, lexer) => {
      const match = CALLOUT_REGEX.exec(source);
      if (!match) return;
      const content = match[2]?.replace(/^>[ \t]?/gm, "").trim() ?? "";
      return {
        type: "callout",
        raw: match[0],
        calloutType: match[1]?.toLowerCase(),
        tokens: content ? lexer.blockTokens(content) : [],
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const content = helpers.parseChildren(token.tokens ?? []);
    return {
      type: "callout",
      attrs: { type: toCalloutType(token["calloutType"]) },
      content: content.length ? content : [{ type: "paragraph" }],
    };
  },

  renderMarkdown: (node, helpers) => {
    const type = toCalloutType(node.attrs?.["type"]).toUpperCase();
    const children = helpers.renderChildren(node.content ?? [], "\n\n").trim();
    const body = children ? `\n${children}` : "";
    return `${helpers.wrapInBlock("> ", `[!${type}]${body}`)}\n\n`;
  },
});

function createIcon(icon: string) {
  if (typeof document === "undefined") {
    return ["span", { class: "callout-icon" }, ["i", { "data-lucide": icon }]];
  }
  const wrapper = document.createElement("span");
  wrapper.className = "callout-icon";
  const placeholder = document.createElement("i");
  placeholder.setAttribute("data-lucide", icon);
  wrapper.appendChild(placeholder);
  renderIcons(wrapper);
  return wrapper;
}
