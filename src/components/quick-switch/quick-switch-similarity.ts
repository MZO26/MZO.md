import { getRelatedNotes } from "@/api/api";
import { rendererLogger } from "@/app";
import { noteStore } from "@/state/state";
import { isNoteID, type Id, type Note } from "@shared/schemas/note-schema";

function tokenize(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(/\p{L}+/gu);
  return matches ?? [];
}

function checkNoteSimilarity(
  titleA: Readonly<Note["title"]>,
  titleB: Readonly<Note["title"]>,
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

async function getSimilarityMatching(activeId: Id) {
  const noteIndex = noteStore.get("noteIndex");
  const comparison = noteIndex.get(activeId);
  if (!comparison) return [];
  const relatedNotesQuery = await getRelatedNotes({
    id: activeId,
  });
  const relatedNotes = relatedNotesQuery.success ? relatedNotesQuery.data : [];
  const titleIndex = new Map(
    noteStore.get("notes").map((n) => [n.title, n.id]),
  );
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
}

export { getSimilarityMatching };
