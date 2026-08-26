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
    assert.equal(placedLevel('plain', 3), 0);
    assert.equal(placedLevel('plain', 0), 0);
  });

  test('a sibling sits at the enclosing heading level', () => {
    assert.equal(placedLevel('sibling', 3), 3);
  });

  test('a child sits one level deeper', () => {
    assert.equal(placedLevel('child', 3), 4);
  });

  test('with nothing above, a sibling of the note itself is an H1', () => {
    assert.equal(placedLevel('sibling', 0), 1);
    assert.equal(placedLevel('child', 0), 1);
  });

  test('asks past the Markdown limit rather than clamping — the writer does that', () => {
    assert.equal(placedLevel('child', 6), 7);
  });
});
