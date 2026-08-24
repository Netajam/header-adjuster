import { App, Modal, Notice, Setting } from 'obsidian';
import type { AdjustmentOperation } from '../core/operations';
import type { HeaderAdjusterSettings } from '../settings/settingsModel';
import type { LevelInputSubmission } from './submissionValidation';
import { defaultLevelFor } from '../settings/settingsModel';
import { describeProblem } from './submissionValidation';

export type { LevelInputSubmission };

/** Asks for a shift and an optional line range before adjusting. */
export class LevelInputModal extends Modal {
  private readonly onSubmit: (submission: LevelInputSubmission) => void;
  private readonly operation: AdjustmentOperation;
  private readonly settings: HeaderAdjusterSettings;

  private levelsInput: HTMLInputElement;
  private startLineInput: HTMLInputElement;
  private endLineInput: HTMLInputElement;

  constructor(
    app: App,
    onSubmit: (submission: LevelInputSubmission) => void,
    operation: AdjustmentOperation,
    settings: HeaderAdjusterSettings
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.operation = operation;
    this.settings = settings;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: 'Adjust Header Levels' });

    const defaultLevel = defaultLevelFor(this.settings, this.operation);

    this.levelsInput = this.addNumberField(
      `Levels to ${this.operation}`,
      `Leave blank to use default (${defaultLevel})`,
      String(defaultLevel)
    );
    this.levelsInput.focus();

    this.startLineInput = this.addNumberField(
      'Start line (optional)',
      'Apply adjustment starting from this line number.',
      'e.g., 1'
    );

    this.endLineInput = this.addNumberField(
      'End line (optional)',
      'Apply adjustment up to and including this line number.',
      'e.g., 50'
    );

    const submitButton = this.addButtons();
    for (const input of [this.levelsInput, this.startLineInput, this.endLineInput]) {
      submitOnEnter(input, submitButton);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }

  /** One optional, positive-integer field. */
  private addNumberField(
    name: string,
    description: string,
    placeholder: string
  ): HTMLInputElement {
    let inputEl!: HTMLInputElement;

    new Setting(this.contentEl)
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

  /** Submit and Cancel, returning the submit button so Enter can reach it. */
  private addButtons(): HTMLButtonElement {
    let submitEl!: HTMLButtonElement;

    new Setting(this.contentEl)
      .addButton((button) => {
        button
          .setButtonText('Submit')
          .setCta()
          .onClick(() => this.submit());
        submitEl = button.buttonEl;
      })
      .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()));

    return submitEl;
  }

  private submit(): void {
    const submission = this.readSubmission();
    const problem = describeProblem(submission);

    if (problem) {
      new Notice(problem);
      return;
    }

    this.onSubmit(submission);
    this.close();
  }

  private readSubmission(): LevelInputSubmission {
    return {
      levels: readOptionalNumber(this.levelsInput) ?? undefined,
      startLine: readOptionalNumber(this.startLineInput),
      endLine: readOptionalNumber(this.endLineInput),
    };
  }
}

/** Null for a blank field; NaN for a field holding something that is not a number. */
function readOptionalNumber(input: HTMLInputElement): number | null {
  return input.value ? parseInt(input.value, 10) : null;
}

/** Enter in a field is the same as pressing Submit. */
function submitOnEnter(input: HTMLInputElement, submitButton: HTMLButtonElement): void {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitButton.click();
    }
  });
}
