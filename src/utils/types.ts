import type { APP_ICONS } from "@/utils/icons";
import type { WorkerErrorCode } from "@shared/errors";
import type {
  Id,
  NoteListItem,
  SearchResult,
} from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { AppEvent } from "@shared/shared-types";
import type { Editor, SetContentOptions } from "@tiptap/core";

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

type SelectOption<T extends string | boolean> = {
  value: T;
  label: string;
};

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
  action: AppEvent;
  icon: AppIcons;
};

type Divider = {
  type: "divider";
};

type ToolbarItem = Action | Divider;

type ActionMap = Record<string, ToolbarItem>;

type ImageCompressionPayload = {
  buffer: ArrayBuffer;
  mimeType: string;
  maxWidth: number;
  quality: number;
};

type EditorContentType = NonNullable<SetContentOptions["contentType"]>;

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

type ActiveStateParams = {
  buttonElements: Map<string, HTMLButtonElement>;
  actions: ActionMap;
  editor: Editor;
};

type QuickSwitchDisplayNote =
  | (Pick<NoteListItem, "id" | "title"> & {
      section:
        | "search"
        | "create"
        | "recent"
        | "backlink"
        | "outgoing"
        | "related";
    })
  | { title: string; section: "create" };

type AllTagsMenu = {
  popover: HTMLDivElement;
  content: HTMLDivElement;
  render(tags: string[]): void;
  toggle(): void;
  open(): void;
  close(): void;
};

type SelectionAction =
  | "cancel"
  | "pin"
  | "export"
  | "copy-rich-text"
  | "delete";

type SelectionActionConfig = { id: SelectionAction; icon: AppIcons };

type SettingsCategory = "Appearance" | "Editor" | "General";

type AppIcons = keyof typeof APP_ICONS;

type QuickAction = "open-path" | "backup-db" | "backup-db-restore";

type QuickActionConfig = {
  id: QuickAction;
  icon: AppIcons;
  label: string;
};

type FilterMode = "recent" | "search" | "tag";

type MappedMatches = Omit<SearchResult, "search_match"> & {
  snippet: string;
};

export type {
  Action,
  ActionMap,
  ActiveStateParams,
  AllTagsMenu,
  AppIcons,
  EditorContentType,
  FilterMode,
  ImageCompressionPayload,
  MappedMatches,
  MathOptions,
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
  ToolbarItem,
  WorkerRequest,
  WorkerResult,
};
