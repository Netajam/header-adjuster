import type { Editor } from 'obsidian';
import type { AdjustmentOperation } from '../core/operations';
import type { CommandContext } from './commandContext';
import { Notice } from 'obsidian';
import { selectedLineRange } from '../editor/editorDocument';
import { adjustEditorHeadings } from '../editor/headingAdjustmentService';
import { defaultLevelFor } from '../settings/settingsModel';
import { LevelInputModal } from '../ui/levelInputModal';

/**
 * The things a user can ask for, independent of how they asked — the ribbon
 * menu and the command palette both land here.
 */

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
  const range = selectedLineRange(editor);
  if (!range) {
    return;
  }

  adjustEditorHeadings(
    editor,
    operation,
    defaultLevelFor(context.settings, operation),
    range.fromLine,
    range.toLine
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
export function requireActiveEditor(context: CommandContext): Editor | null {
  const editor = context.app.workspace.activeEditor?.editor;
  if (!editor) {
    new Notice('No active editor found.');
    return null;
  }
  return editor;
}
