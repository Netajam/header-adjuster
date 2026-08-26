import type { App, Editor } from 'obsidian';
import { MarkdownView, Notice } from 'obsidian';

/**
 * Which editor a command acts on.
 *
 * Every command starts with this question and none of them answer it the same
 * way twice, so it is asked here once. Reading the workspace is also the only
 * Obsidian knowledge `commands/` holds that is not about a command at all.
 */

/**
 * All this file needs of the plugin.
 *
 * Stated rather than imported: naming `CommandContext` here would point an
 * arrow back at the file that already imports this one, and the workspace is
 * the whole of what finding an editor takes. `CommandContext` satisfies it
 * without knowing this interface exists.
 */
export interface EditorHost {
  readonly app: App;
}

/**
 * The editor of whichever Markdown view is open, or null.
 *
 * `workspace.activeEditor` tracks focus rather than the workspace: it stays null
 * until a Markdown editor has actually been focused, so a session restored with
 * a file already open reports no editor until the user clicks into the text.
 * Asking which view is active answers the question that was meant. The old
 * reading stays as a fallback for the cases it still covers, such as a Canvas
 * embedding a Markdown editor, where there is no active `MarkdownView`.
 */
export function activeEditor(host: EditorHost): Editor | null {
  const view = host.app.workspace.getActiveViewOfType(MarkdownView);
  return view?.editor ?? host.app.workspace.activeEditor?.editor ?? null;
}

/** The editor the user is in, or null after telling them there isn't one. */
export function requireActiveEditor(host: EditorHost): Editor | null {
  const editor = activeEditor(host);
  if (!editor) {
    new Notice('No active editor found.');
    return null;
  }
  return editor;
}
