import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { adjustHeadings } from '../../src/core/adjustHeadings';
import { adjust, doc } from '../support/document';

/** Only the reverse conversion, which is the one a decrease can trigger. */
const TO_HEADINGS = { headingsToBullets: false, bulletsToHeadings: true };
const NEITHER = { headingsToBullets: false, bulletsToHeadings: false };
/** Both, for the round trips: a document has to survive going out and back. */
const BOTH = { headingsToBullets: true, bulletsToHeadings: true };

describe('with the conversion switched off', () => {
  test('a decrease over nothing but list items finds no headings', () => {
    const outcome = adjustHeadings(['- milk', '- eggs'], {
      operation: 'decrease',
      levels: 1,
      conversion: NEITHER,
    });

    assert.equal(outcome.status, 'rejected');
    assert.equal(outcome.status === 'rejected' && outcome.reason, 'no-headings');
  });

  test('list items alongside a heading are left alone', () => {
    const { text } = adjust(
      doc`
        ### A
        - milk
      `,
      { operation: 'decrease', levels: 1, conversion: NEITHER }
    );

    assert.equal(
      text,
      doc`
        ## A
        - milk
      `
    );
  });
});

describe('a list item becomes the heading it came from', () => {
  test('a top-level item decreased by one lands at the ceiling', () => {
    const { text, changedCount } = adjust('- A', {
      operation: 'decrease',
      levels: 1,
      conversion: TO_HEADINGS,
    });

    assert.equal(text, '###### A');
    assert.equal(changedCount, 1);
  });

  test('a nested pair decreased by two lands one level apart', () => {
    const { text } = adjust(
      doc`
        - A
          - B
      `,
      { operation: 'decrease', levels: 2, conversion: TO_HEADINGS }
    );

    assert.equal(
      text,
      doc`
        ##### A
        ###### B
      `
    );
  });

  test('the content under an item comes back out with it', () => {
    const { text } = adjust(
      doc`
        - A
          body
      `,
      { operation: 'decrease', levels: 1, conversion: TO_HEADINGS }
    );

    assert.equal(
      text,
      doc`
        ###### A
        body
      `
    );
  });

  test('an item with nothing under it still converts', () => {
    const { text } = adjust(
      doc`
        - A
        - B
      `,
      { operation: 'decrease', levels: 1, conversion: TO_HEADINGS }
    );

    assert.equal(
      text,
      doc`
        ###### A
        ###### B
      `
    );
  });

  test('every unordered marker is treated the same', () => {
    const request = { operation: 'decrease' as const, levels: 1, conversion: TO_HEADINGS };

    assert.equal(adjust('* A', request).text, '###### A');
    assert.equal(adjust('+ A', request).text, '###### A');
  });

  test('an item too deep to lift stays an item and moves left', () => {
    const { text } = adjust(
      doc`
        - A
          - B
            - C
      `,
      { operation: 'decrease', levels: 1, conversion: TO_HEADINGS }
    );

    assert.equal(
      text,
      doc`
        ###### A
        - B
          - C
      `
    );
  });

  test('an ordered list is not touched, having no level to come back to', () => {
    const { text } = adjust(
      doc`
        ### A
        1. one
      `,
      { operation: 'decrease', levels: 1, conversion: TO_HEADINGS }
    );

    assert.equal(
      text,
      doc`
        ## A
        1. one
      `
    );
  });

  test('blank lines stay blank', () => {
    const { text } = adjust('- A\n  first\n\n  second', {
      operation: 'decrease',
      levels: 1,
      conversion: TO_HEADINGS,
    });

    assert.equal(text, '###### A\nfirst\n\nsecond');
  });

  test('text that never reached the item is left where it is', () => {
    const { text } = adjust('- A\nloose', {
      operation: 'decrease',
      levels: 1,
      conversion: TO_HEADINGS,
    });

    assert.equal(text, '###### A\nloose');
  });

  test('items outside the range are untouched', () => {
    const { text } = adjust('- A\n- B', {
      operation: 'decrease',
      levels: 1,
      conversion: TO_HEADINGS,
      fromLine: 1,
    });

    assert.equal(text, '- A\n###### B');
  });

  test('a list inside a fence is code, not markup', () => {
    const before = '```yaml\n- alpha\n- beta\n```';
    const outcome = adjustHeadings(before.split('\n'), {
      operation: 'decrease',
      levels: 1,
      conversion: TO_HEADINGS,
    });

    assert.equal(outcome.status, 'rejected');
  });
});

describe('the bluntness ADR-0001 accepts', () => {
  test('a hand-written list in range is converted like any other', () => {
    const { text } = adjust(
      doc`
        - milk
        - eggs
      `,
      { operation: 'decrease', levels: 1, conversion: TO_HEADINGS }
    );

    assert.equal(
      text,
      doc`
        ###### milk
        ###### eggs
      `
    );
  });
});

describe('a document survives the round trip', () => {
  /** Increases then decreases by the same distance, with both conversions on. */
  function roundTrip(markdown: string, levels: number): { out: string; back: string } {
    const out = adjust(markdown, { operation: 'increase', levels, conversion: BOTH }).text;
    return {
      out,
      back: adjust(out, { operation: 'decrease', levels, conversion: BOTH }).text,
    };
  }

  test('a heading with a body', () => {
    const before = doc`
      ###### A
      body
    `;
    const { out, back } = roundTrip(before, 1);

    assert.equal(out, doc`
      - A
        body
    `);
    assert.equal(back, before);
  });

  test('nested headings that both overflow', () => {
    const before = doc`
      ##### A
      a body
      ###### B
      b body
    `;
    const { out, back } = roundTrip(before, 2);

    assert.equal(out, doc`
      - A
        a body
        - B
          b body
    `);
    assert.equal(back, before);
  });

  test('a body that already contained a nested list', () => {
    const before = doc`
      ###### A
      - a
        - b
    `;
    const { out, back } = roundTrip(before, 1);

    assert.equal(out, doc`
      - A
        - a
          - b
    `);
    assert.equal(back, before);
  });

  test('prose and a nested list under one heading', () => {
    const before = doc`
      ###### A
      text under A
      - a
        text under a
    `;

    assert.equal(roundTrip(before, 1).back, before);
  });

  test('a heading with no body at all', () => {
    const before = doc`
      ###### A
      ###### B
    `;
    const { out, back } = roundTrip(before, 1);

    assert.equal(out, doc`
      - A
      - B
    `);
    assert.equal(back, before);
  });
});
