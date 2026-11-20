import { handleCreateWelcomeNote } from "@/notes/note-actions";
import { handleUpdateSettings } from "@/settings/setting-actions";
import { noteStore } from "@/state/state";
import { IS_MAC, KEY_LABELS } from "@/utils/shortcuts";
import type { ShortcutToken } from "@/utils/types";
import type { AppSettings } from "@shared/schemas/store-schema";

export type WelcomeNote = {
  title: string;
  content: string;
};

export const WELCOME_NOTE_TITLE = "Welcome";

type KeyPart = ShortcutToken | (string & {});

type NonEmptyKeyParts = [first: KeyPart, ...rest: KeyPart[]];

const KEY_MAP = new Map<string, string>(Object.entries(KEY_LABELS));

async function maybeSeedWelcomeNote(settings: Readonly<AppSettings>) {
  if (settings.welcome_note_seeded) return;
  const isFreshInstall = noteStore.get("notes").length === 0;
  if (!isFreshInstall) {
    await handleUpdateSettings({ welcome_note_seeded: true });
    return;
  }
  const id = await handleCreateWelcomeNote(createWelcomeNote());
  if (!id) return;
  await handleUpdateSettings({ welcome_note_seeded: true });
  return id;
}

function formatCombo(...parts: KeyPart[]) {
  return parts.map((part) => KEY_MAP.get(part) ?? part).join(IS_MAC ? "" : " + ");
}

function k(...parts: NonEmptyKeyParts) {
  return `\`${formatCombo(...parts)}\``;
}

