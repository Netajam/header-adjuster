import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { Heading } from '../../src/core/heading';
import {
  applyHeadingEdits,
  collectHeadingEdits,
} from '../../src/core/headingEdits';

/** A heading on `lineNumber`, written at `originalLevel` and moved to `level`. */
function moved(originalLevel: number, lineNumber: number, level: number): Heading {
  const heading = new Heading(originalLevel, lineNumber, 'text');
  heading.level = level;
  return heading;
}

describe('collectHeadingEdits', () => {
  test('ignores headings that did not move', () => {
    const unmoved = new Heading(2, 1, 'text');

    assert.deepEqual(collectHeadingEdits([unmoved]), []);
  });

  test('replaces exactly the old hashes with the new ones', () => {
    assert.deepEqual(collectHeadingEdits([moved(3, 5, 1)]), [
      { line: 4, fromColumn: 0, toColumn: 3, text: '#' },
    ]);
  });

  test('orders edits from the last line upward', () => {
    const edits = collectHeadingEdits([moved(1, 1, 2), moved(1, 9, 2), moved(1, 4, 2)]);

    assert.deepEqual(
      edits.map((edit) => edit.line),
      [8, 3, 0]
    );
  });
});

describe('applyHeadingEdits', () => {
  test('rewrites the prefix and leaves the rest of the line byte for byte', () => {
    const lines = ['###   Title  ', 'body'];
    const edits = collectHeadingEdits([moved(3, 1, 1)]);

    assert.deepEqual(applyHeadingEdits(lines, edits), ['#   Title  ', 'body']);
  });

  test('does not modify the document it was given', () => {
    const lines = ['# A'];

    applyHeadingEdits(lines, collectHeadingEdits([moved(1, 1, 3)]));

    assert.deepEqual(lines, ['# A']);
  });
});
