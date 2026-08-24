import type { App } from 'obsidian';
import type { AdjustmentOperation } from '../contracts';
import type { LevelInputSubmission } from './levelInputForm';
import { Modal, Notice, Setting } from 'obsidian';
import { LevelInputForm } from './levelInputForm';

export type { LevelInputSubmission };

/** What the dialog needs to describe itself before the user types anything. */
export interface LevelPrompt {
  operation: AdjustmentOperation;
  /** The shift applied when the levels field is left blank. */
  defaultLevel: number;
}

/**
 * Asks for a shift and an optional line range before adjusting — the door
 * into `ui/`.
 *
 * The fields and what they mean belong to `LevelInputForm`; this owns the
 * frame around them: the title, the two buttons, and when to close.
 */
export class LevelInputModal extends Modal {
  private readonly prompt: LevelPrompt;
  private readonly onSubmit: (submission: LevelInputSubmission) => void;
  private form: LevelInputForm;

  constructor(
    app: App,
    prompt: LevelPrompt,
    onSubmit: (submission: LevelInputSubmission) => void
  ) {
    super(app);
    this.prompt = prompt;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: 'Adjust Header Levels' });

    this.form = new LevelInputForm(
      contentEl,
      this.prompt.operation,
      this.prompt.defaultLevel,
      () => this.submit()
    );

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText('Submit')
          .setCta()
          .onClick(() => this.submit())
      )
      .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()));

    this.form.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private submit(): void {
    const reading = this.form.read();

    if ('problem' in reading) {
      new Notice(reading.problem);
      return;
    }

    this.onSubmit(reading.submission);
    this.close();
  }
}
