# Architecture

The plugin does one thing: move Markdown heading levels up or down without
breaking the outline. The folders exist so that decision can be read, and
tested, apart from the editor it happens in.

## Layers

Dependencies only ever point down this list. Nothing below imports anything
above it, so there are no cycles anywhere in `src/`.

| Folder | Depends on | Holds |
| --- | --- | --- |
| `src/core/` | — | The whole adjustment, as a function of text. No Obsidian import. |
| `src/settings/` | `core` | The user's preferences, and the tab that edits them. |
| `src/editor/` | `core` | The Obsidian `Editor` adapter, and the one place side effects happen. |
| `src/ui/` | `core`, `settings` | The level-input dialog and its validation rules. |
| `src/commands/` | all of the above | What a user can trigger, from the ribbon or the palette. |
| `src/main.ts` | `commands`, `settings` | The entry point, and nothing else. |

### `src/core/` — the decision

- `operations.ts` — the shared vocabulary: `AdjustmentOperation`, H1–H6.
- `heading.ts` — reading one line as a heading; the `Heading` node.
- `headingTree.ts` — reading a slice of a document into a heading tree.
- `levelAdjustment.ts` — moving levels while keeping the nesting intact.
- `headingEdits.ts` — turning moved headings into line edits.
- `adjustHeadings.ts` — the composition of the four above, and the entry point
  every caller uses.

`adjustHeadings(lines, request)` takes plain strings and returns either the
edits to apply or a reason it declined. That signature is what makes the
behaviour testable without standing up Obsidian.

### The seam

`src/editor/headingAdjustmentService.ts` is the only place where a decision
becomes an effect: it reads the editor, calls `adjustHeadings`, applies the
edits in one undoable transaction, and turns the outcome into a `Notice`.

### Breaking the loop with the entry point

`commands/` and `settings/` both need the plugin's settings, and `settings/`
needs to save them. Rather than importing `main.ts` — which imports them right
back — each declares what it needs as an interface: `CommandContext` and
`SettingsHost`. `HeaderAdjusterPlugin` implements both and hands itself over at
load time.

## Tests

`npm test` runs Node's built-in runner over `tests/`, mirroring the source
layout. Every layer except the two that touch Obsidian's globals
(`headingAdjustmentService`, `levelInputModal`) is covered directly.

`tests/support/resolveTypeScript.mjs` teaches Node's ESM loader to resolve the
extensionless relative imports that `esbuild` and `tsc` already understand; it
is a test-time concern only and nothing in `src/` knows about it.
