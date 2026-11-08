import { getRelatedNotes } from "@/api/api";
import { editorCommands } from "@/components/editor/editor-commands";
import {
  settingsCommands,
  type SettingEventStrings,
} from "@/settings/settings-commands";
import { noteStore, settingsStore, stateStore } from "@/state/state";
import { UNTAGGED } from "@/utils/constants";
import { memoize, rendererLogger } from "@/utils/helpers";
import { useCore } from "@/utils/registry";
import type { QuickSwitchDisplayBadge } from "@/utils/types";
import type { EditorEventStrings } from "@shared/event-emitter";
import {
  isNoteID,
  type Id,
  type Link,
  type Note,
  type NoteListItem,
} from "@shared/schemas/note-schema";

function tokenize(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(/\p{L}+/gu);
  return matches ?? [];
}

function checkNoteSimilarity(
  titleA: Note["title"],
  titleB: Note["title"],
): number {
  const setA = new Set(tokenize(titleA));
  const setB = new Set(tokenize(titleB));
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const minSize = Math.min(setA.size, setB.size);
  const containmentRatio = intersection / minSize;
  if (containmentRatio === 1.0) {
    return 0.85;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

const getSimilarityMatching = memoize(
  async (
    activeId: Id,
    notes: readonly NoteListItem[],
    noteIndex: Map<Id, NoteListItem>,
  ) => {
    const comparison = noteIndex.get(activeId);
    if (!comparison) return [];
    const relatedNotesQuery = await getRelatedNotes({
      id: activeId,
    });
    const relatedNotes = relatedNotesQuery.success
      ? relatedNotesQuery.data
      : [];
    const titleIndex = new Map(notes.map((n) => [n.title, n.id]));
    for (const index of titleIndex.entries()) {
      if (activeId === index[1]) continue;
      const similarity = checkNoteSimilarity(comparison.title, index[0]);
      if (similarity >= 0.75) {
        rendererLogger.devLog(`Similar note found: ${index[0]}`);
        if (isNoteID(index[1])) {
          const note = noteIndex.get(index[1]);
          if (!note) continue;
          relatedNotes.push({
            id: index[1],
            title: note.title,
          });
        }
      }
    }
    rendererLogger.devLog(
      `[getSimilarityMatching]: matched notes: ${relatedNotes}`,
    );
    return relatedNotes;
  },
);

function getAllUsableEditorCommands() {
  const { editor } = useCore("editor");
  const commands: QuickSwitchDisplayBadge[] = [];
  for (const key of Object.keys(editorCommands) as EditorEventStrings[]) {
    const value = editorCommands[key];
    if (value.isDisabled?.(editor)) continue;
    commands.push({
      title: key.replace("editor:", "").replaceAll("-", " "),
      section: "command" as const,
      commandKey: key,
      isActive: value.isActive?.(editor) ?? false,
    });
  }
  return commands;
}

function getSettingsCommands() {
  const commands: QuickSwitchDisplayBadge[] = [];
  for (const key of Object.keys(settingsCommands) as SettingEventStrings[]) {
    const value = settingsCommands[key];
    commands.push({
      title: key.replace("setting:", "").replaceAll("-", " "),
      section: "setting" as const,
      commandKey: key,
      isActive: value.isActive?.() ?? false,
    });
  }
  return commands;
}

function getTags(notes: readonly NoteListItem[]): QuickSwitchDisplayBadge[] {
  const tagCount: Record<string, number> = {};
  let untaggedCount = 0;
  for (const note of notes) {
    if (!note.tags?.length) {
      untaggedCount++;
      continue;
    }
    for (const tag of note.tags) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1;
    }
  }
  return [
    ...Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({
        title: tag,
        section: "tag" as const,
        count,
        isActive: !!(settingsStore.get("active_tag") === tag),
      })),
    {
      title: "Untagged",
      section: "tag" as const,
      count: untaggedCount,
      isActive: settingsStore.get("active_tag") === UNTAGGED,
    },
  ];
}

async function computeDisplayNotes() {
  const activeId = stateStore.get("activeId") as Id | null;
  const displayNotes: QuickSwitchDisplayBadge[] = [];
  const { recentNotes, noteIndex } = noteStore.getState();
  const activeNote = activeId ? noteIndex.get(activeId) : undefined;
  const recentIds = new Set(recentNotes);
  const backlinkIds = new Set<Id>();
  const outgoingIds = new Set<Id>();
  for (const id of recentNotes) {
    const note = noteIndex.get(id);
    if (!note || !recentIds.has(id)) continue;
    displayNotes.push({
      id: note.id,
      title: note.title,
      section: "recent",
    });
  }
  if (activeNote) {
    const { backlinks, outgoingLinks } = computeActiveNoteLinks(activeNote);
    const { notes, noteIndex } = noteStore.getState();
    const relatedNotes = await getSimilarityMatching(
      activeNote.id,
      notes,
      noteIndex,
    );
    for (const link of backlinks) {
      const linkedNote = noteIndex.get(link.id);
      if (!linkedNote || backlinkIds.has(linkedNote.id)) continue;
      backlinkIds.add(linkedNote.id);
      displayNotes.push({
        id: linkedNote.id,
        title: linkedNote.title,
        section: "backlink",
      });
    }
    for (const link of outgoingLinks) {
      const linkedNote = noteIndex.get(link.id);
      if (!linkedNote || outgoingIds.has(link.id)) continue;
      outgoingIds.add(link.id);
      displayNotes.push({
        id: linkedNote.id,
        title: linkedNote.title,
        section: "outgoing",
      });
    }
    for (const note of relatedNotes) {
      if (relatedNotes.length === 0) return;
      if (!noteIndex.has(note.id)) continue;
      displayNotes.push({
        id: note.id,
        title: note.title,
        section: "related",
      });
    }
  }
  return displayNotes;
}

function computeActiveNoteLinks(activeNote: NoteListItem) {
  const backlinks: Link[] = [];
  const outgoingLinks: Link[] = [];
  for (const link of activeNote.links) {
    if (link.id === activeNote.id) continue;
    if (link.dir === "in") {
      backlinks.push(link);
    } else if (link.dir === "out") {
      outgoingLinks.push(link);
    }
  }
  return { backlinks, outgoingLinks };
}

export {
  computeActiveNoteLinks,
  computeDisplayNotes,
  getAllUsableEditorCommands,
  getSettingsCommands,
  getSimilarityMatching,
  getTags,
};
