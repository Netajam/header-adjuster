import type { App, Editor } from 'obsidian';
import type { AdjustmentOperation, ConversionSettings } from '../contracts';
import { Notice } from 'obsidian';
import {
  adjustEditorHeadings,
  adjustEditorSelection,
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

/** Adjusts the active selection, or explains why it cannot. */
export function adjustActiveSelection(
  context: CommandContext,
  operation: AdjustmentOperation
): void {
  const editor = context.app.workspace.activeEditor?.editor;
  if (!editor || !editor.somethingSelected()) {
    new Notice('Select text containing headers first.');
    return;
  }

  adjustSelection(context, editor, operation);
}

/** The editor the user is in, or null after telling them there isn't one. */
function requireActiveEditor(context: CommandContext): Editor | null {
  const editor = context.app.workspace.activeEditor?.editor;
  if (!editor) {
    new Notice('No active editor found.');
    return null;
  }
  return editor;
}
