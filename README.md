# Heading Adjuster Plugin for Obsidian

## Overview

The Heading Adjuster Plugin for Obsidian allows users to easily adjust the levels of headings in their Markdown documents. Users can increase or decrease heading levels by a specified number of levels, across the entire document, a selection, a specified range of lines, or just the line the cursor is on. The plugin also provides convenient default settings for heading adjustments.

## Features

- Increase heading levels by a specified number.
- Decrease heading levels by a specified number.
- Adjust headings within a specified range of lines, or across the selection.
- Adjust just the line the cursor is on, including turning a plain line into a
  heading and back again.
- Make the current line a sibling or a child of the heading above it, or remove
  its heading outright.
- Convert headings pushed past the deepest allowed level into bulleted list
  items, and optionally convert them back on the way out.
- Use default settings for heading adjustments.
- Commands accessible from the command palette.
- Ribbon icon with options for increasing or decreasing heading levels.

## Installation

From inside Obsidian: open Settings → Community plugins, browse for
"Heading Adjuster", and install it.

Manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from the
   [latest release](https://github.com/Netajam/heading-adjuster/releases/latest).
2. Place all three in your vault's `.obsidian/plugins/header-adjuster` directory
   — the folder name has to match the plugin id in `manifest.json`, which is
   still `header-adjuster` from before the plugin was renamed.
3. Enable Heading Adjuster from Settings → Community plugins.

## Usage

### Commands

The plugin provides the following commands accessible from the command palette.
The two "by N" commands name your current default, so N is whatever the settings
say.

- **Increase heading level...** / **Decrease heading level...**: Opens a dialog
  asking how many levels to shift by, and optionally over which line range.
- **Increase heading level by N (entire document)** / **Decrease heading level by
  N (entire document)**: Shifts every heading in the note by the default.
- **Increase heading level in selection by N** / **Decrease heading level in
  selection by N**: Shifts only the headings inside the current selection.
  Available when something is selected.
- **Increase heading level of current line by N** / **Decrease heading level of
  current line by N**: Shifts the line the cursor is on, and nothing else. See
  [The current line](#the-current-line) below.
- **Toggle heading on current line**: Puts a heading on the current line at the
  level of the heading above, or takes it off again if it is already there. One
  binding for both halves — see [Toggling](#toggling) below.
- **Remove heading from current line**: Turns the current line back into plain
  text, whatever level it was at.
- **Make current line a sibling of the heading above**: Sets the current line to
  the level of the nearest heading above it.
- **Make current line a child of the heading above**: Sets the current line one
  level deeper than the nearest heading above it.

### Ribbon Icon

Clicking the ribbon icon opens a menu with options to:

- Increase or decrease by a number you type, over an optional line range.
- Increase or decrease the whole document by one level.
- Increase or decrease the selection by your default.
- Increase or decrease the current line by your default.
- Remove the current line's heading, or place it as a sibling or child of the
  heading above.

### On Mobile

Obsidian's mobile toolbar shows commands as icons with no names, so every
command this plugin registers carries its own symbol and no two are alike:

| Symbol family    | Scope                        |
| ---------------- | ---------------------------- |
| Solid arrow      | the dialog — you say how far |
| Page with +/−    | the whole note               |
| Box with +/−     | the selection                |
| Bare chevron     | the current line             |
| A struck through | remove the heading           |
| Equals sign      | sibling of the heading above |
| Arrow turning in | child of the heading above   |

Up increases and down decreases throughout, so there are two things to learn
rather than twelve.

If you only have one slot, spend it on the hash: "Toggle heading on current
line" both makes a section and unmakes it.

To add one: Settings → Toolbar, then pick the commands you want. The ribbon
menu shows the same symbols beside their names, which is the quickest way to
learn which is which.

### Modal Input

When using the "Increase heading level..." or "Decrease heading level..." commands, a dialog will prompt you to:

1. Enter the number of levels to increase or decrease (or leave blank to use the default setting).
2. Optionally specify the start line number.
3. Optionally specify the end line number.

### The current line

The current-line commands are the finest of the three scopes, and the only ones
that treat a line with no `#` as a heading of level zero. That makes them a way
to write a heading as well as to move one:

| Before (cursor on the line) | Command  | After     |
| --------------------------- | -------- | --------- |
| `Some prose`                | Increase | `# Some prose`  |
| `# Some prose`              | Increase | `## Some prose` |
| `## Some prose`             | Decrease | `# Some prose`  |
| `# Some prose`              | Decrease | `Some prose`    |

So a plain line becomes a heading by increasing it once, and again for each level
deeper you want. Decreasing an `#` takes the heading back off.

Unlike the document and selection commands, these leave nesting alone: only the
line you are on moves, and headings nested under it stay where they are. If you
want a heading and everything beneath it to move together, select those lines and
use the selection commands. Conversions do not apply either — a line is not a
section, so there is no body to indent into a bullet. A line inside a code fence
is left as the code it is.

#### Placing a line instead of shifting it

The three placement commands say what the line should *be* rather than how far
to move it, so they land in one step and ignore your default shift. Two of them
read the nearest heading above the current line:

```markdown
# Guide
## Setup
some prose        ← cursor here; the heading above is `## Setup`
```

| Command                                          | Result           |
| ------------------------------------------------ | ---------------- |
| Make current line a sibling of the heading above | `## some prose`  |
| Make current line a child of the heading above   | `### some prose` |
| Remove heading from current line                 | `some prose`     |

They work on a line that is already a heading too, which is how you re-level one
without counting: put the cursor on it and make it a child of the heading above.

If there is no heading above the line, both "sibling" and "child" produce an `#`
— the note itself is what encloses the line. A heading inside a code fence does
not count as the heading above, and a line inside one is left alone.

#### Toggling

"Toggle heading on current line" is the sibling placement and the removal in one
command, which is what you want if you have a single hotkey or a single free
slot on the mobile toolbar to spend:

```markdown
# Guide
## Setup
some prose        ← cursor here
```

| Toggle set to                     | Once             | Twice        |
| --------------------------------- | ---------------- | ------------ |
| Same level as the heading above    | `## some prose`  | `some prose` |
| One level below the heading above  | `### some prose` | `some prose` |
| Top level                          | `# some prose`   | `some prose` |

Which of the three it uses is yours to set, under **Toggle puts the heading at**
in the settings. It ships as "same level as the heading above".

A heading already at some *other* level is moved to the one you chose rather
than removed, so the second press is what takes it off. That keeps two presses
enough to reach plain text from anywhere, and keeps a press from ever destroying
a level you would have to retype. It also means the toggle only takes off the
level it puts on: set to "one below", it will move a sibling heading rather than
remove it.

#### Lines that are already bullets

A line cannot be a bullet and a heading at once, so writing a heading onto a list
item replaces its marker instead of sitting in front of it — indentation
included, since a heading only counts at the start of a line:

| Before          | After (increase, or a placement) |
| --------------- | -------------------------------- |
| `- Some prose`  | `# Some prose`                   |
| `  * Some prose`| `# Some prose`                   |
| `1. Some prose` | `# 1. Some prose`                |

Ordered items are left alone: `1. ` is not a bullet, and the plugin keeps one
definition of a list item across every command. Removing a heading never writes
a bullet back, either — Markdown records no provenance for the marker it
replaced, so there is nothing to restore.

### Settings

Access the plugin settings from the Obsidian Settings under the "Heading Adjuster" section:

- **Default increase level**: The default number of levels to increase headings by.
- **Default decrease level**: The default number of levels to decrease headings by.
- **Toggle puts the heading at**: Which level "Toggle heading on current line"
  writes, and so which level it takes back off — the top level (`#`), the same
  level as the heading above, or one below it. Defaults to the same level.
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
  An item takes one decrease per level of nesting to reach a heading, so a
  heading that overflowed several levels past the ceiling needs the same number
  of decreases to come back.

### Example Usage

#### Full Document Adjustment

To increase all headings in a document by 2 levels:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Increase heading level...".
3. Enter `2` in the modal and click "Submit".

#### Range Adjustment

To decrease headings from line 5 to line 20 by 1 level:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Decrease heading level...".
3. Enter `1` in the modal.
4. Enter `5` for the start line.
5. Enter `20` for the end line.
6. Click "Submit".

#### Using Default Settings

To increase every heading in the note using the default setting:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Increase heading level by N (entire document)".

To do the same to a selection, select the lines first and run "Increase heading
level in selection by N".

#### Promoting One Line to a Heading

To turn the paragraph you are looking at into an `###` heading:

1. Put the cursor anywhere on the line.
2. Run "Increase heading level of current line by N" three times, with the
   default set to 1.

To take it back off, run "Remove heading from current line" once, or "Decrease
heading level of current line by N" until the `#` characters are gone.

#### Filing a Line Under the Section It Is In

To turn a line into a subheading of whatever section it already sits in:

1. Put the cursor anywhere on the line.
2. Run "Make current line a child of the heading above".

The level is worked out from the note, so this does the right thing whether the
section above is an `#` or an `#####`.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the checks a change has to
pass, and where each kind of code belongs. `docs/architecture.md` describes the
layering, and `CONTEXT.md` defines the vocabulary the code is written in.

## License

This plugin is licensed under the MIT License.
