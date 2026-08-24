import type { AdjustmentRequest } from '../../src/core/adjustHeadings';
import { adjustHeadings } from '../../src/core/adjustHeadings';
import { applyHeadingEdits } from '../../src/core/headingEdits';

/**
 * Runs an adjustment over a Markdown snippet and gives back the resulting text.
 *
 * Tests read as before/after documents this way, which is how the feature is
 * actually experienced — the intermediate heading tree is an implementation
 * detail they should not have to spell out.
 */
export function adjust(
  markdown: string,
  request: AdjustmentRequest
): { text: string; changedCount: number } {
  const lines = markdown.split('\n');
  const outcome = adjustHeadings(lines, request);

  if (outcome.status === 'rejected') {
    throw new Error(`Expected an adjustment, got rejection: ${outcome.reason}`);
  }

  return {
    text: applyHeadingEdits(lines, outcome.edits).join('\n'),
    changedCount: outcome.changedCount,
  };
}

/** Trims the leading newline and shared indentation off a template literal. */
export function doc(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = strings.reduce(
    (text, part, index) => text + String(values[index - 1]) + part
  );
  const lines = raw.replace(/^\n/, '').replace(/\n[ \t]*$/, '').split('\n');
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim() !== '')
      .map((line) => line.length - line.trimStart().length)
  );

  return lines.map((line) => line.slice(indent)).join('\n');
}
