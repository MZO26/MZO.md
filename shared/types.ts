import type { Editor } from "@tiptap/core";
import type { Settings } from "http2";
import type { Views } from "../electron/db/views";

type NativeWindowColors = {
  backgroundColor: string;
  overlayOptions: TitleBarOverlayOptions;
};

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
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

interface AutoSaveConfig {
  editor: Editor;
  signal: AbortSignal;
  noteID?: string;
}

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

type NoteData = {
  title: string;
  snippet: string;
  tags: string[];
  todos_left: number;
  stringifiedContent: string;
  now: string;
};

export type {
  AutoSaveConfig,
  AutoScrollOptions,
  BubbleMenuCommands,
  Code,
  IpcResponse,
  NativeWindowColors,
  NoteData,
  NoteItemElements,
  ResolvedTheme,
  Settings,
  TitleBarOverlayOptions,
  Views,
  WorkerResult,
};
