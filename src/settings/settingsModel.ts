import type { AdjustmentOperation } from '../adjustmentOperation';

/** The preferences a user can set for the plugin. */
export interface HeaderAdjusterSettings {
  increaseLevel: number;
  decreaseLevel: number;
}

export const DEFAULT_SETTINGS: HeaderAdjusterSettings = {
  increaseLevel: 1,
  decreaseLevel: 1,
};

/** The narrowest and largest default shift the settings UI offers. */
export const SETTING_LEVEL_RANGE = { min: 1, max: 5, step: 1 } as const;

/**
 * Whatever owns the settings and can persist them.
 *
 * Declaring the settings tab's needs as an interface rather than as the plugin
 * class keeps this folder from depending on the entry point that assembles it.
 */
export interface SettingsHost {
  settings: HeaderAdjusterSettings;
  saveSettings(): Promise<void>;
}

/** The shift to use when the user does not name one for this operation. */
export function defaultLevelFor(
  settings: HeaderAdjusterSettings,
  operation: AdjustmentOperation
): number {
  return operation === 'increase' ? settings.increaseLevel : settings.decreaseLevel;
}
