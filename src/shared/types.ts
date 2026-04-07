interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  tags: string[];
}

type Theme =
  | "light"
  | "dark"
  | "dark-glass"
  | "light-glass"
  | "paper"
  | "nord"
  | "sepia"
  | "lavender"
  | "system";

type Font =
  | "system"
  | "arial"
  | "verdana"
  | "trebuchet"
  | "georgia"
  | "courier"
  | "times"
  | "palpatino"
  | "garamond"
  | "tahoma"
  | "century"
  | "consolas";

export type { Font, Note, Theme };
