import { z } from "zod";
import { DbContentSchema, EditorDocSchema } from "./editorSchema";

const IdSchema = z.uuid();

const TitleSchema = z.string().min(1).max(100).default("New Note");

const TagSchema = z.string().trim().min(1).max(40).toLowerCase();

const TagsSchema = z.array(TagSchema).max(3).default([]);

const SnippetSchema = z.string().max(50).default("");

const PlainTextSchema = z.string().default("");

const DateSchema = z.iso.datetime();

const NoteSchema = z
  .object({
    id: IdSchema,
    title: TitleSchema,
    content: EditorDocSchema,
    snippet: SnippetSchema,
    plainText: PlainTextSchema,
    created_at: DateSchema,
    updated_at: DateSchema,
    tags: TagsSchema,
  })
  .strict();

const NoteFromDbSchema = z.object({
  id: IdSchema,
  title: TitleSchema,
  content: DbContentSchema,
  snippet: SnippetSchema,
  plainText: PlainTextSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
  tags: TagsSchema,
});

const NotesSchema = z.array(NoteSchema);

const FTSRowsSchema = NoteSchema.omit({
  tags: true,
}).extend({
  tags: z.string(),
});

const SearchSchema = z.object({
  searchTerm: z
    .string()
    .trim()
    .min(1, "Search term is required")
    .max(100, "Search term is too long"),

  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .default(20),
});

const CreateNotePayloadSchema = NoteSchema.omit({
  id: true,
  title: true,
  snippet: true,
  tags: true,
  created_at: true,
  updated_at: true,
});

const UpdateNotePayloadSchema = NoteSchema.omit({
  title: true,
  snippet: true,
  tags: true,
  created_at: true,
  updated_at: true,
});

export {
  CreateNotePayloadSchema,
  EditorDocSchema,
  FTSRowsSchema,
  IdSchema,
  NoteFromDbSchema,
  NoteSchema,
  NotesSchema,
  PlainTextSchema,
  SearchSchema,
  SnippetSchema,
  TagSchema,
  TagsSchema,
  TitleSchema,
  UpdateNotePayloadSchema,
};
