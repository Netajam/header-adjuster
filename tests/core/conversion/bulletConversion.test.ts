import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { adjust, doc } from '../../support/document';

/** Only the forward conversion, which is the one an increase can trigger. */
const TO_BULLETS = { headingsToBullets: true, bulletsToHeadings: false };
const NEITHER = { headingsToBullets: false, bulletsToHeadings: false };

describe('with the conversion switched off', () => {
  test('increasing an H6 still does nothing', () => {
    const { text, changedCount } = adjust('###### A', {
      operation: 'increase',
      levels: 1,
      conversion: NEITHER,
    });

    assert.equal(text, '###### A');
    assert.equal(changedCount, 0);
  });

  test('the body under an H6 is left where it is', () => {
    const before = doc`
      ###### A
      body
    `;

    assert.equal(
      adjust(before, { operation: 'increase', levels: 1, conversion: NEITHER }).text,
      before
    );
  });
});

describe('a heading pushed past the ceiling becomes a bullet', () => {
  test('the heading line keeps its text and loses its hashes', () => {
    const { text, changedCount } = adjust('###### My deepest heading', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
    });

    assert.equal(text, '- My deepest heading');
    assert.equal(changedCount, 1);
  });

  test('the section body moves inside the new item', () => {
    const { text } = adjust(
      doc`
        ###### A
        body text
      `,
      { operation: 'increase', levels: 1, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        - A
          body text
      `
    );
  });

  test('a body that was already indented keeps its relative shape', () => {
    const { text } = adjust(
      doc`
        ###### A
        - a
          - b
      `,
      { operation: 'increase', levels: 1, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        - A
          - a
            - b
      `
    );
  });

  test('blank lines stay blank rather than collecting whitespace', () => {
    const { text } = adjust('###### A\nfirst\n\nsecond', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
    });

    assert.equal(text, '- A\n  first\n\n  second');
  });

  test('a heading with no body becomes a bare bullet', () => {
    const { text } = adjust(
      doc`
        ###### A
        ###### B
      `,
      { operation: 'increase', levels: 1, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        - A
        - B
      `
    );
  });

  test('each heading takes its own body with it', () => {
    const { text, changedCount } = adjust(
      doc`
        ###### A
        a body
        ###### B
        b body
      `,
      { operation: 'increase', levels: 1, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        - A
          a body
        - B
          b body
      `
    );
    assert.equal(changedCount, 2);
  });

  test('a heading that still fits is adjusted normally', () => {
    const { text } = adjust(
      doc`
        ## A
        body
      `,
      { operation: 'increase', levels: 1, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        ### A
        body
      `
    );
  });
});

describe('overflow depth becomes nesting depth', () => {
  test('a parent and child that both overflow stay nested', () => {
    const { text } = adjust(
      doc`
        ##### A
        ###### B
      `,
      { operation: 'increase', levels: 2, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        - A
          - B
      `
    );
  });

  test('each body indents to its own item', () => {
    const { text } = adjust(
      doc`
        ##### A
        a body
        ###### B
        b body
      `,
      { operation: 'increase', levels: 2, conversion: TO_BULLETS }
    );

    assert.equal(
      text,
      doc`
        - A
          a body
          - B
            b body
      `
    );
  });

  test('an overflow of three nests two levels deep', () => {
    const { text } = adjust('###### A\nbody', {
      operation: 'increase',
      levels: 3,
      conversion: TO_BULLETS,
    });

    assert.equal(text, '    - A\n      body');
  });

  test('only the headings that overflow become bullets', () => {
    const { text } = adjust(
      doc`
        #### A
        ##### B
        ###### C
      `,
      { operation: 'increase', levels: 2, conversion: TO_BULLETS }
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
});

describe('fenced code is carried, not read', () => {
  test('a fence is indented whole so it still renders the same code', () => {
    const { text } = adjust('###### A\n```js\nconst x = 1;\n```', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
    });

    assert.equal(text, '- A\n  ```js\n  const x = 1;\n  ```');
  });

  test('a hash inside a fence neither becomes a heading nor ends a section', () => {
    const { text } = adjust('###### A\n```bash\n# comment\n```\ntail', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
    });

    assert.equal(text, '- A\n  ```bash\n  # comment\n  ```\n  tail');
  });
});

describe('a section that runs past the range', () => {
  test('only the selected lines are indented, and the cut is reported', () => {
    const { text, truncatedSections } = adjust('###### A\nfirst\nsecond\nthird', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
      toLine: 1,
    });

    assert.equal(text, '- A\n  first\nsecond\nthird');
    assert.equal(truncatedSections, 1);
  });

  test('a body that fits inside the range is not reported', () => {
    const { truncatedSections } = adjust('###### A\nbody', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
      toLine: 1,
    });

    assert.equal(truncatedSections, 0);
  });

  test('a heading converts even when none of its body is in range', () => {
    const { text, truncatedSections } = adjust('###### A\nbody', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
      toLine: 0,
    });

    assert.equal(text, '- A\nbody');
    assert.equal(truncatedSections, 1);
  });

  test('headings outside the range are untouched', () => {
    const { text } = adjust('###### A\n###### B', {
      operation: 'increase',
      levels: 1,
      conversion: TO_BULLETS,
      fromLine: 1,
    });

    assert.equal(text, '###### A\n- B');
  });
});
