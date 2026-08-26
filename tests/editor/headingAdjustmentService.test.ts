import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  adjustEditorHeadings,
  adjustEditorLine,
  adjustEditorRange,
  placeEditorLine,
} from '../../src/editor/headingAdjustmentService';

/**
 * That the conversions work is settled in `tests/core/`. What is settled here is
 * that a setting reaches them: every core test hands `adjustHeadings` a
 * conversion directly, so all of them would still pass if this layer dropped it
 * on the floor and the feature did nothing in the app.
 */

/** The slice of Obsidian's Editor this layer uses, and a record of what it wrote. */
function fakeEditor(lines: string[], cursor = 0, ch = 0) {
  const transactions: Array<Transaction> = [];

  return {
    transactions,
    lineCount: () => lines.length,
    getLine: (index: number) => lines[index],
    getCursor: () => ({ line: cursor, ch }),
    listSelections: () => [],
    transaction: (spec: Transaction) => transactions.push(spec),
  };
}

interface Transaction {
  changes: EditorChange[];
  selection?: { from: { line: number; ch: number } };
}

/** Where the recorded transaction leaves the caret, or null if it says nothing. */
function caret(editor: ReturnType<typeof fakeEditor>) {
  return editor.transactions[0]?.selection?.from ?? null;
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

  for (const change of editor.transactions.flatMap((spec: Transaction) => spec.changes)) {
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

/**
 * Where the caret is left, which is only ever noticed on an empty line.
 *
 * An editor left to itself keeps a caret sitting exactly where text was
 * inserted in front of that text. On a line with something on it the caret is
 * almost never at column zero, so it rides along and nobody sees this; on an
 * empty line column zero is the only place it can be, so every insertion lands
 * behind it.
 */
describe('the caret after writing a heading onto the current line', () => {
  test('waits after the hash on an empty line, ready to be typed into', () => {
    const editor = fakeEditor(['## Setup', ''], 1, 0);

    placeEditorLine(asEditor(editor), 'toggle', 'sibling');

    assert.equal(written(editor, ['## Setup', '']), '## Setup\n## ');
    assert.deepEqual(caret(editor), { line: 1, ch: 3 });
  });

  test('stays with its text on a line that has some', () => {
    const editor = fakeEditor(['## Setup', 'some prose'], 1, 5);

    placeEditorLine(asEditor(editor), 'toggle', 'sibling');

    // `some |prose` before, `## some |prose` after: the same character.
    assert.deepEqual(caret(editor), { line: 1, ch: 8 });
  });

  test('is not pushed behind the markup when it sits at the head of the line', () => {
    const editor = fakeEditor(['## Setup', 'some prose'], 1, 0);

    placeEditorLine(asEditor(editor), 'toggle', 'sibling');

    assert.deepEqual(caret(editor), { line: 1, ch: 3 });
  });

  test('comes back with the text when the heading is taken off', () => {
    const editor = fakeEditor(['## Setup', '## some prose'], 1, 6);

    placeEditorLine(asEditor(editor), 'toggle', 'sibling');

    // `## som|e prose` before, `som|e prose` after.
    assert.equal(written(editor, ['## Setup', '## some prose']), '## Setup\nsome prose');
    assert.deepEqual(caret(editor), { line: 1, ch: 3 });
  });

  test('shifting the current line moves it too', () => {
    const editor = fakeEditor([''], 0, 0);

    adjustEditorLine(asEditor(editor), 'increase', 1);

    assert.equal(written(editor, ['']), '# ');
    assert.deepEqual(caret(editor), { line: 0, ch: 2 });
  });

  test('a document-wide adjustment leaves the caret to the editor', () => {
    const editor = fakeEditor(['# A', '## B'], 0, 0);

    adjustEditorHeadings(asEditor(editor), 'increase', 1, {
      headingsToBullets: false,
      bulletsToHeadings: false,
    });

    assert.equal(caret(editor), null);
  });
});

describe('a range pinned to the cursor', () => {
  /**
   * The four ranges the two boundaries spell out. The cursor sits on line 2 of
   * four headings throughout, so every boundary lands somewhere visible: a
   * range that ignored one end would take in a heading the assertion names.
   */
  const NOTE = ['# A', '# B', '# C', '# D'];
  const NONE = { headingsToBullets: false, bulletsToHeadings: false };

  function shifted(
    top: 'note-start' | 'cursor',
    bottom: 'cursor' | 'note-end',
    cursor = 2
  ): string {
    const editor = fakeEditor([...NOTE], cursor);

    adjustEditorRange(asEditor(editor), 'increase', 1, NONE, { top, bottom });

    return written(editor, NOTE);
  }

  test('a top of the cursor runs on to the end of the note', () => {
    assert.equal(shifted('cursor', 'note-end'), '# A\n# B\n## C\n## D');
  });

  test('a bottom of the cursor runs back to the top of the note', () => {
    assert.equal(shifted('note-start', 'cursor'), '## A\n## B\n## C\n# D');
  });

  test('the two note edges are the whole document', () => {
    assert.equal(shifted('note-start', 'note-end'), '## A\n## B\n## C\n## D');
  });

  test('the cursor at both ends is the cursor line alone', () => {
    assert.equal(shifted('cursor', 'cursor'), '# A\n# B\n## C\n# D');
  });

  test('the cursor on the first line still reaches the end', () => {
    assert.equal(shifted('cursor', 'note-end', 0), '## A\n## B\n## C\n## D');
  });

  test('the cursor on the last line still reaches the top', () => {
    assert.equal(shifted('note-start', 'cursor', 3), '## A\n## B\n## C\n## D');
  });

  /**
   * The reason `adjustEditorRange` has nothing to reject, and the reason the
   * two ends are offered different options: whichever line the cursor is on,
   * the top never lands below the bottom.
   */
  test('no pair of boundaries can produce a backwards range', () => {
    for (const cursor of [0, 1, 2, 3]) {
      for (const top of ['note-start', 'cursor'] as const) {
        for (const bottom of ['cursor', 'note-end'] as const) {
          const editor = fakeEditor([...NOTE], cursor);

          adjustEditorRange(asEditor(editor), 'increase', 1, NONE, { top, bottom });

          assert.ok(
            editor.transactions.length > 0,
            `cursor ${cursor}, top ${top}, bottom ${bottom} wrote nothing`
          );
        }
      }
    }
  });

  test('the conversion still reaches the core through this scope', () => {
    const before = ['###### A', 'body', '# B'];
    const editor = fakeEditor([...before], 0);

    adjustEditorRange(asEditor(editor), 'increase', 1, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    }, { top: 'note-start', bottom: 'cursor' });

    assert.equal(written(editor, before), '- A\nbody\n# B');
  });

  test('a selection is still read from the editor rather than the cursor', () => {
    const before = ['# A', '# B'];
    const editor = fakeEditor([...before], 0);
    editor.listSelections = () => [
      { anchor: { line: 1 }, head: { line: 1 } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any;

    adjustEditorRange(asEditor(editor), 'increase', 1, NONE, 'selection');

    assert.equal(written(editor, before), '# A\n## B');
  });
});
