/**
 * Which lines of a document sit inside a fenced code block.
 *
 * Inside a fence, `#` and `-` are ordinary characters: a shell comment is not a
 * heading and a YAML sequence is not a list. Every part of the adjustment that
 * recognises Markdown consults this first, so none of them rewrite code.
 *
 * A leaf: it reads lines and answers about lines, and knows nothing of headings.
 */

/** A fence opener or closer. Indentation is unbounded — a fence carried into a
 * list item is indented along with the rest of that item's content. */
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})(.*)$/;

/**
 * Flags every line inside a fenced block, the fence lines themselves included.
 *
 * A closing fence has to match its opener's character and be at least as long,
 * and carry no info string — so a ``` inside a ~~~ block does not end it. An
 * unterminated fence runs to the end of the document, which is the safe way to
 * be wrong: over-detecting shields text that was never markup, while
 * under-detecting corrupts code.
 */
export function computeFencedLines(lines: readonly string[]): boolean[] {
  const fenced = new Array<boolean>(lines.length).fill(false);
  let openCharacter: string | null = null;
  let openLength = 0;

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(FENCE_PATTERN);

    if (openCharacter === null) {
      if (match) {
        openCharacter = match[1][0];
        openLength = match[1].length;
        fenced[index] = true;
      }
      continue;
    }

    fenced[index] = true;
    if (closes(match, openCharacter, openLength)) {
      openCharacter = null;
    }
  }

  return fenced;
}

/** Whether this line ends a fence opened with `character` repeated `length` times. */
function closes(
  match: RegExpMatchArray | null,
  character: string,
  length: number
): boolean {
  return (
    match !== null &&
    match[1][0] === character &&
    match[1].length >= length &&
    match[2].trim() === ''
  );
}
