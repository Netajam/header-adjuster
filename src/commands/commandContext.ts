import type { App } from 'obsidian';
import type { HeaderAdjusterSettings } from '../settings/settingsModel';

/**
 * All a command needs from the plugin: somewhere to find the active editor, and
 * the user's default shifts.
 *
 * Commands depend on this interface rather than on the plugin class, so the
 * entry point can depend on the commands without the two importing each other.
 */
export interface CommandContext {
  readonly app: App;
  readonly settings: HeaderAdjusterSettings;
}
