import type { Editor } from 'obsidian';
import type {
  AdjustmentOperation,
  ConversionSettings,
  LinePlacement,
  RejectionReason,
} from '../contracts';
import type { AdjustmentOutcome } from '../core/adjustHeadings';
import { Notice } from 'obsidian';
import { adjustHeadings, placeLineHeading } from '../core/adjustHeadings';
import {
  applyLineEdits,
  cursorLine,
  readEditorLines,
  selectedLineRange,
} from './editorDocument';

/**
 * Running a heading adjustment against a live editor — the door into `editor/`.
 *
 * This is the seam between the pure decision (`adjustHeadings`) and the two
 * side effects it implies: writing the edits, and telling the user what
 * happened. Every command surface funnels through here.
 */

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
  applyOutcome(
    editor,
    adjustHeadings(readEditorLines(editor), {
      operation,
      levels,
      conversion,
      fromLine,
      toLine,
    })
  );
}

/**
 * Adjusts the level of the line the cursor sits on, and nothing else.
 *
 * The finest of the three scopes, and the only one that reads a plain line as a
 * heading of level zero: increasing writes a heading onto it, decreasing an
 * `#` takes the heading away. Nesting is left alone on purpose — a user who
 * wants a heading's children to follow selects them, which is what the
 * selection scope is for.
 *
 * No conversion is passed, because `levelZero` does not read one: a bullet
 * conversion re-indents a section body, and one line is not a section.
 */
export function adjustEditorLine(
  editor: Editor,
  operation: AdjustmentOperation,
  levels: number
): void {
  const line = cursorLine(editor);

  applyOutcome(
    editor,
    adjustHeadings(readEditorLines(editor), {
      operation,
      levels,
      fromLine: line,
      toLine: line,
      levelZero: true,
    })
  );
}

/**
 * Writes the line the cursor sits on as a heading placed against the section it
 * is in, or as plain text.
 *
 * No direction and no distance: a placement says where the line belongs, and
 * the level that follows from that is the same whichever level it is written at
 * now.
 */
export function placeEditorLine(editor: Editor, placement: LinePlacement): void {
  applyOutcome(
    editor,
    placeLineHeading(readEditorLines(editor), cursorLine(editor), placement)
  );
}

/** Writes what was decided, then says what happened — the two effects, in order. */
function applyOutcome(editor: Editor, outcome: AdjustmentOutcome): void {
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

/**
 * A request that could not mean anything.
 *
 * Only `no-headings` is something the user did: the dialog refuses a backwards
 * range or a non-positive shift before it gets here, and the settings sliders
 * cannot produce one either, so the other three can only come from a caller
 * that is already wrong and there is nothing useful to say about them.
 */
function reportRejection(reason: RejectionReason): void {
  if (reason === 'no-headings') {
    new Notice('No headings found in the specified range/selection.');
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
    new Notice('No heading levels needed adjustment in the range.');
    return;
  }

  const cut =
    truncatedSections > 0
      ? ` ${truncatedSections} section(s) continued past the selection;` +
        ' only the selected lines were indented.'
      : '';

  new Notice(`Adjusted ${changedCount} heading(s).${cut}`);
}
