import type {
  SettingDropdownControl,
  SettingSliderControl,
  SettingToggleControl,
} from 'obsidian';
import type { HeadingPlacement } from '../contracts';

/**
 * What the settings are, said once and in one place.
 *
 * Kept apart from the tab because the two answer different questions: this
 * file is the list of settings the plugin has, and `settingsTab.ts` is how
 * Obsidian is handed them. Both of its rendering paths read this list, so
 * neither can come to describe a setting the other does not have.
 */

/**
 * How far each slider may travel: a default shift of one to five levels, and a
 * ceiling anywhere in Markdown's own range, six being that range's end and so
 * the setting having no effect.
 */
const RANGE = {
  level: { min: 1, max: 5, step: 1 },
  ceiling: { min: 1, max: 6, step: 1 },
} as const;

/** The settings a slider can be bound to. */
type LevelKey = 'increaseLevel' | 'decreaseLevel' | 'deepestHeadingLevel';

/** The settings a toggle can be bound to. */
type ToggleKey = 'headingsToBullets' | 'bulletsToHeadings';

/** Where the toggle command may be pointed, in the user's words. */
export const TOGGLE_TARGETS: Record<HeadingPlacement, string> = {
  root: 'Top level (#)',
  sibling: 'Same level as the heading above',
  child: 'One level below the heading above',
};

/**
 * One setting, described rather than drawn.
 *
 * Narrower than Obsidian's own `SettingDefinitionItem`, which also covers
 * groups, pages and lists this plugin has no use for. Naming the three controls
 * it does use is what lets the tab read a key and get back the type the setting
 * actually holds.
 */
export type ControlDefinition = {
  name: string;
  desc: string;
  control:
    | SettingSliderControl<LevelKey>
    | SettingToggleControl<ToggleKey>
    | SettingDropdownControl<'toggleTarget'>;
};

/** Every setting there is, said once. */
export const SETTINGS: ControlDefinition[] = [
  {
    name: 'Default increase level',
    desc: 'The default number of levels to increase headings by.',
    control: { type: 'slider', key: 'increaseLevel', ...RANGE.level },
  },
  {
    name: 'Default decrease level',
    desc: 'The default number of levels to decrease headings by.',
    control: { type: 'slider', key: 'decreaseLevel', ...RANGE.level },
  },
  {
    name: 'Deepest heading level',
    desc: 'The level headings stop at. Anything an increase would push past it '
      + 'becomes a bulleted list item instead, and a bullet converted back '
      + 'returns to this level. Only has an effect with a conversion below '
      + 'switched on.',
    control: { type: 'slider', key: 'deepestHeadingLevel', ...RANGE.ceiling },
  },
  {
    name: 'Toggle puts the heading at',
    desc: 'Which level "Toggle heading on current line" writes, and so which level '
      + 'it takes back off. A line already at that level loses its heading; a '
      + 'line anywhere else is moved to it first.',
    control: { type: 'dropdown', key: 'toggleTarget', options: TOGGLE_TARGETS },
  },
  {
    name: 'Convert headings past the deepest level into bullets',
    desc: 'When increasing would push a heading past the level above, turn it into a '
      + 'bulleted list item instead of leaving it unchanged. The content beneath '
      + 'the heading is re-indented so it sits inside the new bullet.',
    control: { type: 'toggle', key: 'headingsToBullets' },
  },
  {
    name: 'Convert bullets back into headings',
    desc: 'When decreasing, turn list items back into headings. Warning: this cannot '
      + 'tell a bullet this plugin created from one you typed yourself, so every '
      + 'list in range is converted — including hand-written ones.',
    control: { type: 'toggle', key: 'bulletsToHeadings' },
  },
];
