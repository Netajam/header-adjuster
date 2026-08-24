import { Heading, matchHeadingLevel } from './heading';


/**
 * Reads a slice of a document into headings linked into a tree.
 *
 * Only lines inside `[fromLine, toLine]` are read, so an adjustment scoped to a
 * selection sees exactly the headings the user selected — a heading outside the
 * range is neither parent nor child of anything inside it.
 *
 * @param lines The whole document, one entry per line.
 * @param fromLine First 0-based line to read, clamped to the document.
 * @param toLine Last 0-based line to read (inclusive), clamped to the document.
 * @param fenced Lines inside a code fence, which are text rather than markup.
 */
export function parseHeadings(
  lines: readonly string[],
  fromLine = 0,
  toLine: number = lines.length - 1,
  fenced: readonly boolean[] = []
): Heading[] {
  const headings: Heading[] = [];
  const start = Math.max(0, fromLine);
  const end = Math.min(lines.length - 1, toLine);
  let previous: Heading | null = null;

  for (let index = start; index <= end; index++) {
    const level = fenced[index] ? null : matchHeadingLevel(lines[index]);
    if (level === null) {
      continue;
    }

    const heading = new Heading(level, index + 1);
    linkToTree(heading, previous);
    headings.push(heading);
    previous = heading;
  }

  return headings;
}

/**
 * Which lines open a new section: the headings, minus anything inside a fence.
 *
 * A section's body runs until the next of these, so this is what stops a `#`
 * written inside a code block from cutting a section in half.
 */
export function headingBoundaries(
  lines: readonly string[],
  fenced: readonly boolean[]
): boolean[] {
  return lines.map(
    (line, index) => !fenced[index] && matchHeadingLevel(line) !== null
  );
}

/**
 * Attaches a heading under the nearest preceding heading that outranks it.
 *
 * The previous heading is enough to find that ancestor: the tree is built in
 * document order, so walking up from it passes every candidate exactly once.
 * A heading with no such ancestor in range stays a root.
 */
function linkToTree(heading: Heading, previous: Heading | null): void {
  if (!previous) {
    return;
  }

  const parent =
    previous.level < heading.level ? previous : findAncestor(previous, heading.level);

  if (parent) {
    heading.parent = parent;
    parent.children.push(heading);
  }
}

/** Walks up from `from` to the first heading shallower than `level`. */
function findAncestor(from: Heading, level: number): Heading | null {
  let candidate = from.parent;
  while (candidate && candidate.level >= level) {
    candidate = candidate.parent;
  }
  return candidate;
}
