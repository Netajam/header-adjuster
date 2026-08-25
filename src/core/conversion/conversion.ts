import type { AdjustmentOperation, ConversionSettings } from '../../contracts';
import { collectBulletEdits } from './bulletConversion';
import { collectHeadingConversionEdits } from './headingConversion';

/**
 * Whether a heading becomes a bullet, or a bullet becomes a heading — the door
 * into `conversion/`.
 *
 * The two directions are opposites of one another and never both apply, which
 * is the decision this file owns. Keeping it here rather than in
 * `adjustHeadings.ts` is what stops the door of `core/` from growing a branch
 * per setting: it asks for the conversion once and is handed edits, the same
 * way it asks for heading edits.
 */

/** A replacement of one span of one line. Core's `HeadingEdit` satisfies this. */
export interface ConversionEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
}

/** A heading that no longer fits under the ceiling, and how deep it lands. */
export interface OverflowHeading {
  readonly lineNumber: number;
  readonly originalLevel: number;
  readonly depth: number;
}

/** As much of the adjustment as a conversion has to know about. */
export interface ConversionRequest {
  operation: AdjustmentOperation;
  levels: number;
  fromLine: number;
  toLine: number;
  /** Which conversions the user switched on. Both are off when omitted. */
  settings?: ConversionSettings;
}

/** The edits a conversion implies, and what they cost. */
export interface ConversionResult {
  edits: ConversionEdit[];
  changedCount: number;
  /** Sections whose body ran past the range and was only partly indented. */
  truncatedSections: number;
}

/**
 * Whether levels should be allowed to settle above the ceiling.
 *
 * Asked before any heading moves, because the answer decides how levels are
 * computed rather than how they are written: only an increase that will convert
 * has any use for a level of seven.
 */
export function bulletsRequested(request: ConversionRequest): boolean {
  return request.operation === 'increase' && request.settings?.headingsToBullets === true;
}

/**
 * Runs whichever conversion the direction and the settings call for.
 *
 * @param lines The whole document, unmodified.
 * @param boundaries Which lines start a new section.
 * @param fenced Which lines sit inside a code fence and are not markup.
 * @param overflowing Headings that outgrew the ceiling, in document order.
 * @param request What the adjustment is doing.
 */
export function convertOverflow(
  lines: readonly string[],
  boundaries: readonly boolean[],
  fenced: readonly boolean[],
  overflowing: readonly OverflowHeading[],
  request: ConversionRequest
): ConversionResult {
  const bullets = collectBulletEdits(lines, overflowing, boundaries, request.toLine);

  const backToHeadings =
    request.operation === 'decrease' && request.settings?.bulletsToHeadings === true
      ? collectHeadingConversionEdits(
          lines,
          boundaries,
          fenced,
          request.levels,
          request.fromLine,
          request.toLine
        )
      : { edits: [], changedCount: 0 };

  return {
    edits: [...bullets.edits, ...backToHeadings.edits],
    changedCount: overflowing.length + backToHeadings.changedCount,
    truncatedSections: bullets.truncatedSections,
  };
}
