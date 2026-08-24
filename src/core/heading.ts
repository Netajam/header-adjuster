/**
 * An ATX heading line: between MIN_HEADING_LEVEL and MAX_HEADING_LEVEL `#`,
 * whitespace, then the heading text.
 */
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;

/** What a heading line says, before it is placed in a document. */
export interface HeadingMatch {
  level: number;
  content: string;
}

/** Reads a single line as a heading, or reports that it is not one. */
export function matchHeading(line: string): HeadingMatch | null {
  const match = line.match(HEADING_PATTERN);
  if (!match) {
    return null;
  }
  return { level: match[1].length, content: match[2] };
}

/**
 * A heading found in a document, together with its place in the heading tree.
 *
 * `originalLevel` is the level as written on disk and never changes; `level` is
 * the working value an adjustment moves. The two differing is what marks a
 * heading as needing an edit.
 */
export class Heading {
  level: number;
  readonly originalLevel: number;
  /** 1-based line number, as shown to the user. */
  readonly lineNumber: number;
  readonly content: string;
  parent: Heading | null;
  readonly children: Heading[] = [];

  constructor(
    level: number,
    lineNumber: number,
    content: string,
    parent: Heading | null = null
  ) {
    this.level = level;
    this.originalLevel = level;
    this.lineNumber = lineNumber;
    this.content = content;
    this.parent = parent;
  }

  /** 0-based index of this heading's line, as document arrays address it. */
  get lineIndex(): number {
    return this.lineNumber - 1;
  }

  /** True once an adjustment has moved this heading off its written level. */
  get hasChanged(): boolean {
    return this.level !== this.originalLevel;
  }
}
