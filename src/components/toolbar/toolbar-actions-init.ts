import type { ActionMap } from "@/utils/types";

const TOP_TOOLBAR_ACTIONS: ActionMap = {
  editorWidth: {
    action: "app:set-editor-width",
    icon: "RulerDimensionLine",
  },
  focus: {
    action: "app:toggle-focus-mode",
    icon: "Focus",
  },
  toggleToolbar: {
    action: "app:toggle-toolbar",
    icon: "ArrowDownFromLine",
  },
};

const TOOLBAR_ACTIONS: ActionMap = {
  toggleSidebar: {
    action: "app:toggle-sidebar",
    icon: "ArrowLeftFromLine",
  },
  undo: {
    action: "undo",
    icon: "Undo2",
  },
  redo: {
    action: "redo",
    icon: "Redo2",
  },
  search: {
    action: "app:toggle-editor-search",
    icon: "Search",
  },
  quickSwitch: {
    action: "app:toggle-quick-switch",
    icon: "FileClock",
  },
  divider1: { type: "divider" },
  bold: {
    action: "bold",
    icon: "Bold",
  },
  italic: {
    action: "italic",
    icon: "Italic",
  },
  strike: {
    action: "strike",
    icon: "Strikethrough",
  },
  underline: {
    action: "underline",
    icon: "Underline",
  },
  highlight: {
    action: "highlight",
    icon: "Highlighter",
  },
  mathInline: {
    action: "mathInline",
    icon: "Sigma",
  },
  divider2: { type: "divider" },
  heading1: {
    action: "heading1",
    icon: "Heading1",
  },
  heading2: {
    action: "heading2",
    icon: "Heading2",
  },
  heading3: {
    action: "heading3",
    icon: "Heading3",
  },
  divider3: { type: "divider" },
  bulletList: {
    action: "bulletList",
    icon: "List",
  },
  orderedList: {
    action: "orderedList",
    icon: "ListOrdered",
  },
  blockQuote: {
    action: "blockQuote",
    icon: "TextQuote",
  },
  divider4: { type: "divider" },
  inlineCode: {
    action: "inlineCode",
    icon: "Code",
  },
  codeBlock: {
    action: "codeBlock",
    icon: "CodeXml",
  },
  mathBlock: {
    action: "mathBlock",
    icon: "SquareSigma",
  },
  horizontalRule: {
    action: "horizontalRule",
    icon: "SeparatorHorizontal",
  },
  divider5: { type: "divider" },
  link: {
    action: "link",
    icon: "Link",
  },
  image: {
    action: "image",
    icon: "Image",
  },
  table: {
    action: "table",
    icon: "Grid2x2",
  },
};

export { TOOLBAR_ACTIONS, TOP_TOOLBAR_ACTIONS };
