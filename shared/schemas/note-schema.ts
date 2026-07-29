import { MAX_SEARCH_LENGTH, UNTITLED } from "@shared/constants";
import { EditorDocSchema } from "@shared/schemas/editor-schema";
import { z } from "zod";

const IdSchema = z.uuid();

const IdsSchema = z.array(IdSchema);

const TitleSchema = z.string().min(1).max(50).default(UNTITLED);

const SnippetSchema = z.string().max(100).default("");

const QuerySchema = z.string().min(1).max(MAX_SEARCH_LENGTH);

const BoolSchema = z.boolean();

const BoolDbSchema = z.union([z.literal(0), z.literal(1)]);

const DbBoolCodec = z.codec(BoolDbSchema, BoolSchema, {
  decode: (val) => val === 1,
  encode: (val) => (val ? 1 : 0),
});

const PlainTextSchema = z.string().default("");

const DateSchema = z.iso.datetime();

const TagSchema = z.string().trim().min(1).max(100).toLowerCase();

const TagsSchema = z.array(TagSchema).max(5).default([]);

const TagRowSchema = z.object({
  note_id: IdSchema,
  tag_name: TagSchema,
});

const TagRowsSchema = z.array(TagRowSchema).default([]);

const LinkRowSchema = z.object({
  source_id: IdSchema,
  target_id: IdSchema,
});

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
  content: z.string(),
  plain_text: PlainTextSchema,
  pinned: BoolSchema,
  created_at: DateSchema,
  updated_at: DateSchema,
});

const NoteRowSchema = NoteTableSchema.omit({ pinned: true }).extend({
  pinned: BoolDbSchema,
});

// Full Note Object
const NoteSchema = NoteTableSchema.extend({
  content: EditorDocSchema,
  tags: TagsSchema,
  links: LinksSchema,
});

const OldNoteSchema = z.array(
  NoteSchema.pick({ created_at: true, title: true }),
);

// Full Array of Note Objects
const NotesSchema = z.array(NoteSchema);

// DB Results (Content gets parsed / 0 or 1 gets converted to boolean). Links have new Schema
const NoteFromDB = NoteSchema.extend({
  content: EditorDocSchema,
  pinned: BoolSchema,
  links: LinksSchema,
});

const NoteListItemFromDB = NoteFromDB.omit({
  content: true,
  plain_text: true,
});

// Payload Evaluation: Expects content to be stringified and converts booleans to 0 or 1 for DB
const NoteToDBSchema = NoteSchema.extend({
  id: IdSchema,
  content: z.string(),
  pinned: BoolDbSchema,
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

const DbUpdateSchema = UpdateNotePayloadSchema.omit({
  content: true,
  markdown: true,
}).extend({ content: z.string() });

const DbCreateSchema = CreateNotePayloadSchema.omit({
  content: true,
  pinned: true,
}).extend({ content: z.string(), pinned: BoolDbSchema });

const SearchResultSchema = NoteSchema.pick({
  id: true,
  title: true,
}).extend({ search_match: QuerySchema, rank: z.number() });

const NoteMenuPayloadSchema = z.object({
  id: IdSchema,
  pinned: BoolSchema.optional(),
});

const AutoExportWritePayloadSchema = z.object({
  created_at: DateSchema,
  fileName: TitleSchema,
  markdown: PlainTextSchema,
  targetDir: z.string(),
  oldFileName: z.string().optional(),
});

type BoolDb = z.infer<typeof BoolDbSchema>;
type DbUpdateArgs = z.infer<typeof DbUpdateSchema>;
type DbCreateArgs = z.infer<typeof DbCreateSchema>;
type SearchQuery = z.infer<typeof QuerySchema>;
type SearchResult = z.infer<typeof SearchResultSchema>;
type NoteMenuPayload = z.infer<typeof NoteMenuPayloadSchema>;
type NoteListItem = z.infer<typeof NoteListItemFromDB>;
type AutoExportWritePayload = z.infer<typeof AutoExportWritePayloadSchema>;
type NoteRow = z.infer<typeof NoteRowSchema>;
type TagRow = z.infer<typeof TagRowSchema>;
type LinkRow = z.infer<typeof LinkRowSchema>;
type Tag = z.infer<typeof TagSchema>;
type Link = z.infer<typeof LinkSchema>;
type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;
type UpdateNotePayload = z.infer<typeof UpdateNotePayloadSchema>;
type CreateNotePayload = z.infer<typeof CreateNotePayloadSchema>;
type CreateNotesPayload = z.infer<typeof CreateNotesPayloadsSchema>;
type Note = z.infer<typeof NoteSchema>;
type Id = z.infer<typeof IdSchema>;
type Ids = z.infer<typeof IdsSchema>;

export {
  AutoExportWritePayloadSchema,
  BoolDbSchema,
  BoolSchema,
  CreateNotePayloadSchema,
  CreateNotesPayloadsSchema,
  CreateTransactionSchema,
  DateSchema,
  DbBoolCodec,
  IdSchema,
  IdsSchema,
  LinksSchema,
  NoteFromDB,
  NoteListItemFromDB,
  NoteMenuPayloadSchema,
  NoteRowSchema,
  NoteSchema,
  NotesSchema,
  NoteToDBSchema,
  OldNoteSchema,
  PlainTextSchema,
  QuerySchema,
  SearchResultSchema,
  SnippetSchema,
  TagRowsSchema,
  TagSchema,
  TagsSchema,
  TitleSchema,
  UpdateNotePayloadSchema,
  UpdateTransactionSchema,
  type AutoExportWritePayload,
  type BoolDb,
  type CreateNotePayload,
  type CreateNotesPayload,
  type CreateTransaction,
  type DbCreateArgs,
  type DbUpdateArgs,
  type Id,
  type Ids,
  type Link,
  type LinkRow,
  type Note,
  type NoteListItem,
  type NoteMenuPayload,
  type NoteRow,
  type SearchQuery,
  type SearchResult,
  type Tag,
  type TagRow,
  type UpdateNotePayload,
  type UpdateTransaction,
};
