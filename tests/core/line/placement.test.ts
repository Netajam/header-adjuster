import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { enclosingLevel, placedLevel } from '../../../src/core/line/placement';

/**
 * Which level a placed heading takes. Nothing here reads a line: a placement is
 * worked out from the outline above it and from nothing else, which is the
 * whole reason it is a different question from a shift.
 */

describe('the enclosing level', () => {
  test('is the level of the last heading above the line', () => {
    assert.equal(enclosingLevel([{ level: 1 }, { level: 3 }]), 3);
  });

  test('is the nearest one, not the shallowest', () => {
    assert.equal(enclosingLevel([{ level: 4 }, { level: 2 }]), 2);
  });

  test('is zero when nothing is above the line', () => {
    assert.equal(enclosingLevel([]), 0);
  });
});

describe('the level a placement asks for', () => {
  test('plain is level zero — no heading at all', () => {
    assert.equal(placedLevel('plain', 3, 0, 'sibling'), 0);
    assert.equal(placedLevel('plain', 0, 0, 'sibling'), 0);
  });

  test('a sibling sits at the enclosing heading level', () => {
    assert.equal(placedLevel('sibling', 3, 0, 'sibling'), 3);
  });

  test('a child sits one level deeper', () => {
    assert.equal(placedLevel('child', 3, 0, 'sibling'), 4);
  });

  test('with nothing above, a sibling of the note itself is an H1', () => {
    assert.equal(placedLevel('sibling', 0, 0, 'sibling'), 1);
    assert.equal(placedLevel('child', 0, 0, 'sibling'), 1);
  });

  test('asks past the Markdown limit rather than clamping — the writer does that', () => {
    assert.equal(placedLevel('child', 6, 0, 'sibling'), 7);
  });

  test('the three that name a level do not read the one the line is at', () => {
    for (const level of [0, 1, 3, 6]) {
      assert.equal(placedLevel('plain', 2, level, 'sibling'), 0);
      assert.equal(placedLevel('sibling', 2, level, 'sibling'), 2);
      assert.equal(placedLevel('child', 2, level, 'sibling'), 3);
    }
  });
});

describe('the level a root placement asks for', () => {
  test('is the top of the note, whatever sits above the line', () => {
    assert.equal(placedLevel('root', 0, 0, 'sibling'), 1);
    assert.equal(placedLevel('root', 4, 3, 'sibling'), 1);
  });
});

describe('where a toggle is pointed', () => {
  test('follows its target rather than assuming a sibling', () => {
    assert.equal(placedLevel('toggle', 2, 0, 'root'), 1);
    assert.equal(placedLevel('toggle', 2, 0, 'sibling'), 2);
    assert.equal(placedLevel('toggle', 2, 0, 'child'), 3);
  });

  test('comes off when the line is at whichever level it was pointed at', () => {
    assert.equal(placedLevel('toggle', 2, 1, 'root'), 0);
    assert.equal(placedLevel('toggle', 2, 2, 'sibling'), 0);
    assert.equal(placedLevel('toggle', 2, 3, 'child'), 0);
  });

  test('a line at the wrong one of the three is moved, not removed', () => {
    assert.equal(placedLevel('toggle', 2, 2, 'child'), 3);
    assert.equal(placedLevel('toggle', 2, 3, 'sibling'), 2);
  });

  test('the target is ignored by every placement that is not a toggle', () => {
    for (const target of ['root', 'sibling', 'child'] as const) {
      assert.equal(placedLevel('sibling', 4, 0, target), 4);
      assert.equal(placedLevel('child', 4, 0, target), 5);
      assert.equal(placedLevel('plain', 4, 0, target), 0);
    }
  });
});

describe('the level a toggle asks for', () => {
  test('aims at the sibling level from anywhere else', () => {
    assert.equal(placedLevel('toggle', 2, 0, 'sibling'), 2);
    assert.equal(placedLevel('toggle', 2, 1, 'sibling'), 2);
    assert.equal(placedLevel('toggle', 2, 5, 'sibling'), 2);
  });

  test('comes off once the line is already sitting there', () => {
    assert.equal(placedLevel('toggle', 2, 2, 'sibling'), 0);
  });

  test('with nothing above, it is an H1 that toggles', () => {
    assert.equal(placedLevel('toggle', 0, 0, 'sibling'), 1);
    assert.equal(placedLevel('toggle', 0, 1, 'sibling'), 0);
  });

  test('two presses reach plain text from any level', () => {
    for (const level of [0, 1, 3, 6]) {
      const first = placedLevel('toggle', 3, level, 'sibling');
      assert.equal(placedLevel('toggle', 3, first, 'sibling'), first === 0 ? 3 : 0);
    }
  });
});
