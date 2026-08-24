/**
 * Enough of Obsidian for a module to load.
 *
 * `resolveTypeScript.mjs` points the bare `obsidian` specifier here when tests
 * run. Nothing in this file pretends to work: it exists so that a module which
 * imports Obsidian at the top can still be imported for the sake of the pure
 * functions further down it — `defaultLevelFor` in `settings/settings.ts` is
 * the case that needs it.
 *
 * Anything that actually drives one of these classes wants a real Obsidian, not
 * this. If a test starts leaning on the behaviour of a stub below, that is a
 * sign the code under test belongs in a file that does not import Obsidian.
 */

const notImplemented = (name: string) => () => {
  throw new Error(`obsidian stub: ${name} is not implemented`);
};

export class Plugin {
  app: unknown;
  addCommand = notImplemented('Plugin.addCommand');
  addRibbonIcon = notImplemented('Plugin.addRibbonIcon');
  addSettingTab = notImplemented('Plugin.addSettingTab');
  loadData = notImplemented('Plugin.loadData');
  saveData = notImplemented('Plugin.saveData');
}

export class PluginSettingTab {
  containerEl: unknown;
  constructor(_app: unknown, _plugin: unknown) {}
}

export class Modal {
  contentEl: unknown;
  constructor(_app: unknown) {}
  close = notImplemented('Modal.close');
}

export class Setting {
  constructor(_containerEl: unknown) {}
  setName = notImplemented('Setting.setName');
  setDesc = notImplemented('Setting.setDesc');
  addText = notImplemented('Setting.addText');
  addButton = notImplemented('Setting.addButton');
  addSlider = notImplemented('Setting.addSlider');
}

export class Menu {
  addItem = notImplemented('Menu.addItem');
  addSeparator = notImplemented('Menu.addSeparator');
  showAtMouseEvent = notImplemented('Menu.showAtMouseEvent');
}

export class Notice {
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}
