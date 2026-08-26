import type { App, Plugin, SettingDefinitionItem } from 'obsidian';
import type { HeadingPlacement, SettingsHost } from '../contracts';
import type { ControlDefinition } from './controls';
import { PluginSettingTab, Setting } from 'obsidian';
import { SETTINGS, TOGGLE_TARGETS } from './controls';

/**
 * How Obsidian is handed the settings — described where it can, drawn where it
 * cannot.
 *
 * What the settings are lives in `controls.ts`; this file is only the two ways
 * of putting them on screen and the reading and writing of one by key.
 */

export class HeadingAdjusterSettingTab extends PluginSettingTab {
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
    } else if (control?.type === 'dropdown' && isTarget(value)) {
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
      this.draw(new Setting(containerEl).setName(name).setDesc(desc), control);
    }
  }

  /**
   * Puts one control on screen and wires it back to the setting it holds.
   *
   * Split out of `display()` because a control per kind, each a chain inside a
   * callback inside a branch inside a loop, is nesting a reader has to unpick
   * rather than read. `store` is shared: the three components hand back three
   * different types and `setControlValue` is what decides which are real, so
   * there is nothing per-kind to say here.
   */
  private draw(setting: Setting, control: ControlDefinition['control']): void {
    const store = (value: unknown) => void this.setControlValue(control.key, value);

    if (control.type === 'slider') {
      setting.addSlider((slider) =>
        slider
          .setLimits(control.min, control.max, control.step)
          .setValue(this.host.settings[control.key])
          .setDynamicTooltip()
          .onChange(store)
      );
      return;
    }

    if (control.type === 'dropdown') {
      setting.addDropdown((dropdown) =>
        dropdown
          .addOptions(control.options)
          .setValue(this.host.settings[control.key])
          .onChange(store)
      );
      return;
    }

    setting.addToggle((toggle) =>
      toggle.setValue(this.host.settings[control.key]).onChange(store)
    );
  }
}

/**
 * Whether a value is one of the three places a toggle may be pointed.
 *
 * A stored setting is whatever the file held, so the dropdown's own options are
 * what say which strings are real — the same list the user picked from.
 */
function isTarget(value: unknown): value is HeadingPlacement {
  return typeof value === 'string' && value in TOGGLE_TARGETS;
}

/** The control bound to `key`, or nothing if this tab does not own it. */
function controlFor(key: string): ControlDefinition['control'] | undefined {
  return SETTINGS.find((setting) => setting.control.key === key)?.control;
}
