import { App, Notice, Plugin, MarkdownView, Editor, Menu } from 'obsidian';
import { HeaderAdjusterSettings, DEFAULT_SETTINGS, HeaderAdjusterSettingTab } from './settings';
import * as commands from './commands'
import { AdjustmentOperation } from './ui/LevelInputModal'; 
import * as headerUtils from './headerUtils'; 

export default class HeaderAdjusterPlugin extends Plugin {
  settings: HeaderAdjusterSettings;

  async onload() {
    console.log("Loading Header Adjuster Plugin");
    await this.loadSettings();

    // --- Ribbon Icon ---
    this.addRibbonIcon('heading', 'Adjust headers', (event) => {
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle('Increase level...')
            .setIcon('plus-square')
            .onClick(() => commands.openLevelInputModal(this, 'increase')) 
      );
      menu.addItem((item) =>
        item.setTitle('Decrease level...') 
            .setIcon('minus-square')
            .onClick(() => commands.openLevelInputModal(this, 'decrease')) 
      );
      menu.addSeparator(); 

      menu.addItem((item) =>
        item.setTitle("Increase level by 1 (Document)")
            .setIcon("chevron-up") 
            .onClick(() => {
                const editor = this.app.workspace.activeEditor?.editor;
                if (!editor) {
                    new Notice("No active editor found.");
                    return;
                }
                headerUtils.processHeaderAdjustment(editor, 'increase', 1);
            })
      );
      menu.addItem((item) =>
        item.setTitle("Decrease level by 1 (Document)")
            .setIcon("chevron-down") 
            .onClick(() => {
                const editor = this.app.workspace.activeEditor?.editor;
                if (!editor) {
                    new Notice("No active editor found.");
                    return;
                }
                headerUtils.processHeaderAdjustment(editor, 'decrease', 1);
            })
      );

      menu.addSeparator();

       menu.addItem((item) => 
        item.setTitle(`Increase level by (+${this.settings.increaseLevel}) (Selection)`)
            .setIcon('plus-square')
            .onClick(() => {
                const editor = this.app.workspace.activeEditor?.editor;
                if (editor && editor.somethingSelected()) {
                     commands.handleSelectionAdjustment(this, editor, 'increase');
                } else {
                    new Notice("Select text containing headers first.");
                }
            })
      );
        menu.addItem((item) =>
        item.setTitle(`Decrease level by  (-${this.settings.decreaseLevel}) (Selection)`)
            .setIcon('minus-square')
            .onClick(() => {
                 const editor = this.app.workspace.activeEditor?.editor;
                 if (editor && editor.somethingSelected()) {
                    commands.handleSelectionAdjustment(this, editor, 'decrease');
                 } else {
                     new Notice("Select text containing headers first.");
                 }
            })
      );
      menu.showAtMouseEvent(event);
    });

    // --- Commands ---
    this.addCommand({
      id: 'increase-header-level',
      name: 'Increase header level...', 
      callback: () => commands.openLevelInputModal(this, 'increase')
    });

    this.addCommand({
      id: 'decrease-header-level',
      name: 'Decrease header level...',
      callback: () => commands.openLevelInputModal(this, 'decrease') 
    });

    this.addCommand({
      id: 'increase-header-level-default',
      name: `Increase header level by ${this.settings.increaseLevel} (entire document)`,
      callback: () => commands.handleDefaultAdjustment(this, 'increase') 
    });

    this.addCommand({
      id: 'decrease-header-level-default',
      name: `Decrease header level by ${this.settings.decreaseLevel} (entire document)`,
      callback: () => commands.handleDefaultAdjustment(this, 'decrease')
    });

    // --- NEW Selection Commands ---
    this.addCommand({
        id: 'increase-header-level-selection-default',
        name: `Increase header level in selection by ${this.settings.increaseLevel}`,
        editorCheckCallback: (checking, editor, view) => {
            if (editor.somethingSelected()) {
                if (!checking) {
                    commands.handleSelectionAdjustment(this, editor, 'increase');
                }
                return true; 
            }
            return false; 
        }
    });

     this.addCommand({
        id: 'decrease-header-level-selection-default',
        name: `Decrease header level in selection by ${this.settings.decreaseLevel}`,
        editorCheckCallback: (checking, editor, view) => {
            if (editor.somethingSelected()) {
                if (!checking) {
                    commands.handleSelectionAdjustment(this, editor, 'decrease');
                }
                return true; 
            }
            return false; 
        }
    });


    // --- Settings Tab ---
    this.addSettingTab(new HeaderAdjusterSettingTab(this.app, this));
  }

  onunload(): void {
      console.log("Unloading Header Adjuster Plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}