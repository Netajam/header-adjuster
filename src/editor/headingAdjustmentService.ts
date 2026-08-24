import type { Editor } from 'obsidian';
import type { AdjustmentOperation, ConversionSettings } from '../contracts';
import type { RejectionReason } from '../core/adjustHeadings';
import { Notice } from 'obsidian';
import { adjustHeadings } from '../core/adjustHeadings';
import { applyLineEdits, readEditorLines, selectedLineRange } from './editorDocument';

/**
 * Running a heading adjustment against a live editor — the door into `editor/`.
 *
 * This is the seam between the pure decision (`adjustHeadings`) and the two
 * side effects it implies: writing the edits, and telling the user what
 * happened. Every command surface funnels through here.
 */

const LOG_PREFIX = '[Header Adjuster]';

/**
 * @param conversion Which overflow conversions the user has switched on.
 * @param fromLine First 0-based line to adjust. Defaults to the document start.
 * @param toLine Last 0-based line to adjust, inclusive. Defaults to the end.
 */
export function adjustEditorHeadings(
  editor: Editor,
  operation: AdjustmentOperation,
  levels: number,
  conversion: ConversionSettings,
  fromLine?: number,
  toLine?: number
): void {
  const outcome = adjustHeadings(readEditorLines(editor), {
    operation,
    levels,
    conversion,
    fromLine,
    toLine,
  });

  if (outcome.status === 'rejected') {
    reportRejection(outcome.reason);
    return;
  }

  applyLineEdits(editor, outcome.edits);
  reportAdjusted(outcome.changedCount, outcome.truncatedSections);
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
  levels: number,
  conversion: ConversionSettings
): void {
  const range = selectedLineRange(editor);
  if (!range) {
    return;
  }

  adjustEditorHeadings(editor, operation, levels, conversion, range.fromLine, range.toLine);
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

/**
 * What happened, in the user's terms.
 *
 * A section cut short by the range is called out rather than left to be
 * discovered: the selection stopped the indentation partway, and half an
 * indented section is not something to find out about later.
 */
function reportAdjusted(changedCount: number, truncatedSections: number): void {
  if (changedCount === 0) {
    new Notice('No header levels needed adjustment in the range.');
    return;
  }

  const cut =
    truncatedSections > 0
      ? ` ${truncatedSections} section(s) continued past the selection;` +
        ' only the selected lines were indented.'
      : '';

  new Notice(`Adjusted ${changedCount} header(s).${cut}`);
}
