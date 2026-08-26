import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { registerCommandSurfaces } from '../../src/commands/commandSurfaces';
import { PLACEMENT_ICON, SHIFT_ICON } from '../../src/commands/icons';

/**
 * That every action is reachable by symbol alone.
 *
 * The command palette shows names, so nothing there would notice a missing or
 * repeated icon. The mobile toolbar shows only the icon, which makes this the
 * one place the requirement can be checked at all.
 */

interface RegisteredCommand {
  id: string;
  name: string;
  icon?: string;
}

/** The commands the plugin registers, as a fake Obsidian records them. */
function registeredCommands(): RegisteredCommand[] {
  const commands: RegisteredCommand[] = [];
  const plugin = {
    addRibbonIcon: () => null,
    addCommand: (command: RegisteredCommand) => commands.push(command),
  };
  const context = { app: {}, defaultLevel: () => 1, conversion: () => ({}) };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerCommandSurfaces(plugin as any, context as any);

  return commands;
}

describe('every action carries a symbol', () => {
  const commands = registeredCommands();

  test('there is a command for each scope in each direction, plus the placements', () => {
    assert.equal(commands.length, 12);
  });

  for (const command of commands) {
    test(`${command.id} has one`, () => {
      assert.ok(command.icon, `${command.id} would reach the toolbar unlabelled`);
    });
  }
});

describe('no two actions wear the same symbol', () => {
  test('across every command the plugin registers', () => {
    const commands = registeredCommands();
    const byIcon = new Map<string, string[]>();

    for (const command of commands) {
      const icon = command.icon ?? '(none)';
      byIcon.set(icon, [...(byIcon.get(icon) ?? []), command.id]);
    }

    const shared = [...byIcon.entries()].filter(([, ids]) => ids.length > 1);

    assert.deepEqual(
      shared,
      [],
      shared.map(([icon, ids]) => `${icon} is worn by ${ids.join(' and ')}`).join('; ')
    );
  });

  test('the tables themselves hold every symbol apart', () => {
    const icons = [
      ...Object.values(SHIFT_ICON).flatMap((pair) => Object.values(pair)),
      ...Object.values(PLACEMENT_ICON),
    ];

    assert.equal(new Set(icons).size, icons.length);
  });
});
