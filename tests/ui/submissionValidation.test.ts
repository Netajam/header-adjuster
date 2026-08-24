import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { describeProblem } from '../../src/ui/submissionValidation';

/** The three fields, in the order the dialog shows them. */
interface Fields {
  levels: number | undefined;
  startLine: number | null;
  endLine: number | null;
}

const BLANK: Fields = { levels: undefined, startLine: null, endLine: null };

function problemWith(fields: Partial<Fields>): string | null {
  const { levels, startLine, endLine } = { ...BLANK, ...fields };
  return describeProblem(levels, startLine, endLine);
}

describe('describeProblem', () => {
  test('accepts an entirely blank form — every field is optional', () => {
    assert.equal(problemWith({}), null);
  });

  test('accepts a fully specified, well-ordered request', () => {
    assert.equal(problemWith({ levels: 2, startLine: 10, endLine: 20 }), null);
  });

  test('accepts a single-line range', () => {
    assert.equal(problemWith({ startLine: 7, endLine: 7 }), null);
  });

  test('rejects a shift that is not a positive number', () => {
    const message = 'Please enter a valid positive number for levels.';

    assert.equal(problemWith({ levels: 0 }), message);
    assert.equal(problemWith({ levels: -1 }), message);
    assert.equal(problemWith({ levels: NaN }), message);
  });

  test('rejects line numbers that are not positive', () => {
    assert.equal(
      problemWith({ startLine: 0 }),
      'Please enter a valid positive number for start line.'
    );
    assert.equal(
      problemWith({ endLine: NaN }),
      'Please enter a valid positive number for end line.'
    );
  });

  test('rejects a range that ends before it starts', () => {
    assert.equal(
      problemWith({ startLine: 20, endLine: 10 }),
      'End line cannot be before start line.'
    );
  });

  test('reports the first problem, so the user fixes one thing at a time', () => {
    assert.equal(
      problemWith({ levels: 0, startLine: 0, endLine: 0 }),
      'Please enter a valid positive number for levels.'
    );
  });
});
