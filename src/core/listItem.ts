/**
 * What a list item is: one line read as a marker, a depth, and its text.
 *
 * A leaf, and the mirror of `heading.ts` for the other half of the conversion.
 * Ordered items are deliberately not matched — `1. ` carries a number that no
 * heading level can round-trip back to.
 */

/** Indentation, an unordered marker, whitespace, then the item's text. */
const LIST_ITEM_PATTERN = /^([ \t]*)([-*+])([ \t]+)(.*)$/;

/** One level of list nesting. Two columns is the width of a `- ` marker. */
export const INDENT_WIDTH = 2;

/** A list item line, taken apart into the pieces a conversion needs. */
export interface ListItem {
  /** The whitespace the line opens with, verbatim. */
  readonly indent: string;
  /** Nesting depth, counted in `INDENT_WIDTH` columns. */
  readonly depth: number;
  /** The marker character: `-`, `*` or `+`. */
  readonly marker: string;
  /** The whitespace between marker and text, preserved on rewrite. */
  readonly gap: string;
  /** The column the item's text starts at, which its body has to reach. */
  readonly contentColumn: number;
}

/** The pieces of a list item line, or null when the line is not one. */
export function matchListItem(line: string): ListItem | null {
  const match = line.match(LIST_ITEM_PATTERN);
  if (!match) {
    return null;
  }

  const [, indent, marker, gap] = match;
  return {
    indent,
    depth: Math.floor(indent.length / INDENT_WIDTH),
    marker,
    gap,
    contentColumn: indent.length + marker.length + gap.length,
  };
}
