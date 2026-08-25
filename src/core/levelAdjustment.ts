import type { AdjustmentOperation } from '../contracts';

/** `#` — the shallowest Markdown heading. */
const MIN_HEADING_LEVEL = 1;

/**
 * `######` — the deepest heading Markdown defines.
 *
 * This is syntax, not policy: there is no seventh level to write. The level a
 * user caps headings at is a separate, configurable thing, and lives with the
 * conversions that are the only thing it governs.
 */
const MARKDOWN_MAX_LEVEL = 6;

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
 *
 * @param allowOverflow Lets an increase settle above the ceiling instead of
 *   clamping to it. Levels then stay ordered in a space that continues past
 *   `######`, which is what keeps a parent and child that both overflow from
 *   collapsing onto the same level before either becomes a bullet.
 */
export function assignAdjustedLevels(
  headings: readonly AdjustableHeading[],
  operation: AdjustmentOperation,
  levels: number,
  allowOverflow = false
): void {
  const order = operation === 'decrease' ? headings : [...headings].reverse();

  for (const heading of order) {
    heading.level =
      operation === 'decrease'
        ? decreasedLevel(heading, levels)
        : increasedLevel(heading, levels, allowOverflow);
  }
}

/** The level a heading rises to, never reaching its (already moved) parent. */
function decreasedLevel(heading: AdjustableHeading, levels: number): number {
  let level = Math.max(MIN_HEADING_LEVEL, heading.originalLevel - levels);

  if (heading.parent && level <= heading.parent.level) {
    level = heading.parent.level + 1;
  }

  return Math.min(level, MARKDOWN_MAX_LEVEL);
}

/**
 * How far past the ceiling a level sits. Zero when it still fits.
 *
 * The ceiling is passed in rather than assumed: a user who finds H5 unreadable
 * caps headings higher up, and everything past that cap converts.
 */
export function overflowDepth(level: number, ceiling: number): number {
  return Math.max(0, level - ceiling);
}

/** The level a heading sinks to, never reaching its (already moved) children. */
function increasedLevel(
  heading: AdjustableHeading,
  levels: number,
  allowOverflow: boolean
): number {
  const target = heading.originalLevel + levels;
  let level = allowOverflow ? target : Math.min(MARKDOWN_MAX_LEVEL, target);

  for (const child of heading.children) {
    if (level >= child.level) {
      level = child.level - 1;
    }
  }

  return Math.max(MIN_HEADING_LEVEL, level);
}
