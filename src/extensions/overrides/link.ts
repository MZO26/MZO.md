import { mergeAttributes } from "@tiptap/core";
import Link from "@tiptap/extension-link";

const LinkWithTitle = Link.extend({
  renderHTML({ HTMLAttributes }) {
    const href =
      typeof HTMLAttributes["href"] === "string"
        ? HTMLAttributes["href"]
        : undefined;

    const title =
      typeof HTMLAttributes["title"] === "string" &&
      HTMLAttributes["title"].length > 0
        ? HTMLAttributes["title"]
        : href;

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { title }),
      0,
    ];
  },
});

export { LinkWithTitle };
