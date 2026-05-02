import type { Views } from "@electron/db/views";
import type { Note } from "@shared/schemas/note-schema";
import type { Editor } from "@tiptap/core";

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

type BubbleMenuCommands = (
  value?: string | undefined,
) => boolean | void | Promise<void>;

type BubbleMenuGroup = "text" | "inlineCode" | "codeBlock" | "table";

type Action = {
  type?: "action";
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  icon: string;
  shortcut?: string;
  group?: BubbleMenuGroup;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;
type ActionMap = Record<string, ToolbarItem>;

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
  BubbleMenuCommands,
  BubbleMenuGroup,
  Code,
  DbRow,
  IpcResponse,
  Metadata,
  NativeWindowColors,
  NoteItemElements,
  ResolvedTheme,
  TitleBarOverlayOptions,
  Views,
  WorkerResult,
};
