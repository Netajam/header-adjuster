import { Editor, MarkdownView, Menu, Notice, EditorSelectionOrCaret } from 'obsidian';
import HeaderAdjusterPlugin from './main';
import { LevelInputModal, AdjustmentOperation } from './ui/LevelInputModal';
import * as headerUtils from './headerUtils';

/** Opens the modal for detailed level adjustment (range or full doc). */
export function openLevelInputModal(plugin: HeaderAdjusterPlugin, operation: AdjustmentOperation): void {
  const modal = new LevelInputModal(
    plugin.app,
    // --- Callback when modal submits ---
    (levelsInput, startLineInput, endLineInput) => {
        // Determine final levels and range
        const levels = levelsInput ?? (operation === 'increase' ? plugin.settings.increaseLevel : plugin.settings.decreaseLevel);
        const startLine = startLineInput ? startLineInput - 1 : 0; 
        const endLine = endLineInput ? endLineInput - 1 : undefined; 

        const editor = plugin.app.workspace.activeEditor?.editor;
        if (!editor) {
            new Notice("No active editor found.");
            return;
        }
        // Call the core processing function
        headerUtils.processHeaderAdjustment(editor, operation, levels, startLine, endLine);
    },
    // --- Pass operation and settings to modal ---
    operation,
    plugin.settings
  );
  modal.open();
}

/** Handles default adjustment for the entire document. */
export function handleDefaultAdjustment(plugin: HeaderAdjusterPlugin, operation: AdjustmentOperation): void {
    const editor = plugin.app.workspace.activeEditor?.editor;
    if (!editor) {
        new Notice("No active editor found.");
        return;
    }
    const levels = operation === 'increase' ? plugin.settings.increaseLevel : plugin.settings.decreaseLevel;
    // Call core processing for the whole document (no line numbers specified)
    headerUtils.processHeaderAdjustment(editor, operation, levels);
}

/** Handles adjustment within the current editor selection using default levels. */
export function handleSelectionAdjustment(plugin: HeaderAdjusterPlugin, editor: Editor, operation: AdjustmentOperation): void {
    const levels = operation === 'increase' ? plugin.settings.increaseLevel : plugin.settings.decreaseLevel;


    const selection = editor.listSelections()[0];
    if (!selection) return; 

    // Get line numbers from the selection (anchor is start, head is end, regardless of direction)
    const from = selection.anchor.line < selection.head.line ? selection.anchor : selection.head;
    const to = selection.anchor.line >= selection.head.line ? selection.anchor : selection.head;

    const fromLine = from.line;
    const toLine = to.line;

    // Call core processing function with the selection's line range
    headerUtils.processHeaderAdjustment(editor, operation, levels, fromLine, toLine);
}