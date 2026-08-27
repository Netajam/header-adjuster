import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

import type { LinePlacement } from '../../../src/contracts';
import { adjustLineLevel, placeLineLevel } from '../../../src/core/line/line';

/**
 * The current-line adjustment on its own, where a line with no `#` is a heading
 * of level zero.
 *
 * These read as one line in, one line out: the point of the scope is that
 * nothing around the line is consulted, so there is no document to write down.
 */

/** The line as the edit would leave it, or unchanged when there is no edit. */
function moved(
  line: string,
  operation: 'increase' | 'decrease',
  levels = 1
): string {
  const [edit] = adjustLineLevel([line], [], 0, operation, levels);
  if (!edit) {
    return line;
  }

  assert.equal(edit.line, 0, 'the edit carries the line number it was given');
  return line.slice(0, edit.fromColumn) + edit.text + line.slice(edit.toColumn);
}

describe('increasing one line', () => {
  test('writes a heading onto plain text', () => {
    assert.equal(moved('Some prose', 'increase'), '# Some prose');
  });

  test('goes on deepening it once it is a heading', () => {
    assert.equal(moved('# Some prose', 'increase'), '## Some prose');
  });

  test('takes the whole shift in one step', () => {
    assert.equal(moved('Some prose', 'increase', 3), '### Some prose');
  });

  test('stops at H6 rather than writing a seventh hash', () => {
    assert.equal(moved('###### A', 'increase'), '###### A');
    assert.equal(moved('#### A', 'increase', 5), '###### A');
  });

  test('leaves the gap the author wrote', () => {
    assert.equal(moved('#\tA', 'increase'), '##\tA');
    assert.equal(moved('#   A', 'increase'), '##   A');
  });
});

describe('decreasing one line', () => {
  test('takes the heading off an H1, gap and all', () => {
    assert.equal(moved('# A', 'decrease'), 'A');
    assert.equal(moved('#   A', 'decrease'), 'A');
  });

  test('shallows a heading that still has somewhere to go', () => {
    assert.equal(moved('### A', 'decrease'), '## A');
  });

  test('lands on plain text rather than overshooting', () => {
    assert.equal(moved('### A', 'decrease', 9), 'A');
  });

  test('leaves plain text alone — there is nothing below level zero', () => {
    assert.deepEqual(adjustLineLevel(['Some prose'], [], 0, 'decrease', 1), []);
  });
});

describe('what the line has to look like', () => {
  test('a hash with no gap after it is not a heading, so it is level zero', () => {
    assert.equal(moved('#tag', 'increase'), '# #tag');
  });

  test('an indented hash is not a heading either', () => {
    assert.equal(moved('  # A', 'increase'), '#   # A');
  });

  test('an empty line becomes an empty heading, ready to be typed into', () => {
    assert.equal(moved('', 'increase'), '# ');
  });
});

describe('the edit an adjustment produces', () => {
  test('replaces only the prefix, and carries the line it was given', () => {
    const lines = ['x', 'y', 'z', 'w', 'v', 'u', 't', '### A'];

    assert.deepEqual(adjustLineLevel(lines, [], 7, 'decrease', 1), [
      { line: 7, fromColumn: 0, toColumn: 3, text: '##' },
    ]);
  });

  test('inserts rather than replaces when the line has no prefix yet', () => {
    assert.deepEqual(adjustLineLevel(['x', 'y', 'A'], [], 2, 'increase', 2), [
      { line: 2, fromColumn: 0, toColumn: 0, text: '## ' },
    ]);
  });

  test('a line that cannot move produces no edit at all', () => {
    assert.deepEqual(adjustLineLevel(['###### A'], [], 0, 'increase', 1), []);
  });

  test('a line the document reads as code is left alone', () => {
    assert.deepEqual(adjustLineLevel(['# A'], [true], 0, 'increase', 1), []);
  });

  test('a line past the end of the document is nothing to move', () => {
    assert.deepEqual(adjustLineLevel(['# A'], [], 9, 'decrease', 1), []);
  });
});

