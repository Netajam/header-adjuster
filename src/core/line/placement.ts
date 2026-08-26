import type { HeadingPlacement, LinePlacement } from '../../contracts';

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

/**
 * The level a placement asks for, before the writer clamps it to what Markdown
 * has.
 *
 * @param level What the line is written at now. Only `toggle` reads it: the
 *   others say where the line belongs without looking at where it is.
 * @param target Where a toggle is pointed. Ignored by every other placement.
 */
export function placedLevel(
  placement: LinePlacement,
  enclosing: number,
  level: number,
  target: HeadingPlacement
): number {
  if (placement === 'plain') {
    return 0;
  }

  // A toggle is its target read twice. Aiming at it turns a plain line into a
  // heading; finding the line already there means the only move left is off,
  // which is what makes one press create a section and the next remove it.
  const aim = placement === 'toggle' ? target : placement;
  const aimed = headingLevel(aim, enclosing);

  return placement === 'toggle' && level === aimed ? 0 : aimed;
}

/** The level one of the three heading placements names. */
function headingLevel(placement: HeadingPlacement, enclosing: number): number {
  if (placement === 'root') {
    return MIN_HEADING_LEVEL;
  }
  if (placement === 'child') {
    return enclosing + 1;
  }
  return Math.max(MIN_HEADING_LEVEL, enclosing);
}
