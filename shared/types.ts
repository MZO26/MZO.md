import type {
  ALLOWED_IMPORT_EXTENSIONS,
  APP_EVENTS,
  CODE_THEMES,
  QUICK_ACTIONS,
  SELECTION_ACTIONS,
  SIDEBAR_FILTER_MODES,
} from "@shared/constants/renderer-constants";
import type { AppErrorCode, WorkerErrorCode } from "@shared/errors";
import type { NoteListItem, SearchResult } from "@shared/schemas/note-schema";
import type {
  AppSettings,
  ExportFormat,
  Theme,
} from "@shared/schemas/store-schema";
import type { Editor, SetContentOptions } from "@tiptap/core";
import type { SETTINGS_CATEGORIES } from "./constants/setting-constants";

type NativeWindowColors = {
  backgroundColor: string;
  overlayOptions: TitleBarOverlayOptions;
};

type LinkAttributes = {
  href?: string;
  url?: string;
};

type MathOptions =
  | {
      mode: "insert";
      type: "inline" | "block";
      initialValue?: string;
    }
  | {
      mode: "update";
      type: "inline" | "block";
      pos: number;
      initialValue?: string;
    };

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
  focus?: boolean;
};

type UrlDecision = "allow" | "block" | "external";

type ResolvedTheme = Extract<Theme, "light" | "dark">;

type SelectOption<T extends string | boolean> = { value: T; label: string };

type Code = (typeof CODE_THEMES)[number];

type TableAction =
  | "addRowBefore"
  | "addRowAfter"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable";

type Expand<T> = T extends unknown ? { [K in keyof T]: T[K] } : never;

type DeepExpand<T> = T extends object
  ? { [K in keyof T]: DeepExpand<T[K]> }
  : T;

type Success<T> = {
  success: true;
  data: T;
};

type Failure<E = AppErrorCode> = {
  success: false;
  error: E;
};

type Result<T, E = AppErrorCode> = Success<T> | Failure<E>;

type WorkerSuccess<T> = {
  success: true;
  data: T;
};

interface WorkerRequest<T> {
  id: string;
  payload: T;
}

type WorkerFailure<E = WorkerErrorCode> = {
  success: false;
  error: E;
};

type WorkerResult<T, E = WorkerErrorCode> = WorkerSuccess<T> | WorkerFailure<E>;

type Action = {
  type?: "action";
  run: (args?: Editor | null) => void;
  isActive?: (args: Editor) => boolean;
  isDisabled?: (args: Editor) => boolean;
  icon: string;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;

type ActionMap = Record<string, ToolbarItem>;

type Metadata = {
  snippet: string;
  tags: string[];
  links: string[];
};

type ImportStats = {
  total: number;
  duplicates: number;
  errors: number;
};

type ImageCompressionPayload = {
  buffer: ArrayBuffer;
  mimeType: string;
  maxWidth: number;
  quality: number;
};

type PDFAssets = { template: string; css: string };

type ImportExtension = (typeof ALLOWED_IMPORT_EXTENSIONS)[number];

type ContentType = ImportExtension;

type EditorContentType = NonNullable<SetContentOptions["contentType"]>;

type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

interface AppRegistry {
  ui: Partial<UIRegistry>;
  core: Partial<CoreRegistry>;
  template: Partial<TemplateRegistry>;
}

interface CoreRegistry {
  editor: Editor;
  appContainer: HTMLDivElement;
  sidebar: HTMLDivElement;
  sidebarContainer: HTMLDivElement;
  editorWrapper: HTMLDivElement;
  editorContainer: HTMLDivElement;
}

interface UIRegistry {
  wordCountEl: HTMLSpanElement;
  charCountEl: HTMLSpanElement;
  readingTime: HTMLSpanElement;
  searchInput: HTMLInputElement;
  sidebarHeader: HTMLDivElement;
  sidebarFooter: HTMLDivElement;
  selectionFooter: HTMLDivElement;
  quickActionContainer: HTMLDivElement;
}

interface TemplateRegistry {
  // editor empty state template and view
  editorEmptyStateTemplate: HTMLTemplateElement;
  editorView: HTMLDivElement;
  // sidebar empty state template
  sidebarEmptyStateTemplate: HTMLTemplateElement;
  // note item template
  noteItemTemplate: HTMLTemplateElement;
}

type SidebarParams = {
  visibleNotes: readonly NoteListItem[];
  searchSnippets: Record<string, string>;
  query: string;
  activeId: string | null;
  activeTag?: string | null;
  display: AppSettings["note_item_display"];
};

type SnippetGenParams = {
  item: HTMLDivElement;
  note: NoteListItem;
  snippets: Record<string, string>;
  display: AppSettings["note_item_display"];
};

type SelectionParams = {
  selectionMode: boolean;
  selectedIds: Set<string>;
};

type QuickSwitchDisplayNote = Expand<
  Pick<NoteListItem, "id" | "title"> & {
    section: "recent" | "backlink" | "outgoing";
  }
>;

type AllTagsMenu = {
  popover: HTMLDivElement;
  content: HTMLDivElement;
  render(tags: string[]): void;
  toggle(): void;
  open(): void;
  close(): void;
};

type SelectionAction = (typeof SELECTION_ACTIONS)[number]["id"];

type QuickAction = (typeof QUICK_ACTIONS)[number]["id"];

type QuickActionConfig = {
  id: QuickAction;
  icon: string;
  label: string;
};

type FilterMode = (typeof SIDEBAR_FILTER_MODES)[number];

type AppEvents = (typeof APP_EVENTS)[number];

type MappedMatches = Expand<
  Omit<SearchResult, "search_match"> & { snippet: string }
>[];

type ImageContent = (
  | {
      type: string;
      attrs: {
        src: {
          imageSrc: string;
        };
      };
    }
  | {
      type: string;
      attrs?: never;
    }
)[];

export type {
  Action,
  ActionMap,
  AllTagsMenu,
  AppEvents,
  AppRegistry,
  Code,
  ContentType,
  CoreRegistry,
  DeepExpand,
  EditorContentType,
  Expand,
  ExportFormat,
  Failure,
  FilterMode,
  ImageCompressionPayload,
  ImageContent,
  ImportExtension,
  ImportStats,
  LinkAttributes,
  MappedMatches,
  MathOptions,
  Metadata,
  NativeWindowColors,
  PDFAssets,
  QuickAction,
  QuickActionConfig,
  QuickSwitchDisplayNote,
  ResolvedTheme,
  Result,
  SelectionAction,
  SelectionParams,
  SelectOption,
  SettingsCategory,
  SidebarParams,
  SnippetGenParams,
  Success,
  TableAction,
  TemplateRegistry,
  TitleBarOverlayOptions,
  ToolbarItem,
  UIRegistry,
  UrlDecision,
  WorkerRequest,
  WorkerResult,
};
