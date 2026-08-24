import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  DEFAULT_SETTINGS,
  defaultLevelFor,
} from '../../src/settings/settingsDefaults';

describe('defaultLevelFor', () => {
  test('picks the shift configured for the direction being asked about', () => {
    const settings = { increaseLevel: 2, decreaseLevel: 3 };

    assert.equal(defaultLevelFor(settings, 'increase'), 2);
    assert.equal(defaultLevelFor(settings, 'decrease'), 3);
  });

  test('a fresh install shifts by one in both directions', () => {
    assert.equal(defaultLevelFor(DEFAULT_SETTINGS, 'increase'), 1);
    assert.equal(defaultLevelFor(DEFAULT_SETTINGS, 'decrease'), 1);
  });
});
