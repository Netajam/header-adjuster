import type { App } from 'obsidian';
import type {
  AdjustmentOperation,
  ConversionSettings,
  HeadingPlacement,
  LinePlacement,
} from '../contracts';
import { Notice } from 'obsidian';
import { activeEditor, requireActiveEditor } from './activeEditor';
import {
  adjustEditorHeadings,
  adjustEditorLine,
  adjustEditorRange,
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
  /** Where the toggle is pointed, for the same reason again. */
  toggleTarget(): HeadingPlacement;
  /** The two boundaries the user set the custom range to. */
  customRange(): { top: 'note-start' | 'cursor'; bottom: 'cursor' | 'note-end' };
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

/**
 * Adjusts the headings between the two boundaries the user configured.
 *
 * The parametrizable scope: everything else names its own range in its own
 * command name, and this one names it in the settings instead. That is what
 * makes it the only one whose range can be a thing the plugin does not ship —
 * from the cursor to the end of the note, or from the top of the note back to
 * the cursor — without another pair of commands per combination.
 *
 * Asked for now rather than when the command was registered, so a boundary
 * changed mid-session takes effect without a reload.
 */
export function adjustCustomRange(
  context: CommandContext,
  operation: AdjustmentOperation
): void {
  const editor = requireActiveEditor(context);
  if (editor) {
    adjustEditorRange(
      editor,
      operation,
      context.defaultLevel(operation),
      context.conversion(),
      context.customRange()
    );
  }
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
    // Asked for now rather than when the command was registered, so a setting
    // changed mid-session takes effect without a reload.
    placeEditorLine(editor, placement, context.toggleTarget());
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

  adjustEditorRange(
    editor,
    operation,
    context.defaultLevel(operation),
    context.conversion(),
    'selection'
  );
}
