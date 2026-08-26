import type { Editor, Plugin } from 'obsidian';
import type { AdjustmentOperation, LinePlacement } from '../contracts';
import type { CommandContext } from './adjustmentCommands';
import { Menu } from 'obsidian';
import { PLACEMENT_ICON, SHIFT_ICON } from './icons';
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
 *
 * Every entry takes its symbol from `icons.ts` rather than naming one, so a
 * command and the menu item that runs it cannot come to wear different glyphs.
 * The palette shows names and does not need them; the mobile toolbar shows
 * nothing else.
 *
 * The `id` of every command still says `header`, from before the plugin was
 * renamed to Heading Adjuster. A user's custom hotkey is stored against
 * `header-adjuster:<id>`, so renaming one of these unbinds that hotkey with no
 * error and no way for the user to see why. The names are what people read;
 * those say `heading`. Leave the ids as they are.
 */

const OPERATIONS: AdjustmentOperation[] = ['increase', 'decrease'];

/**
 * The placements, with the words they are offered under: the palette entry
 * names the line because it stands alone in a search, the menu entry does not
 * because the group it sits in already said so.
 */
const PLACEMENTS: Array<[LinePlacement, string, string]> = [
  ['plain', 'Remove heading from current line', 'Remove heading'],
  [
    'sibling',
    'Make current line a sibling of the heading above',
    'Sibling of the heading above',
  ],
  ['child', 'Make current line a child of the heading above', 'Child of the heading above'],
];

export function registerCommandSurfaces(
  plugin: Plugin,
  context: CommandContext
): void {
  plugin.addRibbonIcon('heading', 'Adjust headings', (event) => {
    buildRibbonMenu(context).showAtMouseEvent(event);
  });

  for (const operation of OPERATIONS) {
    registerCommandsFor(plugin, context, operation);
  }

  for (const [placement, name] of PLACEMENTS) {
    plugin.addCommand({
      id: `header-current-line-${placement}`,
      name,
      icon: PLACEMENT_ICON[placement],
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
    name: `${verb(operation)} heading level...`,
    icon: SHIFT_ICON.prompt[operation],
    callback: () => promptForAdjustment(context, operation),
  });

  plugin.addCommand({
    id: `${operation}-header-level-default`,
    name: `${verb(operation)} heading level by ${levels} (entire document)`,
    icon: SHIFT_ICON.document[operation],
    callback: () => adjustActiveDocument(context, operation),
  });

  plugin.addCommand({
    id: `${operation}-header-level-current-line`,
    name: `${verb(operation)} heading level of current line by ${levels}`,
    icon: SHIFT_ICON.line[operation],
    callback: () => adjustCurrentLine(context, operation),
  });

  plugin.addCommand({
    id: `${operation}-header-level-selection-default`,
    name: `${verb(operation)} heading level in selection by ${levels}`,
    icon: SHIFT_ICON.selection[operation],
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

  addMenuItem(menu, 'Increase level...', SHIFT_ICON.prompt.increase, () =>
    promptForAdjustment(context, 'increase')
  );
  addMenuItem(menu, 'Decrease level...', SHIFT_ICON.prompt.decrease, () =>
    promptForAdjustment(context, 'decrease')
  );
  menu.addSeparator();

  addMenuItem(menu, 'Increase level by 1 (Document)', SHIFT_ICON.document.increase, () =>
    adjustActiveDocument(context, 'increase', 1)
  );
  addMenuItem(menu, 'Decrease level by 1 (Document)', SHIFT_ICON.document.decrease, () =>
    adjustActiveDocument(context, 'decrease', 1)
  );
  menu.addSeparator();

  addMenuItem(
    menu,
    `Increase level by (+${increaseBy}) (Selection)`,
    SHIFT_ICON.selection.increase,
    () => adjustActiveSelection(context, 'increase')
  );
  addMenuItem(
    menu,
    `Decrease level by (-${decreaseBy}) (Selection)`,
    SHIFT_ICON.selection.decrease,
    () => adjustActiveSelection(context, 'decrease')
  );
  menu.addSeparator();

  addMenuItem(menu, `Increase level by (+${increaseBy}) (Current line)`, SHIFT_ICON.line.increase, () =>
    adjustCurrentLine(context, 'increase')
  );
  addMenuItem(menu, `Decrease level by (-${decreaseBy}) (Current line)`, SHIFT_ICON.line.decrease, () =>
    adjustCurrentLine(context, 'decrease')
  );
  menu.addSeparator();

  for (const [placement, , label] of PLACEMENTS) {
    addMenuItem(menu, `${label} (Current line)`, PLACEMENT_ICON[placement], () =>
      placeCurrentLine(context, placement)
    );
  }

  return menu;
}

function addMenuItem(menu: Menu, title: string, icon: string, run: () => void): void {
  menu.addItem((item) => item.setTitle(title).setIcon(icon).onClick(run));
}
