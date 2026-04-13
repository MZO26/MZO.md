import type { CreateNotePayload, UpdateNotePayload } from "../shared/types";

function createNotePayload(data?: CreateNotePayload): CreateNotePayload {
  return {
    title: data?.title || "New note",
    content: data?.content || { type: "doc", content: [] },
    plainText: data?.plainText || "",
    snippet: data?.snippet || "",
    tags: data?.tags || [],
  };
}

function updateNotePayload(data: UpdateNotePayload): UpdateNotePayload {
  return {
    ...data,
  };
}

export { createNotePayload, updateNotePayload };
