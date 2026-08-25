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

/** What the configured ceiling means for one request. */
export interface CeilingPolicy {
  /** The level an increase has to pass before a heading becomes a bullet. */
  overflowAt: number;
  /** Whether levels may settle above that instead of clamping to it. */
  allowOverflow: boolean;
  /** The level a bullet comes back to on decrease. */
  liftTo: number;
}

/**
 * Reads the ceiling three ways at once, because they are one decision.
 *
 * A configured ceiling is inert unless something actually converts. Capping
 * headings at H4 while the conversion is off must not start clamping increases
 * at H4 — that would let an increase make a heading *shallower*, which is not
 * what a cap means. So `overflowAt` falls back to Markdown's own limit, which
 * levels already respect, and the question falls away.
 *
 * `liftTo` does not: a decrease converting a bullet back has to aim at the
 * level an increase would have pushed it out from, or the round trip does not
 * close.
 */
export function ceilingPolicy(request: ConversionRequest): CeilingPolicy {
  const markdownLimit = 6;
  const configured = request.settings?.deepestHeadingLevel ?? markdownLimit;
  const converting =
    request.operation === 'increase' && request.settings?.headingsToBullets === true;

  return {
    overflowAt: converting ? configured : markdownLimit,
    allowOverflow: converting,
    liftTo: configured,
  };
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
      ? collectHeadingConversionEdits(lines, boundaries, fenced, {
          levels: request.levels,
          fromLine: request.fromLine,
          toLine: request.toLine,
          ceiling: ceilingPolicy(request).liftTo,
        })
      : { edits: [], changedCount: 0 };

  return {
    edits: [...bullets.edits, ...backToHeadings.edits],
    changedCount: overflowing.length + backToHeadings.changedCount,
    truncatedSections: bullets.truncatedSections,
  };
}
