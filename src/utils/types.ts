import type { APP_ICONS } from "@/utils/icons";
import type { WorkerErrorCode } from "@shared/errors";
import type {
  Id,
  NoteListItem,
  SearchResult,
} from "@shared/schemas/note-schema";
import type { AppSettings, ExportFormat } from "@shared/schemas/store-schema";
import type {
  APP_EVENTS,
  SETTINGS_CATEGORIES,
  SIDEBAR_FILTER_MODES,
} from "@shared/shared-constants";
import type { Editor, SetContentOptions } from "@tiptap/core";

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

type SelectOption<T extends string | boolean> = { value: T; label: string };

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
  icon: AppIcons;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;

type ActionMap = Record<string, ToolbarItem>;

type Metadata = {
  snippet: string;
  tags: string[];
  links: Id[];
};

type ImageCompressionPayload = {
  buffer: ArrayBuffer;
  mimeType: string;
  maxWidth: number;
  quality: number;
};

type EditorContentType = NonNullable<SetContentOptions["contentType"]>;

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
  searchSnippets: Record<Id, string>;
  query: string;
  activeId: Id | null;
  activeTag?: string | null;
  display: AppSettings["note_item_display"];
};

type SnippetGenParams = {
  item: HTMLDivElement;
  note: NoteListItem;
  snippets: Record<Id, string>;
  display: AppSettings["note_item_display"];
};

type SelectionParams = {
  selectionMode: boolean;
  selectedIds: Set<Id>;
};

type QuickSwitchDisplayNote = Pick<NoteListItem, "id" | "title"> & {
  section: "recent" | "backlink" | "outgoing";
};

type AllTagsMenu = {
  popover: HTMLDivElement;
  content: HTMLDivElement;
  render(tags: string[]): void;
  toggle(): void;
  open(): void;
  close(): void;
};

// number to get keys of array (index) and then indexed access
// has to be as const so ts doesn't infer string
type SelectionAction =
  | "cancel"
  | "pin"
  | "export"
  | "copy-rich-text"
  | "delete";

type SelectionActionConfig = { id: SelectionAction; icon: AppIcons };

type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

type AppIcons = keyof typeof APP_ICONS;

type QuickAction =
  | "open-path"
  | "backup-db"
  | "backup-notes"
  | "backup-db-restore";

type QuickActionConfig = {
  id: QuickAction;
  icon: AppIcons;
  label: string;
};

type FilterMode = (typeof SIDEBAR_FILTER_MODES)[number];

type AppEvents = (typeof APP_EVENTS)[number];

type MappedMatches = (Omit<SearchResult, "search_match"> & {
  snippet: string;
})[];

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
  AppIcons,
  AppRegistry,
  CoreRegistry,
  EditorContentType,
  ExportFormat,
  FilterMode,
  ImageCompressionPayload,
  ImageContent,
  LinkAttributes,
  MappedMatches,
  MathOptions,
  Metadata,
  QuickAction,
  QuickActionConfig,
  QuickSwitchDisplayNote,
  SelectionAction,
  SelectionActionConfig,
  SelectionParams,
  SelectOption,
  SettingsCategory,
  SidebarParams,
  SnippetGenParams,
  TemplateRegistry,
  ToolbarItem,
  UIRegistry,
  WorkerRequest,
  WorkerResult,
};
