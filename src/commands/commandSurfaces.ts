import type { Editor, Plugin } from 'obsidian';
import type { AdjustmentOperation, LinePlacement } from '../contracts';
import type { CommandContext } from './adjustmentCommands';
import { Menu } from 'obsidian';
import {
  adjustActiveDocument,
  adjustActiveSelection,
  adjustCurrentLine,
  adjustSelection,
  placeCurrentLine,
  promptForAdjustment,
} from './adjustmentCommands';

/**
 * Every way a user can reach the plugin, registered in one call — the door
 * into `commands/`.
 *
 * The palette offers the same four scopes in each direction, so those are
 * generated from the pair, and the three placements from their own table: a
 * placement has no direction, so there is nothing to pair it with. The ribbon
 * menu is written out, because its order and its separators are the thing being
 * designed.
 */

const OPERATIONS: AdjustmentOperation[] = ['increase', 'decrease'];

/**
 * The placements, with the words they are offered under: the palette entry
 * names the line because it stands alone in a search, the menu entry does not
 * because the group it sits in already said so.
 */
const PLACEMENTS: Array<[LinePlacement, string, string, string]> = [
  ['plain', 'Remove header from current line', 'Remove header', 'x-square'],
  [
    'sibling',
    'Make current line a sibling of the header above',
    'Sibling of the header above',
    'equal',
  ],
  [
    'child',
    'Make current line a child of the header above',
    'Child of the header above',
    'corner-down-right',
  ],
];

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

  for (const [placement, name] of PLACEMENTS) {
    plugin.addCommand({
      id: `header-current-line-${placement}`,
      name,
      callback: () => placeCurrentLine(context, placement),
    });
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
  const levels = context.defaultLevel(operation);

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
    id: `${operation}-header-level-current-line`,
    name: `${verb(operation)} header level of current line by ${levels}`,
    callback: () => adjustCurrentLine(context, operation),
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

function buildRibbonMenu(context: CommandContext): Menu {
  const menu = new Menu();
  const increaseBy = context.defaultLevel('increase');
  const decreaseBy = context.defaultLevel('decrease');

  addMenuItem(menu, 'Increase level...', 'plus-square', () =>
    promptForAdjustment(context, 'increase')
  );
  addMenuItem(menu, 'Decrease level...', 'minus-square', () =>
    promptForAdjustment(context, 'decrease')
  );
  menu.addSeparator();

  addMenuItem(menu, 'Increase level by 1 (Document)', 'chevron-up', () =>
    adjustActiveDocument(context, 'increase', 1)
  );
  addMenuItem(menu, 'Decrease level by 1 (Document)', 'chevron-down', () =>
    adjustActiveDocument(context, 'decrease', 1)
  );
  menu.addSeparator();

  addMenuItem(menu, `Increase level by (+${increaseBy}) (Selection)`, 'plus-square', () =>
    adjustActiveSelection(context, 'increase')
  );
  addMenuItem(menu, `Decrease level by (-${decreaseBy}) (Selection)`, 'minus-square', () =>
    adjustActiveSelection(context, 'decrease')
  );
  menu.addSeparator();

  addMenuItem(menu, `Increase level by (+${increaseBy}) (Current line)`, 'plus-square', () =>
    adjustCurrentLine(context, 'increase')
  );
  addMenuItem(menu, `Decrease level by (-${decreaseBy}) (Current line)`, 'minus-square', () =>
    adjustCurrentLine(context, 'decrease')
  );
  menu.addSeparator();

  for (const [placement, , label, icon] of PLACEMENTS) {
    addMenuItem(menu, `${label} (Current line)`, icon, () =>
      placeCurrentLine(context, placement)
    );
  }

  return menu;
}

function addMenuItem(menu: Menu, title: string, icon: string, run: () => void): void {
  menu.addItem((item) => item.setTitle(title).setIcon(icon).onClick(run));
}
