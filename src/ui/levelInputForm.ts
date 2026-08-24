import { Setting } from 'obsidian';
import type { AdjustmentOperation } from '../contracts';
import { describeProblem } from './submissionValidation';

/**
 * The three number fields of the level dialog, and what they add up to.
 *
 * The modal owns the buttons and the decision to close; this owns the inputs
 * and what they mean. Enter in any field is routed to the same handler the
 * Submit button uses, which the modal passes in.
 */

/** What the user typed, in the units the dialog speaks: 1-based line numbers. */
export interface LevelInputSubmission {
  /** Undefined when the field was left blank, meaning "use the default". */
  levels: number | undefined;
  /** Null when blank, meaning "from the top of the document". */
  startLine: number | null;
  /** Null when blank, meaning "to the end of the document". */
  endLine: number | null;
}

/** Either a submission worth acting on, or the first thing wrong with it. */
export type FormReading =
  | { submission: LevelInputSubmission }
  | { problem: string };

export class LevelInputForm {
  private readonly levelsInput: HTMLInputElement;
  private readonly startLineInput: HTMLInputElement;
  private readonly endLineInput: HTMLInputElement;

  constructor(
    contentEl: HTMLElement,
    operation: AdjustmentOperation,
    defaultLevel: number,
    onEnter: () => void
  ) {
    this.levelsInput = addNumberField(
      contentEl,
      `Levels to ${operation}`,
      `Leave blank to use default (${defaultLevel})`,
      String(defaultLevel)
    );
    this.startLineInput = addNumberField(
      contentEl,
      'Start line (optional)',
      'Apply adjustment starting from this line number.',
      'e.g., 1'
    );
    this.endLineInput = addNumberField(
      contentEl,
      'End line (optional)',
      'Apply adjustment up to and including this line number.',
      'e.g., 50'
    );

    for (const input of [this.levelsInput, this.startLineInput, this.endLineInput]) {
      submitOnEnter(input, onEnter);
    }
  }

  focus(): void {
    this.levelsInput.focus();
  }

  /** Reads the fields and validates them in one step. */
  read(): FormReading {
    const submission: LevelInputSubmission = {
      levels: readOptionalNumber(this.levelsInput) ?? undefined,
      startLine: readOptionalNumber(this.startLineInput),
      endLine: readOptionalNumber(this.endLineInput),
    };

    const problem = describeProblem(
      submission.levels,
      submission.startLine,
      submission.endLine
    );
    return problem ? { problem } : { submission };
  }
}

/** One optional, positive-integer field. */
function addNumberField(
  contentEl: HTMLElement,
  name: string,
  description: string,
  placeholder: string
): HTMLInputElement {
  let inputEl!: HTMLInputElement;

  new Setting(contentEl)
    .setName(name)
    .setDesc(description)
    .addText((text) => {
      text.inputEl.type = 'number';
      text.inputEl.min = '1';
      text.setPlaceholder(placeholder);
      inputEl = text.inputEl;
    });

  return inputEl;
}

/** Null for a blank field; NaN for a field holding something that is not a number. */
function readOptionalNumber(input: HTMLInputElement): number | null {
  return input.value ? parseInt(input.value, 10) : null;
}

/** Enter in a field is the same as pressing Submit. */
function submitOnEnter(input: HTMLInputElement, onEnter: () => void): void {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onEnter();
    }
  });
}
