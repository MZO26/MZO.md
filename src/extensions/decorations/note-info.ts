import { noteStore, stateStore } from "@/state/state";
import { formatUpdatedAt } from "@/utils/date";
import type { Id } from "@shared/schemas/note-schema";
import { Extension } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const noteMetaKey = new PluginKey<DecorationSet>("noteMeta");

interface TaskInfo {
  tasks: number;
  completed: number;
}

interface NoteInfo extends TaskInfo {
  key: string;
  updatedAt: string;
}

function getNoteInfo(state: EditorState): NoteInfo | null {
  const activeId = stateStore.get("activeId") as Id | null;
  if (!activeId) return null;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  if (!activeNote) return null;
  const { tasks, completed } = getTaskInfo(state);
  return {
    key: `info-${activeId}-${activeNote.updated_at}-${tasks}-${completed}`,
    updatedAt: activeNote.updated_at,
    tasks,
    completed,
  };
}

function getTaskInfo(state: EditorState): TaskInfo {
  let tasks = 0;
  let completed = 0;
  const taskItemType = state.schema.nodes["taskItem"];
  state.doc.descendants((node) => {
    if (node.type === taskItemType) {
      tasks++;
      if (node.attrs?.["checked"]) completed++;
      return false;
    }
    if (node.isTextblock) return false;
    return true;
  });
  return { tasks, completed };
}

function createNoteInfoDecoration(
  state: EditorState,
  oldSet?: DecorationSet,
): DecorationSet {
  const first = state.doc.firstChild;
  if (
    !first ||
    first.type !== state.schema.nodes["heading"] ||
    first.content.size === 0
  )
    return DecorationSet.empty;
  const info = getNoteInfo(state);
  if (!info) return DecorationSet.empty;
  const existing = oldSet?.find()[0];
  if (
    existing &&
    existing.spec.key === info.key &&
    existing.from === first.nodeSize
  ) {
    return oldSet;
  }
  return DecorationSet.create(state.doc, [
    Decoration.widget(
      first.nodeSize,
      () => {
        const dom = document.createElement("div");
        dom.className = "note-info-widget";
        dom.contentEditable = "false";
        const timeEl = document.createElement("span");
        timeEl.className = "note-info-time";
        timeEl.textContent = `Updated: ${formatUpdatedAt(info.updatedAt)}`;
        dom.append(timeEl);
        if (info.tasks > 0) {
          const taskCompletion = (info.completed / info.tasks) * 100;
          const progressBar = document.createElement("div");
          progressBar.className = "note-info-progress-bar-bg";
          if (taskCompletion === 100) progressBar.classList.add("is-complete");
          const fill = document.createElement("div");
          fill.className = "note-info-progress-bar-fill";
          fill.style.width = `${taskCompletion}%`;
          progressBar.append(fill);
          const countLabel = document.createElement("span");
          countLabel.className = "note-info-task-label";
          countLabel.textContent = `${info.completed}/${info.tasks}`;
          dom.append(progressBar, countLabel);
        }
        return dom;
      },
      {
        side: -1,
        key: info.key,
        ignoreSelection: true,
      },
    ),
  ]);
}

export const NoteInfoWidget = Extension.create({
  name: "noteInfo",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: noteMetaKey,
        state: {
          init: (_, state) => createNoteInfoDecoration(state),
          apply: (tr, oldSet, _oldState, newState) => {
            try {
              if (!tr.docChanged && !tr.getMeta("noteInfoRefresh"))
                return oldSet;
              return createNoteInfoDecoration(newState, oldSet);
            } catch (err) {
              return DecorationSet.empty;
            }
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
