import { InputRule, PasteRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { Plugin } from "@tiptap/pm/state";

const CustomInlineMath = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^$\n]+)\$$/,
        handler: ({ range, match, commands }) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          if (!latex) return null;
          commands.insertContentAt(range, {
            type: this.type.name,
            attrs: { latex },
          });
          return;
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: /(?<!\$)\$([^$\n]+)\$(?!\$)/g,
        handler: ({ range, match, commands }) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          if (!latex) return null;
          commands.insertContentAt(range, {
            type: this.type.name,
            attrs: { latex },
          });
          return;
        },
      }),
    ];
  },
});

const CustomBlockMath = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$\$([\s\S]+?)\$\$$/,
        handler: ({ range, match, commands }) => {
          const latex = typeof match[1] === "string" ? match[1].trim() : "";
          if (!latex) return null;
          commands.insertContentAt(range, {
            type: this.type.name,
            attrs: { latex },
          });
          return;
        },
      }),
    ];
  },

  addPasteRules() {
    return [];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;
            const text = event.clipboardData.getData("text/plain");
            if (!text || !text.includes("$$")) return false;
            const parts = text
              .split(/(\$\$[\s\S]+?\$\$)/g)
              .filter((part) => part.length > 0);
            const content: unknown[] = [];
            for (const part of parts) {
              const mathMatch = part.match(/^\$\$([\s\S]+?)\$\$$/);
              if (mathMatch) {
                const latex =
                  typeof mathMatch[1] === "string"
                    ? mathMatch[1].trim()
                    : undefined;
                if (!latex) continue;
                content.push({
                  type: this.type.name,
                  attrs: { latex },
                });
                continue;
              }
              const paragraphs = part
                .split(/\n{2,}/)
                .filter(
                  (paragraph): paragraph is string =>
                    typeof paragraph === "string",
                )
                .map((paragraph) => paragraph.split(/\n+/).join(" ").trim())
                .filter((paragraph) => paragraph.length > 0);
              for (const paragraph of paragraphs) {
                content.push({
                  type: "paragraph",
                  content: [{ type: "text", text: paragraph }],
                });
              }
            }
            if (!content.length) return false;
            this.editor.commands.insertContentAt(
              {
                from: view.state.selection.from,
                to: view.state.selection.to,
              },
              content,
            );
            return true;
          },
        },
      }),
    ];
  },
});

export { CustomBlockMath, CustomInlineMath };
