/**
 * How an adjusted heading gets written back.
 *
 * Like `levelAdjustment.ts`, this file states the heading shape it needs rather
 * than importing one, which is what keeps it a leaf.
 */

/** All this file needs a heading to be. */
export interface EditableHeading {
  readonly lineNumber: number;
  readonly originalLevel: number;
  readonly level: number;
  readonly hasChanged: boolean;
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

/** The `#` prefix a heading of this level is written with. */
function headingPrefix(level: number): string {
  return '#'.repeat(level);
}

/**
 * Turns adjusted headings into the edits that write them back.
 *
 * Headings that did not move produce no edit, and the edits come back
 * bottom-up so an editor applying them in order never invalidates a line number
 * it has not reached yet.
 */
export function collectHeadingEdits(
  headings: readonly EditableHeading[]
): HeadingEdit[] {
  return [...headings]
    .sort((a, b) => b.lineNumber - a.lineNumber)
    .filter((heading) => heading.hasChanged)
    .map((heading) => ({
      line: heading.lineNumber - 1,
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
