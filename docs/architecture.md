# Architecture

The plugin does one thing: move Markdown heading levels up or down without
breaking the outline. `src/` is arranged as a tree so that both the folders and
the files hold the same shape at every level.

## The rules

These are checked by `tests/architecture.test.ts`, not just described here.
Breaking one fails the build.

1. **Every folder has exactly one door.** Outsiders import one file from a
   folder and never reach past it.
2. **Every file gets its dependencies from its parent.** The import graph is a
   tree rooted at `main.ts`, so no file has two importers. **No file re-exports
   what another file declares** — a re-export makes one file look like the
   parent while the caller stays coupled to whatever is behind it, so the
   arrow in the graph points at the wrong file.
3. **No file declares more than 7 entities.**
4. **No entity has more than 7 elements** — members for a class or interface,
   parameters for a function.

## The tree

```
main.ts                              root
├── commands/commandSurfaces.ts      door — ribbon icon + palette entries
│   ├── commands/icons.ts            one symbol per action
│   └── commands/adjustmentCommands.ts
│       ├── commands/activeEditor.ts             which editor a command acts on
│       ├── editor/headingAdjustmentService.ts   door — the only place effects happen
│       │   ├── editor/editorDocument.ts
│       │   └── core/adjustHeadings.ts           door — the whole decision, on strings
│       │       ├── core/fencedLines.ts          which lines are code, not markup
│       │       ├── core/headingTree.ts
│       │       │   └── core/heading.ts
│       │       ├── core/levelAdjustment.ts
│       │       ├── core/line/line.ts             door — the current line's level
│       │       │   ├── core/line/placement.ts
│       │       │   └── core/line/marker.ts
│       │       ├── core/headingEdits.ts
│       │       └── core/conversion/conversion.ts  door — which conversion applies
│       │           ├── core/conversion/bulletConversion.ts
│       │           │   └── core/conversion/sectionBody.ts
│       │           └── core/conversion/headingConversion.ts
│       │               └── core/conversion/listItem.ts
│       └── ui/levelInputModal.ts    door — the level dialog
│           └── ui/levelInputForm.ts
│               └── ui/submissionValidation.ts
└── settings/settings.ts             door
    └── settings/settingsTab.ts      how Obsidian is handed them
        └── settings/controls.ts     what the settings are

contracts.ts                         shared vocabulary — outside the tree
```

## How a leaf stays a leaf

Rule 2 would be impossible if every file that handles a heading had to import
the file that defines one. It does not: a leaf **states the shape it needs**
instead of importing a type.

`levelAdjustment.ts` declares `AdjustableHeading` — the four fields it actually
touches. `headingEdits.ts` declares `EditableHeading`. `editorDocument.ts`
declares `LineEdit`. `line/placement.ts` declares `LeveledLine`, because the
level is the whole of what a placement reads from the outline. `activeEditor.ts`
declares `EditorHost`, the one field of the plugin that finding an editor takes,
so that the file it is called from does not end up on both ends of an arrow. `adjustHeadings.ts` declares `LeveledHeading` for the three
fields an overflow is worked out from. `Heading` and `HeadingEdit` satisfy them
all structurally without knowing they exist. This is why `core/heading.ts` has one importer
rather than three, and it reads better than the import did: each file says what
it wants from a heading rather than accepting the whole of one.

Where even a shape would be duplication, the leaf takes values instead:
`submissionValidation.ts` validates three arguments rather than the object
holding them, so `levelInputForm.ts` can own `LevelInputSubmission` outright
and nothing has to be passed back up.

## The one carve-out

`contracts.ts` declares types and nothing else — no functions, no constants.
`RejectionReason` lives there for the same reason `AdjustmentOperation` does:
`core/` decides one and `editor/` is what says it out loud, so the word belongs
to neither.
Those declarations are erased at compile time, so importing them couples
nothing and none of it appears in the shipped bundle. It is vocabulary, not a
dependency, and it sits outside the tree.

The exemption is earned per file, not granted by name: the architecture test
checks that an exempt module contains nothing that can run and imports nothing
itself. Add one function to `contracts.ts` and it stops qualifying — the tree
rule starts applying and immediately fails on its seven importers.

## Why `line/` is a folder

A heading adjustment has three scopes — the document, the selection, and the
current line — and the first two are the same decision with different bounds.
The third is not, which is why `line/` sits beside the range pipeline rather
than inside it.

The range pipeline exists to keep a hierarchy intact: it parses a tree, moves
each heading against its parent and children, and re-indents section bodies for
anything that overflows. A single line has no tree and no section body. Running
it through that pipeline with `fromLine === toLine` would work, and would answer
the wrong question: `parseHeadings` would return one heading with no relatives,
`assignAdjustedLevels` would floor it at `#`, and the thing that makes the scope
worth having — that a plain line is a heading of level zero, so an increase
writes one and a decrease takes it away — would be missing.

