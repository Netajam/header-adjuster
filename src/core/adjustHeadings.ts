import type {
  AdjustmentOperation,
  ConversionSettings,
  HeadingPlacement,
  LinePlacement,
  RejectionReason,
} from '../contracts';
import type { HeadingEdit } from './headingEdits';
import { ceilingPolicy, convertOverflow } from './conversion/conversion';
import { collectHeadingEdits } from './headingEdits';
import { adjustLineLevel, placeLineLevel } from './line/line';
import { computeFencedLines } from './fencedLines';
import { headingBoundaries, parseHeadings } from './headingTree';
import { assignAdjustedLevels, overflowDepth } from './levelAdjustment';

/**
 * The whole adjustment, as a function of text — and the door into `core/`.
 *
 * Everything the plugin decides about a heading adjustment is decided here, on
 * plain strings: this is the layer that can be exercised without an editor.
 * Callers hand in lines and get back either edits or a reason nothing happened,
 * and never need to name anything behind this file.
 */

/** What the user asked for: a direction, a distance, and the lines it applies to. */
export interface AdjustmentRequest {
  operation: AdjustmentOperation;
  levels: number;
  /** First 0-based line to adjust. Defaults to the start of the document. */
  fromLine?: number;
  /** Last 0-based line to adjust, inclusive. Defaults to the end of the document. */
  toLine?: number;
  /** Which overflow conversions to apply. Both are off when omitted. */
  conversion?: ConversionSettings;
  /**
   * Read the line at `fromLine` on its own, counting a line with no `#` as a
   * heading of level zero — so an increase writes a heading onto plain text and
   * a decrease takes one back off.
   *
   * This narrows the whole request: `toLine` and `conversion` are not read. One
   * line has no tree to keep intact and no section body to carry into a bullet,
   * which is exactly what makes it the finest adjustment the plugin offers.
   */
  levelZero?: boolean;
}

export type AdjustmentOutcome =
  | {
      status: 'adjusted';
      edits: HeadingEdit[];
      changedCount: number;
      /** Sections whose body ran past the range and was only partly indented. */
      truncatedSections: number;
    }
  | { status: 'rejected'; reason: RejectionReason };

export function adjustHeadings(
  lines: readonly string[],
  request: AdjustmentRequest
): AdjustmentOutcome {
  const fromLine = request.fromLine ?? 0;
  const toLine = request.toLine ?? lines.length - 1;

  const rejection = rejectRequest(fromLine, toLine, request.levels);
  if (rejection) {
    return { status: 'rejected', reason: rejection };
  }

  const fenced = computeFencedLines(lines);

  // A line that cannot move comes back as nothing to do rather than as a
  // missing heading — the user is pointing at the line, so it is not lost.
  if (request.levelZero) {
    const edits = adjustLineLevel(lines, fenced, fromLine, request.operation, request.levels);
    return { status: 'adjusted', edits, changedCount: edits.length, truncatedSections: 0 };
  }

  const boundaries = headingBoundaries(lines, fenced);
  const headings = parseHeadings(lines, fromLine, toLine, fenced);

  const conversion = { ...request, fromLine, toLine, settings: request.conversion };
  const { overflowAt, allowOverflow } = ceilingPolicy(conversion);
  assignAdjustedLevels(headings, request.operation, request.levels, allowOverflow);

  // A heading pushed past the ceiling is written as a bullet instead, so it must
  // not also be written back as a `#` run seven characters long.
  const kept = headings.filter((heading) => overflowDepth(heading.level, overflowAt) === 0);
  const converted = convertOverflow(
    lines,
    boundaries,
    fenced,
    overflowed(headings, overflowAt),
    conversion
  );
  const edits = [...collectHeadingEdits(kept), ...converted.edits];

  if (edits.length === 0 && headings.length === 0) {
    return { status: 'rejected', reason: 'no-headings' };
  }

  return {
    status: 'adjusted',
    // Bottom-up, so an editor applying them in order never invalidates a line
    // number it has not reached yet.
    edits: edits.sort((a, b) => b.line - a.line),
    changedCount: kept.filter((heading) => heading.hasChanged).length + converted.changedCount,
    truncatedSections: converted.truncatedSections,
  };
}

/**
 * Writes the line at `lineNumber` as a heading placed against the section it
 * sits in, or as plain text — the second thing a caller can ask of `core/`.
 *
 * A placement names the level outright, so none of the range machinery applies:
 * there is no distance to travel, nothing to reject, and no hierarchy to keep
 * intact. What it does need is the outline above the line, which is the one
 * thing a single line cannot see for itself.
 */
export function placeLineHeading(
  lines: readonly string[],
  lineNumber: number,
  placement: LinePlacement,
  target: HeadingPlacement = 'sibling',
  conversion?: ConversionSettings
): AdjustmentOutcome {
  const fenced = computeFencedLines(lines);
  const above = parseHeadings(lines, 0, lineNumber - 1, fenced);
  const edits = placeLineLevel(lines, fenced, lineNumber, placement, above, target, conversion);

  return { status: 'adjusted', edits, changedCount: edits.length, truncatedSections: 0 };
}

/**
 * All this file needs a heading to be.
 *
 * Stated rather than imported: naming `Heading` here would give the file that
 * declares it a second parent, and the three fields below are the whole of what
 * an overflow is worked out from.
 */
interface LeveledHeading {
  readonly lineNumber: number;
  readonly originalLevel: number;
  readonly level: number;
}

/** The headings that outgrew the ceiling, paired with how deep they now land. */
function overflowed(headings: readonly LeveledHeading[], ceiling: number) {
  return headings
    .filter((heading) => overflowDepth(heading.level, ceiling) > 0)
    .map((heading) => ({
      lineNumber: heading.lineNumber,
      originalLevel: heading.originalLevel,
      depth: overflowDepth(heading.level, ceiling) - 1,
    }));
}

/** Requests that cannot mean anything, checked before the document is read. */
function rejectRequest(
  fromLine: number,
  toLine: number,
  levels: number
): RejectionReason | null {
  if (fromLine > toLine) {
    return 'empty-range';
  }
  if (levels === 0) {
    return 'zero-levels';
  }
  if (levels < 0) {
    return 'negative-levels';
  }
  return null;
}
