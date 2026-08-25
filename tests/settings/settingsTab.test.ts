import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import type { HeaderAdjusterSettings } from '../../src/contracts';
import { readSettings } from '../../src/settings/settings';
import { HeaderAdjusterSettingTab } from '../../src/settings/settingsTab';

/**
 * What Obsidian 1.13 and later ask the tab, without asking it to draw anything.
 *
 * `display()` is not exercised here: it needs a real Setting to build, and the
 * stub deliberately refuses. The three methods below are the whole contract for
 * a declarative tab — they are also what feeds the settings search — and none
 * of them touches the DOM.
 */

async function defaults(): Promise<HeaderAdjusterSettings> {
  return readSettings({ loadData: async () => null } as never);
}

function tabFor(settings: HeaderAdjusterSettings) {
  const saves: HeaderAdjusterSettings[] = [];
  const host = {
    settings,
    saveSettings: async () => {
      saves.push({ ...settings });
    },
  };

  return { tab: new HeaderAdjusterSettingTab(null as never, host as never), saves };
}

/**
 * The control on each definition.
 *
 * Obsidian's return type also covers definitions that carry no control at all —
 * groups, pages, actions — so this asserts its way down to the two kinds this
 * plugin actually returns before any test reads a key off one.
 */
function controls(tab: HeaderAdjusterSettingTab) {
  return tab.getSettingDefinitions().map((definition) => {
    const control = 'control' in definition ? definition.control : undefined;
    assert.ok(control, 'every definition binds a control');
    return control;
  });
}

describe('getSettingDefinitions', () => {
  test('every control binds a setting that exists', async () => {
    const settings = await defaults();
    const { tab } = tabFor(settings);

    for (const control of controls(tab)) {
      assert.ok(
        control.key in settings,
        `${control.key} is bound by the tab but is not a setting`
      );
    }
  });

  test('every setting the user has is offered', async () => {
    const settings = await defaults();
    const { tab } = tabFor(settings);
    const bound = controls(tab).map((control) => control.key);

    assert.deepEqual(bound.sort(), Object.keys(settings).sort());
  });

  test('every definition carries the text the search indexes', async () => {
    const { tab } = tabFor(await defaults());

    for (const definition of tab.getSettingDefinitions()) {
      assert.ok('name' in definition && definition.name, 'a definition needs a name');
      assert.ok('desc' in definition && definition.desc, 'a definition needs a description');
    }
  });
});

describe('getControlValue', () => {
  test('reads what is stored, not what the default was', async () => {
    const settings = await defaults();
    settings.increaseLevel = 4;
    const { tab } = tabFor(settings);

    assert.equal(tab.getControlValue('increaseLevel'), 4);
    assert.equal(tab.getControlValue('headingsToBullets'), false);
  });

  test('says nothing about a key this tab does not own', async () => {
    const { tab } = tabFor(await defaults());

    assert.equal(tab.getControlValue('somebodyElsesSetting'), undefined);
  });
});

describe('setControlValue', () => {
  test('a moved slider is stored and persisted', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('deepestHeadingLevel', 3);

    assert.equal(settings.deepestHeadingLevel, 3);
    assert.deepEqual(saves.map((saved) => saved.deepestHeadingLevel), [3]);
  });

  test('a flipped toggle is stored and persisted', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('bulletsToHeadings', true);

    assert.equal(settings.bulletsToHeadings, true);
    assert.equal(saves.length, 1);
  });

  test('a value of the wrong type is refused rather than stored', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('increaseLevel', true);

    assert.equal(settings.increaseLevel, 1);
    assert.deepEqual(saves, [], 'nothing was written, so nothing is persisted');
  });

  test('an unknown key writes nothing', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('somebodyElsesSetting', 2);

    assert.deepEqual(settings, await defaults());
    assert.deepEqual(saves, []);
  });
});
