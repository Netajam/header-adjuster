import type { Plugin } from 'obsidian';
import type { CommandContext } from './commandContext';
import { Menu } from 'obsidian';
import { defaultLevelFor } from '../settings/settingsModel';
import {
  adjustActiveDocument,
  adjustActiveSelection,
  promptForAdjustment,
} from './adjustmentCommands';

const SEPARATOR = 'separator' as const;

interface MenuAction {
  title: string;
  icon: string;
  run: () => void;
}

type MenuEntry = MenuAction | typeof SEPARATOR;

/** Adds the ribbon icon that opens the adjustment menu. */
export function registerRibbonMenu(plugin: Plugin, context: CommandContext): void {
  plugin.addRibbonIcon('heading', 'Adjust headers', (event) => {
    buildRibbonMenu(context).showAtMouseEvent(event);
  });
}

/**
 * The menu, described as data.
 *
 * Read top to bottom it is the whole feature surface: prompt for a shift, nudge
 * the document by one, or apply the configured defaults to a selection.
 */
export function ribbonMenuEntries(context: CommandContext): MenuEntry[] {
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
