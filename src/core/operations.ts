/**
 * The vocabulary shared by every layer: what an adjustment is, and the range of
 * Markdown heading levels it has to stay inside.
 */

/** The two directions a heading level can be moved in. */
export type AdjustmentOperation = 'increase' | 'decrease';

/** `#` — the shallowest Markdown heading. */
export const MIN_HEADING_LEVEL = 1;

/** `######` — the deepest heading Markdown defines. */
export const MAX_HEADING_LEVEL = 6;

/** Pins a level inside the range Markdown actually renders as a heading. */
export function clampHeadingLevel(level: number): number {
  return Math.min(MAX_HEADING_LEVEL, Math.max(MIN_HEADING_LEVEL, level));
}

/** The `#` prefix a heading of this level is written with. */
export function headingPrefix(level: number): string {
  return '#'.repeat(level);
}
