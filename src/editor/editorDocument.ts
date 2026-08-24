// Types only: this module must stay loadable — and testable — without Obsidian.
import type { Editor, EditorChange } from 'obsidian';
import type { HeadingEdit } from '../core/headingEdits';

/**
 * The translation between an Obsidian editor and the plain lines the core works
 * on. Everything that knows the shape of the editor API lives here.
 */

/** A 0-based, inclusive span of lines. */
export interface LineRange {
  fromLine: number;
  toLine: number;
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
export function applyEditsToEditor(
  editor: Editor,
  edits: readonly HeadingEdit[]
): void {
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
