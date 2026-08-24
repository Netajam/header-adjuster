import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import type { EditableHeading } from '../../src/core/headingEdits';
import {
  applyHeadingEdits,
  collectHeadingEdits,
} from '../../src/core/headingEdits';

/**
 * A heading written at `originalLevel` and moved to `level`, as a plain
 * object — this layer asks for a shape, not for the `Heading` class, and the
 * tests hold it to that.
 */
function heading(
  originalLevel: number,
  lineNumber: number,
  level: number
): EditableHeading {
  return {
    lineNumber,
    originalLevel,
    level,
    hasChanged: level !== originalLevel,
  };
}

describe('collectHeadingEdits', () => {
  test('ignores headings that did not move', () => {
    assert.deepEqual(collectHeadingEdits([heading(2, 1, 2)]), []);
  });

  test('replaces exactly the old hashes with the new ones', () => {
    assert.deepEqual(collectHeadingEdits([heading(3, 5, 1)]), [
      { line: 4, fromColumn: 0, toColumn: 3, text: '#' },
    ]);
  });

  test('orders edits from the last line upward', () => {
    const edits = collectHeadingEdits([
      heading(1, 1, 2),
      heading(1, 9, 2),
      heading(1, 4, 2),
    ]);

    assert.deepEqual(
      edits.map((edit) => edit.line),
      [8, 3, 0]
    );
  });
});

describe('applyHeadingEdits', () => {
  test('rewrites the prefix and leaves the rest of the line byte for byte', () => {
    const lines = ['###   Title  ', 'body'];
    const edits = collectHeadingEdits([heading(3, 1, 1)]);

    assert.deepEqual(applyHeadingEdits(lines, edits), ['#   Title  ', 'body']);
  });

  test('does not modify the document it was given', () => {
    const lines = ['# A'];

    applyHeadingEdits(lines, collectHeadingEdits([heading(1, 1, 3)]));

    assert.deepEqual(lines, ['# A']);
  });
});
