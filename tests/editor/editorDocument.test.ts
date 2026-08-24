import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  applyEditsToEditor,
  readEditorLines,
  selectedLineRange,
} from '../../src/editor/editorDocument';

/**
 * The slice of Obsidian's Editor this layer actually uses, stubbed. Anything
 * these tests do not implement is something the adapter must not reach for.
 */
function fakeEditor(lines: string[], selections: unknown[] = []) {
  const transactions: unknown[] = [];

  return {
    transactions,
    lineCount: () => lines.length,
    getLine: (index: number) => lines[index],
    listSelections: () => selections,
    transaction: (spec: unknown) => transactions.push(spec),
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

describe('applyEditsToEditor', () => {
  test('sends every edit as one undoable transaction', () => {
    const editor = fakeEditor(['# A']);

    applyEditsToEditor(asEditor(editor), [
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

    applyEditsToEditor(asEditor(editor), []);

    assert.deepEqual(editor.transactions, []);
  });
});
