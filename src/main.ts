import type { HeaderAdjusterSettings, SettingsHost } from './settings/settingsModel';
import { Plugin } from 'obsidian';
import { registerCommandSurfaces } from './commands/commandSurfaces';
import { DEFAULT_SETTINGS } from './settings/settingsModel';
import { HeaderAdjusterSettingTab } from './settings/settingsTab';

/**
 * The entry point, and nothing else.
 *
 * It owns the settings and hands itself to the pieces that need them. Those
 * pieces ask for an interface rather than for this class — `CommandContext` in
 * `commands/`, `SettingsHost` in `settings/` — which is what keeps this file at
 * the top of the dependency graph instead of in a loop with them. Passing
 * `this` below is where TypeScript checks it still satisfies both.
 */
export default class HeaderAdjusterPlugin extends Plugin implements SettingsHost {
  settings: HeaderAdjusterSettings;

  async onload(): Promise<void> {
    console.log('Loading Header Adjuster Plugin');
    await this.loadSettings();

    registerCommandSurfaces(this, this);
    this.addSettingTab(new HeaderAdjusterSettingTab(this.app, this));
  }

  onunload(): void {
    console.log('Unloading Header Adjuster Plugin');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
