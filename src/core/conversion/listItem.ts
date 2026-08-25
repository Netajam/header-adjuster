/**
 * What a list item is, and how deep it sits in the list around it.
 *
 * A leaf, and the mirror of `heading.ts` for the other half of the conversion.
 * Ordered items are deliberately not matched — `1. ` carries a number that no
 * heading level can round-trip back to.
 */

/** Indentation, an unordered marker, whitespace, then the item's text. */
const LIST_ITEM_PATTERN = /^([ \t]*)([-*+])([ \t]+)(.*)$/;

/** A list item line, taken apart into the pieces a conversion needs. */
export interface ListItem {
  /** The whitespace the line opens with, verbatim. */
  readonly indent: string;
  /** The marker character: `-`, `*` or `+`. */
  readonly marker: string;
  /** The whitespace between marker and text, preserved on rewrite. */
  readonly gap: string;
  /** The column the item's text starts at. */
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
    marker,
    gap,
    contentColumn: indent.length + marker.length + gap.length,
  };
}

/** A list item together with where it sits in the nesting around it. */
export interface NestedItem {
  /** 0-based line the item is written on. */
  readonly line: number;
  /** How deep the item nests. Zero is outermost, whatever it is indented by. */
  readonly level: number;
  readonly item: ListItem;
  /** The indent width of each level enclosing this one, outermost first. */
  readonly enclosing: readonly number[];
}

/**
 * Reads the list items in a range, working out how deeply each one nests.
 *
 * Depth is relative, never arithmetic on the indentation: a tab, two spaces and
 * four spaces are all one level, because what makes an item a child is being
 * indented past the item above it rather than being indented by any particular
 * amount. Dividing columns by an assumed width gets a tab-indented list wrong in
 * the worst way — it reads every child as another root.
 *
 * `enclosing` carries the indent widths the item is nested inside, so a caller
 * lifting it out by some number of levels knows the column to put it back at
 * without having to guess the document's indent style.
 */
export function nestedItems(
  lines: readonly string[],
  fenced: readonly boolean[],
  fromLine: number,
  toLine: number
): NestedItem[] {
  const items: NestedItem[] = [];
  const open: number[] = [];

  for (let line = fromLine; line <= toLine; line++) {
    const item = fenced[line] ? null : matchListItem(lines[line]);
    if (!item) {
      continue;
    }

    const indent = item.indent.length;
    while (open.length > 0 && indent <= open[open.length - 1]) {
      open.pop();
    }

    items.push({ line, level: open.length, item, enclosing: [...open] });
    open.push(indent);
  }

  return items;
}
