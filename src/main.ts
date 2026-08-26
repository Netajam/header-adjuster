import type {
  AdjustmentOperation,
  ConversionSettings,
  HeadingAdjusterSettings,
  SettingsHost,
} from './contracts';
import { Plugin } from 'obsidian';
import { registerCommandSurfaces } from './commands/commandSurfaces';
import {
  defaultLevelFor,
  installSettingsTab,
  readSettings,
} from './settings/settings';

/**
 * The entry point, and the root of the tree.
 *
 * It owns the settings and hands itself to the two folders below it. Those
 * folders ask for an interface rather than for this class — `CommandContext`
 * in `commands/`, `SettingsHost` in `settings/` — which is what keeps this
 * file at the top of the graph instead of in a loop with them. Passing `this`
 * below is where TypeScript checks it still satisfies both.
 */
export default class HeadingAdjusterPlugin extends Plugin implements SettingsHost {
  settings: HeadingAdjusterSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    registerCommandSurfaces(this, this);
    installSettingsTab(this);
  }

  async loadSettings(): Promise<void> {
    this.settings = await readSettings(this);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** How far to shift by default in this direction. Satisfies `CommandContext`. */
  defaultLevel(operation: AdjustmentOperation): number {
    return defaultLevelFor(this.settings, operation);
  }

  /** Which conversions are switched on. Also satisfies `CommandContext`. */
  conversion(): ConversionSettings {
    return this.settings;
  }
}
