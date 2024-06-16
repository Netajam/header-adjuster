import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownView, Editor, Menu } from 'obsidian';

interface HeaderAdjusterSettings {
  increaseLevel: number;
  decreaseLevel: number;
}

const DEFAULT_SETTINGS: HeaderAdjusterSettings = {
  increaseLevel: 1,
  decreaseLevel: 1
};

class HeaderObject {
  level: number;
  lineNumber: number;
  parent: HeaderObject | null;
  children: HeaderObject[];

  constructor(level: number, lineNumber: number, parent: HeaderObject | null) {
    this.level = level;
    this.lineNumber = lineNumber;
    this.parent = parent;
    this.children = [];
  }
}

export default class HeaderAdjusterPlugin extends Plugin {
  settings: HeaderAdjusterSettings;

  async onload() {
    await this.loadSettings();

    const ribbonIconEl = this.addRibbonIcon('heading', 'Adjust Headers', (event) => {
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle('Increase Header Level').onClick(() => this.openLevelInputModal('increase'))
      );
      menu.addItem((item) =>
        item.setTitle('Decrease Header Level').onClick(() => this.openLevelInputModal('decrease'))
      );
      menu.showAtMouseEvent(event);
    });

    this.addCommand({
      id: 'increase-header-level',
      name: 'Increase Header Level',
      callback: () => this.openLevelInputModal('increase')
    });

    this.addCommand({
      id: 'decrease-header-level',
      name: 'Decrease Header Level',
      callback: () => this.openLevelInputModal('decrease')
    });

    this.addCommand({
      id: 'increase-header-level-default',
      name: 'Increase Header Level (Default)',
      callback: () => this.adjustHeaders('increase', this.settings.increaseLevel, null, null)
    });

    this.addCommand({
      id: 'decrease-header-level-default',
      name: 'Decrease Header Level (Default)',
      callback: () => this.adjustHeaders('decrease', this.settings.decreaseLevel, null, null)
    });

    this.addSettingTab(new HeaderAdjusterSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  openLevelInputModal(operation: 'increase' | 'decrease') {
    const modal = new LevelInputModal(this.app, (levels, startLine, endLine) => {
      if (isNaN(levels)) {
        levels = operation === 'increase' ? this.settings.increaseLevel : this.settings.decreaseLevel;
      }
      this.adjustHeaders(operation, levels, startLine, endLine);
    }, operation, this.settings);
    modal.open();
  }

  adjustHeaders(operation: 'increase' | 'decrease', levels: number, startLine: number | null, endLine: number | null) {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) {
      new Notice("No active editor found");
      return;
    }

    const view = activeLeaf.view as MarkdownView;
    if (view.getViewType() !== 'markdown') {
      new Notice("Active view is not a markdown file");
      return;
    }

    const editor = view.editor;
    if (!editor) {
      new Notice("No editor found");
      return;
    }

    const headerObjects = this.createHeaderObjects(editor, startLine, endLine);

    if (operation === 'increase') {
      headerObjects.reverse();
    }

    this.updateHeaderLevels(headerObjects, operation, levels);

    this.applyHeaderChanges(editor, headerObjects);
  }

