import {
  DbContentSchema,
  EditorDocSchema,
} from "@shared/schemas/editor-schema";
import { z } from "zod";

const IdSchema = z.uuid();

const TitleSchema = z.string().min(1).max(50).default("New Note");

const TagSchema = z.string().trim().min(1).max(40).toLowerCase();

const TagsSchema = z.array(TagSchema).max(3).default([]);

const SnippetSchema = z.string().max(50).default("");

const BookmarkedSchema = z.boolean().default(false);

const MirrorSchema = z.boolean().default(false);

const DBBooleanSchema = z
  .union([z.literal(0), z.literal(1)])
  .default(0)
  .transform((val) => val === 1); // default before transform because else it expects a boolean -> transform handles to-boolean transformation

const DBBookmarkedSchema = DBBooleanSchema;

const DBPinnedSchema = DBBooleanSchema;

const DBMirrorSchema = DBBooleanSchema;

const PinnedSchema = z.boolean().default(false);

const TodoSchema = z.number().int().min(0).default(0);

const PlainTextSchema = z.string().default("");

const MDSchema = z.string().optional();

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
    is_mirrored: MirrorSchema,
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
  is_mirrored: DBMirrorSchema,
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
  searchTerm: z.string().trim().min(1).max(100),
  limit: z.number().int().min(20).max(50).default(50),
});

const CreateNotePayloadSchema = NoteSchema.omit({
  id: true,
  pinned: true,
  bookmarked: true,
  created_at: true,
  updated_at: true,
}).extend({ markdown: MDSchema });

const UpdateNotePayloadSchema = NoteSchema.omit({
  pinned: true,
  bookmarked: true,
  created_at: true,
  updated_at: true,
}).extend({ markdown: MDSchema });

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
