# Header Adjuster

An Obsidian plugin that shifts markdown heading levels across a document or a
selection, preserving the relative hierarchy between headings.

## Language

**Heading level**:
The number of `#` characters that open a heading line, from 1 to 6.

**Increase**:
Raising a heading's level, so `## A` becomes `### A` — moving *deeper* into the
outline.
_Avoid_: Promote, demote — both are read in opposite directions by different
people, and "promote" in particular suggests moving toward H1.

**Decrease**:
Lowering a heading's level, so `### A` becomes `## A` — moving *shallower*.
_Avoid_: Promote, demote.

**Heading ceiling**:
The deepest legal heading level, fixed at 6. Markdown defines no `#######`.

**Overflow**:
The amount by which a heading's computed target level exceeds the heading
ceiling. An H6 increased by 1 has an overflow of 1.

**Section body**:
The lines following a heading up to the next heading of any level, or the end of
the document. A heading and its section body are what a reader thinks of as "the
section".

**Top-level bullet**:
An unordered list item at zero indentation — `- `, `* `, or `+ ` in the first
column.

**Bullet conversion**:
Rewriting a heading that overflows the ceiling as a list item, indenting its
section body beneath it so the content stays inside the item.

**Heading conversion**:
The inverse — rewriting a list item as a heading, de-indenting its content back
out. Only **decrease** does this, and only when explicitly enabled.

## Relationships

- A **heading** owns exactly one **section body**, possibly empty
- An **overflow** of _n_ maps to a bullet indented _n − 1_ levels deep
- **Increase** performs **bullet conversion**; **decrease** performs **heading
  conversion**. Neither is enabled by default

## Example dialogue

> **Dev:** "If I **increase** an H6, it has nowhere to go. Should it stay put?"
> **Outliner:** "No — that's where my outline stops dead. It should become a
> bullet, and everything under it should come along inside that bullet."
> **Dev:** "So the **section body** moves with it. And going back the other way?"
> **Outliner:** "That's the awkward bit — you can't tell my hand-written lists
> apart from the ones you made."

## See also

`docs/architecture.md` describes how `src/` is shaped and which rules the build
enforces. This file is about the words; that one is about the structure.

## Flagged ambiguities

- "Promote" was used to mean **increase** (going deeper toward H6), while the
  word normally suggests moving toward H1 — resolved: use **increase** and
  **decrease** exclusively, named after the heading level number, never the
  visual hierarchy.
- Markdown carries no provenance marker, so a **top-level bullet** the plugin
  created and one the user typed are indistinguishable — resolved in ADR-0001.
