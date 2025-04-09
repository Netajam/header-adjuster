import { Editor,Notice, EditorPosition } from 'obsidian';

export type AdjustmentOperation = 'increase' | 'decrease';

// Represents a header found in the document
export class HeaderObject {
  level: number; 
  originalLevel: number; 
  lineNumber: number;
  content: string; 
  parent: HeaderObject | null; 
  children: HeaderObject[]; 

  constructor(level: number, lineNumber: number, content: string, parent: HeaderObject | null) {
    this.level = level;
    this.originalLevel = level;
    this.lineNumber = lineNumber;
    this.content = content;
    this.parent = parent;
    this.children = [];
  }
}

const HEADER_REGEX = /^(#{1,6})\s+(.*)$/; // Includes content capture

/**
 * Parses the specified lines in the editor and builds a hierarchical structure of HeaderObjects.
 * @param editor The Obsidian editor instance.
 * @param fromLine The starting line number (0-based).
 * @param toLine The ending line number (0-based).
 * @returns An array of HeaderObject instances found within the range.
 */
export function parseHeaders(editor: Editor, fromLine: number, toLine: number): HeaderObject[] {
    const headers: HeaderObject[] = [];
    let lastHeader: HeaderObject | null = null;
    const lineCount = editor.lineCount();

    // Clamp lines to valid editor range
    const start = Math.max(0, fromLine);
    const end = Math.min(lineCount - 1, toLine);

    for (let i = start; i <= end; i++) {
        const lineText = editor.getLine(i);
        const match = lineText.match(HEADER_REGEX);

        if (match) {
            const currentLevel = match[1].length;
            const content = match[2];
            // Create HeaderObject for line number i (1-based index is i + 1)
            const newHeader = new HeaderObject(currentLevel, i + 1, content, null);

            // Determine parent based on level and previous header
            if (lastHeader) {
                if (currentLevel > lastHeader.level) {
                    // Direct child
                    newHeader.parent = lastHeader;
                    lastHeader.children.push(newHeader);
                } else {
                    // Find appropriate ancestor
                    let parentCandidate = lastHeader.parent;
                    while (parentCandidate && parentCandidate.level >= currentLevel) {
                        parentCandidate = parentCandidate.parent;
                    }
                    newHeader.parent = parentCandidate;
                    if (parentCandidate) {
                        parentCandidate.children.push(newHeader);
                    }
                }
            } // else: it's a root-level header within the selection/range

            headers.push(newHeader);
            lastHeader = newHeader; // Update last header found
        }
    }
    return headers;
}

/**
 * Adjusts the 'level' property of HeaderObjects based on the operation and constraints.
 * Mutates the HeaderObject array directly.
 * @param headers The array of HeaderObjects to update.
 * @param operation 'increase' or 'decrease'.
 * @param levels The number of levels to adjust by.
 */
export function updateHeaderLevels(headers: HeaderObject[], operation: AdjustmentOperation, levels: number): void {
    // It's crucial to process decreases top-down and increases bottom-up
    // to correctly handle parent/child level constraints *within the processed set*.
    const sortedHeaders = (operation === 'decrease')
        ? headers // Process in found order (top-down)
        : [...headers].reverse(); // Process reversed order (bottom-up)

    sortedHeaders.forEach(header => {
        let newLevel: number;
        if (operation === 'decrease') {
            newLevel = header.originalLevel - levels;
            // Constraint: Cannot be lower than level 1
            newLevel = Math.max(1, newLevel);
            // Constraint: Cannot be equal to or lower than its *processed* parent's level
            // Note: parent's level might have already been adjusted if processing top-down
            if (header.parent && newLevel <= header.parent.level) {
                 newLevel = header.parent.level + 1;
            }
            // Final check against max level (although decreasing shouldn't hit this)
            header.level = Math.min(newLevel, 6);

        } else { // increase
            newLevel = header.originalLevel + levels;
            // Constraint: Cannot be higher than level 6
             newLevel = Math.min(6, newLevel);
            // Constraint: Cannot be equal to or higher than its *processed* child's level
            // Note: children's levels might have already been adjusted if processing bottom-up
            header.children.forEach(child => {
                if (newLevel >= child.level) {
                    newLevel = child.level - 1;
                }
            });
            // Final check against min level (increasing shouldn't hit this unless child constraint triggers)
            header.level = Math.max(1, newLevel);
        }
    });
}

/**
 * Applies the adjusted levels back to the editor document.
 * @param editor The Obsidian editor instance.
 * @param headers The array of mutated HeaderObjects containing the new levels.
 */
export function applyHeaderChanges(editor: Editor, headers: HeaderObject[]): void {
    // Apply changes from bottom to top to avoid messing up line numbers
    // for subsequent changes in the same transaction.
    const sortedHeaders = [...headers].sort((a, b) => b.lineNumber - a.lineNumber);

    editor.transaction({
        changes: sortedHeaders.map(header => {
            // Only apply if the level actually changed
            if (header.level === header.originalLevel) {
                return null; // Return null or undefined for no change
            }
            const newHeaderPrefix = '#'.repeat(header.level) + ' ';
            const lineIndex = header.lineNumber - 1; // 0-based index
            return {
                from: { line: lineIndex, ch: 0 },
                to: { line: lineIndex, ch: header.originalLevel }, // Replace old '#'s
                text: newHeaderPrefix
            };
        }).filter(change => change !== null) // Filter out null changes
    });
}

/**
 * Orchestrates the header adjustment process for a given range or selection.
 * @param editor The editor instance.
 * @param operation 'increase' or 'decrease'.
 * @param levels The number of levels to adjust by.
 * @param fromLine Optional starting line (0-based). Defaults to 0.
 * @param toLine Optional ending line (0-based). Defaults to last line.
 */
export function processHeaderAdjustment(
    editor: Editor,
    operation: AdjustmentOperation,
    levels: number,
    fromLine?: number,
    toLine?: number
): void {
    const startLine = fromLine ?? 0;
    const endLine = toLine ?? editor.lineCount() - 1;

    if (startLine > endLine) {
        console.warn("[Header Adjuster] Start line is after end line, skipping adjustment.");
        return;
    }

    // 1. Parse headers within the specified range
    const headersInRange = parseHeaders(editor, startLine, endLine);

    if (headersInRange.length === 0) {
        new Notice("No headers found in the specified range/selection.");
        return;
    }

    // 2. Calculate the new levels (mutates header objects)
    updateHeaderLevels(headersInRange, operation, levels);

    // 3. Apply the changes back to the editor
    applyHeaderChanges(editor, headersInRange);

    new Notice(`Adjusted ${headersInRange.filter(h => h.level !== h.originalLevel).length} header(s).`);
}