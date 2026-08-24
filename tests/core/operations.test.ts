import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  MAX_HEADING_LEVEL,
  MIN_HEADING_LEVEL,
  clampHeadingLevel,
  headingPrefix,
} from '../../src/core/operations';

describe('heading levels', () => {
  test('run from H1 to H6, the levels Markdown defines', () => {
    assert.equal(MIN_HEADING_LEVEL, 1);
    assert.equal(MAX_HEADING_LEVEL, 6);
  });

  test('clamp to that range from either side', () => {
    assert.equal(clampHeadingLevel(0), 1);
    assert.equal(clampHeadingLevel(-3), 1);
    assert.equal(clampHeadingLevel(3), 3);
    assert.equal(clampHeadingLevel(7), 6);
  });

  test('are written as that many hashes', () => {
    assert.equal(headingPrefix(1), '#');
    assert.equal(headingPrefix(6), '######');
  });
});
