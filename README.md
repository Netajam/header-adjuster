# Header Adjuster Plugin for Obsidian

## Overview

The Header Adjuster Plugin for Obsidian allows users to easily adjust the levels of headers in their Markdown documents. Users can increase or decrease header levels by a specified number of levels, either for the entire document or within a specified range of lines. The plugin also provides convenient default settings for header adjustments.

## Features

- Increase header levels by a specified number.
- Decrease header levels by a specified number.
- Adjust headers within a specified range of lines, or across the selection.
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

### Ribbon Icon

Clicking the ribbon icon opens a menu with options to:

- Increase or decrease by a number you type, over an optional line range.
- Increase or decrease the whole document by one level.
- Increase or decrease the selection by your default.

### Modal Input

When using the "Increase header level..." or "Decrease header level..." commands, a dialog will prompt you to:

1. Enter the number of levels to increase or decrease (or leave blank to use the default setting).
2. Optionally specify the start line number.
3. Optionally specify the end line number.

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

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the checks a change has to
pass, and where each kind of code belongs. `docs/architecture.md` describes the
layering, and `CONTEXT.md` defines the vocabulary the code is written in.

## License

This plugin is licensed under the MIT License.
