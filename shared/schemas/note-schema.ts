import { UNTITLED } from "@shared/constants";
import {
  DbContentSchema,
  EditorDocSchema,
} from "@shared/schemas/editor-schema";
import { z } from "zod";

const IdSchema = z.uuid();

const IdsSchema = z.array(IdSchema);

const TitleSchema = z.string().min(1).max(50).default(UNTITLED);

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

const ToggleManyPinsSchema = z.array(TogglePinSchema);

const TagSchema = z.string().trim().min(1).max(100).toLowerCase();

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
  pinned: z.boolean(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

// Full Note Object
const NoteSchema = NoteTableSchema.extend({
  tags: TagsSchema,
  links: LinksSchema,
});

const NoteMetaData = NoteSchema.omit({
  content: true,
});

// Full Array of Note Objects
const NotesSchema = z.array(NoteSchema);

// DB Results (Content gets parsed / 0 or 1 gets converted to boolean). Links have new Schema
const NoteFromDB = NoteSchema.extend({
  content: DbContentSchema,
  pinned: DBBooleanSchema,
  links: LinksSchema,
});

const NoteListItemFromDB = NoteFromDB.omit({ content: true }).extend({
  plainText: PlainTextSchema,
});

// Payload Evaluation: Expects content to be stringified and converts booleans to 0 or 1 for DB
const NoteToDBSchema = NoteSchema.extend({
  id: IdSchema,
  content: z.string(),
  pinned: BooleanSchema,
  links: LinkPayloadSchema,
});

// Omitted values get generated in the DB. Links have their own Schema for Payload because DB expects them in an Array.
const CreateNotePayloadSchema = NoteSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({ links: LinkPayloadSchema });

const CreateNotesPayloadsSchema = z.array(CreateNotePayloadSchema);

// Update payload does not send updated_at. Timestamp for it gets generated in DB. Pinned does not need to be sent over because it gets toggled individually.
const UpdateNotePayloadSchema = NoteSchema.omit({
  pinned: true,
  created_at: true,
  updated_at: true,
}).extend({ links: LinkPayloadSchema, markdown: PlainTextSchema.optional() });

// Everything gets written to DB.
const CreateTransactionSchema = NoteToDBSchema;

const UpdateTransactionSchema = NoteToDBSchema.omit({
  pinned: true,
  created_at: true,
});

const NoteRowSchema = z.object({
  id: IdSchema,
  title: TitleSchema,
  content: z.string(),
  snippet: SnippetSchema,
  pinned: z.union([z.literal(0), z.literal(1)]).default(0),
  todos_left: TodoSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

const NoteSearchDoc = NoteSchema.omit({
  content: true,
  pinned: true,
  links: true,
  created_at: true,
  updated_at: true,
  todos_left: true,
}).extend({ plainText: PlainTextSchema });

const AutoExportWritePayloadSchema = z.object({
  id: IdSchema,
  fileName: TitleSchema,
  markdown: PlainTextSchema,
  targetDir: z.string(),
  oldFileName: z.string().optional(),
});

type NoteListItem = z.infer<typeof NoteListItemFromDB>;
type AutoExportWritePayload = z.infer<typeof AutoExportWritePayloadSchema>;
type NoteSearchDoc = z.infer<typeof NoteSearchDoc>;
type NoteMetaData = z.infer<typeof NoteMetaData>;
type NoteRow = z.infer<typeof NoteRowSchema>;
type TagRow = z.infer<typeof TagRowSchema>;
type LinkRow = z.infer<typeof LinkRowSchema>;
type Tag = z.infer<typeof TagSchema>;
type Link = z.infer<typeof LinkSchema>;
type TagName = z.infer<typeof TagNameRowSchema>;
type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;
type UpdateNotePayload = z.infer<typeof UpdateNotePayloadSchema>;
type CreateNotePayload = z.infer<typeof CreateNotePayloadSchema>;
type CreateNotesPayload = z.infer<typeof CreateNotesPayloadsSchema>;
type Note = z.infer<typeof NoteSchema>;

export {
  AutoExportWritePayloadSchema,
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  CreateTransactionSchema,
  DateSchema,
  DBBooleanSchema,
  IdSchema,
  IdsSchema,
  LinkRowsSchema,
  LinksSchema,
  NoteFromDB,
  NoteListItemFromDB,
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
  ToggleManyPinsSchema,
  TogglePinSchema,
  UpdateNotePayloadSchema,
  UpdateTransactionSchema,
  type AutoExportWritePayload,
  type CreateNotePayload,
  type CreateNotesPayload,
  type CreateTransaction,
  type Link,
  type LinkRow,
  type Note,
  type NoteListItem,
  type NoteMetaData,
  type NoteRow,
  type NoteSearchDoc,
  type Tag,
  type TagName,
  type TagRow,
  type UpdateNotePayload,
  type UpdateTransaction,
};
