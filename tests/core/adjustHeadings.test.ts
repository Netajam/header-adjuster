import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { adjustHeadings, placeLineHeading } from '../../src/core/adjustHeadings';
import { applyHeadingEdits } from '../../src/core/headingEdits';
import { adjust, doc } from '../support/document';

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

describe('reading one line as level zero', () => {
  test('writes a heading onto the plain line the request points at', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        some prose
        ## B
      `,
      { operation: 'increase', levels: 1, fromLine: 1, toLine: 1, levelZero: true }
    );

    assert.equal(
      text,
      doc`
        # A
        # some prose
        ## B
      `
    );
    assert.equal(changedCount, 1);
  });

  test('takes a heading back off, leaving the rest of the outline standing', () => {
    const { text, changedCount } = adjust(
      doc`
        # A
        # B
        ### C
      `,
      { operation: 'decrease', levels: 1, fromLine: 1, toLine: 1, levelZero: true }
    );

    assert.equal(
      text,
      doc`
        # A
        B
        ### C
      `
    );
    assert.equal(changedCount, 1);
  });

  test('moves the one heading without dragging its children along', () => {
    const { text, changedCount } = adjust(
      doc`
        ## A
        ### B
        #### C
      `,
      { operation: 'increase', levels: 1, fromLine: 0, toLine: 0, levelZero: true }
    );

    assert.equal(
      text,
      doc`
        ### A
        ### B
        #### C
      `
    );
    assert.equal(changedCount, 1);
  });

  test('reads fromLine alone, whatever toLine says', () => {
    const { text } = adjust(
      doc`
        first
        second
        third
      `,
      { operation: 'increase', levels: 1, fromLine: 0, toLine: 2, levelZero: true }
    );

    assert.equal(
      text,
      doc`
        # first
        second
        third
      `
    );
  });

  test('leaves a line inside a code fence as the text it is', () => {
    const before = '```\nnot a heading\n```';
    const { text, changedCount } = adjust(before, {
      operation: 'increase',
      levels: 1,
      fromLine: 1,
      toLine: 1,
      levelZero: true,
    });

    assert.equal(text, before);
    assert.equal(changedCount, 0);
  });

  test('a line that cannot move is nothing to do, not a missing heading', () => {
    const outcome = adjustHeadings(['some prose'], {
      operation: 'decrease',
      levels: 1,
      fromLine: 0,
      toLine: 0,
      levelZero: true,
    });

    assert.equal(outcome.status, 'adjusted');
    assert.deepEqual(outcome.status === 'adjusted' && outcome.edits, []);
    assert.equal(outcome.status === 'adjusted' && outcome.changedCount, 0);
  });

  test('never converts, however the conversions are set', () => {
    const { text, truncatedSections } = adjust(
      doc`
        ###### A
        body
      `,
      {
        operation: 'increase',
        levels: 1,
        fromLine: 0,
        toLine: 0,
        levelZero: true,
        conversion: { headingsToBullets: true, bulletsToHeadings: true },
      }
    );

    assert.equal(
      text,
      doc`
        ###### A
        body
      `
    );
    assert.equal(truncatedSections, 0);
  });
});

describe('placing the current line against the section it sits in', () => {
  /** The document as the placement would leave it, with what it changed. */
  function place(
    markdown: string,
    lineNumber: number,
    placement: 'plain' | 'sibling' | 'child'
  ): { text: string; changedCount: number } {
    const lines = markdown.split('\n');
    const outcome = placeLineHeading(lines, lineNumber, placement);

    assert.equal(outcome.status, 'adjusted', 'a placement never rejects');
    if (outcome.status !== 'adjusted') {
      throw new Error('unreachable');
    }

    return {
      text: applyHeadingEdits(lines, outcome.edits).join('\n'),
      changedCount: outcome.changedCount,
    };
  }

  test('a sibling takes the level of the heading above it', () => {
    const { text, changedCount } = place(
      doc`
        # A
        ## B
        some prose
      `,
      2,
      'sibling'
    );

    assert.equal(
      text,
      doc`
        # A
        ## B
        ## some prose
      `
    );
    assert.equal(changedCount, 1);
  });

  test('a child sits one level under the heading above it', () => {
    const { text } = place(
      doc`
        # A
        ## B
        some prose
      `,
      2,
      'child'
    );

    assert.equal(
      text,
      doc`
        # A
        ## B
        ### some prose
      `
    );
  });

  test('the heading above is the nearest one, not the shallowest', () => {
    const { text } = place(
      doc`
        #### deep
        ## shallow
        some prose
      `,
      2,
      'child'
    );

    assert.equal(
      text,
      doc`
        #### deep
        ## shallow
        ### some prose
      `
    );
  });

  test('plain takes the heading away, whatever level it was at', () => {
    const { text, changedCount } = place(
      doc`
        # A
        ##### B
        body
      `,
      1,
      'plain'
    );

    assert.equal(
      text,
      doc`
        # A
        B
        body
      `
    );
    assert.equal(changedCount, 1);
  });

  test('re-levels a line that is already a heading', () => {
    const { text } = place(
      doc`
        ## A
        ##### B
      `,
      1,
      'sibling'
    );

    assert.equal(
      text,
      doc`
        ## A
        ## B
      `
    );
  });

  test('with no heading above, a placement lands on H1', () => {
    assert.equal(place('some prose', 0, 'sibling').text, '# some prose');
    assert.equal(place('some prose', 0, 'child').text, '# some prose');
  });

  test('stops at H6 rather than writing a seventh hash', () => {
    const { text, changedCount } = place(
      doc`
        ###### A
        some prose
      `,
      1,
      'child'
    );

    assert.equal(
      text,
      doc`
        ###### A
        ###### some prose
      `
    );
    assert.equal(changedCount, 1);
  });

  test('a heading inside a code fence is not the heading above', () => {
    const { text } = place('```\n### fake\n```\nsome prose', 3, 'child');

    assert.equal(text, '```\n### fake\n```\n# some prose');
  });

  test('a line inside a code fence is left as the code it is', () => {
    const { text, changedCount } = place('## A\n```\ncode\n```', 2, 'child');

    assert.equal(text, '## A\n```\ncode\n```');
    assert.equal(changedCount, 0);
  });

  test('a bullet placed as a heading loses its bullet', () => {
    const { text, changedCount } = place(
      doc`
        ## Setup
        - item
      `,
      1,
      'child'
    );

    assert.equal(
      text,
      doc`
        ## Setup
        ### item
      `
    );
    assert.equal(changedCount, 1);
  });

  test('an indented bullet loses its indentation with it', () => {
    const { text } = place('## Setup\n  - item', 1, 'sibling');

    assert.equal(text, '## Setup\n## item');
  });

  test('removing a header does not touch a bullet — it is already plain', () => {
    const { changedCount } = place('## Setup\n- item', 1, 'plain');

    assert.equal(changedCount, 0);
  });

  test('a line already where the placement wants it is nothing to do', () => {
    const { changedCount } = place('## A\n### B', 1, 'child');

    assert.equal(changedCount, 0);
  });
});
