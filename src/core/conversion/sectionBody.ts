/**
 * How far a heading's section reaches.
 *
 * A leaf: it is handed a flag per line saying where a new section starts, so it
 * never has to recognise a heading itself. That is also what keeps a fenced `#`
 * from ending a section early — the caller has already ruled those out.
 */

/** Where a section's body stops, and whether the range cut it short. */
export interface SectionExtent {
  /** Last 0-based line of the body. Below the heading's own line when empty. */
  lastLine: number;
  /** True when the body continued past the range and was only partly covered. */
  truncated: boolean;
}

/**
 * The body of the section opening at `headingIndex`.
 *
 * A body runs to the line before the next section starts, or to the end of the
 * document. It is then cut to `rangeEnd`: an adjustment scoped to a selection
 * must not edit lines outside it, even when the section carries on past them.
 * Losing the tail is reported rather than hidden, because a half-indented
 * section is something the user should hear about.
 */
export function sectionBodyExtent(
  boundaries: readonly boolean[],
  headingIndex: number,
  rangeEnd: number
): SectionExtent {
  let next = headingIndex + 1;
  while (next < boundaries.length && !boundaries[next]) {
    next++;
  }

  const naturalLast = next - 1;
  return {
    lastLine: Math.min(naturalLast, rangeEnd),
    truncated: naturalLast > rangeEnd,
  };
}
