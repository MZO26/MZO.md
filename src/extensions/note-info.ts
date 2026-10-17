import { noteStore, stateStore } from "@/state/state";
import { formatUpdatedAt } from "@/utils/date";
import type { Id } from "@shared/schemas/note-schema";
import { Extension } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const noteMetaKey = new PluginKey<DecorationSet>("noteMeta");

interface NoteInfo {
  key: string;
  updatedAt: string;
}

function getNoteInfo(): NoteInfo | null {
  const activeId = stateStore.get("activeId") as Id | null;
  if (!activeId) return null;
  const activeNote = noteStore.get("noteIndex").get(activeId);
  if (!activeNote) return null;
  return {
    key: `info-${activeId}-${activeNote.updated_at}-${activeNote.tags.join(" ")}`,
    updatedAt: activeNote.updated_at,
  };
}

function createNoteInfoDecoration(state: EditorState): DecorationSet {
  const first = state.doc.firstChild;
  if (!first || first.type.name !== "heading" || first.content.size === 0)
    return DecorationSet.empty;
  const info = getNoteInfo();
  if (!info) return DecorationSet.empty;
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
        dom.appendChild(timeEl);
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
            if (!tr.docChanged && !tr.getMeta("noteInfoRefresh")) return oldSet;
            return createNoteInfoDecoration(newState);
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
