import type { Editor } from 'obsidian';
import type { RejectionReason } from '../core/adjustHeadings';
import type { AdjustmentOperation } from '../adjustmentOperation';
import { Notice } from 'obsidian';
import { adjustHeadings } from '../core/adjustHeadings';
import { applyEditsToEditor, readEditorLines, selectedLineRange } from './editorDocument';

const LOG_PREFIX = '[Header Adjuster]';

/**
 * Runs a heading adjustment against a live editor.
 *
 * This is the seam between the pure decision (`adjustHeadings`) and the two
 * side effects it implies: writing the edits, and telling the user what
 * happened. Every command surface funnels through here.
 *
 * @param fromLine First 0-based line to adjust. Defaults to the document start.
 * @param toLine Last 0-based line to adjust, inclusive. Defaults to the end.
 */
export function adjustEditorHeadings(
  editor: Editor,
  operation: AdjustmentOperation,
  levels: number,
  fromLine?: number,
  toLine?: number
): void {
  const outcome = adjustHeadings(readEditorLines(editor), {
    operation,
    levels,
    fromLine,
    toLine,
  });

  if (outcome.status === 'rejected') {
    reportRejection(outcome.reason);
    return;
  }

  applyEditsToEditor(editor, outcome.edits);
  reportAdjusted(outcome.changedCount);
}

/**
 * Adjusts only the headings inside the editor's current selection.
 *
 * Working out which lines are selected is this layer's job, not the caller's —
 * which is why `selectedLineRange` never has to leave the folder.
 */
export function adjustEditorSelection(
  editor: Editor,
  operation: AdjustmentOperation,
  levels: number
): void {
  const range = selectedLineRange(editor);
  if (!range) {
    return;
  }

  adjustEditorHeadings(editor, operation, levels, range.fromLine, range.toLine);
}

/** A request that could not mean anything: a log for us, a notice for the user. */
function reportRejection(reason: RejectionReason): void {
  switch (reason) {
    case 'empty-range':
      console.warn(`${LOG_PREFIX} Start line is after end line, skipping adjustment.`);
      return;
    case 'zero-levels':
      console.log(`${LOG_PREFIX} Adjustment level is 0, skipping.`);
      return;
    case 'negative-levels':
      console.warn(`${LOG_PREFIX} Adjustment level is negative, skipping.`);
      return;
    case 'no-headings':
      new Notice('No headers found in the specified range/selection.');
      return;
  }
}

function reportAdjusted(changedCount: number): void {
  new Notice(
    changedCount > 0
      ? `Adjusted ${changedCount} header(s).`
      : 'No header levels needed adjustment in the range.'
  );
}