describe('writing a line at the level its placement asks for', () => {
  /** The line as `placeLineLevel` would leave it, under a heading of `enclosing`. */
  function placed(
    line: string,
    placement: LinePlacement,
    enclosing = 0
  ): string {
    const above = enclosing > 0 ? [{ level: enclosing }] : [];
    const [edit] = placeLineLevel([line], [], 0, placement, above, 'sibling');

    return edit
      ? line.slice(0, edit.fromColumn) + edit.text + line.slice(edit.toColumn)
      : line;
  }

  test('writes a heading onto plain text at the level asked for', () => {
    assert.equal(placed('Some prose', 'child', 2), '### Some prose');
    assert.equal(placed('Some prose', 'sibling', 2), '## Some prose');
  });

  test('rewrites a heading whatever level it was written at', () => {
    assert.equal(placed('##### A', 'sibling', 2), '## A');
    assert.equal(placed('# A', 'child', 3), '#### A');
  });

  test('takes the heading off, gap and all', () => {
    assert.equal(placed('###   A', 'plain', 2), 'A');
  });

  test('clamps a placement that reaches past the Markdown limit', () => {
    assert.equal(placed('# A', 'child', 6), '###### A');
  });

  test('a line already where the placement wants it is nothing to write', () => {
    assert.deepEqual(placeLineLevel(['## A'], [], 0, 'sibling', [{ level: 2 }], 'sibling'), []);
    assert.deepEqual(placeLineLevel(['A'], [], 0, 'plain', [], 'sibling'), []);
  });

  test('a line the document reads as code is left alone', () => {
    assert.deepEqual(placeLineLevel(['# A'], [true], 0, 'child', [{ level: 2 }], 'sibling'), []);
  });
});

describe('writing a heading onto a line that is already a bullet', () => {
  test('takes the bullet away rather than sitting in front of it', () => {
    assert.equal(moved('- Some prose', 'increase'), '# Some prose');
    assert.equal(moved('* Some prose', 'increase'), '# Some prose');
    assert.equal(moved('+ Some prose', 'increase'), '# Some prose');
  });

  test('takes the indentation with it — a heading only counts at column zero', () => {
    assert.equal(moved('  - Some prose', 'increase', 2), '## Some prose');
  });

  test('leaves an ordered item alone, which is not a bullet', () => {
    assert.equal(moved('1. Some prose', 'increase'), '# 1. Some prose');
  });

  test('leaves a thematic break as the break it is', () => {
    assert.equal(moved('---', 'increase'), '# ---');
  });

  test('decreasing a bullet does nothing — it is already level zero', () => {
    assert.deepEqual(adjustLineLevel(['- Some prose'], [], 0, 'decrease', 1), []);
  });

  test('a heading taken back off does not become a bullet again', () => {
    assert.equal(moved('# Some prose', 'decrease'), 'Some prose');
  });
});

describe('toggling a heading on and off the current line', () => {
  /** The line as a toggle would leave it, under a heading of `enclosing`. */
  function toggled(line: string, enclosing = 0): string {
    const above = enclosing > 0 ? [{ level: enclosing }] : [];
    const [edit] = placeLineLevel([line], [], 0, 'toggle', above, 'sibling');

    return edit
      ? line.slice(0, edit.fromColumn) + edit.text + line.slice(edit.toColumn)
      : line;
  }

  test('writes a heading onto a plain line at the enclosing level', () => {
    assert.equal(toggled('Some prose', 2), '## Some prose');
  });

  test('takes it back off when the line is already sitting there', () => {
    assert.equal(toggled('## Some prose', 2), 'Some prose');
  });

  test('one press then another returns the line it started from', () => {
    assert.equal(toggled(toggled('Some prose', 3), 3), 'Some prose');
    assert.equal(toggled(toggled('### Some prose', 3), 3), '### Some prose');
  });

  test('a heading at some other level is levelled first, not removed', () => {
    assert.equal(toggled('##### Some prose', 2), '## Some prose');
    assert.equal(toggled('# Some prose', 3), '### Some prose');
  });

  test('with nothing above, it is an H1 that goes on and off', () => {
    assert.equal(toggled('Some prose'), '# Some prose');
    assert.equal(toggled('# Some prose'), 'Some prose');
  });

  test('takes a bullet away on the way in, like the other placements', () => {
    assert.equal(toggled('- Some prose', 2), '## Some prose');
  });

  test('a line the document reads as code is left alone', () => {
    assert.deepEqual(placeLineLevel(['# A'], [true], 0, 'toggle', [], 'sibling'), []);
  });
});

