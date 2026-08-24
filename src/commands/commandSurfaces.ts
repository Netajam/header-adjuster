import type { Editor, Plugin } from 'obsidian';
import type { AdjustmentOperation } from '../adjustmentOperation';
import type { CommandContext } from './adjustmentCommands';
import { Menu } from 'obsidian';
import { defaultLevelFor } from '../settings/settingsModel';
import {
  adjustActiveDocument,
  adjustActiveSelection,
  adjustSelection,
  promptForAdjustment,
} from './adjustmentCommands';

/**
 * Every way a user can reach the plugin, registered in one call.
 *
 * The ribbon menu and the command palette offer the same three things in each
 * direction — prompt, whole document, selection — so both are described as data
 * over the pair rather than written out six times each.
 */

const OPERATIONS: AdjustmentOperation[] = ['increase', 'decrease'];

const SEPARATOR = 'separator' as const;

interface MenuAction {
  title: string;
  icon: string;
  run: () => void;
}

type MenuEntry = MenuAction | typeof SEPARATOR;

/** The single door into this folder: everything `onload` has to hook up. */
export function registerCommandSurfaces(
  plugin: Plugin,
  context: CommandContext
): void {
  plugin.addRibbonIcon('heading', 'Adjust headers', (event) => {
    buildRibbonMenu(context).showAtMouseEvent(event);
  });

  for (const operation of OPERATIONS) {
    registerCommandsFor(plugin, context, operation);
  }
}

/** Title-case verb for command names: 'increase' → 'Increase'. */
function verb(operation: AdjustmentOperation): string {
  return operation === 'increase' ? 'Increase' : 'Decrease';
}

function registerCommandsFor(
  plugin: Plugin,
  context: CommandContext,
  operation: AdjustmentOperation
): void {
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

/**
 * The menu, described as data.
 *
 * Read top to bottom it is the whole feature surface: prompt for a shift, nudge
 * the document by one, or apply the configured defaults to a selection.
 */
function ribbonMenuEntries(context: CommandContext): MenuEntry[] {
  const increaseBy = defaultLevelFor(context.settings, 'increase');
  const decreaseBy = defaultLevelFor(context.settings, 'decrease');

  return [
    {
      title: 'Increase level...',
      icon: 'plus-square',
      run: () => promptForAdjustment(context, 'increase'),
    },
    {
      title: 'Decrease level...',
      icon: 'minus-square',
      run: () => promptForAdjustment(context, 'decrease'),
    },
    SEPARATOR,
    {
      title: 'Increase level by 1 (Document)',
      icon: 'chevron-up',
      run: () => adjustActiveDocument(context, 'increase', 1),
    },
    {
      title: 'Decrease level by 1 (Document)',
      icon: 'chevron-down',
      run: () => adjustActiveDocument(context, 'decrease', 1),
    },
    SEPARATOR,
    {
      title: `Increase level by (+${increaseBy}) (Selection)`,
      icon: 'plus-square',
      run: () => adjustActiveSelection(context, 'increase'),
    },
    {
      title: `Decrease level by (-${decreaseBy}) (Selection)`,
      icon: 'minus-square',
      run: () => adjustActiveSelection(context, 'decrease'),
    },
  ];
}

function buildRibbonMenu(context: CommandContext): Menu {
  const menu = new Menu();

  for (const entry of ribbonMenuEntries(context)) {
    if (entry === SEPARATOR) {
      menu.addSeparator();
      continue;
    }

    menu.addItem((item) =>
      item.setTitle(entry.title).setIcon(entry.icon).onClick(entry.run)
    );
  }

  return menu;
}
