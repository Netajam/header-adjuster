import { App, PluginSettingTab, Setting } from 'obsidian';
import HeaderAdjusterPlugin from './main'; 

// Settings Interface
export interface HeaderAdjusterSettings {
  increaseLevel: number;
  decreaseLevel: number;
}

// Default Settings
export const DEFAULT_SETTINGS: HeaderAdjusterSettings = {
  increaseLevel: 1,
  decreaseLevel: 1
};

// Settings Tab UI
export class HeaderAdjusterSettingTab extends PluginSettingTab {
  plugin: HeaderAdjusterPlugin;

  constructor(app: App, plugin: HeaderAdjusterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Header Adjuster Settings' });

    new Setting(containerEl)
      .setName('Default increase level')
      .setDesc('The default number of levels to increase headers by.')
      .addSlider(slider => slider
        .setLimits(1, 5, 1) 
        .setValue(this.plugin.settings.increaseLevel)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.increaseLevel = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default decrease level')
      .setDesc('The default number of levels to decrease headers by.')
      .addSlider(slider => slider
        .setLimits(1, 5, 1) 
        .setValue(this.plugin.settings.decreaseLevel)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.decreaseLevel = value;
          await this.plugin.saveSettings();
        }));
  }
}