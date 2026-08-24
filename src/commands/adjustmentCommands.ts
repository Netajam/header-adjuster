import type { App, Editor } from 'obsidian';
import type { AdjustmentOperation } from '../adjustmentOperation';
import type { HeaderAdjusterSettings } from '../settings/settingsModel';
import { Notice } from 'obsidian';
import {
  adjustEditorHeadings,
  adjustEditorSelection,
} from '../editor/headingAdjustmentService';
import { defaultLevelFor } from '../settings/settingsModel';
import { LevelInputModal } from '../ui/levelInputModal';

/**
 * The things a user can ask for, independent of how they asked — the ribbon
 * menu and the command palette both land here.
 */

/**
 * All a command needs from the plugin: somewhere to find the active editor, and
 * the user's default shifts.
 *
 * Commands depend on this interface rather than on the plugin class, so the
 * entry point can depend on the commands without the two importing each other.
 */
export interface CommandContext {
  readonly app: App;
  readonly settings: HeaderAdjusterSettings;
}

/** Asks for a shift and a range, then adjusts what the user named. */
export function promptForAdjustment(
  context: CommandContext,
  operation: AdjustmentOperation
): void {
  new LevelInputModal(
    context.app,
    ({ levels, startLine, endLine }) => {
      const editor = requireActiveEditor(context);
      if (!editor) {
        return;
      }

      adjustEditorHeadings(
        editor,
        operation,
        levels ?? defaultLevelFor(context.settings, operation),
        startLine ? startLine - 1 : 0,
        endLine ? endLine - 1 : undefined
      );
    },
    operation,
    context.settings
  ).open();
}

/** Adjusts every heading in the active document. */
export function adjustActiveDocument(
  context: CommandContext,
  operation: AdjustmentOperation,
  levels: number = defaultLevelFor(context.settings, operation)
): void {
  const editor = requireActiveEditor(context);
  if (editor) {
    adjustEditorHeadings(editor, operation, levels);
  }
}

/** Adjusts the headings inside a selection the caller has already confirmed. */
export function adjustSelection(
  context: CommandContext,
  editor: Editor,
  operation: AdjustmentOperation
): void {
  adjustEditorSelection(
    editor,
    operation,
    defaultLevelFor(context.settings, operation)
  );
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
