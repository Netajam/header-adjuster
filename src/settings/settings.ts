import type { Plugin } from 'obsidian';
import type { SettingsHost } from '../contracts';
import { HeaderAdjusterSettingTab } from './settingsTab';

/**
 * The door into `settings/`.
 *
 * Behind it the folder splits along the line that matters: the policy
 * (`settingsDefaults.ts`) has no Obsidian in it and can be tested directly,
 * while the dialog that edits it (`settingsTab.ts`) is all Obsidian. Callers
 * see one contract and neither half.
 */

export { DEFAULT_SETTINGS, defaultLevelFor } from './settingsDefaults';

/** Adds the settings tab to Obsidian's settings dialog. */
export function installSettingsTab(plugin: Plugin & SettingsHost): void {
  plugin.addSettingTab(new HeaderAdjusterSettingTab(plugin.app, plugin));
}