Level zero cannot simply be lowered into `levelAdjustment.ts` either. A
document-wide decrease that stripped every H1 to plain text would be a disaster,
so the floor has to differ by scope, and a floor that differs by scope is two
rules wearing one name. `adjustHeadings` keeps its door and branches on
`levelZero` in the request, which is why `core/` still has exactly one entrance
and the branch costs the door one line.

`conversion/` never enters the picture: a bullet conversion re-indents a section
body, and one line is not a section.

The folder holds two files because the current line is asked for in two ways.
A *shift* moves it by a distance, reading the level it is written at; a
*placement* names a level outright, reading the enclosing heading instead and
ignoring the line entirely. `placement.ts` owns that second question — which
level a `plain`, `sibling` or `child` asks for — and `line.ts` owns the part
they share, which is reading and rewriting the `#` prefix. That gap after the
`#`s is why they are here at all rather than reusing `heading.ts` and
`headingEdits.ts`: those two rewrite a `#` run and leave the whitespace where
they found it, which is correct for every move that stays a heading and wrong
for the two that cross level zero.

`marker.ts` is there for the same reason as the gap: a line cannot be a bullet
and a heading at once, so writing one onto a list item replaces the marker
rather than following it. It matches the syntax `conversion/listItem.ts` matches
and keeps only the width, because a conversion re-indents whole sections around
an item while this one is only working out what the `#`s cover.

Grouping them was also arithmetic, the same as it was for `conversion/`: three
more children would have put `core/` at ten, past what a reader takes in at
once. `line.ts` is the door, so `adjustHeadings` asks for a shift or a placement
and is handed edits either way — the same way it asks for a conversion.

Placements enter through a second function on the door rather than another flag
on `AdjustmentRequest`. A placement has no direction and no distance, so routing
one through the request would mean handing `adjustHeadings` an `operation` and a
`levels` that mean nothing, and a required argument nobody means is how a door
starts lying about what it takes.

## Why `conversion/` is a folder

The two conversions — a heading that outgrew `######` becoming a list item, and
a list item becoming a heading again — are opposites of one another and never
both apply. That choice is a thing in its own right, so it lives behind its own
door rather than as two more branches in the door of `core/`.

Grouping them was not only about naming. `core/` had grown to ten children,
which is more than a reader takes in at once, and `adjustHeadings.ts` had grown
a branch per setting. `conversion.ts` owns the choice between the two
directions outright, so the door above it asks for a conversion once and is
handed edits — the same way it asks for heading edits.

It owns the ceiling too. How deep headings may go is configurable, but the
setting is inert unless something converts, and a decrease converting a bullet
back has to aim at the level an increase pushed it out from. Those are one
decision read three ways, which is why `ceilingPolicy` returns all three rather
than leaving each caller to work them out.

## Where the layers split

- **`core/`** is the whole adjustment as a function of text. No Obsidian
  import anywhere in it, which is what makes the behaviour testable directly.
- **`editor/`** is the Obsidian adapter, and the only place a decision becomes
  an effect: one undoable transaction and one `Notice`.
- **`settings/`** is the policy — defaults, how a stored value is read back,
  how a default is chosen — with the dialog that edits it behind the door.
  `controls.ts` is the list of settings there are; `settingsTab.ts` is the two
  ways Obsidian gets them, described from 1.13 and drawn by hand before that.
  Both paths read the one list, so neither can describe a setting the other
  does not have. A stored value is whatever the file held, so a control that
  admits only some strings — the toggle target does — checks the value against
  the very options the user chose from rather than a second list of its own.
- **`commands/`** owns how an action is offered, which on mobile means its
  symbol as much as its name: the toolbar there shows the icon and nothing
  else, so two actions wearing one glyph are two actions a user cannot tell
  apart. `icons.ts` holds the symbol next to nothing but itself, and both the
  palette entry and the ribbon item read it, so the two cannot drift. The
  ribbon menu is also where every symbol appears at once, which is what makes
  a missing one visible.
- **`commands/`** never imports `settings/`. `CommandContext` asks for
  `defaultLevel(operation)` rather than for the settings object, because the
  plugin is what owns the settings.

## Tests

`npm test` runs Node's built-in runner over `tests/`, mirroring the source
layout. Tests sit outside the tree and may import any file directly — that is
what unit testing is.

`tests/support/resolveTypeScript.mjs` teaches Node's ESM loader to resolve the
extensionless relative imports that `esbuild` and `tsc` already understand, and
points the `obsidian` specifier at `obsidianStub.ts`. That stub is only enough
for a module to load, so a file that imports Obsidian at the top can still be
imported for the pure functions further down it. Nothing in it works: a test
that starts leaning on stub behaviour is a sign the code under test belongs in
a file that does not import Obsidian.

`tests/support/sourceTree.ts` parses `src/` with TypeScript's own parser so the
architecture test can tell an erased `import type` from a real dependency.
