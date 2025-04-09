import { App, Modal, Setting, Notice } from 'obsidian'; 
import { HeaderAdjusterSettings } from '../settings'; 

export type AdjustmentOperation = 'increase' | 'decrease';

export class LevelInputModal extends Modal {
  onSubmit: (levels: number | undefined, startLine: number | null, endLine: number | null) => void;
  operation: AdjustmentOperation;
  settings: HeaderAdjusterSettings;

  private levelsInputEl: HTMLInputElement;
  private startLineInputEl: HTMLInputElement;
  private endLineInputEl: HTMLInputElement;

  constructor(
    app: App,
    onSubmit: (levels: number | undefined, startLine: number | null, endLine: number | null) => void,
    operation: AdjustmentOperation,
    settings: HeaderAdjusterSettings
    ) {
    super(app);
    this.onSubmit = onSubmit;
    this.operation = operation;
    this.settings = settings;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const defaultLevel = this.operation === 'increase' ? this.settings.increaseLevel : this.settings.decreaseLevel;
    contentEl.createEl('h3', { text: `Adjust Header Levels` });

    new Setting(contentEl)
      .setName(`Levels to ${this.operation}`)
      .setDesc(`Leave blank to use default (${defaultLevel})`)
      .addText(text => {
        text.inputEl.type = 'number';
        text.setPlaceholder(String(defaultLevel));
        text.inputEl.min = '1';
        this.levelsInputEl = text.inputEl; // Assign to class property
        this.levelsInputEl.focus();
      });

    new Setting(contentEl)
      .setName('Start line (optional)')
      .setDesc('Apply adjustment starting from this line number.')
      .addText(text => {
        text.inputEl.type = 'number';
        text.setPlaceholder('e.g., 1');
        text.inputEl.min = '1';
        this.startLineInputEl = text.inputEl;
      });

     new Setting(contentEl)
      .setName('End line (optional)')
      .setDesc('Apply adjustment up to and including this line number.')
      .addText(text => {
        text.inputEl.type = 'number';
        text.setPlaceholder('e.g., 50');
        text.inputEl.min = '1';
        this.endLineInputEl = text.inputEl; 
      });

    // Submit Button Setting
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Submit')
        .setCta()
        .onClick(() => {
            const levels = this.levelsInputEl.value ? parseInt(this.levelsInputEl.value, 10) : undefined;
            const startLine = this.startLineInputEl.value ? parseInt(this.startLineInputEl.value, 10) : null;
            const endLine = this.endLineInputEl.value ? parseInt(this.endLineInputEl.value, 10) : null;

            if (this.levelsInputEl.value && (isNaN(levels ?? NaN) || (levels ?? 0) < 1)) {
                 new Notice("Please enter a valid positive number for levels.");
                 return;
            }
             if (startLine !== null && (isNaN(startLine) || startLine < 1)) {
                 new Notice("Please enter a valid positive number for start line.");
                 return;
            }
             if (endLine !== null && (isNaN(endLine) || endLine < 1)) {
                 new Notice("Please enter a valid positive number for end line.");
                 return;
            }
            if (startLine !== null && endLine !== null && endLine < startLine) {
                new Notice("End line cannot be before start line.");
                return;
            }
            this.onSubmit(levels, startLine, endLine);
            this.close();
        }))
      .addButton(button => button 
        .setButtonText('Cancel')
        .onClick(() => {
            this.close();
        }));

  
    // Add event listeners *after* all input elements are guaranteed to be created and assigned

    const submitButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement | null;

    if (this.levelsInputEl && submitButton) {
        this.levelsInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitButton.click(); 
            }
        });
    }

    if (this.startLineInputEl && submitButton) {
        this.startLineInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitButton.click(); // Use .click()
            }
        });
    }

     if (this.endLineInputEl && submitButton) {
        this.endLineInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitButton.click();
            }
        });
     }

  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}