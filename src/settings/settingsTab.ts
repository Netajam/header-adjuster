import type { App, Plugin } from 'obsidian';
import type { SettingsHost } from '../contracts';
import { PluginSettingTab, Setting } from 'obsidian';

/** The narrowest and largest default shift the settings UI offers. */
const SETTING_LEVEL_RANGE = { min: 1, max: 5, step: 1 } as const;

/** How deep a heading may sit before it converts. Six is Markdown's own limit. */
const CEILING_RANGE = { min: 1, max: 6, step: 1 } as const;

/** The settings a slider can be bound to. */
type LevelKey = 'increaseLevel' | 'decreaseLevel' | 'deepestHeadingLevel';

/** The settings a toggle can be bound to. */
type ToggleKey = 'headingsToBullets' | 'bulletsToHeadings';

export class HeaderAdjusterSettingTab extends PluginSettingTab {
  private readonly host: SettingsHost;

  constructor(app: App, plugin: Plugin & SettingsHost) {
    super(app, plugin);
    this.host = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Header Adjuster Settings' });

    this.addLevelSlider(
      'Default increase level',
      'The default number of levels to increase headers by.',
      'increaseLevel'
    );

    this.addLevelSlider(
      'Default decrease level',
      'The default number of levels to decrease headers by.',
      'decreaseLevel'
    );

    this.addLevelSlider(
      'Deepest heading level',
      'The level headings stop at. Anything an increase would push past it '
        + 'becomes a bulleted list item instead, and a bullet converted back '
        + 'returns to this level. Only has an effect with a conversion below '
        + 'switched on.',
      'deepestHeadingLevel',
      CEILING_RANGE
    );

    this.addConversionToggle(
      'Convert headings past the deepest level into bullets',
      'When increasing would push a heading past the level above, turn it into a '
        + 'bulleted list item instead of leaving it unchanged. The content beneath '
        + 'the heading is re-indented so it sits inside the new bullet.',
      'headingsToBullets'
    );

    this.addConversionToggle(
      'Convert bullets back into headings',
      'When decreasing, turn list items back into headings. Warning: this cannot '
        + 'tell a bullet this plugin created from one you typed yourself, so every '
        + 'list in range is converted \u2014 including hand-written ones.',
      'bulletsToHeadings'
    );
  }

  /** One slider bound to one numeric setting, saved as it moves. */
  private addLevelSlider(
    name: string,
    description: string,
    key: LevelKey,
    range: { min: number; max: number; step: number } = SETTING_LEVEL_RANGE
  ): void {
    const { min, max, step } = range;

    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addSlider((slider) =>
        slider
          .setLimits(min, max, step)
          .setValue(this.host.settings[key])
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.host.settings[key] = value;
            await this.host.saveSettings();
          })
      );
  }

  /** One toggle bound to one conversion, saved as it flips. */
  private addConversionToggle(
    name: string,
    description: string,
    key: ToggleKey
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings[key]).onChange(async (value) => {
          this.host.settings[key] = value;
          await this.host.saveSettings();
        })
      );
  }
}
