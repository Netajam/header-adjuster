import type { Plugin } from 'obsidian';
import type {
  AdjustmentOperation,
  HeadingAdjusterSettings,
  SettingsHost,
} from '../contracts';
import { HeadingAdjusterSettingTab } from './settingsTab';

/**
 * The user's preferences — the door into `settings/`.
 *
 * The shapes live in `contracts.ts`, because every layer names them. What
 * lives here is the policy: what a fresh install uses, how a stored value is
 * read back, how a default is chosen, and how the tab gets installed.
 */

const DEFAULT_SETTINGS: HeadingAdjusterSettings = {
  increaseLevel: 1,
  decreaseLevel: 1,
  // Both off: each rewrites more than a heading line, so neither is something
  // to start doing to an existing vault without being asked.
  headingsToBullets: false,
  bulletsToHeadings: false,
  // Markdown's own limit, which is this setting having no effect.
  deepestHeadingLevel: 6,
  // What the toggle did before it could be pointed anywhere else, so an
  // upgrade finds the command behaving exactly as it left it.
  toggleTarget: 'sibling',
};

/** The stored settings, with anything missing filled in from the defaults. */
export async function readSettings(plugin: Plugin): Promise<HeadingAdjusterSettings> {
  // loadData() is typed `any`, and a vault may hold settings written by an
  // older version of the plugin, so what comes back is a partial at best.
  const stored = (await plugin.loadData()) as Partial<HeadingAdjusterSettings> | null;
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** The shift to use when the user does not name one for this operation. */
export function defaultLevelFor(
  settings: HeadingAdjusterSettings,
  operation: AdjustmentOperation
): number {
  return operation === 'increase' ? settings.increaseLevel : settings.decreaseLevel;
}

/** Adds the settings tab to Obsidian's settings dialog. */
export function installSettingsTab(plugin: Plugin & SettingsHost): void {
  plugin.addSettingTab(new HeadingAdjusterSettingTab(plugin.app, plugin));
}
