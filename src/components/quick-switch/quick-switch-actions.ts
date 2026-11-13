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
import type { NoteSection, QuickSwitchDisplayBadge } from "@/utils/types";
import type { EditorEventStrings } from "@shared/event-emitter";
import {
  isNoteID,
  type Id,
  type Link,
  type NoteListItem,
} from "@shared/schemas/note-schema";

function tokenize(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(/\p{L}+/gu);
  return matches ?? [];
}

function checkNoteSimilarity(titleA: string, titleB: string) {
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
  const tagCount = new Map<string, number>();
  let untaggedCount = 0;
  for (const note of notes) {
    if (!note.tags?.length) {
      untaggedCount++;
      continue;
    }
    for (const tag of note.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  const activeTag = settingsStore.get("active_tag");
  const badge = (
    title: string,
    count: number,
    isActive: boolean,
  ): QuickSwitchDisplayBadge => ({
    title,
    section: "tag",
    count,
    isActive,
  });
  const entries = [...tagCount.entries()].sort(([, a], [, b]) => b - a);
  entries.push([UNTAGGED, untaggedCount]);
  return entries.map(([tag, count]) => badge(tag, count, activeTag === tag));
}

function toDisplayBadges(
  ids: Iterable<Id>,
  section: Extract<QuickSwitchDisplayBadge["section"], NoteSection>,
  noteIndex: Map<Id, NoteListItem>,
  { limit = Infinity }: { limit?: number } = {},
): QuickSwitchDisplayBadge[] {
  const badges: QuickSwitchDisplayBadge[] = [];
  for (const id of new Set(ids)) {
    if (badges.length >= limit) break;
    const note = noteIndex.get(id);
    if (note) {
      badges.push({ id: note.id, title: note.title, section });
    }
  }
  return badges;
}

async function computeDisplayNotes(): Promise<QuickSwitchDisplayBadge[]> {
  const activeId = stateStore.get("activeId") as Id | null;
  const { recentNotes, notes, noteIndex } = noteStore.getState();
  const recentBadges = toDisplayBadges(recentNotes, "recent", noteIndex);
  const activeNote = activeId ? noteIndex.get(activeId) : undefined;
  if (!activeNote) return recentBadges;
  const { backlinks, outgoingLinks } = computeActiveNoteLinks(activeNote);
  const relatedNotes = await getSimilarityMatching(
    activeNote.id,
    notes,
    noteIndex,
  );
  return [
    ...recentBadges,
    ...toDisplayBadges(
      backlinks.map((l) => l.id),
      "backlink",
      noteIndex,
    ),
    ...toDisplayBadges(
      outgoingLinks.map((l) => l.id),
      "outgoing",
      noteIndex,
    ),
    ...toDisplayBadges(
      relatedNotes.map((n) => n.id),
      "related",
      noteIndex,
    ),
  ];
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
  computeDisplayNotes,
  getAllUsableEditorCommands,
  getSettingsCommands,
  getTags,
  toDisplayBadges,
};
