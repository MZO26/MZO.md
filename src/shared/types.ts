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

export type { Note, Theme };
