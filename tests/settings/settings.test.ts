import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { defaultLevelFor, readSettings } from '../../src/settings/settings';

/** A plugin as far as `readSettings` is concerned: something with stored data. */
function pluginStoring(data: unknown) {
  return { loadData: async () => data } as never;
}

describe('defaultLevelFor', () => {
  test('picks the shift configured for the direction being asked about', () => {
    const settings = {
      increaseLevel: 2,
      decreaseLevel: 3,
      headingsToBullets: false,
      bulletsToHeadings: false,
    };

    assert.equal(defaultLevelFor(settings, 'increase'), 2);
    assert.equal(defaultLevelFor(settings, 'decrease'), 3);
  });
});

describe('readSettings', () => {
  test('a fresh install shifts by one in both directions', async () => {
    assert.deepEqual(await readSettings(pluginStoring(null)), {
      increaseLevel: 1,
      decreaseLevel: 1,
      headingsToBullets: false,
      bulletsToHeadings: false,
    });
  });

  test('a conversion the user switched on survives a reload', async () => {
    const stored = await readSettings(pluginStoring({ bulletsToHeadings: true }));

    assert.equal(stored.bulletsToHeadings, true);
    assert.equal(stored.headingsToBullets, false);
  });

  test('stored values win over the defaults', async () => {
    assert.deepEqual(await readSettings(pluginStoring({ increaseLevel: 4 })), {
      increaseLevel: 4,
      decreaseLevel: 1,
      headingsToBullets: false,
      bulletsToHeadings: false,
    });
  });
});
