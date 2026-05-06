import type { Note } from "@shared/schemas/note-schema";

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

type DbRow = Omit<Note, "content" | "tags"> & {
  content: string;
};

export type {
  Action,
  ActionMap,
  AutoScrollOptions,
  Code,
  DbRow,
  IpcResponse,
  Metadata,
  NativeWindowColors,
  NoteItemElements,
  ResolvedTheme,
  TitleBarOverlayOptions,
  WorkerResult,
};
