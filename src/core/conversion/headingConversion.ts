import { matchListItem, nestedItems } from './listItem';

/**
 * Turning list items back into headings — the inverse of `bulletConversion.ts`.
 *
 * An item at level `i`, decreased by `n`, lands at `ceiling - n + 1 + i`, which
 * is exactly the level an increase of `n` would have pushed out to that depth.
 * An item too deep for the decrease to lift stays an item and moves out to the
 * column its grandparent occupied, so the shape of a nested list survives and
 * the document's own indent style is kept.
 *
 * Which items are eligible is deliberately blunt: every one in range. Markdown
 * records no provenance, so a bullet this plugin wrote cannot be told from one
 * the user typed. `docs/adr/0001` records why that is accepted rather than
 * guessed at, and why the setting ships off.
 */

/** A replacement of one span of one line. Core's `HeadingEdit` satisfies this. */
export interface HeadingConversionEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
}

/** Where a conversion applies, how far it moves, and what it converts back to. */
export interface ConversionRange {
  levels: number;
  /** First 0-based line to convert. */
  fromLine: number;
  /** Last 0-based line to convert, inclusive. */
  toLine: number;
  /** The level a top-level item lifted all the way comes back to. */
  ceiling: number;
}

/** The edits a conversion implies, and how many lines they rewrite. */
export interface HeadingConversion {
  edits: HeadingConversionEdit[];
  changedCount: number;
}

/**
 * Rewrites the list items in range, and de-indents the content under them.
 *
 * @param lines The whole document, unmodified.
 * @param boundaries Which lines start a new section.
 * @param fenced Which lines sit inside a code fence and are not markup.
 * @param range Where the conversion applies and what it converts back to.
 */
export function collectHeadingConversionEdits(
  lines: readonly string[],
  boundaries: readonly boolean[],
  fenced: readonly boolean[],
  range: ConversionRange
): HeadingConversion {
  const edits: HeadingConversionEdit[] = [];
  let changedCount = 0;

  for (const nested of nestedItems(lines, fenced, range.fromLine, range.toLine)) {
    const { item, level } = nested;
    // Shallow enough to reach the ceiling becomes a heading; anything deeper
    // stays an item and moves out to the column its ancestor left behind.
    const lifted = level < range.levels;
    const shift = lifted
      ? item.contentColumn
      : item.indent.length - nested.enclosing[level - range.levels];

    edits.push({
      line: nested.line,
      fromColumn: 0,
      toColumn: lifted ? item.indent.length + item.marker.length : shift,
      text: lifted ? '#'.repeat(liftedLevel(level, range)) : '',
    });
    changedCount++;

    edits.push(
      ...bodyEdits(lines, boundaries, fenced, {
        index: nested.line,
        toLine: range.toLine,
        shift,
        indent: item.indent.length,
      })
    );
  }

  return { edits, changedCount };
}

/**
 * The heading level an item at this depth is lifted to.
 *
 * The inverse of the overflow mapping: an item that an increase of `levels`
 * would have pushed out to this depth came from exactly this level.
 */
function liftedLevel(level: number, range: ConversionRange): number {
  const target = range.ceiling - range.levels + 1 + level;
  return Math.max(1, Math.min(range.ceiling, target));
}

/** Where a converted item's body reaches, and how far each line of it moves. */
interface BodySpan {
  index: number;
  toLine: number;
  shift: number;
  /** The item's own indent width; its body has to be indented past it. */
  indent: number;
}

/**
 * De-indents the lines belonging to a converted item.
 *
 * A line belongs to the item when it is indented past the item's own marker —
 * a test that holds whatever the document indents by, where comparing against
 * the content column assumes one. The body ends at the next item or section, or
 * at the first line that is no longer indented past it, which is what makes the
 * round trip exact for a body that itself contains a nested list.
 */
function bodyEdits(
  lines: readonly string[],
  boundaries: readonly boolean[],
  fenced: readonly boolean[],
  span: BodySpan
): HeadingConversionEdit[] {
  const edits: HeadingConversionEdit[] = [];

  for (let line = span.index + 1; line <= span.toLine; line++) {
    const text = lines[line];
    if (text.trim() === '') {
      continue;
    }
    if (!fenced[line] && (boundaries[line] || matchListItem(text))) {
      break;
    }

    const leading = text.length - text.trimStart().length;
    if (leading <= span.indent) {
      break;
    }

    edits.push({ line, fromColumn: 0, toColumn: Math.min(span.shift, leading), text: '' });
  }

  return edits;
}