describe('content travelling with a line that crosses between the two', () => {
  /**
   * The one thing the current-line scope reads beyond its own line, and only
   * because a list item and a heading disagree about what sits under them: an
   * item holds what is indented past it, a heading holds what follows it. A
   * line crossing between the two leaves what it held answering to nothing.
   */
  const LIFT = { headingsToBullets: false, bulletsToHeadings: false, liftNestedOnHeading: true };
  const OFF = { headingsToBullets: false, bulletsToHeadings: false, liftNestedOnHeading: false };

  /** The document as the edits would leave it. */
  function placed(
    lines: string[],
    lineNumber: number,
    placement: LinePlacement,
    conversion?: typeof LIFT
  ): string[] {
    const edits = placeLineLevel(lines, [], lineNumber, placement, [], 'root', conversion);
    const next = [...lines];
    for (const edit of edits) {
      next[edit.line] =
        next[edit.line].slice(0, edit.fromColumn) + edit.text + next[edit.line].slice(edit.toColumn);
    }
    return next;
  }

  const NESTED = ['- A', '\t- B', '\t\t- C', '\t\t\t- D', '\t\t\t\t- E', '\t\t\t\t\t- etc'];

  test('the items under a converted list item come out with it', () => {
    assert.deepEqual(placed(NESTED, 3, 'toggle', LIFT), [
      '- A', '\t- B', '\t\t- C', '# D', '- E', '\t- etc',
    ]);
  });

  test('switched off, they stay where they were', () => {
    assert.deepEqual(placed(NESTED, 3, 'toggle', OFF), [
      '- A', '\t- B', '\t\t- C', '# D', '\t\t\t\t- E', '\t\t\t\t\t- etc',
    ]);
  });

  test('the sibling and child placements carry the nesting too', () => {
    assert.deepEqual(placed(NESTED, 3, 'sibling', LIFT).slice(3), ['# D', '- E', '\t- etc']);
    assert.deepEqual(placed(NESTED, 3, 'child', LIFT).slice(3), ['# D', '- E', '\t- etc']);
  });

  test('the block ends at the first line no deeper than the item', () => {
    const lines = ['\t- D', '\t\t- E', '\t- sibling', '\t\t- its child'];

    assert.deepEqual(placed(lines, 0, 'toggle', LIFT), [
      '# D', '- E', '\t- sibling', '\t\t- its child',
    ]);
  });

  test('a blank line does not end it — a list with a gap is still one list', () => {
    const lines = ['- D', '\t- E', '', '\t- F'];

    assert.deepEqual(placed(lines, 0, 'toggle', LIFT), ['# D', '- E', '', '- F']);
  });

  test('a line that is not a list item has nothing nested to carry', () => {
    const lines = ['Some prose', '\t- E'];

    assert.deepEqual(placed(lines, 0, 'toggle', LIFT), ['# Some prose', '\t- E']);
  });

  test('an item holding nothing is written on its own', () => {
    assert.deepEqual(placed(['\t- D', '- after'], 0, 'toggle', LIFT), ['# D', '- after']);
  });
});

