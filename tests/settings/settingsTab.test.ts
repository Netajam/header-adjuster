import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import type { HeadingAdjusterSettings } from '../../src/contracts';
import { readSettings } from '../../src/settings/settings';
import { HeadingAdjusterSettingTab } from '../../src/settings/settingsTab';

/**
 * What Obsidian 1.13 and later ask the tab, without asking it to draw anything.
 *
 * `display()` is not exercised here: it needs a real Setting to build, and the
 * stub deliberately refuses. The three methods below are the whole contract for
 * a declarative tab — they are also what feeds the settings search — and none
 * of them touches the DOM.
 */

/** The three kinds of control this plugin binds, and nothing else. */
const CONTROL_TYPES = ['slider', 'toggle', 'dropdown'];

async function defaults(): Promise<HeadingAdjusterSettings> {
  return readSettings({ loadData: async () => null } as never);
}

function tabFor(settings: HeadingAdjusterSettings) {
  const saves: HeadingAdjusterSettings[] = [];
  const host = {
    settings,
    saveSettings: async () => {
      saves.push({ ...settings });
    },
  };

  return { tab: new HeadingAdjusterSettingTab(null as never, host as never), saves };
}

/**
 * Every definition inside the groups the tab returns.
 *
 * The tab hands Obsidian a list of groups, so a control is always one level
 * down. Obsidian's return type also covers pages and lists this plugin does not
 * return, which is what the assertions on the way down are for.
 */
function definitions(tab: HeadingAdjusterSettingTab) {
  return tab.getSettingDefinitions().flatMap((group) => {
    assert.ok('type' in group && group.type === 'group', 'the tab returns groups');
    assert.ok('items' in group && group.items, 'a group carries its settings');
    return group.items;
  });
}

