import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import { computeFencedLines } from '../../src/core/fencedLines';

/** The fenced lines of a snippet, as indexes, which reads better than booleans. */
function fencedIndexes(markdown: string): number[] {
  return computeFencedLines(markdown.split('\n'))
    .map((inside, index) => (inside ? index : -1))
    .filter((index) => index >= 0);
}

describe('computeFencedLines', () => {
  test('a document with no fence has no fenced lines', () => {
    assert.deepEqual(fencedIndexes('# A\nbody'), []);
  });

  test('the fence lines themselves count as inside', () => {
    assert.deepEqual(fencedIndexes('```\ncode\n```'), [0, 1, 2]);
  });

  test('text after a closed fence is outside again', () => {
    assert.deepEqual(fencedIndexes('```\ncode\n```\nafter'), [0, 1, 2]);
  });

  test('a backtick run does not close a tilde fence', () => {
    assert.deepEqual(fencedIndexes('~~~\n```\nstill inside\n~~~'), [0, 1, 2, 3]);
  });

  test('a closing fence must be at least as long as its opener', () => {
    assert.deepEqual(fencedIndexes('````\n```\nstill inside\n````'), [0, 1, 2, 3]);
  });

  test('a line with an info string opens but does not close', () => {
    assert.deepEqual(fencedIndexes('```js\ncode\n```js\nmore\n```'), [0, 1, 2, 3, 4]);
  });

  test('an unterminated fence swallows the rest of the document', () => {
    assert.deepEqual(fencedIndexes('before\n```\ncode'), [1, 2]);
  });

  test('an indented fence is still a fence', () => {
    assert.deepEqual(fencedIndexes('  ```\n  code\n  ```'), [0, 1, 2]);
  });
});
