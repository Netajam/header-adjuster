import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  MAX_HEADING_LEVEL,
  MIN_HEADING_LEVEL,
  headingPrefix,
  matchHeading,
} from '../../src/core/heading';

describe('the heading scale', () => {
  test('runs from H1 to H6, the levels Markdown defines', () => {
    assert.equal(MIN_HEADING_LEVEL, 1);
    assert.equal(MAX_HEADING_LEVEL, 6);
  });

  test('writes a level as that many hashes', () => {
    assert.equal(headingPrefix(1), '#');
    assert.equal(headingPrefix(6), '######');
  });
});

describe('matchHeading', () => {
  test('reads the level and the text either side of the whitespace', () => {
    assert.deepEqual(matchHeading('### Some title'), {
      level: 3,
      content: 'Some title',
    });
  });

  test('swallows the whole separator but keeps trailing spacing', () => {
    assert.deepEqual(matchHeading('#    padded   '), {
      level: 1,
      content: 'padded   ',
    });
  });

  test('accepts a tab as the separator', () => {
    assert.deepEqual(matchHeading('##\tTabbed'), { level: 2, content: 'Tabbed' });
  });

  test('accepts a heading with no text', () => {
    assert.deepEqual(matchHeading('## '), { level: 2, content: '' });
  });

  const notHeadings = [
    ['no space after the hashes', '#NoSpace'],
    ['more hashes than Markdown defines', '####### seven'],
    ['a hash that is not at the start', ' # indented'],
    ['prose that merely mentions one', 'see the # symbol'],
    ['a bullet', '- item'],
    ['an empty line', ''],
  ];

  for (const [name, line] of notHeadings) {
    test(`rejects ${name}`, () => {
      assert.equal(matchHeading(line), null);
    });
  }
});
