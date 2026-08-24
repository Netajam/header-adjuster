import type { AdjustmentOperation } from '../adjustmentOperation';
import type { Heading } from './heading';
import { headingPrefix } from './heading';
import { parseHeadings } from './headingTree';
import { assignAdjustedLevels } from './levelAdjustment';

/**
 * The whole adjustment, as a function of text — and the only door into `core/`.
 *
 * Everything the plugin decides about a heading adjustment is decided here, on
 * plain strings: this is the layer that can be exercised without an editor.
 * Callers hand in lines, get back either edits or a reason nothing happened,
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
}

/**
 * A replacement of one line's `#` prefix, addressed the way a text editor
 * addresses a range: 0-based line, character columns, replacement text.
 */
export interface HeadingEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
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
      headings: Heading[];
      edits: HeadingEdit[];
      changedCount: number;
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

  const headings = parseHeadings(lines, fromLine, toLine);
  if (headings.length === 0) {
    return { status: 'rejected', reason: 'no-headings' };
  }

  assignAdjustedLevels(headings, request.operation, request.levels);

  return {
    status: 'adjusted',
    headings,
    edits: collectHeadingEdits(headings),
    changedCount: headings.filter((heading) => heading.hasChanged).length,
  };
}

/**
 * Turns adjusted headings into the edits that write them back.
 *
 * Headings that did not move produce no edit, and the edits come back
 * bottom-up so an editor applying them in order never invalidates a line number
 * it has not reached yet.
 */
export function collectHeadingEdits(headings: readonly Heading[]): HeadingEdit[] {
  return [...headings]
    .sort((a, b) => b.lineNumber - a.lineNumber)
    .filter((heading) => heading.hasChanged)
    .map((heading) => ({
      line: heading.lineIndex,
      fromColumn: 0,
      toColumn: heading.originalLevel,
      text: headingPrefix(heading.level),
    }));
}

/** Applies edits to a copy of the document. The in-memory twin of an editor transaction. */
export function applyHeadingEdits(
  lines: readonly string[],
  edits: readonly HeadingEdit[]
): string[] {
  const result = [...lines];

  for (const edit of edits) {
    const line = result[edit.line];
    result[edit.line] =
      line.slice(0, edit.fromColumn) + edit.text + line.slice(edit.toColumn);
  }

  return result;
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
