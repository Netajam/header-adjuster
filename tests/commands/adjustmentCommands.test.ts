import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  adjustActiveDocument,
  adjustActiveSelection,
  adjustCurrentLine,
  adjustCustomRange,
  placeCurrentLine,
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

function fakeEditor(lines: string[], selections: unknown[] = [], cursor = 0) {
  const transactions: Array<{ changes: EditorChange[] }> = [];

  return {
    transactions,
    lineCount: () => lines.length,
    getLine: (index: number) => lines[index],
    getCursor: () => ({ line: cursor, ch: 0 }),
    somethingSelected: () => selections.length > 0,
    listSelections: () => selections,
    transaction: (spec: { changes: EditorChange[] }) => transactions.push(spec),
  };
}

/**
 * A plugin that answers the questions a command is allowed to ask.
 *
 * `reports` chooses how the workspace hands the editor over: as the active
 * Markdown view, as the focus-tracked `activeEditor`, or not at all.
 * `customRange` is where the two custom-range commands are pointed; the two note
 * edges are the whole document, which is what a fresh install has.
 */
function fakeContext(
  editor: ReturnType<typeof fakeEditor> | null,
  conversion: Record<string, unknown>,
  reports: 'view' | 'focus' | 'neither' = 'view',
  customRange: { top: 'note-start' | 'cursor'; bottom: 'cursor' | 'note-end' } = {
    top: 'note-start',
    bottom: 'note-end',
  }
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
    toggleTarget: () => 'sibling',
    customRange: () => customRange,
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

    adjustActiveSelection(context, 'increase');

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

describe('the current-line command finds the editor the user is in', () => {
  test('adjusts the line the cursor sits on', () => {
    const before = ['# A', 'some prose'];
    const editor = fakeEditor([...before], [], 1);

    adjustCurrentLine(fakeContext(editor, {}), 'increase');

    assert.equal(written(editor, before), '# A\n# some prose');
  });

  test('reads the shift from the plugin when the caller does not name one', () => {
    const before = ['some prose'];
    const editor = fakeEditor([...before], [], 0);
    const context = fakeContext(editor, {});
    context.defaultLevel = () => 3;

    adjustCurrentLine(context, 'increase');

    assert.equal(written(editor, before), '### some prose');
  });

  test('needs no selection, unlike the selection command', () => {
    const before = ['## A'];
    const editor = fakeEditor([...before], [], 0);

    adjustCurrentLine(fakeContext(editor, {}), 'decrease');

    assert.equal(editor.somethingSelected(), false);
    assert.equal(written(editor, before), '# A');
  });

  test('says so rather than throwing when no editor is open', () => {
    assert.doesNotThrow(() =>
      adjustCurrentLine(fakeContext(null, {}, 'neither'), 'increase')
    );
  });
});

describe('the placement commands find the editor the user is in', () => {
  test('places the current line under the heading above it', () => {
    const before = ['## A', 'some prose'];
    const editor = fakeEditor([...before], [], 1);

    placeCurrentLine(fakeContext(editor, {}), 'child');

    assert.equal(written(editor, before), '## A\n### some prose');
  });

  test('never reads the plugin default — a placement has no distance', () => {
    const before = ['## A', 'some prose'];
    const editor = fakeEditor([...before], [], 1);
    const context = fakeContext(editor, {});
    context.defaultLevel = () => {
      throw new Error('a placement must not ask for a default shift');
    };

    placeCurrentLine(context, 'sibling');

    assert.equal(written(editor, before), '## A\n## some prose');
  });

  test('says so rather than throwing when no editor is open', () => {
    assert.doesNotThrow(() =>
      placeCurrentLine(fakeContext(null, {}, 'neither'), 'plain')
    );
  });
});

describe('the toggle command needs only the one binding', () => {
  /** The document after toggling line 1, with the toggle pointed at `target`. */
  function toggled(lines: string[], target: string): string {
    const editor = fakeEditor([...lines], [], 1);
    const context = fakeContext(editor, {});
    context.toggleTarget = () => target;

    placeCurrentLine(context, 'toggle');

    return written(editor, lines);
  }

  test('the same command puts a heading on and takes it off again', () => {
    assert.equal(toggled(['## Setup', 'some prose'], 'sibling'), '## Setup\n## some prose');
    assert.equal(toggled(['## Setup', '## some prose'], 'sibling'), '## Setup\nsome prose');
  });

  test('it goes wherever the plugin says it is pointed', () => {
    const before = ['## Setup', 'some prose'];

    assert.equal(toggled(before, 'root'), '## Setup\n# some prose');
    assert.equal(toggled(before, 'sibling'), '## Setup\n## some prose');
    assert.equal(toggled(before, 'child'), '## Setup\n### some prose');
  });

  test('each target takes off only the level it puts on', () => {
    const on = ['## Setup', '### some prose'];

    assert.equal(toggled(on, 'child'), '## Setup\nsome prose');
    assert.equal(toggled(on, 'sibling'), '## Setup\n## some prose');
  });

  test('the target is read at press time, not when the command was registered', () => {
    const before = ['## Setup', 'some prose'];
    const editor = fakeEditor([...before], [], 1);
    const context = fakeContext(editor, {});
    let target = 'sibling';
    context.toggleTarget = () => target;

    target = 'child';
    placeCurrentLine(context, 'toggle');

    assert.equal(written(editor, before), '## Setup\n### some prose');
  });
});

describe('the custom-range commands', () => {
  const NONE = { headingsToBullets: false, bulletsToHeadings: false };
  const NOTE = ['# A', '# B', '# C'];

  test('the boundaries come from the plugin, not from the command', () => {
    const editor = fakeEditor([...NOTE], [], 1);
    const context = fakeContext(editor, NONE, 'view', {
      top: 'cursor',
      bottom: 'note-end',
    });

    adjustCustomRange(context, 'increase');

    assert.equal(written(editor, NOTE), '# A\n## B\n## C');
  });

  test('pointed the other way, the same command covers the other side', () => {
    const editor = fakeEditor([...NOTE], [], 1);
    const context = fakeContext(editor, NONE, 'view', {
      top: 'note-start',
      bottom: 'cursor',
    });

    adjustCustomRange(context, 'increase');

    assert.equal(written(editor, NOTE), '## A\n## B\n# C');
  });

  test('unconfigured, it is the whole document — what a fresh install has', () => {
    const editor = fakeEditor([...NOTE], [], 1);

    adjustCustomRange(fakeContext(editor, NONE), 'increase');

    assert.equal(written(editor, NOTE), '## A\n## B\n## C');
  });

  test('it decreases as well as increases', () => {
    const before = ['## A', '## B'];
    const editor = fakeEditor([...before], [], 1);
    const context = fakeContext(editor, NONE, 'view', {
      top: 'cursor',
      bottom: 'note-end',
    });

    adjustCustomRange(context, 'decrease');

    assert.equal(written(editor, before), '## A\n# B');
  });

  /**
   * The same gap `CommandContext` leaves everywhere else: a command that
   * forgot to ask the plugin for the conversion would still compile.
   */
  test('the conversion is asked for and carried through', () => {
    const before = ['# A', '###### B'];
    const editor = fakeEditor([...before], [], 1);
    const context = fakeContext(
      editor,
      { headingsToBullets: true, bulletsToHeadings: false },
      'view',
      { top: 'cursor', bottom: 'note-end' }
    );

    adjustCustomRange(context, 'increase');

    assert.equal(written(editor, before), '# A\n- B');
  });

  test('with no editor open, nothing is written', () => {
    const editor = fakeEditor([...NOTE], [], 1);

    adjustCustomRange(fakeContext(editor, NONE, 'neither'), 'increase');

    assert.deepEqual(editor.transactions, []);
  });
});
