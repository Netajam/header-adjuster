import { sectionBodyExtent } from './sectionBody';

/**
 * Turning a heading that overflowed H6 into a list item.
 *
 * The heading line keeps everything after its `#` run, so only the prefix is
 * rewritten and the user's spacing survives. The section body comes with it,
 * indented to the new item's content column: a body left at column 0 would stop
 * being part of the item, and the resulting Markdown would claim a structure
 * the document no longer has.
 */

/** One level of list nesting. Paired with `listItem.ts`, which reads it back. */
const INDENT_UNIT = '  ';

/** A heading that no longer fits under the ceiling, and how deep it lands. */
export interface OverflowHeading {
  /** 1-based line number, as headings are numbered everywhere else. */
  readonly lineNumber: number;
  readonly originalLevel: number;
  /** Nesting depth of the resulting bullet: an overflow of one lands at zero. */
  readonly depth: number;
}

/** A replacement of one span of one line. Core's `HeadingEdit` satisfies this. */
export interface BulletEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
}

/** The edits a conversion implies, and what the range cost it. */
export interface BulletConversion {
  edits: BulletEdit[];
  /** Sections whose body ran past the range and was only partly indented. */
  truncatedSections: number;
}

/**
 * Rewrites each overflowing heading as a bullet and pulls its body inside.
 *
 * @param lines The whole document, unmodified.
 * @param headings The overflowing headings, in document order.
 * @param boundaries Which lines start a new section.
 * @param rangeEnd Last 0-based line the adjustment may touch.
 */
export function collectBulletEdits(
  lines: readonly string[],
  headings: readonly OverflowHeading[],
  boundaries: readonly boolean[],
  rangeEnd: number
): BulletConversion {
  const edits: BulletEdit[] = [];
  let truncatedSections = 0;

  for (const heading of headings) {
    const index = heading.lineNumber - 1;
    const marker = INDENT_UNIT.repeat(heading.depth) + '-';
    edits.push({ line: index, fromColumn: 0, toColumn: heading.originalLevel, text: marker });

    // The body has to reach the column the item's text starts at, which is the
    // marker plus whatever spacing the heading already used.
    const padding = ' '.repeat(marker.length + gapWidth(lines[index], heading.originalLevel));
    const body = sectionBodyExtent(boundaries, index, rangeEnd);

    for (let line = index + 1; line <= body.lastLine; line++) {
      if (lines[line].trim() !== '') {
        edits.push({ line, fromColumn: 0, toColumn: 0, text: padding });
      }
    }

    if (body.truncated) {
      truncatedSections++;
    }
  }

  return { edits, truncatedSections };
}

/** How much whitespace separates a heading's `#` run from its text. */
function gapWidth(line: string, level: number): number {
  const rest = line.slice(level);
  return rest.length - rest.trimStart().length;
}
