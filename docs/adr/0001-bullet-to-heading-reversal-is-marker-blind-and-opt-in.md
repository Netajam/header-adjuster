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
