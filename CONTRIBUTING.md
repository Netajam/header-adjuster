# Contributing to Heading Adjuster

Thanks for taking an interest. Issues and pull requests are both welcome on
[the GitHub repository](https://github.com/Netajam/heading-adjuster).

## Reporting a bug

The heading rules have a lot of edge cases, so a report is most useful when it
carries the markdown that triggered it. Please include:

- The note content, or a trimmed version that still reproduces the problem —
  fences, front matter, and list nesting all matter.
- Which command you ran, and over what: the whole document, a selection, or a
  line range.
- Your settings for **Deepest heading level** and the two conversion toggles.
- What you expected, and what you got.

## Suggesting a feature

Say what you are trying to do with your notes rather than which button you want.
`CONTEXT.md` names the vocabulary this plugin thinks in — heading ceiling,
overflow, conversion — and a request phrased in those terms is quicker to place.

## Setting up

```bash
git clone https://github.com/Netajam/heading-adjuster.git
cd heading-adjuster
npm install
```

To develop against a real vault, clone into
`<vault>/.obsidian/plugins/header-adjuster` — the plugin id, which the rename to
Heading Adjuster deliberately left alone — and run `npm run dev`, which watches
the sources and rebuilds `main.js` in place. Reload Obsidian to pick up a build.

## Checks

All three must pass before a pull request is ready:

```bash
npm run lint    # eslint over src/ and tests/
npm test        # the node:test suite
npm run build   # type-check, then bundle to main.js
```

`main.js` is a build artifact and is not committed — it is attached to GitHub
releases instead.

## Where code goes

`docs/architecture.md` describes the layering, and the short version is that
dependencies point one way, from the outside in:

- `src/core/` is pure. It decides what should change given text and settings,
  and it never imports from `obsidian`. Every rule belongs here.
- `src/editor/` is the seam between those decisions and a live editor: reading
  lines, writing them back as one undoable transaction, and telling the user
  what happened.
- `src/commands/`, `src/ui/`, `src/settings/` are the surfaces. They gather a
  request and hand it down; they hold no heading rules of their own.

A change to how headings behave should therefore be testable without an editor.
If a new rule cannot be reached from a `core/` test, it is probably in the wrong
folder.

## Tests

Tests live in `tests/`, mirroring the `src/` layout, and run on the built-in
`node:test` runner. A bug fix wants a test that fails before it, written as the
markdown that broke and the markdown that should come out.

## Decisions already made

`docs/adr/` records the choices that were argued once and should not be
relitigated without new information — most notably that reversing bullets back
into headings is marker-blind and therefore opt-in. If a change contradicts one,
say so in the pull request, and add an ADR alongside it.

## Commits and pull requests

Write the commit subject as what the change does to the plugin's behaviour, in
the imperative. Keep a pull request to one concern, and describe what a user
would notice.
