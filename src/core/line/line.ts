import type {
  AdjustmentOperation,
  HeadingPlacement,
  LinePlacement,
} from '../../contracts';
import type { LeveledLine } from './placement';
import { enclosingLevel, placedLevel } from './placement';
import { listMarkerWidth } from './marker';

/**
 * One line's heading level — the door into `line/`.
 *
 * The current line is the finest of the three scopes, and the only one where a
 * line carrying no `#` is a heading of level zero.
 *
 * This is the whole of the current-line adjustment, and it is deliberately not
 * the range adjustment with a narrower range. A single line has no tree to keep
 * intact and no section body to carry, so nothing above or below it is
 * consulted: the level goes up or down and stops at either end of the scale.
 *
 * Level zero is what makes the two directions meet. `levelAdjustment.ts` floors
 * at `#`, because a document-wide decrease that erased every H1 would be a
 * disaster; here, where the user is pointing at one line, the floor is plain
 * text — so an increase writes a heading onto a paragraph and a decrease takes
 * one back off.
 */

/** `######` — the deepest heading Markdown defines. */
const MARKDOWN_MAX_LEVEL = 6;

/**
 * A heading's `#` run together with the whitespace that closes it.
 *
 * `heading.ts` matches the same syntax but keeps only the run, because a range
 * adjustment rewrites the `#`s and leaves the gap where it found it. Level zero
 * cannot: crossing between a heading and plain text adds or removes that gap,
 * so this file has to see it.
 */
const HEADING_PREFIX = /^(#{1,6})(\s+)/;

/** A replacement of one line's heading prefix. `HeadingEdit` satisfies this. */
export interface LineLevelEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
}

/**
 * The edit that moves one line's level by `levels`, or nothing when it cannot
 * move — plain text asked to decrease, an `######` asked to increase, or a line
 * the document reads as code.
 *
 * An array rather than a nullable edit, so the caller hands the result straight
 * on as the edits of an outcome and counts them for what changed.
 */
export function adjustLineLevel(
  lines: readonly string[],
  fenced: readonly boolean[],
  lineNumber: number,
  operation: AdjustmentOperation,
  levels: number
): LineLevelEdit[] {
  return writeLine(lines, fenced, lineNumber, (level) =>
    operation === 'increase' ? level + levels : level - levels
  );
}

/**
 * The edit that writes one line at the level its placement asks for, or nothing
 * when it is already there.
 *
 * The counterpart to shifting. A placement names a level outright, worked out
 * from the outline rather than from the line — except `toggle`, which asks the
 * line whether it is already there, and is why the level goes to `placedLevel`
 * rather than being settled before `writeLine` is called.
 *
 * @param above The headings preceding the line, nearest last. The last of them
 *   is the enclosing heading, and the whole of what a placement reads.
 * @param target Where a toggle is pointed, which the user chooses. Ignored by
 *   every other placement.
 */
export function placeLineLevel(
  lines: readonly string[],
  fenced: readonly boolean[],
  lineNumber: number,
  placement: LinePlacement,
  above: readonly LeveledLine[],
  target: HeadingPlacement
): LineLevelEdit[] {
  const enclosing = enclosingLevel(above);
  return writeLine(lines, fenced, lineNumber, (level) =>
    placedLevel(placement, enclosing, level, target)
  );
}

/**
 * Rewrites one line at whatever level `choose` makes of the one it is written
 * at, clamped to what Markdown can hold.
 *
 * Both ways of asking meet here, which is why the level arrives as a function
 * rather than a number: reading the prefix is the part they share, and it is
 * also the part a shift needs before it can name its target at all.
 *
 * @param lineNumber The 0-based line to write; the rest of the document is only
 *   here because a fence is not something one line can see for itself.
 */
function writeLine(
  lines: readonly string[],
  fenced: readonly boolean[],
  lineNumber: number,
  choose: (level: number) => number
): LineLevelEdit[] {
  // A `#` inside a fence is text, and so is everything beside it: a line the
  // document reads as code is not one to write a heading onto.
  if (fenced[lineNumber]) {
    return [];
  }

  const line = lines[lineNumber] ?? '';
  const match = line.match(HEADING_PREFIX);
  const level = match ? match[1].length : 0;
  const target = Math.min(MARKDOWN_MAX_LEVEL, Math.max(0, choose(level)));

  if (target === level) {
    return [];
  }

  // What the line opens with, whichever kind of opening it is: a heading's
  // `#`s and their gap, or the marker of a list item at level zero.
  const written = match ? match[0].length : listMarkerWidth(line);

  return [prefixEdit(lineNumber, level, written, target)];
}

/**
 * The replacement that writes `target` where `level` was written.
 *
 * @param written How many characters the line's opening occupies. Only the two
 *   crossings of level zero need it: every move that stays a heading rewrites
 *   the `#` run and leaves whatever gap the author typed.
 */
function prefixEdit(
  lineNumber: number,
  level: number,
  written: number,
  target: number
): LineLevelEdit {
  // Down to plain text: the gap goes with the `#`s, or the line keeps a space
  // it never asked for.
  if (target === 0) {
    return { line: lineNumber, fromColumn: 0, toColumn: written, text: '' };
  }

  // Up from plain text: the gap has to be written, and a list marker is an
  // opening of its own — a line cannot be a bullet and a heading at once.
  if (level === 0) {
    return { line: lineNumber, fromColumn: 0, toColumn: written, text: `${'#'.repeat(target)} ` };
  }

  // Heading to heading: only the `#` run moves, so the gap survives.
  return { line: lineNumber, fromColumn: 0, toColumn: level, text: '#'.repeat(target) };
}
