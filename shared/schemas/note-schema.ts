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

// DB -> App
const DBBooleanSchema = z
  .union([z.literal(0), z.literal(1)])
  .default(0)
  .transform((val) => val === 1);

// App -> DB
const BooleanSchema = z
  .boolean()
  .default(false)
  .transform((val) => (val ? 1 : 0) as 0 | 1);

const TodoSchema = z.number().int().min(0).default(0);

const PlainTextSchema = z.string().default("");

const DateSchema = z.iso.datetime();

const TogglePinSchema = z.object({
  pinned: DBBooleanSchema,
});

const ToggleBookmarkSchema = z.object({
  bookmarked: DBBooleanSchema,
});

const NoteTagRowSchema = z.object({
  note_id: IdSchema,
  tag_name: TagSchema,
});

const NoteTagRowsSchema = z.array(NoteTagRowSchema);

const NoteTagNameRowSchema = NoteTagRowSchema.pick({
  tag_name: true,
});

const NoteTagNameRowsSchema = z.array(NoteTagNameRowSchema);

const SearchSchema = z.object({
  searchTerm: z.string().trim().min(1).max(100),
  limit: z.number().int().min(20).max(50).default(50),
});

// base schema for all notes. These are always there and do not change their shape
const NoteCoreSchema = z.object({
  title: TitleSchema,
  snippet: SnippetSchema,
  todos_left: TodoSchema,
  plainText: PlainTextSchema,
  markdown: PlainTextSchema,
  tags: TagsSchema,
});

// base for payloads. Booleans instead of numbers and normal editor schema (still in json)
const NoteSchema = NoteCoreSchema.extend({
  id: IdSchema,
  content: EditorDocSchema,
  pinned: z.boolean(),
  bookmarked: z.boolean(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

// for note array results
const NotesSchema = z.array(NoteSchema);

// for note table results -> tags have to be appended to result of database
const DBRowSchema = NoteCoreSchema.extend({
  id: IdSchema,
  content: DbContentSchema,
  pinned: DBBooleanSchema,
  bookmarked: DBBooleanSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

// transforms boolean to 0 | 1 and expects stringified content
const NoteToDBSchema = NoteCoreSchema.extend({
  id: IdSchema,
  content: z.string(),
  pinned: BooleanSchema,
  bookmarked: BooleanSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

// omitted values get generated in the db
const CreateNotePayloadSchema = NoteSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

const CreateNotesPayloadsSchema = z.array(CreateNotePayloadSchema);

// markdown if mirroring is activated. Payload does not send updated_at. Timestamp for it gets generated in db
const UpdateNotePayloadSchema = NoteSchema.omit({
  pinned: true,
  bookmarked: true,
  created_at: true,
  updated_at: true,
});

// everything gets written to db. Defaults apply
const CreateTransactionSchema = NoteToDBSchema;

// pinned, bookmarked get toggled dynamically. created_at stays reserved for first creation and never gets touched after
const UpdateTransactionSchema = NoteToDBSchema.omit({
  pinned: true,
  bookmarked: true,
  created_at: true,
});

type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;
type UpdateNotePayload = z.infer<typeof UpdateNotePayloadSchema>;
type CreateNotePayload = z.infer<typeof CreateNotePayloadSchema>;
type CreateNotesPayload = z.infer<typeof CreateNotesPayloadsSchema>;
type Note = z.infer<typeof NoteSchema>;

export {
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  CreateTransactionSchema,
  DBBooleanSchema,
  DBRowSchema,
  EditorDocSchema,
  IdSchema,
  NoteSchema,
  NotesSchema,
  NoteTagNameRowsSchema,
  NoteTagRowsSchema,
  NoteToDBSchema,
  PlainTextSchema,
  SearchSchema,
  SnippetSchema,
  TagSchema,
  TagsSchema,
  TitleSchema,
  ToggleBookmarkSchema,
  TogglePinSchema,
  UpdateNotePayloadSchema,
  UpdateTransactionSchema,
  type CreateNotePayload,
  type CreateNotesPayload,
  type CreateTransaction,
  type Note,
  type UpdateNotePayload,
  type UpdateTransaction,
};
