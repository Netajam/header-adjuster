import type { AdjustmentOperation, ConversionSettings } from '../contracts';
import type { HeadingEdit } from './headingEdits';
import { collectBulletEdits } from './bulletConversion';
import { collectHeadingConversionEdits } from './headingConversion';
import { collectHeadingEdits } from './headingEdits';
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
}

/** Why an adjustment produced nothing. Each reason is reported differently. */
export type RejectionReason =
  | 'empty-range'
  | 'zero-levels'
  | 'negative-levels'
  | 'no-headings';

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
  const boundaries = headingBoundaries(lines, fenced);
  const headings = parseHeadings(lines, fromLine, toLine, fenced);

  const conversion = request.conversion;
  const toBullets = request.operation === 'increase' && conversion?.headingsToBullets === true;
  assignAdjustedLevels(headings, request.operation, request.levels, toBullets);

  // A heading pushed past the ceiling is written as a bullet instead, so it
  // must not also be written back as a `#` run seven characters long.
  const overflowing = headings.filter((heading) => overflowDepth(heading.level) > 0);
  const bullets = collectBulletEdits(
    lines,
    overflowing.map((heading) => ({
      lineNumber: heading.lineNumber,
      originalLevel: heading.originalLevel,
      depth: overflowDepth(heading.level) - 1,
    })),
    boundaries,
    toLine
  );

  const headingsBack =
    request.operation === 'decrease' && conversion?.bulletsToHeadings === true
      ? collectHeadingConversionEdits(lines, boundaries, fenced, request.levels, fromLine, toLine)
      : { edits: [], changedCount: 0 };

  const kept = headings.filter((heading) => overflowDepth(heading.level) === 0);
  const edits = [...collectHeadingEdits(kept), ...bullets.edits, ...headingsBack.edits];

  if (edits.length === 0 && headings.length === 0) {
    return { status: 'rejected', reason: 'no-headings' };
  }

  return {
    status: 'adjusted',
    // Bottom-up, so an editor applying them in order never invalidates a line
    // number it has not reached yet.
    edits: edits.sort((a, b) => b.line - a.line),
    changedCount:
      kept.filter((heading) => heading.hasChanged).length +
      overflowing.length +
      headingsBack.changedCount,
    truncatedSections: bullets.truncatedSections,
  };
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
