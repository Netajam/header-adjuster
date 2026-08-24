import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import type { LevelInputSubmission } from '../../src/ui/submissionValidation';
import { describeProblem } from '../../src/ui/submissionValidation';

const BLANK: LevelInputSubmission = {
  levels: undefined,
  startLine: null,
  endLine: null,
};

describe('describeProblem', () => {
  test('accepts an entirely blank form — every field is optional', () => {
    assert.equal(describeProblem(BLANK), null);
  });

  test('accepts a fully specified, well-ordered request', () => {
    assert.equal(
      describeProblem({ levels: 2, startLine: 10, endLine: 20 }),
      null
    );
  });

  test('accepts a single-line range', () => {
    assert.equal(describeProblem({ ...BLANK, startLine: 7, endLine: 7 }), null);
  });

  test('rejects a shift that is not a positive number', () => {
    const message = 'Please enter a valid positive number for levels.';

    assert.equal(describeProblem({ ...BLANK, levels: 0 }), message);
    assert.equal(describeProblem({ ...BLANK, levels: -1 }), message);
    assert.equal(describeProblem({ ...BLANK, levels: NaN }), message);
  });

  test('rejects line numbers that are not positive', () => {
    assert.equal(
      describeProblem({ ...BLANK, startLine: 0 }),
      'Please enter a valid positive number for start line.'
    );
    assert.equal(
      describeProblem({ ...BLANK, endLine: NaN }),
      'Please enter a valid positive number for end line.'
    );
  });

  test('rejects a range that ends before it starts', () => {
    assert.equal(
      describeProblem({ ...BLANK, startLine: 20, endLine: 10 }),
      'End line cannot be before start line.'
    );
  });

  test('reports the first problem, so the user fixes one thing at a time', () => {
    assert.equal(
      describeProblem({ levels: 0, startLine: 0, endLine: 0 }),
      'Please enter a valid positive number for levels.'
    );
  });
});
