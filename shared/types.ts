import type { Editor } from "@tiptap/core";
import type { Settings } from "http2";

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
};

type ThemeConfig = {
  color: string; // background
  symbolColor: string; // button color
  isDark: boolean;
};

type ResolvedTheme = "light" | "dark";

type Code =
  | "github-light"
  | "github-dark"
  | "atom-one-light"
  | "atom-one-dark"
  | "everforest-dark"
  | "everforest-light";

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
  containers: {
    tagContainer: HTMLDivElement | null;
    snippetContainer: HTMLDivElement | null;
    dateContainer: HTMLDivElement | null;
    titleContainer: HTMLDivElement | null;
  };
  tags: string[];
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
  stringifiedContent: string;
  now: string;
};

export type {
  AutoSaveConfig,
  AutoScrollOptions,
  BubbleMenuCommands,
  Code,
  Font,
  IpcResponse,
  NoteData,
  NoteItemElements,
  ResolvedTheme,
  Settings,
  ThemeConfig,
  TitleBarOverlayOptions,
  WorkerResult,
};
