# Architecture

The plugin does one thing: move Markdown heading levels up or down without
breaking the outline. The folders exist so that decision can be read, and
tested, apart from the editor it happens in.

## Layers

Dependencies only ever point down this list. Nothing below imports anything
above it, so there are no cycles anywhere in `src/`.

| Folder | Depends on | Holds |
| --- | --- | --- |
| `src/adjustmentOperation.ts` | — | `'increase' \| 'decrease'`. The one word every layer says. |
| `src/core/` | the word above | The whole adjustment, as a function of text. No Obsidian import. |
| `src/settings/` | the word above | The user's preferences, and the tab that edits them. |
| `src/editor/` | `core` | The Obsidian `Editor` adapter, and the one place side effects happen. |
| `src/ui/` | `settings` | The level-input dialog and its validation rules. |
| `src/commands/` | `editor`, `ui`, `settings` | What a user can trigger, from the ribbon or the palette. |
| `src/main.ts` | `commands`, `settings` | The entry point, and nothing else. |

## One door per folder

A folder is easier to trust when outsiders enter it at one point, because that
point is the only thing that has to stay stable. Two of the folders are shaped
around this deliberately.

**`core/` is entered only through `adjustHeadings.ts`.** It owns the request,
the outcome, the edit shape, and the functions that build and apply edits — so
`editor/` never has to name `heading.ts`, `headingTree.ts` or
`levelAdjustment.ts`. Those three are core's private working parts.

- `heading.ts` — the H1–H6 scale, reading one line as a heading, the `Heading` node.
- `headingTree.ts` — reading a slice of a document into a heading tree.
- `levelAdjustment.ts` — moving levels while keeping the nesting intact.
- `adjustHeadings.ts` — the door: `adjustHeadings(lines, request)` in, edits or a
  rejection reason out.

**`editor/` is entered only through `headingAdjustmentService.ts`.** Working out
which lines a selection covers is the adapter's job, so `selectedLineRange`
never leaves the folder; `commands/` asks for `adjustEditorSelection` instead.
This is also the only place a decision becomes an effect — one undoable
transaction, and one `Notice`.

`AdjustmentOperation` lives at the root rather than inside `core/` for the same
reason: while it sat in `core/operations.ts`, four folders reached into `core/`
for a three-line type, and `core/` had three doors instead of one.

## Breaking the loop with the entry point

`commands/` and `settings/` both need the plugin's settings, and `settings/`
needs to save them. Rather than importing `main.ts` — which imports them right
back — each declares what it needs as an interface: `CommandContext` and
`SettingsHost`. `HeaderAdjusterPlugin` implements both, and passing `this` to
`registerCommandSurfaces` is where TypeScript checks that it still does.

## Tests

`npm test` runs Node's built-in runner over `tests/`, mirroring the source
layout. Every layer except the two that touch Obsidian's globals
(`headingAdjustmentService`, `levelInputModal`) is covered directly.

`tests/support/resolveTypeScript.mjs` teaches Node's ESM loader to resolve the
extensionless relative imports that `esbuild` and `tsc` already understand; it
is a test-time concern only and nothing in `src/` knows about it.
