import type { LinePlacement } from '../../contracts';

/**
 * Which level a line's heading takes when it is placed rather than moved.
 *
 * Placing reads the outline instead of the line: what matters is the enclosing
 * heading — the nearest one above — and whether the line is meant to sit beside
 * it or under it. How deep the line happens to be written now says nothing
 * about where it belongs, which is exactly what separates this from a shift.
 */

/** `#` — the shallowest heading, and so the shallowest a placed one can be. */
const MIN_HEADING_LEVEL = 1;

/**
 * All this file needs a heading to be.
 *
 * Stated rather than imported: the level is the whole of what a placement reads
 * from the outline, and `Heading` satisfies it without knowing this exists.
 */
export interface LeveledLine {
  readonly level: number;
}

/**
 * The level of the heading whose section the line sits in, or zero when the
 * line is above every heading in the note.
 *
 * Zero is the honest answer rather than a missing one: a line with nothing above
 * it sits in the note itself, and the note is level zero. A sibling of that is
 * an `#`, and so is a child of it.
 */
export function enclosingLevel(above: readonly LeveledLine[]): number {
  return above[above.length - 1]?.level ?? 0;
}

/** The level a placement asks for, before the writer clamps it to what Markdown has. */
export function placedLevel(placement: LinePlacement, enclosing: number): number {
  if (placement === 'plain') {
    return 0;
  }
  if (placement === 'child') {
    return enclosing + 1;
  }
  return Math.max(MIN_HEADING_LEVEL, enclosing);
}