function createWelcomeNote(): WelcomeNote {
  const content = `# Welcome

This note is your playground. Try out features right here, delete whatever you don't need, or come back anytime as a quick reference — everything in this note is searchable.

> [!TIP]
> **One bar for everything:** Press ${k("mod", "P")} to open the Quick Switcher and start typing to search both titles and note contents. Use a prefix to switch modes:
> - \`#\` filters by tags (or creates new ones)
> - \`[[\` links to another note
> - \`/\` or \`>\` searches commands and settings

## Getting Started

- [x] Open the welcome note
- [ ] Click this checkbox to mark it done
- [ ] Press ${k("mod", "P")} and type \`/\` to run a command
- [ ] Link a new note using \`[[My First Note]]\`
- [ ] Create a fresh note with ${k("mod", "N")}

## Organization & Links

* **Tags:** Group notes with \`#ideas\`, \`#work\`, or \`#projects\` and filter them via \`#\` in the Quick Switcher.
* **Wikilinks:** Connect thoughts with \`[[Note Title]]\` — if the note doesn't exist yet, selecting it creates one automatically.

## Formatting & Markdown

Write directly in Markdown, use shortcuts, or toggle the toolbar (${k("mod", ".")}):

* **Bold** (\`**text**\`), *Italic* (\`*text*\`), ==Highlight== (\`==text==\`), and ~~Strikethrough~~ (\`~~text~~\`)
* Inline code like \`const ready = true;\` with \`\` \`code\` \`\` and math like $E = mc^2$ with \`$math$\`
* Headings with \`#\` through \`######\`, lists with \`- \`, \`1. \`, and \`[] \`, and horizontal rules with \`---\`

\`\`\`ts
// Create code blocks with triple backticks or ${formatCombo("mod", "shift", "C")}
const greeting = "Hello, notes!";
\`\`\`

$$
a^2 + b^2 = c^2
$$

> [!NOTE]
> Callouts support \`> [!NOTE]\`, \`> [!TIP]\`, \`> [!INFO]\`, \`> [!WARNING]\`, and \`> [!DANGER]\`.

---

## Keyboard Shortcuts

### App Shortcuts

| Shortcut | Action |
|---|---|
| ${k("mod", "N")} | Create new note |
| ${k("mod", "P")} | Open Quick Switcher |
| ${k("mod", "G")} | Open global search |
| ${k("mod", "F")} | Open doc search |
| ${k("mod", "O")} | Toggle sidebar |
| ${k("mod", ".")} | Toggle toolbar |
| ${k("mod", "W")} | Set editor width |
| ${k("mod", ",")} | Open settings |
| ${k("mod", "+")} / ${k("mod", "=")} | Zoom in |
| ${k("mod", "-")} | Zoom out |
| ${k("mod", "0")} | Reset zoom |
| ${k("F11")} | Toggle focus mode |

### Editor Shortcuts

#### History & Selection

| Shortcut | Action |
|---|---|
| ${k("mod", "Z")} | Undo |
| ${k("mod", "Y")} | Redo |
| ${k("mod", "shift", "Z")} | Redo |
| ${k("mod", "A")} | Select all |

#### Inline Formatting

| Shortcut | Markdown | Action |
|---|---|---|
| ${k("mod", "B")} | \`**text**\` | Bold |
| ${k("mod", "I")} | \`*text*\` | Italic |
| ${k("mod", "S")} | \`~~text~~\` | Strikethrough |
| ${k("mod", "H")} | \`==text==\` | Highlight |
| ${k("mod", "E")} | \`\` \`code\` \`\` | Inline code |
| ${k("mod", "shift", "E")} | \`$math$\` | Inline math |

#### Headings & Paragraphs

| Shortcut | Markdown | Action |
|---|---|---|
| ${k("mod", "shift", "1")} | \`#\` | Heading 1 |
| ${k("mod", "shift", "2")} | \`##\` | Heading 2 |
| ${k("mod", "shift", "3")} | \`###\` | Heading 3 |
| ${k("mod", "shift", "4")} | \`####\` | Heading 4 |
| ${k("mod", "shift", "5")} | \`#####\` | Heading 5 |
| ${k("mod", "shift", "6")} | \`######\` | Heading 6 |

#### Lists

| Shortcut | Markdown | Action |
|---|---|---|
| ${k("mod", "shift", "O")} | \`1.\` | Ordered list |
| ${k("mod", "shift", "L")} | \`-\` | Bullet list |
| ${k("mod", "shift", "T")} | \`[]\` | Task list |
| ${k("Tab")} | — | Indent list item |
| ${k("shift", "Tab")} | — | Outdent list item |
| ${k("enter")} | — | Next list item |

#### Blocks & Elements

| Shortcut | Markdown | Action |
|---|---|---|
| ${k("mod", "shift", "B")} | \`>\` | Blockquote |
| ${k("mod", "shift", "C")} | \`\` \`\`\` \`\` | Code block |
| ${k("mod", "shift", "M")} | \`$$math$$\` | Math block |
| ${k("mod", "shift", "R")} | \`---\` | Horizontal rule |
| ${k("shift", "enter")} | — | Hard break (\`<br>\`) |

#### Links & Media

| Shortcut | Action |
|---|---|
| ${k("mod", "K")} | Toggle link |
| ${k("mod", "alt", "enter")} | Open link |
| ${k("mod", "alt", "I")} | Insert image |

#### Tables

| Shortcut | Action |
|---|---|
| ${k("mod", "alt", "T")} | Insert table |
| ${k("Tab")} | Next cell |
| ${k("shift", "Tab")} | Previous cell |
| ${k("mod", "alt", "↓")} | Add row after |
| ${k("mod", "alt", "↑")} | Add row before |
| ${k("mod", "alt", "→")} | Add column after |
| ${k("mod", "alt", "←")} | Add column before |
| ${k("mod", "alt", "Backspace")} | Delete table |

#### Editor Controls

| Shortcut | Action |
|---|---|
| ${k("mod", "shift", "V")} | Paste without formatting |
| ${k("Escape")} | Remove focus from editor |
| ${k("mod", "shift", "enter")} | Insert space at end of a block |
`;

  return { title: WELCOME_NOTE_TITLE, content };
}

export { createWelcomeNote, maybeSeedWelcomeNote };
