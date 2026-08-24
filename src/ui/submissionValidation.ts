/**
 * What the level dialog accepts, decided without a dialog.
 *
 * Takes the three values rather than the object that holds them, so this file
 * shares no type with its parent and stays a leaf.
 */

/** The first thing wrong with what the user typed, phrased for them, or null. */
export function describeProblem(
  levels: number | undefined,
  startLine: number | null,
  endLine: number | null
): string | null {
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
