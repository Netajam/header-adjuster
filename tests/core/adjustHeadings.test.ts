import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  adjustHeadings,
  applyHeadingEdits,
  collectHeadingEdits,
} from '../../src/core/adjustHeadings';
import { Heading } from '../../src/core/heading';
import { adjust, doc } from '../support/document';

/** A heading on `lineNumber`, written at `originalLevel` and moved to `level`. */
function moved(originalLevel: number, lineNumber: number, level: number): Heading {
  const heading = new Heading(originalLevel, lineNumber, 'text');
  heading.level = level;
  return heading;
}

describe('increasing heading levels', () => {
  test('pushes every heading one level deeper', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        ## B
        ### C
      `,
      { operation: 'increase', levels: 1 }
    );

    assert.equal(
      text,
      doc`
        ## A
        ### B
        #### C
      `
    );
    assert.equal(changedCount, 3);
  });

  test('stops at H6 rather than writing a seventh hash', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        ###### B
      `,
      { operation: 'increase', levels: 1 }
    );

    assert.equal(
      text,
      doc`
        ## A
        ###### B
      `
    );
    assert.equal(changedCount, 1);
  });

  test('holds a heading above its children instead of flattening the outline', () => {
    const { text, changedCount } = adjust(
      doc`
        ##### A
        ###### B
      `,
      { operation: 'increase', levels: 2 }
    );

    assert.equal(
      text,
      doc`
        ##### A
        ###### B
      `
    );
    assert.equal(changedCount, 0);
  });
});

describe('decreasing heading levels', () => {
  test('pulls every heading one level shallower', () => {
    const { text, changedCount } = adjust(
      doc`
        ## A
        ### B
      `,
      { operation: 'decrease', levels: 1 }
    );

    assert.equal(
      text,
      doc`
        # A
        ## B
      `
    );
    assert.equal(changedCount, 2);
  });

  test('stops at H1 and keeps children below their parent', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        ## B
      `,
      { operation: 'decrease', levels: 1 }
    );

    assert.equal(
      text,
      doc`
        # A
        ## B
      `
    );
    assert.equal(changedCount, 0);
  });

  test('collapses a deep outline by more than one level at a time', () => {
    const { text } = adjust(
      doc`
        ### A
        #### B
        ##### C
      `,
      { operation: 'decrease', levels: 2 }
    );

    assert.equal(
      text,
      doc`
        # A
        ## B
        ### C
      `
    );
  });
});

describe('line ranges', () => {
  test('leaves headings outside the range alone', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        # B
        # C
      `,
      { operation: 'increase', levels: 1, fromLine: 1, toLine: 1 }
    );

    assert.equal(
      text,
      doc`
        # A
        ## B
        # C
      `
    );
    assert.equal(changedCount, 1);
  });

  test('a heading outside the range is not treated as a parent', () => {
    const scoped = adjust(
      doc`
        ## A
        ### B
      `,
      { operation: 'decrease', levels: 2, fromLine: 1, toLine: 1 }
    );

    const wholeDocument = adjust(
      doc`
        ## A
        ### B
      `,
      { operation: 'decrease', levels: 2 }
    );

    // Scoped, B has no parent in range and is free to reach H1.
    assert.equal(scoped.text, doc`
      ## A
      # B
    `);
    // Unscoped, A is its parent and holds it one level below.
    assert.equal(wholeDocument.text, doc`
      # A
      ## B
    `);
  });

  test('a range wider than the document is clamped, not an error', () => {
    const { text } = adjust('# A', {
      operation: 'increase',
      levels: 1,
      fromLine: -10,
      toLine: 99,
    });

    assert.equal(text, '## A');
  });
});

describe('what counts as a heading', () => {
  test('leaves lines that only look like headings untouched', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        Some prose mentioning # hash
        #NoSpace
        ####### seven hashes
        - a bullet
      `,
      { operation: 'increase', levels: 1 }
    );

    assert.equal(
      text,
      doc`
        ## A
        Some prose mentioning # hash
        #NoSpace
        ####### seven hashes
        - a bullet
      `
    );
    assert.equal(changedCount, 1);
  });

  test('rewrites only the hashes, so spacing and text survive verbatim', () => {
    const { text } = adjust('#    Spaced   Title   ', {
      operation: 'increase',
      levels: 1,
    });

    assert.equal(text, '##    Spaced   Title   ');
  });

  test('a tab after the hashes still reads as a heading', () => {
    const { text } = adjust('#\tTabbed', { operation: 'increase', levels: 1 });

    assert.equal(text, '##\tTabbed');
  });
});

describe('requests that cannot mean anything', () => {
  const rejections: Array<[string, Parameters<typeof adjustHeadings>[1], string]> = [
    ['a shift of zero', { operation: 'increase', levels: 0 }, 'zero-levels'],
    ['a negative shift', { operation: 'increase', levels: -1 }, 'negative-levels'],
    [
      'a range that ends before it starts',
      { operation: 'increase', levels: 1, fromLine: 3, toLine: 1 },
      'empty-range',
    ],
  ];

  for (const [name, request, reason] of rejections) {
    test(`${name} is rejected as ${reason}`, () => {
      const outcome = adjustHeadings(['# A'], request);

      assert.equal(outcome.status, 'rejected');
      assert.equal(outcome.status === 'rejected' && outcome.reason, reason);
    });
  }

  test('a document with no headings is rejected as no-headings', () => {
    const outcome = adjustHeadings(['just prose', '- a bullet'], {
      operation: 'increase',
      levels: 1,
    });

    assert.equal(outcome.status, 'rejected');
    assert.equal(outcome.status === 'rejected' && outcome.reason, 'no-headings');
  });

  test('an empty range check runs before the document is read', () => {
    const outcome = adjustHeadings([], { operation: 'increase', levels: 1 });

    // toLine defaults to -1 for an empty document, which is before line 0.
    assert.equal(outcome.status, 'rejected');
    assert.equal(outcome.status === 'rejected' && outcome.reason, 'empty-range');
  });
});

describe('the edits an adjustment produces', () => {
  test('are bottom-up, so applying them in order never shifts a later line', () => {
    const outcome = adjustHeadings(['# A', '# B', '# C'], {
      operation: 'increase',
      levels: 1,
    });

    assert.equal(outcome.status, 'adjusted');
    if (outcome.status !== 'adjusted') return;

    assert.deepEqual(
      outcome.edits.map((edit) => edit.line),
      [2, 1, 0]
    );
  });

  test('cover only the hashes of headings that actually moved', () => {
    const outcome = adjustHeadings(['# A', '###### B'], {
      operation: 'increase',
      levels: 1,
    });

    assert.equal(outcome.status, 'adjusted');
    if (outcome.status !== 'adjusted') return;

    assert.deepEqual(outcome.edits, [
      { line: 0, fromColumn: 0, toColumn: 1, text: '##' },
    ]);
  });
});

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
