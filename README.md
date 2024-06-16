# Header Adjuster Plugin for Obsidian

## Overview

The Header Adjuster Plugin for Obsidian allows users to easily adjust the levels of headers in their Markdown documents. Users can increase or decrease header levels by a specified number of levels, either for the entire document or within a specified range of lines. The plugin also provides convenient default settings for header adjustments.

## Features

- Increase header levels by a specified number.
- Decrease header levels by a specified number.
- Adjust headers within a specified range of lines.
- Use default settings for header adjustments.
- Commands accessible from the command palette.
- Ribbon icon with options for increasing or decreasing header levels.

## Installation

1. Download the plugin files (`main.js` and `manifest.json`).
2. Place the files in your Obsidian vault's `.obsidian/plugins/obsidian-header-adjuster` directory.
3. Enable the Header Adjuster Plugin from the Obsidian Settings under the "Community plugins" section.

## Usage

### Commands

The plugin provides the following commands accessible from the command palette:

- **Increase Header Level**: Opens a modal to increase header levels by a specified number of levels.
- **Decrease Header Level**: Opens a modal to decrease header levels by a specified number of levels.
- **Increase Header Level (Default)**: Increases header levels by the default number of levels specified in the settings.
- **Decrease Header Level (Default)**: Decreases header levels by the default number of levels specified in the settings.

### Ribbon Icon

Clicking the ribbon icon opens a context menu with options to:

- Increase Header Level
- Decrease Header Level

### Modal Input

When using the Increase Header Level or Decrease Header Level commands, a modal will prompt you to:

1. Enter the number of levels to increase or decrease (or leave blank to use the default setting).
2. Optionally specify the start line number.
3. Optionally specify the end line number.

### Settings

Access the plugin settings from the Obsidian Settings under the "Header Adjuster" section:

- **Default Increase Level**: The default number of levels to increase headers by.
- **Default Decrease Level**: The default number of levels to decrease headers by.

### Example Usage

#### Full Document Adjustment

To increase all headers in a document by 2 levels:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Increase Header Level".
3. Enter `2` in the modal and click "Submit".

#### Range Adjustment

To decrease headers from line 5 to line 20 by 1 level:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Decrease Header Level".
3. Enter `1` in the modal.
4. Enter `5` for the start line.
5. Enter `20` for the end line.
6. Click "Submit".

#### Using Default Settings

To increase headers using the default setting:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Increase Header Level (Default)".

To decrease headers using the default setting:

1. Open the command palette (`Ctrl+P` or `Cmd+P`).
2. Select "Decrease Header Level (Default)".

## Development

For developers interested in contributing to the plugin:

### Setup

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Build the plugin: `npm run build`.

### Code Structure

- **main.ts**: Main plugin code including command registration and header adjustment logic.
- **HeaderAdjusterSettingTab**: Class for managing plugin settings.
- **LevelInputModal**: Class for the modal to input header adjustment details.

### Building

After making changes, run `npm run build` to compile the TypeScript code to JavaScript.

### Contributing

Contributions are welcome! Please submit issues and pull requests on the GitHub repository.

## License

This plugin is licensed under the MIT License.

---

This documentation provides an overview of the plugin, installation instructions, usage examples, and development guidelines. Feel free to include additional details or examples as needed.