describe('what a removed heading leaves behind', () => {
  const PLAIN = { headingsToBullets: false, bulletsToHeadings: false, removeHeadingAs: 'plain' as const };
  const BULLET = { headingsToBullets: false, bulletsToHeadings: false, removeHeadingAs: 'bullet' as const };
  const SECTION = {
    headingsToBullets: false,
    bulletsToHeadings: false,
    removeHeadingAs: 'bullet-with-section' as const,
  };

  function removed(lines: string[], conversion?: object): string[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edits = placeLineLevel(lines, [], 0, 'plain', [], 'root', conversion as any);
    const next = [...lines];
    for (const edit of edits) {
      next[edit.line] =
        next[edit.line].slice(0, edit.fromColumn) + edit.text + next[edit.line].slice(edit.toColumn);
    }
    return next;
  }

  const SECTIONED = ['# D', '- E', '\t- etc', '# Next', '- untouched'];

  test('plain text, which is what it always wrote', () => {
    assert.deepEqual(removed(SECTIONED, PLAIN), ['D', '- E', '\t- etc', '# Next', '- untouched']);
  });

  test('the same with no conversion passed at all', () => {
    assert.deepEqual(removed(SECTIONED), ['D', '- E', '\t- etc', '# Next', '- untouched']);
  });

  test('a list item, leaving what followed where it was', () => {
    assert.deepEqual(removed(SECTIONED, BULLET), [
      '- D', '- E', '\t- etc', '# Next', '- untouched',
    ]);
  });

  test('a list item holding the section the heading held', () => {
    assert.deepEqual(removed(SECTIONED, SECTION), [
      '- D', '\t- E', '\t\t- etc', '# Next', '- untouched',
    ]);
  });

  /**
   * The section moves as one block, and in the unit the document already uses.
   * Padding a tab-indented list with spaces leaves `\t- child` written as
   * `  \t- child` — two indent styles on one line, a child of its parent only
   * because a tab happens to land on the column the parent's text starts at.
   */
  test('the block takes the indent the section already writes', () => {
    const tabs = ['# D', '- E', '\t- F', '- G'];
    const spaces = ['# D', '- E', '    - F', '- G'];

    assert.deepEqual(removed(tabs, SECTION), ['- D', '\t- E', '\t\t- F', '\t- G']);
    assert.deepEqual(removed(spaces, SECTION), ['- D', '    - E', '        - F', '    - G']);
  });

  test('the narrowest indent is the level, not the first one met', () => {
    const lines = ['# D', '\t\t- deep first', '\t- one level'];

    assert.deepEqual(removed(lines, SECTION), ['- D', '\t\t\t- deep first', '\t\t- one level']);
  });

  test('a flat section has no indent to learn from, so the marker sets it', () => {
    assert.deepEqual(removed(['# D', '- E', 'body'], SECTION), ['- D', '  - E', '  body']);
  });

  test('every line moves by the same amount, so the section keeps its shape', () => {
    const lines = ['# D', '- E', '\t- F', '\t\t- G', '- H'];
    const before = lines.slice(1).map((line) => line.length - line.trimStart().length);
    const after = removed(lines, SECTION).slice(1).map(
      (line) => line.length - line.trimStart().length
    );

    assert.deepEqual(
      after.map((width, index) => width - before[index]),
      [1, 1, 1, 1],
      'a uniform shift is what leaves the relative nesting untouched'
    );
  });

  test('the section stops at the next heading, whatever its level', () => {
    const lines = ['## D', 'body', '###### Deeper', 'after'];

    assert.deepEqual(removed(lines, SECTION), ['- D', '  body', '###### Deeper', 'after']);
  });

  test('a blank line inside the section is left blank rather than padded', () => {
    assert.deepEqual(removed(['# D', '', 'body'], SECTION), ['- D', '', '  body']);
  });

  /**
   * A `#` inside a fence is code, not a heading, so it does not end the section
   * the item is taking with it.
   */
  test('a hash inside a code fence does not end the section', () => {
    const lines = ['# D', '```', '# not a heading', '```', 'after'];
    const fenced = [false, false, true, false, false];
    const edits = placeLineLevel(lines, fenced, 0, 'plain', [], 'root', SECTION);
    const next = [...lines];
    for (const edit of edits) {
      next[edit.line] =
        next[edit.line].slice(0, edit.fromColumn) + edit.text + next[edit.line].slice(edit.toColumn);
    }

    assert.deepEqual(next, ['- D', '  ```', '  # not a heading', '  ```', '  after']);
  });
});
