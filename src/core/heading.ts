/**
 * What a heading is: one line read as a level, and its place in the tree.
 *
 * Reached only through `headingTree.ts`, which is the one file that builds
 * these.
 */

/**
 * An ATX heading line: one to six `#`, whitespace, then the heading text. The
 * upper bound here is the same six that `levelAdjustment.ts` clamps to.
 */
const HEADING_PATTERN = /^(#{1,6})\s+/;

/** The level of a heading line, or null when the line is not a heading. */
export function matchHeadingLevel(line: string): number | null {
  const match = line.match(HEADING_PATTERN);
  return match ? match[1].length : null;
}

/**
 * A heading found in a document, together with its place in the heading tree.
 *
 * `originalLevel` is the level as written on disk and never changes; `level` is
 * the working value an adjustment moves. The two differing is what marks a
 * heading as needing an edit.
 */
export class Heading {
  level: number;
  readonly originalLevel: number;
  /** 1-based line number, as shown to the user. */
  readonly lineNumber: number;
  parent: Heading | null;
  readonly children: Heading[] = [];

  constructor(level: number, lineNumber: number, parent: Heading | null = null) {
    this.level = level;
    this.originalLevel = level;
    this.lineNumber = lineNumber;
    this.parent = parent;
  }

  /** True once an adjustment has moved this heading off its written level. */
  get hasChanged(): boolean {
    return this.level !== this.originalLevel;
  }
}
