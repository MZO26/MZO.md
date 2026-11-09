import type { SettingEventStrings } from "@/settings/settings-commands";
import type { EXPORT_LABELS } from "@/utils/constants";
import type { APP_ICONS } from "@/utils/icons";
import type { WorkerErrorCode } from "@shared/errors";
import type { EditorEventStrings } from "@shared/event-emitter";
import type {
  Id,
  NoteListItem,
  SearchResult,
} from "@shared/schemas/note-schema";
import type { AppSettings } from "@shared/schemas/store-schema";
import type { AppEvent } from "@shared/shared-types";
import type { Editor } from "@tiptap/core";

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

type NoteSection = "search" | "recent" | "backlink" | "outgoing" | "related";

type ActionEntry<Section extends string, Key> = {
  title: string;
  section: Section;
  commandKey: Key;
  isActive: boolean;
};

type QuickSwitchDisplayCommand =
  | ActionEntry<"command", EditorEventStrings>
  | ActionEntry<"setting", SettingEventStrings>;

type QuickSwitchDisplayBadge =
  | (Pick<NoteListItem, "id" | "title"> & { section: NoteSection })
  | { title: string; section: "create" }
  | QuickSwitchDisplayCommand
  | {
      title: string;
      section: "tag";
      count: number;
      isActive?: boolean;
    };

type AppIcons = keyof typeof APP_ICONS;

type FilterMode = "recent" | "search" | "tag";

type MappedMatches = Omit<SearchResult, "search_match"> & {
  snippet: string;
};

type ExportFormat = keyof typeof EXPORT_LABELS;

export type {
  Action,
  ActionMap,
  ActiveStateParams,
  AppIcons,
  ExportFormat,
  FilterMode,
  ImageCompressionPayload,
  MappedMatches,
  MathOptions,
  NoteSection,
  QuickSwitchDisplayBadge,
  SelectionParams,
  SidebarParams,
  SnippetGenParams,
  ToolbarItem,
  WorkerRequest,
  WorkerResult,
};
