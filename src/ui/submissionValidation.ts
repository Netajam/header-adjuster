/**
 * What the level-input dialog accepts, decided without a dialog.
 *
 * Kept apart from the modal so the rules can be read — and tested — without
 * standing up Obsidian's UI.
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

/** The first thing wrong with a submission, phrased for the user, or null. */
export function describeProblem(submission: LevelInputSubmission): string | null {
  const { levels, startLine, endLine } = submission;

  if (levels !== undefined && !isPositiveInteger(levels)) {
    return 'Please enter a valid positive number for levels.';
  }
  if (startLine !== null && !isPositiveInteger(startLine)) {
    return 'Please enter a valid positive number for start line.';
  }
  if (endLine !== null && !isPositiveInteger(endLine)) {
    return 'Please enter a valid positive number for end line.';
  }
  if (startLine !== null && endLine !== null && endLine < startLine) {
    return 'End line cannot be before start line.';
  }
  return null;
}

function isPositiveInteger(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && !isNaN(value) && value >= 1;
}
