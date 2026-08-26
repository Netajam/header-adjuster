// Types only: this module must stay loadable — and testable — without Obsidian.
import type { Editor, EditorChange, EditorRangeOrCaret } from 'obsidian';

/**
 * An Obsidian editor, seen as plain lines.
 *
 * Everything here is phrased in line numbers and columns and knows nothing
 * about headings — which is what keeps it a leaf: the edits it applies are
 * described by the shape below, not by a type it has to import.
 */

/** A 0-based, inclusive span of lines. */
export interface LineRange {
  fromLine: number;
  toLine: number;
}

/** A replacement of one span of one line. Core's `HeadingEdit` satisfies this. */
export interface LineEdit {
  line: number;
  fromColumn: number;
  toColumn: number;
  text: string;
}

/** Snapshots the whole document as lines. */
export function readEditorLines(editor: Editor): string[] {
  const lines: string[] = [];
  const lineCount = editor.lineCount();

  for (let index = 0; index < lineCount; index++) {
    lines.push(editor.getLine(index));
  }

  return lines;
}

/** The 0-based line the cursor sits on — where an adjustment of one line lands. */
export function cursorLine(editor: Editor): number {
  return editor.getCursor().line;
}

/**
 * The lines the user has selected, ordered start-to-end regardless of the
 * direction they dragged in. Null when there is no selection to read.
 */
export function selectedLineRange(editor: Editor): LineRange | null {
  const selection = editor.listSelections()[0];
  if (!selection) {
    return null;
  }

  const { anchor, head } = selection;
  return {
    fromLine: Math.min(anchor.line, head.line),
    toLine: Math.max(anchor.line, head.line),
  };
}

/**
 * Writes the edits back as a single undoable transaction.
 *
 * @param caretLine A line the caret is to be kept on the text of. Left out by
 *   the commands that rewrite a whole document or a selection, where the caret
 *   is not what the user is looking at.
 */
export function applyLineEdits(
  editor: Editor,
  edits: readonly LineEdit[],
  caretLine?: number
): void {
  if (edits.length === 0) {
    return;
  }

  const changes: EditorChange[] = edits.map((edit) => ({
    from: { line: edit.line, ch: edit.fromColumn },
    to: { line: edit.line, ch: edit.toColumn },
    text: edit.text,
  }));

  // Sent only when there is one to send: a document-wide rewrite has no caret
  // to speak for, and saying so with an empty key is not the same as staying
  // out of the way.
  const caret = caretLine === undefined ? undefined : caretOn(editor, edits, caretLine);

  editor.transaction(caret ? { changes, selection: caret } : { changes });
}

/**
 * Where the caret belongs once the opening of its line has been rewritten.
 *
 * An editor left to itself keeps a caret sitting exactly where text was
 * inserted *in front of* that text, which is right for typing and wrong here: a
 * caret at the head of the line is a caret waiting to write the heading, not one
 * asking to be pushed behind the `#`. It is only ever visible on a line with
 * nothing on it, because there the caret has nowhere else to be.
 *
 * So the caret moves with the line's content, and never lands before what was
 * just written.
 */
function caretOn(
  editor: Editor,
  edits: readonly LineEdit[],
  line: number
): EditorRangeOrCaret | undefined {
  const edit = edits.find((each) => each.line === line);
  if (!edit) {
    return undefined;
  }

  const { ch } = editor.getCursor();
  const carried = ch + edit.text.length - (edit.toColumn - edit.fromColumn);

  return { from: { line, ch: Math.max(carried, edit.fromColumn + edit.text.length) } };
}
