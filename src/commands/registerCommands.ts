import type { Editor, Plugin } from 'obsidian';
import type { AdjustmentOperation } from '../core/operations';
import type { CommandContext } from './commandContext';
import { defaultLevelFor } from '../settings/settingsModel';
import {
  adjustActiveDocument,
  adjustSelection,
  promptForAdjustment,
} from './adjustmentCommands';

const OPERATIONS: AdjustmentOperation[] = ['increase', 'decrease'];

/** Title-case verb for command names: 'increase' → 'Increase'. */
function verb(operation: AdjustmentOperation): string {
  return operation === 'increase' ? 'Increase' : 'Decrease';
}

/**
 * Registers the command-palette entries.
 *
 * Each of the three surfaces — prompt, whole document, selection — exists once
 * per direction, so they are generated from the pair rather than written twice.
 */
export function registerHeaderAdjusterCommands(
  plugin: Plugin,
  context: CommandContext
): void {
  for (const operation of OPERATIONS) {
    const levels = defaultLevelFor(context.settings, operation);

    plugin.addCommand({
      id: `${operation}-header-level`,
      name: `${verb(operation)} header level...`,
      callback: () => promptForAdjustment(context, operation),
    });

    plugin.addCommand({
      id: `${operation}-header-level-default`,
      name: `${verb(operation)} header level by ${levels} (entire document)`,
      callback: () => adjustActiveDocument(context, operation),
    });

    plugin.addCommand({
      id: `${operation}-header-level-selection-default`,
      name: `${verb(operation)} header level in selection by ${levels}`,
      editorCheckCallback: (checking: boolean, editor: Editor) => {
        if (!editor.somethingSelected()) {
          return false;
        }
        if (!checking) {
          adjustSelection(context, editor, operation);
        }
        return true;
      },
    });
  }
}
