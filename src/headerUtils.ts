import { Editor, Notice, EditorPosition } from 'obsidian';

export type AdjustmentOperation = 'increase' | 'decrease';

// Represents a header found in the document
export class HeaderObject {
  level: number;
  originalLevel: number;
  lineNumber: number; // 1-based line number
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
    const sortedHeaders = (operation === 'decrease')
        ? headers
        : [...headers].reverse();

    sortedHeaders.forEach(header => {
        let newLevel: number;
        if (operation === 'decrease') {
            newLevel = header.originalLevel - levels;
            newLevel = Math.max(1, newLevel); // Min level is 1
            // Adjust if trying to go below parent level
            if (header.parent && newLevel <= header.parent.level) {
                 newLevel = header.parent.level + 1;
            }
            header.level = Math.min(newLevel, 6); // Ensure level is not > 6 (max header level)

        } else { // increase
            newLevel = header.originalLevel + levels;
            newLevel = Math.min(6, newLevel); // Max level is 6
            // Adjust if trying to go above child level
            header.children.forEach(child => {
                // Compare with the *already potentially adjusted* child level
                if (newLevel >= child.level) {
                    newLevel = child.level - 1;
                }
            });
             header.level = Math.max(1, newLevel); // Ensure level is not < 1
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
    const sortedHeaders = [...headers].sort((a, b) => b.lineNumber - a.lineNumber);

    // 1. Create the array of potential change objects
    const potentialChanges = sortedHeaders.map(header => {
        // Only create a change object if the level actually changed
        if (header.level === header.originalLevel) {
            return null; // Indicate no change needed for this header
        }
        const newHeaderPrefix = '#'.repeat(header.level) + ' ';
        const lineIndex = header.lineNumber - 1; // 0-based index for editor lines
        // The change replaces the old '#' prefix with the new one
        return {
            from: { line: lineIndex, ch: 0 },
            to: { line: lineIndex, ch: header.originalLevel }, // Replace old '#'s length
            text: newHeaderPrefix
        };
    });

    // 2. Filter out the null values to get only the actual changes needed
    // The type predicate `change is Exclude<typeof change, null>` tells TypeScript
    // that the resulting array is guaranteed not to contain null.
    const actualChanges = potentialChanges.filter(
        (change): change is Exclude<typeof change, null> => change !== null
    );

    // 3. Only execute the transaction if there are changes to apply
    if (actualChanges.length > 0) {
        console.log("[Header Adjuster] Applying changes:", actualChanges); // Optional: log the changes
        editor.transaction({
            changes: actualChanges // Pass the filtered array of valid EditorChange objects
        });
    } else {
        console.log("[Header Adjuster] No header level changes to apply.");
    }
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
    // Default to full document range if fromLine/toLine are not provided (or are undefined/null)
    const startLine = fromLine ?? 0;
    const endLine = toLine ?? editor.lineCount() - 1;

    // Basic range sanity check
    if (startLine > endLine) {
        console.warn("[Header Adjuster] Start line is after end line, skipping adjustment.");
        return;
    }
     if (levels === 0) {
         console.log("[Header Adjuster] Adjustment level is 0, skipping.");
         return;
     }
     if (levels < 0) {
         console.warn("[Header Adjuster] Adjustment level is negative, skipping.");
         return;
     }


    // 1. Parse headers within the specified range
    console.log(`[Header Adjuster] Parsing headers from line ${startLine + 1} to ${endLine + 1}`);
    const headersInRange = parseHeaders(editor, startLine, endLine);

    if (headersInRange.length === 0) {
        new Notice("No headers found in the specified range/selection.");
        return;
    }
    console.log(`[Header Adjuster] Found ${headersInRange.length} headers in range.`);

    // 2. Calculate the new levels (mutates header objects)
    updateHeaderLevels(headersInRange, operation, levels);

    // 3. Apply the changes back to the editor
    applyHeaderChanges(editor, headersInRange);

    // Count how many actually changed
    const changedCount = headersInRange.filter(h => h.level !== h.originalLevel).length;
    if (changedCount > 0) {
        new Notice(`Adjusted ${changedCount} header(s).`);
    } else {
        new Notice(`No header levels needed adjustment in the range.`);
    }
}