import {
  DbContentSchema,
  EditorDocSchema,
} from "@shared/schemas/editor-schema";
import { z } from "zod";

const IdSchema = z.uuid();

const IdsSchema = z.array(IdSchema);

const TitleSchema = z.string().min(1).max(50).default("New Note");

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

const TagSchema = z.string().trim().min(1).max(40).toLowerCase();

const TagsSchema = z.array(TagSchema).max(3).default([]);

const TagRowSchema = z.object({
  note_id: IdSchema,
  tag_name: TagSchema,
});

const TagNameRowSchema = z.object({ tag_name: TagSchema });

const TagRowsSchema = z.array(TagRowSchema).default([]);

const LinkRowSchema = z.object({
  source_id: IdSchema,
  target_id: IdSchema,
});

const LinkRowsSchema = z.array(LinkRowSchema).default([]);

const LinkPayloadSchema = z.array(IdSchema).default([]);

const LinkSchema = z.object({
  id: IdSchema,
  dir: z.enum(["in", "out"]),
});

const LinksSchema = z.array(LinkSchema).default([]);

// Full Note Table
const NoteTableSchema = z.object({
  id: IdSchema,
  title: TitleSchema,
  snippet: SnippetSchema,
  content: EditorDocSchema,
  todos_left: TodoSchema,
  plainText: PlainTextSchema,
  pinned: z.boolean(),
  bookmarked: z.boolean(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

// Full Note Object
const NoteSchema = NoteTableSchema.extend({
  tags: TagsSchema,
  links: LinksSchema,
});

// Full Array of Note Objects
const NotesSchema = z.array(NoteSchema);

// DB Results (Content gets parsed / 0 or 1 gets converted to boolean). Links have new Schema
const NoteFromDB = NoteSchema.extend({
  content: DbContentSchema,
  pinned: DBBooleanSchema,
  bookmarked: DBBooleanSchema,
  links: LinksSchema,
});

// Payload Evaluation: Expects content to be stringified and converts booleans to 0 or 1 for DB
const NoteToDBSchema = NoteSchema.extend({
  id: IdSchema,
  content: z.string(),
  pinned: BooleanSchema,
  bookmarked: BooleanSchema,
  links: LinkPayloadSchema,
});

// Omitted values get generated in the DB. Links have their own Schema for Payload because DB expects them in an Array.
const CreateNotePayloadSchema = NoteSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({ links: LinkPayloadSchema });

const CreateNotesPayloadsSchema = z.array(CreateNotePayloadSchema);

// Update payload does not send updated_at. Timestamp for it gets generated in DB. Pinned and Bookmarked do not need to be sent over because they get toggled individually.
const UpdateNotePayloadSchema = NoteSchema.omit({
  pinned: true,
  bookmarked: true,
  created_at: true,
  updated_at: true,
}).extend({ links: LinkPayloadSchema });

// Everything gets written to DB.
const CreateTransactionSchema = NoteToDBSchema;

const UpdateTransactionSchema = NoteToDBSchema.omit({
  pinned: true,
  bookmarked: true,
  created_at: true,
});

const MergeTransactionSchema = z.object({ idA: IdSchema, idB: IdSchema });

const NoteRowSchema = z.object({
  id: IdSchema,
  title: TitleSchema,
  content: z.string(),
  snippet: SnippetSchema,
  bookmarked: z.union([z.literal(0), z.literal(1)]).default(0),
  pinned: z.union([z.literal(0), z.literal(1)]).default(0),
  todos_left: TodoSchema,
  plainText: PlainTextSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

const GetByIdSchema = NoteRowSchema.extend({
  tags_json: z.string(),
  links_json: z.string(),
});

type GetByIdRow = z.infer<typeof GetByIdSchema>;
type NoteRow = z.infer<typeof NoteRowSchema>;
type TagRow = z.infer<typeof TagRowSchema>;
type LinkRow = z.infer<typeof LinkRowSchema>;
type Tag = z.infer<typeof TagSchema>;
type Link = z.infer<typeof LinkSchema>;
type TagName = z.infer<typeof TagNameRowSchema>;
type MergeTransaction = z.infer<typeof MergeTransactionSchema>;
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
  GetByIdSchema,
  IdSchema,
  IdsSchema,
  LinkRowsSchema,
  LinksSchema,
  MergeTransactionSchema,
  NoteFromDB,
  NoteRowSchema,
  NoteSchema,
  NotesSchema,
  NoteToDBSchema,
  PlainTextSchema,
  SnippetSchema,
  TagRowsSchema,
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
  type GetByIdRow,
  type Link,
  type LinkRow,
  type MergeTransaction,
  type Note,
  type NoteRow,
  type Tag,
  type TagName,
  type TagRow,
  type UpdateNotePayload,
  type UpdateTransaction,
};
