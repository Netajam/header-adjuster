import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { listMarkerWidth } from '../../../src/core/line/marker';

/**
 * What counts as the list marker a line opens with — the thing a heading
 * written onto that line has to replace rather than sit in front of.
 */

describe('the width of a list marker', () => {
  test('covers the marker and the whitespace closing it', () => {
    assert.equal(listMarkerWidth('- item'), 2);
    assert.equal(listMarkerWidth('*  item'), 3);
    assert.equal(listMarkerWidth('+\titem'), 2);
  });

  test('covers the indentation too — a heading only counts at column zero', () => {
    assert.equal(listMarkerWidth('  - item'), 4);
    assert.equal(listMarkerWidth('\t\t- item'), 4);
  });

  test('is zero for a line that opens with nothing', () => {
    assert.equal(listMarkerWidth('Some prose'), 0);
    assert.equal(listMarkerWidth('  Some prose'), 0);
    assert.equal(listMarkerWidth(''), 0);
  });

  test('is zero for an ordered item, which is not a bullet', () => {
    assert.equal(listMarkerWidth('1. item'), 0);
    assert.equal(listMarkerWidth('1) item'), 0);
  });

  test('leaves a thematic break alone — no whitespace closes its marker', () => {
    assert.equal(listMarkerWidth('---'), 0);
    assert.equal(listMarkerWidth('***'), 0);
    assert.equal(listMarkerWidth('-'), 0);
  });

  test('takes the marker of a task item, not its checkbox', () => {
    assert.equal(listMarkerWidth('- [ ] item'), 2);
  });
});
