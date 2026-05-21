# MZO.md (Note-App / Editor)

A minimalist, local-first note app for desktop.

Built with Electron, TypeScript, Better SQLite3, and TipTap.

## Features

- Local-first note storage with SQLite
- Fast full-text search with FTS5
- Markdown-focused editing with TipTap
- Export notes to Markdown, Plain Text, HTML, JSON and PDF
- Import notes from Markdown, Plain Text, HTML and JSON
- Focus mode and read-only mode
- Adjustable editor width (Ultrawide support)
- Light and dark theme support
- Persistent settings with electron-store
- Sanitized rendering with DOMPurify
- Runtime validation with Zod

## Stack

- Electron
- TypeScript
- Better SQLite 3
- TipTap
- electron-vite
- Vite
- DOMPurify
- Zod
- tinykeys
- Lucide
- Tippy.js

## Install

Requirements:

- Node.js 20+
- npm 10+

```bash
git clone https://github.com/MZO26/MDEditor.git
cd MDEditor
npm install
npm run dev
```

## Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Start development mode                |
| `npm run build`      | Build production app                  |
| `npm run pack:mac`   | Build macOS app                       |
| `npm run pack:win`   | Build Windows app                     |
| `npm run pack:linux` | Build Linux app                       |
| `npm run typecheck`  | Run TypeScript type check             |
| `npm run preview`    | Preview production build              |
| `npm run rebuild`    | Rebuild better sqlite 3 native module |

## Keyboard Shortcuts

Shortcuts use `$mod` which maps to `Ctrl` on Windows/Linux and `Cmd` on macOS.

| Shortcut              | Action                |
| --------------------- | --------------------- |
| `Mod + N`             | Create new note       |
| `Mod + F`             | Open global search    |
| `Mod + O`             | Toggle sidebar        |
| `Mod + Alt + O`       | Toggle info sidebar   |
| `Mod + Shift + R`     | Toggle read-only mode |
| `Mod + Shift + W`     | Set editor width      |
| `Mod + Shift + V`     | Toggle view filter    |
| `Mod + ,`             | Open settings         |
| `Mod + +` / `Mod + =` | Zoom in               |
| `Mod + -`             | Zoom out              |
| `Mod + 0`             | Reset zoom            |
| `F11`                 | Toggle focus mode     |

### Editor Shortcuts

| Shortcut                  | Action                      |
| ------------------------- | --------------------------- |
| `Mod + Z`                 | Undo                        |
| `Mod + Y`                 | Redo                        |
| `Mod + Shift + Z`         | Redo                        |
| `Mod + B`                 | Bold                        |
| `Mod + I`                 | Italic                      |
| `Mod + Shift + X`         | Strikethrough               |
| `Mod + Shift + H`         | Highlight                   |
| `Mod + E`                 | Inline code                 |
| `Mod + Alt + 1`           | Heading 1                   |
| `Mod + Alt + 2`           | Heading 2                   |
| `Mod + Alt + 3`           | Heading 3                   |
| `Mod + Shift + 8`         | Bullet list                 |
| `Mod + Shift + 7`         | Ordered list                |
| `Mod + Shift + 9`         | Task list                   |
| `Mod + Shift + B`         | Blockquote                  |
| `Mod + Alt + C`           | Code block                  |
| `Mod + Shift + -`         | Horizontal rule             |
| `Mod + Alt + T`           | Insert table                |
| `Mod + Alt + I`           | Insert image                |
| `Mod + Alt + Arrow Down`  | Add row after               |
| `Mod + Alt + Arrow Up`    | Add row before              |
| `Mod + Alt + Arrow Right` | Add column after            |
| `Mod + Alt + Arrow Left`  | Add column before           |
| `Mod + Alt + Backspace`   | Delete table                |
| `Mod + Shift + F`         | Toggle focus mode in editor |

## Architecture

```text
electron/      # Main process
renderer/      # UI, editor, styles, state
shared/        # Shared types, schemas
```

Data flow:

```text
Renderer UI
  ↓
IPC via preload
  ↓
Main process
  ↓
SQLite database
```

## Security

Designed with security in mind:

- **Context Isolation** — Renderer and main process are strictly separated via Electron's `contextBridge`
- **No `nodeIntegration`** — Node.js APIs are never exposed to the renderer
- **HTML Sanitization** — All rendered content is sanitized with DOMPurify before display
- **IPC Validation** — Every IPC message is validated with Zod schemas in the main process
- **XSS Prevention** — Editor output is never injected as raw `innerHTML` without sanitization
- **Local-Only Storage** — No external network requests; all data stays on your machine

## Editor

TipTap powers the editor with support for:

- Markdown import/export
- Syntax-highlighted code blocks
- Tables
- Task lists
- Images
- Text highlight and inline formatting

## What this project tries to demonstrate

- Desktop app architecture with Electron
- Type-safe development with TypeScript
- Secure IPC boundaries
- Local-first application design
- SQLite schema design and search with FTS5
- Rich editor integration without a frontend framework
- Native module handling with `electron-rebuild`
- Separation between main / renderer / shared

## Known issues

- On some systems, theme switching can flicker due to Electron rendering timing.
- The app still functions normally; this is a visual issue only.

## Bug reports

If you find a bug, please open an issue with reproduction steps and any useful context.

## License

MIT
