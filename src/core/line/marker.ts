/**
 * The list marker a line opens with, if any.
 *
 * A heading cannot be a list item as well, so writing one onto a line that is
 * already a bullet has to take the bullet away — otherwise `- Some text`
 * becomes `# - Some text`, which is a heading whose text starts with a dash.
 *
 * `conversion/listItem.ts` matches the same syntax and takes it apart into
 * indent, marker and gap, because a conversion re-indents whole sections around
 * it. Here only the width matters: everything the marker occupies is what the
 * `#`s replace, indentation included, since a heading only counts at the start
 * of the line.
 */

/**
 * Indentation, an unordered marker, then the whitespace closing it.
 *
 * Ordered items are deliberately not matched, the same choice
 * `conversion/listItem.ts` makes: `1. ` is not a bullet, and the plugin has one
 * definition of a list item rather than one per scope.
 */
const LIST_MARKER = /^[ \t]*[-*+][ \t]+/;

/** How many characters of list marker open the line. Zero when it is not one. */
export function listMarkerWidth(line: string): number {
  return line.match(LIST_MARKER)?.[0].length ?? 0;
}
