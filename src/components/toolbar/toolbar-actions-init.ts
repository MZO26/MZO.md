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
    action: "editor:undo",
    icon: "Undo2",
  },
  redo: {
    action: "editor:redo",
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
    action: "editor:bold",
    icon: "Bold",
  },
  italic: {
    action: "editor:italic",
    icon: "Italic",
  },
  strike: {
    action: "editor:strike",
    icon: "Strikethrough",
  },
  underline: {
    action: "editor:underline",
    icon: "Underline",
  },
  highlight: {
    action: "editor:highlight",
    icon: "Highlighter",
  },
  mathInline: {
    action: "editor:math-inline",
    icon: "Sigma",
  },
  divider2: { type: "divider" },
  heading1: {
    action: "editor:heading1",
    icon: "Heading1",
  },
  heading2: {
    action: "editor:heading2",
    icon: "Heading2",
  },
  heading3: {
    action: "editor:heading3",
    icon: "Heading3",
  },
  divider3: { type: "divider" },
  bulletList: {
    action: "editor:bullet-list",
    icon: "List",
  },
  orderedList: {
    action: "editor:ordered-list",
    icon: "ListOrdered",
  },
  blockQuote: {
    action: "editor:block-quote",
    icon: "TextQuote",
  },
  divider4: { type: "divider" },
  inlineCode: {
    action: "editor:inline-code",
    icon: "Code",
  },
  codeBlock: {
    action: "editor:code-block",
    icon: "CodeXml",
  },
  mathBlock: {
    action: "editor:math-block",
    icon: "SquareSigma",
  },
  horizontalRule: {
    action: "editor:horizontal-rule",
    icon: "SeparatorHorizontal",
  },
  divider5: { type: "divider" },
  link: {
    action: "editor:link",
    icon: "Link",
  },
  image: {
    action: "editor:image",
    icon: "Image",
  },
  table: {
    action: "editor:table",
    icon: "Grid2x2",
  },
};

export { TOOLBAR_ACTIONS, TOP_TOOLBAR_ACTIONS };
