type NativeWindowColors = {
  backgroundColor: string;
  overlayOptions: TitleBarOverlayOptions;
};

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
  focus?: boolean;
};

type ResolvedTheme = "light" | "dark";

type Code =
  | "github-light"
  | "github-dark"
  | "atom-one-light"
  | "atom-one-dark"
  | "solarized-dark"
  | "solarized-light";

type IpcResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      message: string;
    };

type WorkerResult =
  | { success: true; data: Uint8Array }
  | { success: false; message: string };

type NoteItemElements = {
  snippetContainer: HTMLDivElement | null;
  dateContainer: HTMLDivElement | null;
  titleContainer: HTMLDivElement | null;
};

type AutoScrollOptions = {
  getScrollContainer: (editorRoot: HTMLElement) => HTMLElement;
  edge?: number;
  maxSpeed?: number;
};

type Action<T> = {
  type?: "action";
  run: (args: T) => void;
  isActive?: (args: T) => boolean;
  isDisabled?: (args: T) => boolean;
  icon: string;
  shortcut: string;
};

type Divider = {
  type: "divider";
};

type ToolbarItem<T> = Action<T> | Divider;

type ActionMap<T> = Record<string, ToolbarItem<T>>;

type Metadata = {
  title: string;
  snippet: string;
  tags: string[];
  todos_left: number;
};

type NoteRow = {
  id: string;
  title: string;
  content: string;
  snippet: string;
  bookmarked: 0 | 1;
  pinned: 0 | 1;
  todos_left: number;
  plainText: string;
  is_mirrored: 0 | 1;
  created_at: number;
  updated_at: number;
  tags: string;
};

type ZoomAction = "get" | "in" | "out" | "reset";

export type {
  Action,
  ActionMap,
  AutoScrollOptions,
  Code,
  IpcResponse,
  Metadata,
  NativeWindowColors,
  NoteItemElements,
  NoteRow,
  ResolvedTheme,
  TitleBarOverlayOptions,
  WorkerResult,
  ZoomAction,
};
