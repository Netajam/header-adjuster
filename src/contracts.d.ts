/**
 * The words every layer of the plugin has to say.
 *
 * This module declares types and nothing else — no functions, no constants, no
 * runtime code at all. That is what lets it sit outside the dependency tree:
 * every one of these declarations is erased at compile time, so importing them
 * couples nothing and the shipped module graph never sees this file.
 *
 * Behaviour never belongs here. The moment something in this file could run,
 * it would become a real dependency of everything that imports it, and the
 * exemption the architecture test grants this file would be a lie.
 */

/** The two directions a heading level can be moved in. */
export type AdjustmentOperation = 'increase' | 'decrease';

/**
 * Which of the two overflow conversions the user has switched on.
 *
 * Both ship off. Each rewrites more than a heading line — one re-indents a
 * section body, the other converts every list item in range — so neither is
 * something to start doing to a vault on upgrade without being asked.
 */
export interface ConversionSettings {
  /** On increase, turn a heading pushed past H6 into a list item. */
  headingsToBullets: boolean;
  /** On decrease, turn list items back into headings. See docs/adr/0001. */
  bulletsToHeadings: boolean;
}

/** The preferences a user can set for the plugin. */
export interface HeaderAdjusterSettings extends ConversionSettings {
  increaseLevel: number;
  decreaseLevel: number;
}

/** Whatever owns the settings and can persist them. */
export interface SettingsHost {
  settings: HeaderAdjusterSettings;
  saveSettings(): Promise<void>;
}
