import type { ActionMap } from "@/utils/types";

const TOOLBAR_ACTIONS: ActionMap = {
  TOGGLE_SIDEBAR: {
    action: "app:toggle-sidebar",
    icon: "SquarePaddingLeft",
  },
  UNDO: {
    action: "editor:undo",
    icon: "Undo2",
  },
  REDO: {
    action: "editor:redo",
    icon: "Redo2",
  },
  SEARCH: {
    action: "app:toggle-editor-search",
    icon: "Search",
  },
  QUICK_SWITCH: {
    action: "app:toggle-quick-switch",
    icon: "FileClock",
  },
  DIVIDER1: { type: "divider" },
  BOLD: {
    action: "editor:bold",
    icon: "Bold",
  },
  ITALIC: {
    action: "editor:italic",
    icon: "Italic",
  },
  STRIKE: {
    action: "editor:strike",
    icon: "Strikethrough",
  },
  UNDERLINE: {
    action: "editor:underline",
    icon: "Underline",
  },
  HIGHLIGHT: {
    action: "editor:highlight",
    icon: "Highlighter",
  },
  MATH_INLINE: {
    action: "editor:math-inline",
    icon: "Sigma",
  },
  DIVIDER2: { type: "divider" },
  HEADING1: {
    action: "editor:heading1",
    icon: "Heading1",
  },
  HEADING2: {
    action: "editor:heading2",
    icon: "Heading2",
  },
  HEADING3: {
    action: "editor:heading3",
    icon: "Heading3",
  },
  DIVIDER3: { type: "divider" },
  BULLET_LIST: {
    action: "editor:bullet-list",
    icon: "List",
  },
  ORDERED_LIST: {
    action: "editor:ordered-list",
    icon: "ListOrdered",
  },
  TASK_LIST: {
    action: "editor:task-list",
    icon: "ListChecks",
  },
  BLOCK_QUOTE: {
    action: "editor:block-quote",
    icon: "TextQuote",
  },
  DIVIDER4: { type: "divider" },
  INLINE_CODE: {
    action: "editor:inline-code",
    icon: "Code",
  },
  CODE_BLOCK: {
    action: "editor:code-block",
    icon: "CodeXml",
  },
  MATH_BLOCK: {
    action: "editor:math-block",
    icon: "SquareSigma",
  },
  HORIZONTAL_RULE: {
    action: "editor:horizontal-rule",
    icon: "SeparatorHorizontal",
  },
  DIVIDER5: { type: "divider" },
  LINK: {
    action: "editor:link",
    icon: "Link",
  },
  IMAGE: {
    action: "editor:image",
    icon: "Image",
  },
  TABLE: {
    action: "editor:table",
    icon: "Grid2x2",
  },
};

export { TOOLBAR_ACTIONS };
