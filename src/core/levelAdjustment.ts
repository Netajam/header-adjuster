import type { AdjustmentOperation } from '../contracts';

/** `#` — the shallowest Markdown heading. */
const MIN_HEADING_LEVEL = 1;

/** `######` — the deepest heading Markdown defines. */
const MAX_HEADING_LEVEL = 6;

/**
 * All this file needs a heading to be.
 *
 * Stating it structurally rather than importing `Heading` is what keeps this
 * file a leaf: it depends on a shape, not on the file that happens to build
 * one. `Heading` satisfies it without knowing this interface exists.
 */
export interface AdjustableHeading {
  level: number;
  readonly originalLevel: number;
  readonly parent: AdjustableHeading | null;
  readonly children: readonly AdjustableHeading[];
}

/**
 * Moves every heading by `levels`, keeping the tree's nesting intact.
 *
 * A shift that would flatten the outline is absorbed rather than applied: a
 * decreased heading never rises to or above its parent, and an increased
 * heading never sinks to or below its shallowest child. Headings are visited in
 * the order that makes the relative each one is measured against already final
 * — parents first when decreasing, children first when increasing.
 *
 * Mutates `level` on the given headings; `originalLevel` is left untouched.
 */
export function assignAdjustedLevels(
  headings: readonly AdjustableHeading[],
  operation: AdjustmentOperation,
  levels: number
): void {
  const order = operation === 'decrease' ? headings : [...headings].reverse();

  for (const heading of order) {
    heading.level =
      operation === 'decrease'
        ? decreasedLevel(heading, levels)
        : increasedLevel(heading, levels);
  }
}

/** The level a heading rises to, never reaching its (already moved) parent. */
function decreasedLevel(heading: AdjustableHeading, levels: number): number {
  let level = Math.max(MIN_HEADING_LEVEL, heading.originalLevel - levels);

  if (heading.parent && level <= heading.parent.level) {
    level = heading.parent.level + 1;
  }

  return Math.min(level, MAX_HEADING_LEVEL);
}

/** The level a heading sinks to, never reaching its (already moved) children. */
function increasedLevel(heading: AdjustableHeading, levels: number): number {
  let level = Math.min(MAX_HEADING_LEVEL, heading.originalLevel + levels);

  for (const child of heading.children) {
    if (level >= child.level) {
      level = child.level - 1;
    }
  }

  return Math.max(MIN_HEADING_LEVEL, level);
}
