import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";

const NoteTag = Mention.extend({
  name: "noteTag", // unique name to register extension in the editor schema
}).configure({
  HTMLAttributes: { class: "tag-node" }, // gives a specific class to handle styling

  renderHTML({ options, node }) {
    return [
      "span",
      mergeAttributes(options.HTMLAttributes),
      `#${node.attrs["id"]}`, // json format to describe the html structure of the tag
    ];
  },

  renderText({ node }) {
    return `#${node.attrs["id"]}`; // without this, the mention extension would default back to @
  },

  suggestion: {
    char: "#",
    pluginKey: new PluginKey("noteTagSuggestion"), // unique key to keep it extensible
    items: ({ query }: { query: string }) => (query ? [query] : []),
    render: () => {
      let savedCommand: ((props: any) => void) | null = null;
      let savedQuery = "";
      // always gets called once # is being typed
      return {
        onStart: (props) => {
          savedCommand = props.command;
          savedQuery = props.query;
        },
        onUpdate: (props) => {
          savedCommand = props.command;
          savedQuery = props.query;
        },
        onExit: () => {
          savedCommand = null;
          savedQuery = "";
        },
        onKeyDown: ({ event }) => {
          // when user hits space or enter
          if (
            (event.key === " " || event.key === "Enter") &&
            savedQuery.length > 0
          ) {
            event.preventDefault();
            savedCommand?.({ id: savedQuery }); // replaces the #query text in the document with a noteTag inline node
            return true;
          }
          return false;
        },
      };
    },
  },
});

export { NoteTag };
