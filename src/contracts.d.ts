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
 * The three ways of naming a level for a line that is to be a heading.
 *
 * `root` is the top of the note and answers to nothing above it. The other two
 * are read against the enclosing heading, the nearest heading above the line:
 * `sibling` takes its level, `child` one deeper. These are also the three a
 * toggle can be pointed at, which is why they are a word of their own.
 */
export type HeadingPlacement = 'root' | 'sibling' | 'child';

/**
 * Where the current line's heading sits relative to the section it is in.
 *
 * These name a level outright instead of a distance to move, which is what
 * separates them from an operation. `plain` is level zero — no heading at all —
 * and is how one is taken away.
 *
 * `toggle` is the one that also reads the line: it is whichever
 * `HeadingPlacement` the user pointed it at, unless the line is already sitting
 * there, in which case there is nothing left to add and it is `plain` instead.
 * That makes one command out of two, which is what a mobile toolbar with a
 * single free slot has room for.
 */
export type LinePlacement = HeadingPlacement | 'plain' | 'toggle';

/**
 * Why an adjustment produced nothing.
 *
 * Core decides these and the editor is what says them out loud, which is why
 * the word is shared rather than owned by either.
 */
export type RejectionReason =
  | 'empty-range'
  | 'zero-levels'
  | 'negative-levels'
  | 'no-headings';

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
  /**
   * The deepest level a heading may occupy before it converts to a bullet, and
   * the level a bullet converts back to. Markdown's own limit of six when
   * omitted, which is the setting doing nothing.
   */
  deepestHeadingLevel?: number;
}

/** The preferences a user can set for the plugin. */
export interface HeadingAdjusterSettings extends ConversionSettings {
  increaseLevel: number;
  decreaseLevel: number;
  deepestHeadingLevel: number;
  /** Which level the toggle puts a heading at, and so which one takes it off. */
  toggleTarget: HeadingPlacement;
  /**
   * Where the custom commands start, and where they stop.
   *
   * Each end names the boundary it sits on rather than answering a yes/no about
   * the cursor: a toggle has to assert one state in its label and describe the
   * other in its help text, which reads as a contradiction whichever way it is
   * worded. `'cursor'` on both ends is the cursor line alone, and the pair
   * defaults to the whole note — the same range the document commands cover, so
   * the custom pair does something sensible before it is configured.
   *
   * The two ends take different options on purpose. Nothing above the top or
   * below the bottom is offered, so a backwards range cannot be configured and
   * there is none to reject.
   *
   * A fixed line number is deliberately not offered either. A range baked into a
   * hotkey outlives the note it was set for; the dialog is where a one-off range
   * belongs.
   */
  customRangeTop: 'note-start' | 'cursor';
  customRangeBottom: 'cursor' | 'note-end';
}

/** Whatever owns the settings and can persist them. */
export interface SettingsHost {
  settings: HeadingAdjusterSettings;
  saveSettings(): Promise<void>;
}
