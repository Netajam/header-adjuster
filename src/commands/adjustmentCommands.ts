import type { App, Editor } from 'obsidian';
import type { AdjustmentOperation, ConversionSettings } from '../contracts';
import { MarkdownView, Notice } from 'obsidian';
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
  const editor = activeEditor(context);
  if (!editor || !editor.somethingSelected()) {
    new Notice('Select text containing headers first.');
    return;
  }

  adjustSelection(context, editor, operation);
}

/**
 * The editor of whichever Markdown view is open, or null.
 *
 * `workspace.activeEditor` tracks focus rather than the workspace: it stays null
 * until a Markdown editor has actually been focused, so a session restored with
 * a file already open reports no editor until the user clicks into the text.
 * Asking which view is active answers the question that was meant. The old
 * reading stays as a fallback for the cases it still covers, such as a Canvas
 * embedding a Markdown editor, where there is no active `MarkdownView`.
 */
function activeEditor(context: CommandContext): Editor | null {
  const view = context.app.workspace.getActiveViewOfType(MarkdownView);
  return view?.editor ?? context.app.workspace.activeEditor?.editor ?? null;
}

/** The editor the user is in, or null after telling them there isn't one. */
function requireActiveEditor(context: CommandContext): Editor | null {
  const editor = activeEditor(context);
  if (!editor) {
    new Notice('No active editor found.');
    return null;
  }
  return editor;
}
