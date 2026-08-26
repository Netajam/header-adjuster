import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  adjustEditorHeadings,
  adjustEditorLine,
  placeEditorLine,
} from '../../src/editor/headingAdjustmentService';

/**
 * That the conversions work is settled in `tests/core/`. What is settled here is
 * that a setting reaches them: every core test hands `adjustHeadings` a
 * conversion directly, so all of them would still pass if this layer dropped it
 * on the floor and the feature did nothing in the app.
 */

/** The slice of Obsidian's Editor this layer uses, and a record of what it wrote. */
function fakeEditor(lines: string[], cursor = 0) {
  const transactions: Array<{ changes: EditorChange[] }> = [];

  return {
    transactions,
    lineCount: () => lines.length,
    getLine: (index: number) => lines[index],
    getCursor: () => ({ line: cursor, ch: 0 }),
    listSelections: () => [],
    transaction: (spec: { changes: EditorChange[] }) => transactions.push(spec),
  };
}

interface EditorChange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  text: string;
}

/** The stub is structural; the adapter only ever sees Obsidian's Editor type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asEditor = (editor: ReturnType<typeof fakeEditor>) => editor as any;

/** The document as the recorded transaction would leave it. */
function written(editor: ReturnType<typeof fakeEditor>, before: string[]): string {
  const lines = [...before];

  for (const change of editor.transactions.flatMap((spec) => spec.changes)) {
    const line = lines[change.from.line];
    lines[change.from.line] =
      line.slice(0, change.from.ch) + change.text + line.slice(change.to.ch);
  }

  return lines.join('\n');
}

describe('the conversion settings reach the core', () => {
  test('switched on, an overflowing heading is written back as a bullet', () => {
    const before = ['###### A', 'body'];
    const editor = fakeEditor([...before]);

    adjustEditorHeadings(asEditor(editor), 'increase', 1, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    });

    assert.equal(written(editor, before), '- A\n  body');
  });

  test('switched off, the same edit is never written', () => {
    const editor = fakeEditor(['###### A', 'body']);

    adjustEditorHeadings(asEditor(editor), 'increase', 1, {
      headingsToBullets: false,
      bulletsToHeadings: false,
    });

    assert.deepEqual(editor.transactions, []);
  });

  test('the reverse conversion reaches the core too', () => {
    const before = ['- A'];
    const editor = fakeEditor([...before]);

    adjustEditorHeadings(asEditor(editor), 'decrease', 1, {
      headingsToBullets: false,
      bulletsToHeadings: true,
    });

    assert.equal(written(editor, before), '###### A');
  });

  test('the configured ceiling reaches the core', () => {
    const before = ['#### A'];
    const editor = fakeEditor([...before]);

    adjustEditorHeadings(asEditor(editor), 'increase', 1, {
      headingsToBullets: true,
      bulletsToHeadings: false,
      deepestHeadingLevel: 4,
    });

    assert.equal(written(editor, before), '- A');
  });

  test('a range reaches the core', () => {
    const before = ['###### A', '###### B'];
    const editor = fakeEditor([...before]);

    adjustEditorHeadings(
      asEditor(editor),
      'increase',
      1,
      { headingsToBullets: true, bulletsToHeadings: false },
      1,
      1
    );

    assert.equal(written(editor, before), '###### A\n- B');
  });
});

describe('a request that means nothing writes nothing', () => {
  test('a document with no headings is left alone', () => {
    const editor = fakeEditor(['just text']);

    adjustEditorHeadings(asEditor(editor), 'increase', 1, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    });

    assert.deepEqual(editor.transactions, []);
  });

  test('a zero-level shift is left alone', () => {
    const editor = fakeEditor(['# A']);

    adjustEditorHeadings(asEditor(editor), 'increase', 0, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    });

    assert.deepEqual(editor.transactions, []);
  });

  test('everything is written as one transaction, so undo takes one step', () => {
    const editor = fakeEditor(['###### A', 'first', 'second']);

    adjustEditorHeadings(asEditor(editor), 'increase', 1, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    });

    assert.equal(editor.transactions.length, 1);
    assert.equal(editor.transactions[0].changes.length, 3);
  });
});

/**
 * That the cursor is what the current-line scope reads.
 *
 * `tests/core/lineLevel.test.ts` settles what happens to the line; every one of
 * those tests names the line directly, so all of them would still pass if this
 * layer asked the editor for the wrong one.
 */
describe('the cursor picks the line', () => {
  test('adjusts the line the cursor is on and no other', () => {
    const before = ['# A', '## B', '### C'];
    const editor = fakeEditor([...before], 1);

    adjustEditorLine(asEditor(editor), 'increase', 1);

    assert.equal(written(editor, before), '# A\n### B\n### C');
  });

  test('writes a heading onto the plain line under the cursor', () => {
    const before = ['# A', 'some prose'];
    const editor = fakeEditor([...before], 1);

    adjustEditorLine(asEditor(editor), 'increase', 1);

    assert.equal(written(editor, before), '# A\n# some prose');
  });

  test('a line with nowhere to go is left as it is', () => {
    const before = ['some prose'];
    const editor = fakeEditor([...before], 0);

    adjustEditorLine(asEditor(editor), 'decrease', 1);

    assert.deepEqual(editor.transactions, []);
  });
});

describe('a placement reads the cursor too', () => {
  test('places the line the cursor is on against the heading above it', () => {
    const before = ['## A', 'some prose', '### C'];
    const editor = fakeEditor([...before], 1);

    placeEditorLine(asEditor(editor), 'child', 'sibling');

    assert.equal(written(editor, before), '## A\n### some prose\n### C');
  });

  test('removes the heading from the line the cursor is on', () => {
    const before = ['## A', '#### B'];
    const editor = fakeEditor([...before], 1);

    placeEditorLine(asEditor(editor), 'plain', 'sibling');

    assert.equal(written(editor, before), '## A\nB');
  });

  test('a line already placed is left untouched', () => {
    const before = ['## A', '### B'];
    const editor = fakeEditor([...before], 1);

    placeEditorLine(asEditor(editor), 'child', 'sibling');

    assert.deepEqual(editor.transactions, []);
  });
});
