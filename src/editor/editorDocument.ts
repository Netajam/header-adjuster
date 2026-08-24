// Types only: this module must stay loadable — and testable — without Obsidian.
import type { Editor, EditorChange } from 'obsidian';

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

/** Writes the edits back as a single undoable transaction. */
export function applyLineEdits(editor: Editor, edits: readonly LineEdit[]): void {
  if (edits.length === 0) {
    return;
  }

  const changes: EditorChange[] = edits.map((edit) => ({
    from: { line: edit.line, ch: edit.fromColumn },
    to: { line: edit.line, ch: edit.toColumn },
    text: edit.text,
  }));

  editor.transaction({ changes });
}
