import z from "zod";

const NotificationSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().max(100).default(""),
});

const ZoomActionSchema = z.enum(["get", "in", "out", "reset"]);

const MenuTypeSchema = z.enum(["table", "text", "note"]);

const ExternalUrlSchema = z.url({
  protocol: /^https?$/,
  hostname: z.regexes.domain,
});

type Url = z.infer<typeof ExternalUrlSchema>;
type Notification = z.infer<typeof NotificationSchema>;
type ZoomAction = z.infer<typeof ZoomActionSchema>;
type MenuType = z.infer<typeof MenuTypeSchema>;

export {
  ExternalUrlSchema,
  MenuTypeSchema,
  NotificationSchema,
  ZoomActionSchema,
  type MenuType,
  type Notification,
  type Url,
  type ZoomAction,
};
