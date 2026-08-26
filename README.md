# Header Adjuster Plugin for Obsidian

## Overview

The Header Adjuster Plugin for Obsidian allows users to easily adjust the levels of headers in their Markdown documents. Users can increase or decrease header levels by a specified number of levels, across the entire document, a selection, a specified range of lines, or just the line the cursor is on. The plugin also provides convenient default settings for header adjustments.

## Features

- Increase header levels by a specified number.
- Decrease header levels by a specified number.
- Adjust headers within a specified range of lines, or across the selection.
- Adjust just the line the cursor is on, including turning a plain line into a
  header and back again.
- Make the current line a sibling or a child of the header above it, or remove
  its header outright.
- Convert headings pushed past the deepest allowed level into bulleted list
  items, and optionally convert them back on the way out.
- Use default settings for header adjustments.
- Commands accessible from the command palette.
- Ribbon icon with options for increasing or decreasing header levels.

## Installation

From inside Obsidian: open Settings → Community plugins, browse for
"Header Adjuster", and install it.

Manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from the
   [latest release](https://github.com/Netajam/header-adjuster/releases/latest).
2. Place all three in your vault's `.obsidian/plugins/header-adjuster` directory
   — the folder name has to match the plugin id in `manifest.json`.
3. Enable Header Adjuster from Settings → Community plugins.

## Usage

### Commands

The plugin provides the following commands accessible from the command palette.
The two "by N" commands name your current default, so N is whatever the settings
say.

- **Increase header level...** / **Decrease header level...**: Opens a dialog
  asking how many levels to shift by, and optionally over which line range.
- **Increase header level by N (entire document)** / **Decrease header level by
  N (entire document)**: Shifts every heading in the note by the default.
- **Increase header level in selection by N** / **Decrease header level in
  selection by N**: Shifts only the headings inside the current selection.
  Available when something is selected.
- **Increase header level of current line by N** / **Decrease header level of
  current line by N**: Shifts the line the cursor is on, and nothing else. See
  [The current line](#the-current-line) below.
- **Remove header from current line**: Turns the current line back into plain
  text, whatever level it was at.
- **Make current line a sibling of the header above**: Sets the current line to
  the level of the nearest header above it.
- **Make current line a child of the header above**: Sets the current line one
  level deeper than the nearest header above it.

### Ribbon Icon

Clicking the ribbon icon opens a menu with options to:

- Increase or decrease by a number you type, over an optional line range.
- Increase or decrease the whole document by one level.
- Increase or decrease the selection by your default.
- Increase or decrease the current line by your default.
- Remove the current line's header, or place it as a sibling or child of the
  header above.

### Modal Input

When using the "Increase header level..." or "Decrease header level..." commands, a dialog will prompt you to:

1. Enter the number of levels to increase or decrease (or leave blank to use the default setting).
2. Optionally specify the start line number.
3. Optionally specify the end line number.

### The current line

The current-line commands are the finest of the three scopes, and the only ones
that treat a line with no `#` as a header of level zero. That makes them a way
to write a header as well as to move one:

| Before (cursor on the line) | Command  | After     |
| --------------------------- | -------- | --------- |
| `Some prose`                | Increase | `# Some prose`  |
| `# Some prose`              | Increase | `## Some prose` |
| `## Some prose`             | Decrease | `# Some prose`  |
| `# Some prose`              | Decrease | `Some prose`    |

So a plain line becomes a header by increasing it once, and again for each level
deeper you want. Decreasing an `#` takes the header back off.

Unlike the document and selection commands, these leave nesting alone: only the
line you are on moves, and headers nested under it stay where they are. If you
want a header and everything beneath it to move together, select those lines and
use the selection commands. Conversions do not apply either — a line is not a
section, so there is no body to indent into a bullet. A line inside a code fence
is left as the code it is.

#### Placing a line instead of shifting it

The three placement commands say what the line should *be* rather than how far
to move it, so they land in one step and ignore your default shift. Two of them
read the nearest header above the current line:

```markdown
# Guide
## Setup
some prose        ← cursor here; the header above is `## Setup`
```

| Command                                       | Result           |
| --------------------------------------------- | ---------------- |
| Make current line a sibling of the header above | `## some prose`  |
| Make current line a child of the header above   | `### some prose` |
| Remove header from current line                 | `some prose`     |

They work on a line that is already a header too, which is how you re-level one
without counting: put the cursor on it and make it a child of the header above.

If there is no header above the line, both "sibling" and "child" produce an `#`
— the note itself is what encloses the line. A header inside a code fence does
not count as the header above, and a line inside one is left alone.

#### Lines that are already bullets

A line cannot be a bullet and a header at once, so writing a header onto a list
item replaces its marker instead of sitting in front of it — indentation
included, since a header only counts at the start of a line:

| Before          | After (increase, or a placement) |
| --------------- | -------------------------------- |
| `- Some prose`  | `# Some prose`                   |
| `  * Some prose`| `# Some prose`                   |
| `1. Some prose` | `# 1. Some prose`                |

Ordered items are left alone: `1. ` is not a bullet, and the plugin keeps one
definition of a list item across every command. Removing a header never writes
a bullet back, either — Markdown records no provenance for the marker it
replaced, so there is nothing to restore.

### Settings

Access the plugin settings from the Obsidian Settings under the "Header Adjuster" section:

- **Default increase level**: The default number of levels to increase headers by.
- **Default decrease level**: The default number of levels to decrease headers by.
- **Deepest heading level**: The level headings stop at. Anything an increase
  would push past it becomes a bulleted list item instead, and a bullet
  converted back returns to this level. Only has an effect with a conversion
  below switched on.
- **Convert headings past the deepest level into bullets**: When increasing
  would push a heading past the level above, turn it into a bulleted list item
  instead of leaving it unchanged. The content beneath the heading is
  re-indented so it sits inside the new bullet.
- **Convert bullets back into headings**: When decreasing, turn list items back
  into headings. This cannot tell a bullet the plugin created from one you typed
  yourself, so every list in range is converted — hand-written ones included.

### Example Usage

#### Full Document Adjustment

To increase all headers in a document by 2 levels:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Increase header level...".
3. Enter `2` in the modal and click "Submit".

#### Range Adjustment

To decrease headers from line 5 to line 20 by 1 level:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Decrease header level...".
3. Enter `1` in the modal.
4. Enter `5` for the start line.
5. Enter `20` for the end line.
6. Click "Submit".

#### Using Default Settings

To increase every header in the note using the default setting:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Increase header level by N (entire document)".

To do the same to a selection, select the lines first and run "Increase header
level in selection by N".

#### Promoting One Line to a Header

To turn the paragraph you are looking at into an `###` header:

1. Put the cursor anywhere on the line.
2. Run "Increase header level of current line by N" three times, with the
   default set to 1.

To take it back off, run "Remove header from current line" once, or "Decrease
header level of current line by N" until the `#` characters are gone.

#### Filing a Line Under the Section It Is In

To turn a line into a subheading of whatever section it already sits in:

1. Put the cursor anywhere on the line.
2. Run "Make current line a child of the header above".

The level is worked out from the note, so this does the right thing whether the
section above is an `#` or an `#####`.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the checks a change has to
pass, and where each kind of code belongs. `docs/architecture.md` describes the
layering, and `CONTEXT.md` defines the vocabulary the code is written in.

## License

This plugin is licensed under the MIT License.
