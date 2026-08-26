import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  applyLineEdits,
  readEditorLines,
  selectedLineRange,
} from '../../src/editor/editorDocument';

/**
 * The slice of Obsidian's Editor this layer actually uses, stubbed. Anything
 * these tests do not implement is something the adapter must not reach for.
 */
function fakeEditor(lines: string[], selections: unknown[] = [], cursor = { line: 0, ch: 0 }) {
  const transactions: Array<{ selection?: { from: { line: number; ch: number } } }> = [];

  return {
    transactions,
    lineCount: () => lines.length,
    getLine: (index: number) => lines[index],
    getCursor: () => cursor,
    listSelections: () => selections,
    transaction: (spec: never) => transactions.push(spec),
  };
}

/** The stub is structural; the adapter only ever sees Obsidian's Editor type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asEditor = (editor: ReturnType<typeof fakeEditor>) => editor as any;

describe('readEditorLines', () => {
  test('snapshots every line of the document in order', () => {
    const editor = fakeEditor(['# A', '', 'body']);

    assert.deepEqual(readEditorLines(asEditor(editor)), ['# A', '', 'body']);
  });

  test('an empty document reads as no lines', () => {
    assert.deepEqual(readEditorLines(asEditor(fakeEditor([]))), []);
  });
});

describe('selectedLineRange', () => {
  test('orders the range start-to-end when the user dragged downward', () => {
    const editor = fakeEditor(
      [],
      [{ anchor: { line: 2, ch: 0 }, head: { line: 5, ch: 4 } }]
    );

    assert.deepEqual(selectedLineRange(asEditor(editor)), {
      fromLine: 2,
      toLine: 5,
    });
  });

  test('orders it the same way when the user dragged upward', () => {
    const editor = fakeEditor(
      [],
      [{ anchor: { line: 5, ch: 4 }, head: { line: 2, ch: 0 } }]
    );

    assert.deepEqual(selectedLineRange(asEditor(editor)), {
      fromLine: 2,
      toLine: 5,
    });
  });

  test('a caret with no selection is a single-line range', () => {
    const editor = fakeEditor(
      [],
      [{ anchor: { line: 3, ch: 1 }, head: { line: 3, ch: 1 } }]
    );

    assert.deepEqual(selectedLineRange(asEditor(editor)), {
      fromLine: 3,
      toLine: 3,
    });
  });

  test('no selection at all reads as no range', () => {
    assert.equal(selectedLineRange(asEditor(fakeEditor([]))), null);
  });
});

describe('applyLineEdits', () => {
  test('sends every edit as one undoable transaction', () => {
    const editor = fakeEditor(['# A']);

    applyLineEdits(asEditor(editor), [
      { line: 0, fromColumn: 0, toColumn: 1, text: '##' },
    ]);

    assert.deepEqual(editor.transactions, [
      {
        changes: [{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 1 }, text: '##' }],
      },
    ]);
  });

  test('opens no transaction when nothing changed', () => {
    const editor = fakeEditor(['# A']);

    applyLineEdits(asEditor(editor), []);

    assert.deepEqual(editor.transactions, []);
  });
});

/**
 * Where a caret is left when the opening of its line is rewritten.
 *
 * An editor left to itself keeps a caret sitting exactly at an insertion in
 * front of what was inserted. That is right for typing and wrong for markup: a
 * caret at the head of a line is one waiting to write the heading, not one
 * asking to be pushed behind the `#`.
 */
describe('the caret applyLineEdits asks for', () => {
  /** The caret a transaction asked for, or null when it asked for none. */
  function caret(editor: ReturnType<typeof fakeEditor>) {
    return editor.transactions[0]?.selection?.from ?? null;
  }

  const write = (text: string, toColumn = 0) => [
    { line: 1, fromColumn: 0, toColumn, text },
  ];

  test('lands past what was written when the caret was at the head of the line', () => {
    const editor = fakeEditor([], [], { line: 1, ch: 0 });

    applyLineEdits(asEditor(editor), write('## '), 1);

    assert.deepEqual(caret(editor), { line: 1, ch: 3 });
  });

  test('carries the caret along by however much the opening grew', () => {
    const editor = fakeEditor([], [], { line: 1, ch: 5 });

    applyLineEdits(asEditor(editor), write('## '), 1);

    assert.deepEqual(caret(editor), { line: 1, ch: 8 });
  });

  test('carries it back by however much the opening shrank', () => {
    const editor = fakeEditor([], [], { line: 1, ch: 6 });

    applyLineEdits(asEditor(editor), write('', 3), 1);

    assert.deepEqual(caret(editor), { line: 1, ch: 3 });
  });

  test('a caret inside the markup being removed comes out at the text', () => {
    const editor = fakeEditor([], [], { line: 1, ch: 1 });

    applyLineEdits(asEditor(editor), write('', 3), 1);

    assert.deepEqual(caret(editor), { line: 1, ch: 0 });
  });

  test('asks for nothing when no caret line is named', () => {
    const editor = fakeEditor([], [], { line: 1, ch: 0 });

    applyLineEdits(asEditor(editor), write('## '));

    assert.equal(caret(editor), null);
  });

  test('asks for nothing when the named line is not one being edited', () => {
    const editor = fakeEditor([], [], { line: 4, ch: 0 });

    applyLineEdits(asEditor(editor), write('## '), 4);

    assert.equal(caret(editor), null);
  });
});