  createHeaderObjects(editor: Editor, startLine: number | null, endLine: number | null): HeaderObject[] {
    const headerPattern = /^(#{1,6})\s(.*)$/;
    const headerObjects: HeaderObject[] = [];
    let lastHeader: HeaderObject | null = null;

    for (let i = 0; i < editor.lineCount(); i++) {
      if ((startLine !== null && i + 1 < startLine) || (endLine !== null && i + 1 > endLine)) {
        continue;
      }

      const line = editor.getLine(i);
      const match = line.match(headerPattern);

      if (match) {
        const currentLevel = match[1].length;
        const newHeader = new HeaderObject(currentLevel, i + 1, null);

        if (lastHeader && currentLevel > lastHeader.level) {
          newHeader.parent = lastHeader;
          lastHeader.children.push(newHeader);
        } else if (lastHeader) {
          let parent = lastHeader.parent;
          while (parent && parent.level >= currentLevel) {
            parent = parent.parent;
          }
          newHeader.parent = parent;
          if (parent) {
            parent.children.push(newHeader);
          }
        }

        headerObjects.push(newHeader);
        lastHeader = newHeader;
      }
    }

    return headerObjects;
  }

  updateHeaderLevels(headerObjects: HeaderObject[], operation: 'increase' | 'decrease', levels: number) {
    headerObjects.forEach(header => {
      if (operation === 'decrease') {
        let newLevel = header.level - levels;
        if (header.parent && newLevel <= header.parent.level) {
          newLevel = header.parent.level + 1;
        }
        header.level = Math.max(newLevel, 1);
      } else if (operation === 'increase') {
        let newLevel = header.level + levels;
        header.children.forEach(child => {
          if (newLevel >= child.level) {
            newLevel = child.level - 1;
          }
        });
        header.level = Math.min(newLevel, 6);
      }
    });
  }

  applyHeaderChanges(editor: Editor, headerObjects: HeaderObject[]) {
    headerObjects.forEach(header => {
      const line = editor.getLine(header.lineNumber - 1);
      const newHeader = '#'.repeat(header.level) + ' ' + line.replace(/^(#{1,6})\s/, '');
      editor.replaceRange(newHeader, { line: header.lineNumber - 1, ch: 0 }, { line: header.lineNumber - 1, ch: line.length });
    });
  }
}

class LevelInputModal extends Modal {
  onSubmit: (levels: number, startLine: number | null, endLine: number | null) => void;
  operation: 'increase' | 'decrease';
  settings: HeaderAdjusterSettings;

  constructor(app: App, onSubmit: (levels: number, startLine: number | null, endLine: number | null) => void, operation: 'increase' | 'decrease', settings: HeaderAdjusterSettings) {
    super(app);
    this.onSubmit = onSubmit;
    this.operation = operation;
    this.settings = settings;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText(`Enter the number of levels to ${this.operation} (or leave blank for default):`);

    const inputLevels = contentEl.createEl('input', { type: 'number', placeholder: `${this.operation === 'increase' ? this.settings.increaseLevel : this.settings.decreaseLevel}` });
    inputLevels.focus();

    contentEl.createEl('br');
    contentEl.createEl('label', { text: 'Start Line (optional):' });
    const inputStartLine = contentEl.createEl('input', { type: 'number', placeholder: 'Start Line' });

    contentEl.createEl('br');
    contentEl.createEl('label', { text: 'End Line (optional):' });
    const inputEndLine = contentEl.createEl('input', { type: 'number', placeholder: 'End Line' });

    contentEl.createEl('button', { text: 'Submit' }).addEventListener('click', () => {
      const levels = parseInt(inputLevels.value);
      const startLine = inputStartLine.value ? parseInt(inputStartLine.value) : null;
      const endLine = inputEndLine.value ? parseInt(inputEndLine.value) : null;
      this.onSubmit(levels, startLine, endLine);
      this.close();
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class HeaderAdjusterSettingTab extends PluginSettingTab {
  plugin: HeaderAdjusterPlugin;

  constructor(app: App, plugin: HeaderAdjusterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Header Adjuster Settings' });

    new Setting(containerEl)
      .setName('Default Increase Level')
      .setDesc('The default level to increase headers by.')
      .addSlider(slider => slider
        .setLimits(1, 6, 1)
        .setValue(this.plugin.settings.increaseLevel)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.increaseLevel = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default Decrease Level')
      .setDesc('The default level to decrease headers by.')
      .addSlider(slider =>slider
		.setLimits(1, 6, 1)
		.setValue(this.plugin.settings.decreaseLevel)
		.setDynamicTooltip()
		.onChange(async (value) => {
		this.plugin.settings.decreaseLevel = value;
		await this.plugin.saveSettings();
		}));
		}
		}