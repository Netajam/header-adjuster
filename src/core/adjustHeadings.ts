import type { AdjustmentOperation } from '../contracts';
import type { HeadingEdit } from './headingEdits';
import { applyHeadingEdits, collectHeadingEdits } from './headingEdits';
import { parseHeadings } from './headingTree';
import { assignAdjustedLevels } from './levelAdjustment';

/**
 * The whole adjustment, as a function of text — and the door into `core/`.
 *
 * Everything the plugin decides about a heading adjustment is decided here, on
 * plain strings: this is the layer that can be exercised without an editor.
 * Callers hand in lines and get back either edits or a reason nothing happened,
 * and never need to name anything behind this file.
 */

export type { HeadingEdit };
export { applyHeadingEdits };

/** What the user asked for: a direction, a distance, and the lines it applies to. */
export interface AdjustmentRequest {
  operation: AdjustmentOperation;
  levels: number;
  /** First 0-based line to adjust. Defaults to the start of the document. */
  fromLine?: number;
  /** Last 0-based line to adjust, inclusive. Defaults to the end of the document. */
  toLine?: number;
}

/** Why an adjustment produced nothing. Each reason is reported differently. */
export type RejectionReason =
  | 'empty-range'
  | 'zero-levels'
  | 'negative-levels'
  | 'no-headings';

export type AdjustmentOutcome =
  | { status: 'adjusted'; edits: HeadingEdit[]; changedCount: number }
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

  const headings = parseHeadings(lines, fromLine, toLine);
  if (headings.length === 0) {
    return { status: 'rejected', reason: 'no-headings' };
  }

  assignAdjustedLevels(headings, request.operation, request.levels);

  return {
    status: 'adjusted',
    edits: collectHeadingEdits(headings),
    changedCount: headings.filter((heading) => heading.hasChanged).length,
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