/** The control on each definition, asserted down to the kinds this plugin binds. */
function controls(tab: HeadingAdjusterSettingTab) {
  return definitions(tab).map((definition) => {
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

    for (const definition of definitions(tab)) {
      assert.ok('name' in definition && definition.name, 'a definition needs a name');
      assert.ok('desc' in definition && definition.desc, 'a definition needs a description');
    }
  });

  /**
   * A setting whose effect a user cannot place is a setting they will not
   * touch, so each group is named for the commands it governs.
   */
  test('the settings arrive grouped, and every group is named', async () => {
    const { tab } = tabFor(await defaults());
    const groups = tab.getSettingDefinitions();

    assert.deepEqual(
      groups.map((group) => ('heading' in group ? group.heading : undefined)),
      ['Default shift', 'Custom range', 'Placing a heading on the current line', 'Bullet conversion']
    );
  });

  test('no group is left empty', async () => {
    const { tab } = tabFor(await defaults());

    for (const group of tab.getSettingDefinitions()) {
      assert.ok(
        'items' in group && group.items && group.items.length > 0,
        'an empty group is a heading with nothing under it'
      );
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

describe('the toggle target dropdown', () => {
  test('offers exactly the three places a toggle can be pointed', async () => {
    const { tab } = tabFor(await defaults());
    const control = controls(tab).find((each) => each.key === 'toggleTarget');

    assert.ok(control && control.type === 'dropdown');
    assert.deepEqual(Object.keys(control.options), ['root', 'sibling', 'child']);
  });

  test('a chosen target is stored and persisted', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('toggleTarget', 'child');

    assert.equal(settings.toggleTarget, 'child');
    assert.equal(saves.length, 1);
  });

  test('a string that is not one of the three is refused rather than stored', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('toggleTarget', 'grandchild');

    assert.equal(settings.toggleTarget, 'sibling');
    assert.deepEqual(saves, []);
  });

  test('a value of the wrong type entirely is refused too', async () => {
    const settings = await defaults();
    const { tab } = tabFor(settings);

    await tab.setControlValue('toggleTarget', 3);

    assert.equal(settings.toggleTarget, 'sibling');
  });

  test('every control the tab binds is one of the kinds it knows how to draw', async () => {
    const { tab } = tabFor(await defaults());

    for (const control of controls(tab)) {
      assert.ok(
        CONTROL_TYPES.includes(control.type),
        `${control.key} is a ${control.type}, which display() would draw as a toggle`
      );
    }
  });
});

describe('the custom range boundaries', () => {
  /**
   * The two ends take different options on purpose: nothing above the top or
   * below the bottom is offered, which is what makes a backwards range
   * unconfigurable rather than merely unlikely.
   */
  test('the top offers the start of the note and the cursor, and nothing else', async () => {
    const { tab } = tabFor(await defaults());
    const control = controls(tab).find((each) => each.key === 'customRangeTop');

    assert.ok(control && control.type === 'dropdown');
    assert.deepEqual(Object.keys(control.options), ['note-start', 'cursor']);
  });

  test('the bottom offers the cursor and the end of the note, and nothing else', async () => {
    const { tab } = tabFor(await defaults());
    const control = controls(tab).find((each) => each.key === 'customRangeBottom');

    assert.ok(control && control.type === 'dropdown');
    assert.deepEqual(Object.keys(control.options), ['cursor', 'note-end']);
  });

  test('a fresh install has the whole note', async () => {
    const settings = await defaults();

    assert.equal(settings.customRangeTop, 'note-start');
    assert.equal(settings.customRangeBottom, 'note-end');
  });

  test('a chosen boundary is stored and persisted', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('customRangeTop', 'cursor');

    assert.equal(settings.customRangeTop, 'cursor');
    assert.equal(saves.length, 1);
  });

  /**
   * Each dropdown is validated against its own options rather than against all
   * of them, so the bottom's values are not writable to the top.
   */
  test('a boundary the other end offers is refused, not stored', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('customRangeTop', 'note-end');

    assert.equal(settings.customRangeTop, 'note-start');
    assert.deepEqual(saves, [], 'nothing was written, so nothing is persisted');
  });

  test('a string that is no boundary at all is refused too', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('customRangeBottom', 'halfway');

    assert.equal(settings.customRangeBottom, 'note-end');
    assert.deepEqual(saves, []);
  });

  test('a value of the wrong type entirely is refused as well', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('customRangeTop', 3);

    assert.equal(settings.customRangeTop, 'note-start');
    assert.deepEqual(saves, []);
  });
});

describe('what a removed heading leaves', () => {
  test('offers exactly the three things it can write', async () => {
    const { tab } = tabFor(await defaults());
    const control = controls(tab).find((each) => each.key === 'removeHeadingAs');

    assert.ok(control && control.type === 'dropdown');
    assert.deepEqual(Object.keys(control.options), ['plain', 'bullet', 'bullet-with-section']);
  });

  test('a fresh install writes plain text, which is what it always wrote', async () => {
    assert.equal((await defaults()).removeHeadingAs, 'plain');
  });

  test('a chosen option is stored and persisted', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('removeHeadingAs', 'bullet-with-section');

    assert.equal(settings.removeHeadingAs, 'bullet-with-section');
    assert.equal(saves.length, 1);
  });

  test('a string it does not offer is refused rather than stored', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('removeHeadingAs', 'a numbered item');

    assert.equal(settings.removeHeadingAs, 'plain');
    assert.deepEqual(saves, [], 'nothing was written, so nothing is persisted');
  });
});

describe('bringing nested list items along', () => {
  /**
   * On rather than off: a heading that strands its children at an indent
   * nothing encloses is broken markup, not a preference.
   */
  test('a fresh install has it switched on', async () => {
    assert.equal((await defaults()).liftNestedOnHeading, true);
  });

  test('switching it off is stored and persisted', async () => {
    const settings = await defaults();
    const { tab, saves } = tabFor(settings);

    await tab.setControlValue('liftNestedOnHeading', false);

    assert.equal(settings.liftNestedOnHeading, false);
    assert.equal(saves.length, 1);
  });
});
