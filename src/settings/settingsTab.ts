import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { HeaderAdjusterSettings, SettingsHost } from './settingsModel';
import { SETTING_LEVEL_RANGE } from './settingsModel';

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
  }

  /** One slider bound to one numeric setting, saved as it moves. */
  private addLevelSlider(
    name: string,
    description: string,
    key: keyof HeaderAdjusterSettings
  ): void {
    const { min, max, step } = SETTING_LEVEL_RANGE;

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
}
