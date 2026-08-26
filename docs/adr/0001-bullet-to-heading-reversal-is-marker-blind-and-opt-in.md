# Bullet-to-heading reversal is marker-blind and opt-in

Converting an overflowing heading into a bullet is easy; converting back is not,
because markdown records no provenance — a top-level bullet the plugin created
is byte-identical to one the user typed by hand. We considered restricting the
reverse to bullets that have indented content (which silently breaks the round
trip for body-less headings) and to bullets tracked in memory (which does not
survive a reload or a sync). We chose the blunt rule instead: with the setting
enabled, **every** top-level bullet in range converts back to a heading, and the
setting ships disabled by default.

## Consequences

Users who enable it will see hand-written lists — shopping lists, task lists,
nested outlines — turn into headings on a document-wide decrease. This is
accepted: the rule is one sentence and therefore predictable, undo is a single
keystroke, and the alternative was a conversion that works only sometimes for
reasons invisible in the file. The setting description must state the risk
plainly rather than burying it.

## Amendment: how deep an item sits

Nesting depth is read from what encloses an item, never from arithmetic on its
indentation — a tab, two spaces and four spaces are each one level, because what
makes an item a child is being indented past the item above it.

That has nothing to measure for an item indented with *nothing* open above it,
and read it as a root. The forward conversion writes exactly that shape: a
heading overflowing the ceiling by more than one level becomes a bullet indented
to record how far it went, with no bullet above it. The depth the indent was
carrying was then dropped on the way back, so a round trip returned the heading
one level too shallow for each level of overflow.

For that one shape — and only that one — the indent is now read, in the two-space
unit the forward conversion writes, and the levels it implies are opened behind
the item so anything nested under it still counts up from where it sits.

### Consequences

A list whose first item is indented, with no item above it, is now read as
nested rather than as a root: a decrease moves it out a level instead of lifting
it to a heading. That is what the same item already did anywhere else in a
document, so indentation now means one thing rather than two depending on what
happened to precede it. Lists that start at column zero — which is every
ordinary list, whatever it indents by — are unaffected.
