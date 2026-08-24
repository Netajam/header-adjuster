import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { Heading, matchHeadingLevel } from '../../src/core/heading';

describe('matchHeadingLevel', () => {
  test('counts the hashes of a heading line', () => {
    assert.equal(matchHeadingLevel('# One'), 1);
    assert.equal(matchHeadingLevel('###### Six'), 6);
  });

  test('accepts a tab as the separator', () => {
    assert.equal(matchHeadingLevel('##\tTabbed'), 2);
  });

  test('accepts a heading with no text after it', () => {
    assert.equal(matchHeadingLevel('## '), 2);
  });

  const notHeadings = [
    ['no space after the hashes', '#NoSpace'],
    ['more hashes than Markdown defines', '####### seven'],
    ['hashes with nothing after them', '##'],
    ['a hash that is not at the start', ' # indented'],
    ['prose that merely mentions one', 'see the # symbol'],
    ['a bullet', '- item'],
    ['an empty line', ''],
  ];

  for (const [name, line] of notHeadings) {
    test(`rejects ${name}`, () => {
      assert.equal(matchHeadingLevel(line), null);
    });
  }
});

describe('Heading', () => {
  test('starts at the level it was written at', () => {
    const heading = new Heading(3, 12);

    assert.equal(heading.level, 3);
    assert.equal(heading.originalLevel, 3);
    assert.equal(heading.lineNumber, 12);
    assert.equal(heading.hasChanged, false);
  });

  test('reports a change once its working level moves', () => {
    const heading = new Heading(3, 12);
    heading.level = 2;

    assert.equal(heading.hasChanged, true);
    assert.equal(heading.originalLevel, 3, 'the written level never moves');
  });
});
