import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { adjust, doc } from '../../support/document';

/** Conversions on, with headings capped well above Markdown's own limit. */
const CAPPED_AT_FOUR = {
  headingsToBullets: true,
  bulletsToHeadings: true,
  deepestHeadingLevel: 4,
};

/** The same cap, with nothing switched on to act on it. */
const CAPPED_BUT_OFF = {
  headingsToBullets: false,
  bulletsToHeadings: false,
  deepestHeadingLevel: 4,
};

describe('the ceiling defaults to Markdown\'s limit', () => {
  test('omitting it leaves H6 as the level headings stop at', () => {
    const { text } = adjust(
      doc`
        ##### A
        ###### B
      `,
      {
        operation: 'increase',
        levels: 1,
        conversion: { headingsToBullets: true, bulletsToHeadings: false },
      }
    );

    assert.equal(
      text,
      doc`
        ###### A
        - B
      `
    );
  });

  test('setting it to six is the same as not setting it', () => {
    const { text } = adjust('###### A', {
      operation: 'increase',
      levels: 1,
      conversion: {
        headingsToBullets: true,
        bulletsToHeadings: false,
        deepestHeadingLevel: 6,
      },
    });

    assert.equal(text, '- A');
  });
});

describe('a ceiling above Markdown\'s limit', () => {
  test('a heading landing on the ceiling is still a heading', () => {
    const { text } = adjust('### A', {
      operation: 'increase',
      levels: 1,
      conversion: CAPPED_AT_FOUR,
    });

    assert.equal(text, '#### A');
  });

  test('a heading landing past the ceiling converts', () => {
    const { text } = adjust('#### A', {
      operation: 'increase',
      levels: 1,
      conversion: CAPPED_AT_FOUR,
    });

    assert.equal(text, '- A');
  });

  test('headings already deeper than the cap keep their relative depth', () => {
    const { text } = adjust(
      doc`
        #### A
        ##### B
        ###### C
      `,
      { operation: 'increase', levels: 1, conversion: CAPPED_AT_FOUR }
    );

    assert.equal(
      text,
      doc`
        - A
          - B
            - C
      `
    );
  });

  test('a converted section still takes its body along', () => {
    const { text } = adjust(
      doc`
        #### A
        body
      `,
      { operation: 'increase', levels: 1, conversion: CAPPED_AT_FOUR }
    );

    assert.equal(
      text,
      doc`
        - A
          body
      `
    );
  });

  test('a bullet converts back to the ceiling, not to H6', () => {
    const { text } = adjust('- A', {
      operation: 'decrease',
      levels: 1,
      conversion: CAPPED_AT_FOUR,
    });

    assert.equal(text, '#### A');
  });

  test('a document survives the round trip at the configured ceiling', () => {
    const before = doc`
      #### A
      body
    `;
    const out = adjust(before, {
      operation: 'increase',
      levels: 1,
      conversion: CAPPED_AT_FOUR,
    }).text;

    assert.equal(
      out,
      doc`
        - A
          body
      `
    );
    assert.equal(
      adjust(out, { operation: 'decrease', levels: 1, conversion: CAPPED_AT_FOUR }).text,
      before
    );
  });

  test('a ceiling of one converts everything an increase touches', () => {
    const { text } = adjust('# A', {
      operation: 'increase',
      levels: 1,
      conversion: { ...CAPPED_AT_FOUR, deepestHeadingLevel: 1 },
    });

    assert.equal(text, '- A');
  });
});

describe('the ceiling is inert while nothing converts', () => {
  /**
   * The cap must not start clamping plain increases: doing so would let an
   * increase make a heading shallower, which is not what a cap means.
   */
  test('an increase past the cap still runs to Markdown\'s limit', () => {
    const { text } = adjust(
      doc`
        #### A
        ##### B
      `,
      { operation: 'increase', levels: 1, conversion: CAPPED_BUT_OFF }
    );

    assert.equal(
      text,
      doc`
        ##### A
        ###### B
      `
    );
  });

  test('a heading already deeper than the cap is never pulled up', () => {
    const { text, changedCount } = adjust('###### A', {
      operation: 'increase',
      levels: 1,
      conversion: CAPPED_BUT_OFF,
    });

    assert.equal(text, '###### A');
    assert.equal(changedCount, 0);
  });

  test('a decrease is unaffected by the cap', () => {
    const { text } = adjust('###### A', {
      operation: 'decrease',
      levels: 1,
      conversion: CAPPED_BUT_OFF,
    });

    assert.equal(text, '##### A');
  });

  test('the cap alone does not convert bullets on decrease', () => {
    const { text } = adjust(
      doc`
        ### A
        - milk
      `,
      { operation: 'decrease', levels: 1, conversion: CAPPED_BUT_OFF }
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
