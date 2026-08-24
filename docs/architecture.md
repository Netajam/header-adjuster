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
│   └── commands/adjustmentCommands.ts
│       ├── editor/headingAdjustmentService.ts   door — the only place effects happen
│       │   ├── editor/editorDocument.ts
│       │   └── core/adjustHeadings.ts           door — the whole decision, on strings
│       │       ├── core/headingTree.ts
│       │       │   └── core/heading.ts
│       │       ├── core/levelAdjustment.ts
│       │       └── core/headingEdits.ts
│       └── ui/levelInputModal.ts    door — the level dialog
│           └── ui/levelInputForm.ts
│               └── ui/submissionValidation.ts
└── settings/settings.ts             door
    └── settings/settingsTab.ts

contracts.ts                         shared vocabulary — outside the tree
```

## How a leaf stays a leaf

Rule 2 would be impossible if every file that handles a heading had to import
the file that defines one. It does not: a leaf **states the shape it needs**
instead of importing a type.

`levelAdjustment.ts` declares `AdjustableHeading` — the four fields it actually
touches. `headingEdits.ts` declares `EditableHeading`. `editorDocument.ts`
declares `LineEdit`. `Heading` and `HeadingEdit` satisfy all three structurally
without knowing they exist. This is why `core/heading.ts` has one importer
rather than three, and it reads better than the import did: each file says what
it wants from a heading rather than accepting the whole of one.

Where even a shape would be duplication, the leaf takes values instead:
`submissionValidation.ts` validates three arguments rather than the object
holding them, so `levelInputForm.ts` can own `LevelInputSubmission` outright
and nothing has to be passed back up.

## The one carve-out

`contracts.ts` declares types and nothing else — no functions, no constants.
Those declarations are erased at compile time, so importing them couples
nothing and none of it appears in the shipped bundle. It is vocabulary, not a
dependency, and it sits outside the tree.

The exemption is earned per file, not granted by name: the architecture test
checks that an exempt module contains nothing that can run and imports nothing
itself. Add one function to `contracts.ts` and it stops qualifying — the tree
rule starts applying and immediately fails on its seven importers.

## Where the layers split

- **`core/`** is the whole adjustment as a function of text. No Obsidian
  import anywhere in it, which is what makes the behaviour testable directly.
- **`editor/`** is the Obsidian adapter, and the only place a decision becomes
  an effect: one undoable transaction and one `Notice`.
- **`settings/`** is the policy — defaults, how a stored value is read back,
  how a default is chosen — with the dialog that edits it behind the door.
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
