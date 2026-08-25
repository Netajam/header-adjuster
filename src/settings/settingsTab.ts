import type {
  App,
  Plugin,
  SettingDefinitionItem,
  SettingSliderControl,
  SettingToggleControl,
} from 'obsidian';
import type { SettingsHost } from '../contracts';
import { PluginSettingTab, Setting } from 'obsidian';

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

/**
 * One setting, described rather than drawn.
 *
 * Narrower than Obsidian's own `SettingDefinitionItem`, which also covers
 * groups, pages and lists this plugin has no use for. Naming the two controls
 * it does use is what lets `display()` below read a key and get back the type
 * the setting actually holds.
 */
type ControlDefinition = {
  name: string;
  desc: string;
  control: SettingSliderControl<LevelKey> | SettingToggleControl<ToggleKey>;
};

/** Every setting there is, said once. */
const SETTINGS: ControlDefinition[] = [
  {
    name: 'Default increase level',
    desc: 'The default number of levels to increase headers by.',
    control: { type: 'slider', key: 'increaseLevel', ...RANGE.level },
  },
  {
    name: 'Default decrease level',
    desc: 'The default number of levels to decrease headers by.',
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

export class HeaderAdjusterSettingTab extends PluginSettingTab {
  private readonly host: SettingsHost;

  constructor(app: App, plugin: Plugin & SettingsHost) {
    super(app, plugin);
    this.host = plugin;
  }

  /**
   * Hands Obsidian the settings instead of drawing them.
   *
   * From 1.13 this is what renders the tab, and it is also what puts these
   * settings into the search users reach them by — a tab that only draws
   * itself cannot be searched, because nothing outside it knows what it holds.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    return SETTINGS;
  }

  /** Reads one setting for the definition bound to `key`. */
  getControlValue(key: string): unknown {
    const control = controlFor(key);
    return control && this.host.settings[control.key];
  }

  /** Writes one setting back, and persists the lot. */
  setControlValue(key: string, value: unknown): Promise<void> {
    const control = controlFor(key);
    const settings = this.host.settings;

    if (control?.type === 'slider' && typeof value === 'number') {
      settings[control.key] = value;
    } else if (control?.type === 'toggle' && typeof value === 'boolean') {
      settings[control.key] = value;
    } else {
      return Promise.resolve();
    }

    return this.host.saveSettings();
  }

  /**
   * The same settings, drawn by hand.
   *
   * Obsidian only reaches this when `getSettingDefinitions()` gives it
   * nothing, which is to say on versions before 1.13. It is kept because
   * `minAppVersion` still admits them, and it reads the same list so the two
   * cannot describe different settings.
   */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    for (const { name, desc, control } of SETTINGS) {
      const setting = new Setting(containerEl).setName(name).setDesc(desc);

      if (control.type === 'slider') {
        setting.addSlider((slider) =>
          slider
            .setLimits(control.min, control.max, control.step)
            .setValue(this.host.settings[control.key])
            .setDynamicTooltip()
            .onChange((value) => void this.setControlValue(control.key, value))
        );
      } else {
        setting.addToggle((toggle) =>
          toggle
            .setValue(this.host.settings[control.key])
            .onChange((value) => void this.setControlValue(control.key, value))
        );
      }
    }
  }
}

/** The control bound to `key`, or nothing if this tab does not own it. */
function controlFor(key: string): ControlDefinition['control'] | undefined {
  return SETTINGS.find((setting) => setting.control.key === key)?.control;
}
