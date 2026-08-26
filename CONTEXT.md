# Heading Adjuster

An Obsidian plugin that shifts markdown heading levels across a document, a
selection, or the current line, preserving the relative hierarchy between
headings.

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

**Markdown limit**:
The deepest heading Markdown defines, six — there is no `#######` to write.

**Level zero**:
A line carrying no `#` at all, read as a heading whose level is zero. An
**increase** from level zero writes a heading onto plain text; a **decrease** to
level zero takes one back off, gap and all.
_Avoid_: Paragraph, body text — those name what the line is, not where it sits
on the scale, and the point of the term is that it is on the scale.

**Current line**:
The line the cursor sits on, and the third and finest scope an adjustment can
have, after the document and the selection. It is the only scope that reads
**level zero**, and the only one that leaves nesting alone.

**Enclosing heading**:
The nearest heading above a line — the one whose **section body** the line sits
in. A line above every heading in a note has none, and the note itself stands in
its place at **level zero**.
_Avoid_: Parent — a parent is a heading's place in the tree, which a line that
is not yet a heading does not have.

**Placement**:
Naming the level a **current line** should take, rather than a distance to move
it. There are three: **sibling**, **child**, and **plain**. A placement reads the
**enclosing heading** and never reads how deep the line is written now, which is
what separates it from an **increase** or a **decrease**.

**Sibling**:
A placement putting the line at the **enclosing heading**'s own level, so the two
become siblings in the outline.

**Child**:
A placement putting the line one level deeper than the **enclosing heading**, so
it becomes the first heading inside that section.

**Plain**:
A placement putting the line at **level zero** — no heading at all. This is how
a heading is taken off outright, whatever level it was written at.

**Heading ceiling**:
The deepest level a heading may occupy before it converts, which the user sets.
_Avoid_: Maximum heading level — on its own it caps nothing.

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

**List marker**:
What opens a list item: its indentation, its `-`, `*` or `+`, and the whitespace
closing it. A **top-level bullet** is the case where the indentation is empty.
An ordered `1. ` is not one — the plugin has a single definition of a list item
and it is unordered.

**Bullet conversion**:
Rewriting a heading that overflows the ceiling as a list item, indenting its
section body beneath it so the content stays inside the item.

**Heading conversion**:
The inverse — rewriting a list item as a heading, de-indenting its content back
out. Only **decrease** does this, and only when explicitly enabled.

## Relationships

- A **heading** owns exactly one **section body**, possibly empty
- The **current line** is the only scope that reads **level zero**; across a
  document or a selection a **decrease** floors at `#`, because one that erased
  every H1 in a note would be a disaster
- The **current line** never converts: **bullet conversion** re-indents a
  **section body**, and one line is not a section
- A **placement** names a level; an **increase** and a **decrease** name a
  distance. Only a placement reads the **enclosing heading**, and only a
  distance reads the level the line is written at
- **Sibling** and **child** both land on `#` when there is no **enclosing
  heading**, because the note they sit in is **level zero**
- A line's **list marker** and its **heading level** are the same slot: writing
  a heading onto a list item replaces the marker rather than following it, since
  a line cannot be a bullet and a heading at once
- Taking a heading off never writes a **list marker** back. Markdown records no
  provenance for the one it replaced, which is the reasoning of ADR-0001 read at
  the scale of one line
- An **overflow** of _n_ maps to a bullet indented _n − 1_ levels deep
- **Increase** performs **bullet conversion**; **decrease** performs **heading
  conversion**. Neither is enabled by default
- The **heading ceiling** defaults to the **Markdown limit**, and is inert
  until a conversion is switched on

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
