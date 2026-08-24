import type { CommandContext } from './commands/commandContext';
import type {
  HeaderAdjusterSettings,
  SettingsHost,
} from './settings/settingsModel';
import { Plugin } from 'obsidian';
import { registerHeaderAdjusterCommands } from './commands/registerCommands';
import { registerRibbonMenu } from './commands/ribbonMenu';
import { DEFAULT_SETTINGS } from './settings/settingsModel';
import { HeaderAdjusterSettingTab } from './settings/settingsTab';

/**
 * The entry point, and nothing else.
 *
 * It owns the settings and hands itself to the pieces that need them — as a
 * `CommandContext` to the command surfaces, as a `SettingsHost` to the settings
 * tab. Those pieces know only the interface, which is what keeps this file at
 * the top of the dependency graph instead of in a loop with them.
 */
export default class HeaderAdjusterPlugin
  extends Plugin
  implements CommandContext, SettingsHost
{
  settings: HeaderAdjusterSettings;

  async onload(): Promise<void> {
    console.log('Loading Header Adjuster Plugin');
    await this.loadSettings();

    registerRibbonMenu(this, this);
    registerHeaderAdjusterCommands(this, this);
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
