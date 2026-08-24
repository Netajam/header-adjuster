import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseHeadings } from '../../src/core/headingTree';
import { assignAdjustedLevels } from '../../src/core/levelAdjustment';
import type { AdjustmentOperation } from '../../src/adjustmentOperation';

function levelsAfter(
  lines: string[],
  operation: AdjustmentOperation,
  levels: number
): number[] {
  const headings = parseHeadings(lines);
  assignAdjustedLevels(headings, operation, levels);
  return headings.map((heading) => heading.level);
}

describe('assignAdjustedLevels', () => {
  test('leaves originalLevel as written, so edits can be diffed against it', () => {
    const headings = parseHeadings(['# A']);
    assignAdjustedLevels(headings, 'increase', 2);

    assert.equal(headings[0].originalLevel, 1);
    assert.equal(headings[0].level, 3);
  });

  test('measures each increase against children that have already moved', () => {
    // C is pushed to H6 first; B then stops at H5 to stay above it, and A at H4.
    assert.deepEqual(levelsAfter(['#### A', '##### B', '###### C'], 'increase', 3), [
      4, 5, 6,
    ]);
  });

  test('measures each decrease against parents that have already moved', () => {
    // A stops at H1; B and C are then held one level below their parent.
    assert.deepEqual(levelsAfter(['## A', '### B', '#### C'], 'decrease', 5), [1, 2, 3]);
  });

  test('siblings move independently of each other', () => {
    assert.deepEqual(levelsAfter(['## A', '### B', '### C'], 'increase', 1), [3, 4, 4]);
  });

  test('a shift larger than the scale saturates instead of overflowing', () => {
    assert.deepEqual(levelsAfter(['# A'], 'increase', 100), [6]);
    assert.deepEqual(levelsAfter(['###### A'], 'decrease', 100), [1]);
  });
});
