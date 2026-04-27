import { z } from "zod";
import { DbContentSchema, EditorDocSchema } from "./editorSchema";

const IdSchema = z.uuid();

const TitleSchema = z.string().min(1).max(100).default("New Note");

const TagSchema = z.string().trim().min(1).max(40).toLowerCase();

const TagsSchema = z.array(TagSchema).max(3).default([]);

const SnippetSchema = z.string().max(50).default("");

const BookmarkedSchema = z.boolean().default(false);

const DBBooleanSchema = z
  .union([z.literal(0), z.literal(1)])
  .default(0)
  .transform((val) => val === 1); // default before transform because else it expects a boolean -> transform handles to-boolean transformation

const DBBookmarkedSchema = DBBooleanSchema;

const DBPinnedSchema = DBBooleanSchema;

const PinnedSchema = z.boolean().default(false);

const TodoSchema = z.number().int().min(0).default(0);

const PlainTextSchema = z.string().default("");

const DateSchema = z.iso.datetime();

const NoteSchema = z
  .object({
    id: IdSchema,
    title: TitleSchema,
    content: EditorDocSchema,
    snippet: SnippetSchema,
    bookmarked: BookmarkedSchema,
    pinned: PinnedSchema,
    todos_left: TodoSchema,
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
  bookmarked: DBBookmarkedSchema,
  pinned: DBPinnedSchema,
  todos_left: TodoSchema,
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
  pinned: true,
  bookmarked: true,
  todos_left: true,
  created_at: true,
  updated_at: true,
});

const UpdateNotePayloadSchema = NoteSchema.omit({
  title: true,
  snippet: true,
  tags: true,
  pinned: true,
  bookmarked: true,
  todos_left: true,
  created_at: true,
  updated_at: true,
});

type UpdateNotePayload = z.infer<typeof UpdateNotePayloadSchema>;
type CreateNotePayload = z.infer<typeof CreateNotePayloadSchema>;
type FTSRows = z.infer<typeof FTSRowsSchema>;
type Note = z.infer<typeof NoteSchema>;

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
  type CreateNotePayload,
  type FTSRows,
  type Note,
  type UpdateNotePayload,
};
