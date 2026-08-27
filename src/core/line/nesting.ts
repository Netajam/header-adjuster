/**
 * What sits underneath one line, and the edits that move it along with the
 * line's own opening.
 *
 * The current-line scope consults nothing above or below itself — that is what
 * makes it the finest scope the plugin has. Crossing between a heading and a
 * list item is the one exception, and only because the two disagree about what
 * "underneath" means: a list item holds what is indented past it, a heading
 * holds everything until the next heading. A line that stops being one and
 * starts being the other leaves whatever it held answering to nothing, so the
 * content has to move with it or the markup stops saying what the document
 * shows.
 *
 * A leaf: `line.ts` decides whether either of these applies, because deciding
 * needs the level the line is about to be written at and that is `line.ts`'s
 * to know.
 */

/** A replacement of one span of one line. `LineLevelEdit` satisfies this. */
export interface NestingEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
}

/**
 * A heading's opening, restated rather than imported.
 *
 * `line.ts` matches the same syntax to read the level it is about to change;
 * here only the fact of a heading matters, because a heading is where the
 * section being carried stops. Naming its pattern across would point an arrow
 * back at the file that imports this one.
 */
const HEADING_LINE = /^#{1,6}\s/;

/** The whitespace a line opens with, in columns. */
function leadingWidth(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * Moves the items nested under a list item out by as much as the item lost when
 * it became a heading.
 *
 * The shift is the first nested line's own indent, not a computed unit: taking
 * the depth the document actually wrote means the children land at column zero
 * and everything below keeps its spacing relative to them, whether the list is
 * indented with tabs, two spaces or four.
 *
 * The nested block runs to the first non-blank line indented no further than
 * the item itself. Blank lines do not end it — a list with a gap in it is still
 * one list — and a fenced block inside it moves with the rest, because it was
 * indented as part of the item and is still part of it afterwards.
 *
 * @param indent The converted line's own indent, in columns.
 */
export function liftNestedEdits(
  lines: readonly string[],
  lineNumber: number,
  indent: number
): NestingEdit[] {
  const edits: NestingEdit[] = [];
  let shift = 0;

  for (let line = lineNumber + 1; line < lines.length; line++) {
    const text = lines[line];
    if (text.trim() === '') {
      continue;
    }

    const leading = leadingWidth(text);
    if (leading <= indent) {
      break;
    }

    // The first line under the item sets how far the whole block moves, so the
    // block keeps its own shape and only stops being nested in the item.
    if (shift === 0) {
      shift = leading;
    }

    edits.push({ line, fromColumn: 0, toColumn: Math.min(shift, leading), text: '' });
  }

  return edits;
}

/**
 * Indents the lines a heading held, so they become the content of the list item
 * written in its place.
 *
 * The section ends where the heading's own does: at the next heading, whatever
 * its level, or at the end of the note. A `#` inside a code fence is text and
 * does not end anything.
 *
 * @param width How far to indent — the width of the marker now opening the line.
 */
export function indentSectionEdits(
  lines: readonly string[],
  fenced: readonly boolean[],
  lineNumber: number,
  width: number
): NestingEdit[] {
  const edits: NestingEdit[] = [];
  const padding = ' '.repeat(width);

  for (let line = lineNumber + 1; line < lines.length; line++) {
    const text = lines[line];
    if (!fenced[line] && HEADING_LINE.test(text)) {
      break;
    }
    if (text.trim() === '') {
      continue;
    }

    edits.push({ line, fromColumn: 0, toColumn: 0, text: padding });
  }

  return edits;
}
