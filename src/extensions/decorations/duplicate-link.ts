import { noteStore, stateStore } from "@/state/state";
import type { Id, NoteListItem } from "@shared/schemas/note-schema";
import { Extension } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface DuplicateItem {
  key: string;
  targetIds: Id[];
  targetTitle: string;
  duplicates: number;
}

function checkForDuplicates(): Map<Id, DuplicateItem> | null {
  const activeId = stateStore.get("activeId") as Id | null;
  if (!activeId) return null;
  const { noteIndex, notes } = noteStore.getState();
  const activeNote = noteIndex.get(activeId);
  if (!activeNote || activeNote.links.length === 0) return null;
  const linkedIds = new Set(activeNote.links.map((l) => l.id));
  const titleIndex = new Map<string, NoteListItem[]>();
  for (const n of notes) {
    const key = n.title.trim().toLowerCase();
    const arr = titleIndex.get(key);
    if (arr) {
      arr.push(n);
    } else {
      titleIndex.set(key, [n]);
    }
  }
  const duplicatesMap = new Map<Id, DuplicateItem>();
  for (const id of linkedIds) {
    if (id === activeId) continue;
    const note = noteIndex.get(id);
    if (!note) continue;
    const title = note.title.trim().toLowerCase();
    // active id shouldn't count itself as duplicate
    const matching = (titleIndex.get(title) ?? []).filter(
      (n) => n.id !== activeId,
    );
    if (matching.length > 1) {
      const targetIds = matching.map((n) => n.id);
      const info: DuplicateItem = {
        key: `dup-${targetIds.join("-")}-${activeNote.title}-${matching.length}`,
        targetIds,
        targetTitle: note.title,
        duplicates: matching.length,
      };
      for (const targetId of targetIds) {
        duplicatesMap.set(targetId, info);
      }
    }
  }
  return duplicatesMap.size > 0 ? duplicatesMap : null;
}

function findAllNodes(
  doc: PMNode,
  predicate: (node: PMNode) => boolean,
): { node: PMNode; pos: number }[] {
  const results: { node: PMNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (predicate(node)) results.push({ node, pos });
    return true;
  });
  return results;
}

function createDuplicateDecoration(state: EditorState): DecorationSet {
  const duplicates = checkForDuplicates();
  if (!duplicates) return DecorationSet.empty;
  const matches = findAllNodes(
    state.doc,
    (n) => n.type.name === "wikilink" && duplicates.has(n.attrs?.["id"]),
  );
  if (matches.length === 0) return DecorationSet.empty;
  return DecorationSet.create(
    state.doc,
    matches.flatMap(({ node, pos }) => {
      const dupInfo = duplicates.get(node.attrs?.["id"]);
      if (!dupInfo) return [];
      return Decoration.widget(
        pos,
        () => {
          const dom = document.createElement("div");
          dom.className = "duplicate-link-widget";
          dom.contentEditable = "false";
          const titleEl = document.createElement("span");
          titleEl.textContent = `Duplicates with title: ${node.attrs?.["title"]} found: ${dupInfo.duplicates}`;
          dom.appendChild(titleEl);
          return dom;
        },
        {
          side: 1,
          key: dupInfo.key,
          ignoreSelection: true,
        },
      );
    }),
  );
}

export const duplicateLinkKey = new PluginKey<DecorationSet>("duplicateLink");

export const DuplicateLinkWidget = Extension.create({
  name: "duplicateLinkWidget",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: duplicateLinkKey,
        state: {
          init: (_, state) => createDuplicateDecoration(state),
          apply: (tr, oldSet, _oldState, newState) => {
            if (tr.getMeta("duplicateLinkRefresh")) {
              return createDuplicateDecoration(newState);
            }
            if (tr.docChanged) {
              return oldSet.map(tr.mapping, tr.doc);
            }
            return oldSet;
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
