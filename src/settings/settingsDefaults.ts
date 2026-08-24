import type { AdjustmentOperation, HeaderAdjusterSettings } from '../contracts';

/**
 * What the plugin does when the user has not said otherwise.
 *
 * Kept clear of Obsidian so the policy can be read — and tested — without the
 * settings dialog that edits it.
 */

export const DEFAULT_SETTINGS: HeaderAdjusterSettings = {
  increaseLevel: 1,
  decreaseLevel: 1,
};

/** The shift to use when the user does not name one for this operation. */
export function defaultLevelFor(
  settings: HeaderAdjusterSettings,
  operation: AdjustmentOperation
): number {
  return operation === 'increase' ? settings.increaseLevel : settings.decreaseLevel;
}
