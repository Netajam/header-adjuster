import type { Plugin } from 'obsidian';
import type {
  AdjustmentOperation,
  HeaderAdjusterSettings,
  SettingsHost,
} from '../contracts';
import { HeaderAdjusterSettingTab } from './settingsTab';

/**
 * The user's preferences — the door into `settings/`.
 *
 * The shapes live in `contracts.ts`, because every layer names them. What
 * lives here is the policy: what a fresh install uses, how a stored value is
 * read back, how a default is chosen, and how the tab gets installed.
 */

const DEFAULT_SETTINGS: HeaderAdjusterSettings = {
  increaseLevel: 1,
  decreaseLevel: 1,
  // Both off: each rewrites more than a heading line, so neither is something
  // to start doing to an existing vault without being asked.
  headingsToBullets: false,
  bulletsToHeadings: false,
  // Markdown's own limit, which is this setting having no effect.
  deepestHeadingLevel: 6,
};

/** The stored settings, with anything missing filled in from the defaults. */
export async function readSettings(plugin: Plugin): Promise<HeaderAdjusterSettings> {
  return Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData());
}

/** The shift to use when the user does not name one for this operation. */
export function defaultLevelFor(
  settings: HeaderAdjusterSettings,
  operation: AdjustmentOperation
): number {
  return operation === 'increase' ? settings.increaseLevel : settings.decreaseLevel;
}

/** Adds the settings tab to Obsidian's settings dialog. */
export function installSettingsTab(plugin: Plugin & SettingsHost): void {
  plugin.addSettingTab(new HeaderAdjusterSettingTab(plugin.app, plugin));
}
