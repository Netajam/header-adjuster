import type { App, Editor } from 'obsidian';
import type {
  AdjustmentOperation,
  ConversionSettings,
  LinePlacement,
} from '../contracts';
import { Notice } from 'obsidian';
import { activeEditor, requireActiveEditor } from './activeEditor';
import {
  adjustEditorHeadings,
  adjustEditorLine,
  adjustEditorSelection,
  placeEditorLine,
} from '../editor/headingAdjustmentService';
import { LevelInputModal } from '../ui/levelInputModal';

/**
 * The things a user can ask for, independent of how they asked — the ribbon
 * menu and the command palette both land here.
 */

/**
 * All a command needs from the plugin: somewhere to find the active editor,
 * and an answer to "how far, by default, in this direction".
 *
 * Asking for the answer rather than for the settings object is what keeps this
 * folder from depending on `settings/` at all — the plugin looks the default
 * up, because the plugin is what owns the settings.
 */
export interface CommandContext {
  readonly app: App;
  defaultLevel(operation: AdjustmentOperation): number;
  /** Which overflow conversions are switched on, for the same reason. */
  conversion(): ConversionSettings;
}

/** Asks for a shift and a range, then adjusts what the user named. */
export function promptForAdjustment(
  context: CommandContext,
  operation: AdjustmentOperation
): void {
  const defaultLevel = context.defaultLevel(operation);

  new LevelInputModal(
    context.app,
    { operation, defaultLevel },
    ({ levels, startLine, endLine }) => {
      const editor = requireActiveEditor(context);
      if (editor) {
        adjustEditorHeadings(
          editor,
          operation,
          levels ?? defaultLevel,
          context.conversion(),
          startLine ? startLine - 1 : 0,
          endLine ? endLine - 1 : undefined
        );
      }
    }
  ).open();
}

/** Adjusts every heading in the active document. */
export function adjustActiveDocument(
  context: CommandContext,
  operation: AdjustmentOperation,
  levels: number = context.defaultLevel(operation)
): void {
  const editor = requireActiveEditor(context);
  if (editor) {
    adjustEditorHeadings(editor, operation, levels, context.conversion());
  }
}

/** Adjusts the headings inside a selection the caller has already confirmed. */
export function adjustSelection(
  context: CommandContext,
  editor: Editor,
  operation: AdjustmentOperation
): void {
  adjustEditorSelection(editor, operation, context.defaultLevel(operation), context.conversion());
}

/**
 * Adjusts the level of the line the cursor is on, and only that line.
 *
 * The finest of the three scopes. A line with no `#` counts as a heading of
 * level zero, so this is also how a heading gets written onto a paragraph in
 * the first place: increase once for `#`, again for `##`. Decreasing an `#`
 * takes the heading back off.
 */
export function adjustCurrentLine(
  context: CommandContext,
  operation: AdjustmentOperation,
  levels: number = context.defaultLevel(operation)
): void {
  const editor = requireActiveEditor(context);
  if (editor) {
    adjustEditorLine(editor, operation, levels);
  }
}

/**
 * Writes the current line as a heading levelled against the one above it, or
 * takes its heading away.
 *
 * Where `adjustCurrentLine` nudges, this aims: the three placements say what the
 * line should be rather than how far to move it, so none of them reads the
 * user's default shift.
 */
export function placeCurrentLine(
  context: CommandContext,
  placement: LinePlacement
): void {
  const editor = requireActiveEditor(context);
  if (editor) {
    placeEditorLine(editor, placement);
  }
}

/** Adjusts the active selection, or explains why it cannot. */
export function adjustActiveSelection(
  context: CommandContext,
  operation: AdjustmentOperation
): void {
  const editor = activeEditor(context);
  if (!editor || !editor.somethingSelected()) {
    new Notice('Select text containing headings first.');
    return;
  }

  adjustSelection(context, editor, operation);
}
