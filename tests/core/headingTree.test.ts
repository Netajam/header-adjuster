import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseHeadings } from '../../src/core/headingTree';

describe('parseHeadings', () => {
  test('records the level and a 1-based line number', () => {
    const [heading] = parseHeadings(['prose', '## Title of the section']);

    assert.equal(heading.lineNumber, 2);
    assert.equal(heading.level, 2);
    assert.equal(heading.originalLevel, 2);
  });

  test('nests each heading under the nearest shallower heading before it', () => {
    const [a, b, c, d] = parseHeadings(['# A', '## B', '## C', '# D']);

    assert.equal(a.parent, null);
    assert.deepEqual(a.children, [b, c]);
    assert.equal(b.parent, a);
    assert.equal(c.parent, a);
    assert.equal(d.parent, null);
    assert.deepEqual(d.children, []);
  });

  test('skipped levels still nest', () => {
    const [a, b] = parseHeadings(['# A', '#### B']);

    assert.equal(b.parent, a);
    assert.deepEqual(a.children, [b]);
  });

  test('a heading shallower than everything before it becomes a root', () => {
    const [, , c] = parseHeadings(['## A', '### B', '# C']);

    assert.equal(c.parent, null);
  });

  test('reads only the requested lines', () => {
    const headings = parseHeadings(['# A', '## B', '### C'], 1, 1);

    assert.deepEqual(
      headings.map((heading) => heading.lineNumber),
      [2]
    );
  });

  test('clamps a range that runs past either end of the document', () => {
    const headings = parseHeadings(['# A', '# B'], -5, 500);

    assert.equal(headings.length, 2);
  });
});
