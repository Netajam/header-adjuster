import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { adjustHeadings } from '../../../src/core/adjustHeadings';
import { adjust, doc } from '../../support/document';

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

describe('nesting is relative, not a column count', () => {
  /**
   * What makes an item a child is being indented past the item above it, not
   * being indented by any particular amount. Obsidian indents with a tab by
   * default, so reading depth as columns-divided-by-two lifted every child of a
   * tab-indented list into a heading of its own.
   */
  const request = { operation: 'decrease' as const, levels: 1, conversion: TO_HEADINGS };

  test('a tab-nested child stays an item and moves out one level', () => {
    const { text } = adjust('- A\n\t- B\n\t\t- C', request);

    assert.equal(text, '###### A\n- B\n\t- C');
  });

  test('a four-space-nested child moves out a whole level, not two columns', () => {
    const { text } = adjust('- A\n    - B\n        - C', request);

    assert.equal(text, '###### A\n- B\n    - C');
  });

  test('two-space nesting is unchanged by the same rule', () => {
    const { text } = adjust('- A\n  - B\n    - C', request);

    assert.equal(text, '###### A\n- B\n  - C');
  });

  test('the document keeps the indent style it was written in', () => {
    assert.match(adjust('- A\n\t- B\n\t\t- C', request).text, /\n\t- C$/);
    assert.match(adjust('- A\n    - B\n        - C', request).text, /\n {4}- C$/);
  });

  test('an inconsistently indented list still nests by what encloses what', () => {
    const { text } = adjust('- A\n   - B\n      - C', request);

    assert.equal(text, '###### A\n- B\n   - C');
  });

  test('body under a tab-indented item de-indents with it', () => {
    const { text } = adjust('- A\n\tbody', request);

    assert.equal(text, '###### A\nbody');
  });

  test('a decrease of two lifts two levels of a tab-indented list', () => {
    const { text } = adjust('- A\n\t- B\n\t\t- C', {
      operation: 'decrease',
      levels: 2,
      conversion: TO_HEADINGS,
    });

    assert.equal(text, '##### A\n###### B\n- C');
  });
});

describe('an item indented with nothing above it', () => {
  /**
   * The one shape relative nesting cannot read, and the one the forward
   * conversion writes: a heading that overflows the ceiling by more than a
   * level becomes a bullet indented to record how far it went, with no bullet
   * above it to be a child of. Counting enclosing items reads that as a root,
   * so the level the indent was recording is lost and the round trip comes back
   * shallow — a level per level of overflow.
   */
  const CEILING_4 = { headingsToBullets: true, bulletsToHeadings: true, deepestHeadingLevel: 4 };

  function roundTrip(markdown: string, levels: number): { out: string; back: string } {
    const out = adjust(markdown, { operation: 'increase', levels, conversion: CEILING_4 }).text;
    return {
      out,
      back: adjust(out, { operation: 'decrease', levels, conversion: CEILING_4 }).text,
    };
  }

  test('a heading two past the ceiling comes back to the level it left', () => {
    const { out, back } = roundTrip('#### A\nbody', 2);

    assert.equal(out, '  - A\n    body');
    assert.equal(back, '#### A\nbody');
  });

  test('three past the ceiling comes back too', () => {
    const { out, back } = roundTrip('#### A\nbody', 3);

    assert.equal(out, '    - A\n      body');
    assert.equal(back, '#### A\nbody');
  });

  test('one past the ceiling is unaffected — it was never indented', () => {
    const { out, back } = roundTrip('#### A\nbody', 1);

    assert.equal(out, '- A\n  body');
    assert.equal(back, '#### A\nbody');
  });

  /**
   * The bug this fixes, stated as the asymmetry it was: the same bullet at the
   * same indent used to lift differently depending on whether something above
   * it happened to make it read as nested.
   */
  test('an indented item lifts the same whether or not an item precedes it', () => {
    const request = { operation: 'decrease' as const, levels: 2, conversion: CEILING_4 };

    const alone = adjust('  - A', request).text;
    const preceded = adjust('- x\n  - A', request).text;

    assert.equal(alone, '#### A');
    assert.match(preceded, /#### A$/);
  });

  test('a bullet deeper than the decrease can lift walks back a level at a time', () => {
    const request = { operation: 'decrease' as const, levels: 1, conversion: CEILING_4 };

    const first = adjust('    - A', request).text;
    const second = adjust(first, request).text;
    const third = adjust(second, request).text;

    assert.equal(first, '  - A');
    assert.equal(second, '- A');
    assert.equal(third, '#### A');
  });
});

describe('the orphan rule leaves relative nesting alone', () => {
  /**
   * The indent is only ever measured when there is no enclosing item to count,
   * so a list that starts at column zero — which is every list these tests
   * describe — is read exactly as before, whatever it indents by.
   */
  const request = { operation: 'decrease' as const, levels: 1, conversion: TO_HEADINGS };

  test('a tab-nested list is untouched by it', () => {
    assert.equal(adjust('- A\n\t- B\n\t\t- C', request).text, '###### A\n- B\n\t- C');
  });

  test('a four-space-nested list is untouched by it', () => {
    assert.equal(adjust('- A\n    - B\n        - C', request).text, '###### A\n- B\n    - C');
  });

  /**
   * A list whose first item is indented does change: it now moves out a level
   * rather than lifting to a heading, which is what the same item does
   * everywhere else. Indentation means one thing now, not two depending on
   * what precedes it.
   */
  test('a list that starts indented moves out rather than lifting', () => {
    assert.equal(adjust('  - a\n    - b', request).text, '- a\n  - b');
  });
});
