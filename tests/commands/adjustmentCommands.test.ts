import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  adjustActiveDocument,
  adjustActiveSelection,
  adjustSelection,
} from '../../src/commands/adjustmentCommands';

/**
 * The last stretch of the wiring: that a command asks the plugin for the
 * conversion and passes it on. `CommandContext` deliberately asks for answers
 * rather than for the settings object, which means nothing type-checks this
 * chain end to end — a command that forgot to ask would compile.
 */

interface EditorChange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  text: string;
}

function fakeEditor(lines: string[], selections: unknown[] = []) {
  const transactions: Array<{ changes: EditorChange[] }> = [];

  return {
    transactions,
    lineCount: () => lines.length,
    getLine: (index: number) => lines[index],
    somethingSelected: () => selections.length > 0,
    listSelections: () => selections,
    transaction: (spec: { changes: EditorChange[] }) => transactions.push(spec),
  };
}

/**
 * A plugin that answers the two questions a command is allowed to ask.
 *
 * `reports` chooses how the workspace hands the editor over: as the active
 * Markdown view, as the focus-tracked `activeEditor`, or not at all.
 */
function fakeContext(
  editor: ReturnType<typeof fakeEditor> | null,
  conversion: Record<string, unknown>,
  reports: 'view' | 'focus' | 'neither' = 'view'
) {
  return {
    app: {
      workspace: {
        getActiveViewOfType: () => (reports === 'view' ? { editor } : null),
        activeEditor: reports === 'focus' ? { editor } : null,
      },
    },
    defaultLevel: () => 1,
    conversion: () => conversion,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

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

describe('a command passes the plugin its conversion', () => {
  test('adjusting the document converts when the plugin says to', () => {
    const before = ['###### A'];
    const editor = fakeEditor([...before]);
    const context = fakeContext(editor, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    });

    adjustActiveDocument(context, 'increase');

    assert.equal(written(editor, before), '- A');
  });

  test('adjusting the document leaves it alone when the plugin says not to', () => {
    const editor = fakeEditor(['###### A']);
    const context = fakeContext(editor, {
      headingsToBullets: false,
      bulletsToHeadings: false,
    });

    adjustActiveDocument(context, 'increase');

    assert.deepEqual(editor.transactions, []);
  });

  test('adjusting a selection carries the conversion as well', () => {
    const before = ['###### A', '###### B'];
    const editor = fakeEditor([...before], [
      { anchor: { line: 1 }, head: { line: 1 } },
    ]);
    const context = fakeContext(editor, {
      headingsToBullets: true,
      bulletsToHeadings: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adjustSelection(context, editor as any, 'increase');

    assert.equal(written(editor, before), '###### A\n- B');
  });

  test('the plugin is asked, not assumed — the ceiling arrives too', () => {
    const before = ['#### A'];
    const editor = fakeEditor([...before]);
    const context = fakeContext(editor, {
      headingsToBullets: true,
      bulletsToHeadings: false,
      deepestHeadingLevel: 4,
    });

    adjustActiveDocument(context, 'increase');

    assert.equal(written(editor, before), '- A');
  });
});

describe('finding the editor the user is in', () => {
  /**
   * `workspace.activeEditor` tracks focus, not the workspace: it stays null
   * until a Markdown editor has been focused, so a session restored with a file
   * already open reported "No active editor found" until the user clicked into
   * the text. Asking which view is active answers the question that was meant.
   */
  const BULLETS = { headingsToBullets: true, bulletsToHeadings: false };

  test('the active view is used even when nothing has been focused yet', () => {
    const before = ['###### A'];
    const editor = fakeEditor([...before]);

    adjustActiveDocument(fakeContext(editor, BULLETS, 'view'), 'increase');

    assert.equal(written(editor, before), '- A');
  });

  test('the focus-tracked editor still works where there is no Markdown view', () => {
    const before = ['###### A'];
    const editor = fakeEditor([...before]);

    adjustActiveDocument(fakeContext(editor, BULLETS, 'focus'), 'increase');

    assert.equal(written(editor, before), '- A');
  });

  test('with neither, nothing is written', () => {
    const editor = fakeEditor(['###### A']);

    adjustActiveDocument(fakeContext(editor, BULLETS, 'neither'), 'increase');

    assert.deepEqual(editor.transactions, []);
  });

  test('a selection command finds the editor the same way', () => {
    const before = ['###### A'];
    const editor = fakeEditor([...before], [
      { anchor: { line: 0 }, head: { line: 0 } },
    ]);

    adjustActiveSelection(fakeContext(editor, BULLETS, 'view'), 'increase');

    assert.equal(written(editor, before), '- A');
  });
});
