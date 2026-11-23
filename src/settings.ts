import { App, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import type Plugin_WikilinkWhenPasteNoteName from './main';
import { TextPasteOption, TimestampPasteOption } from './types';

export class SettingTab extends PluginSettingTab {
	plugin: Plugin_WikilinkWhenPasteNoteName;

	constructor(app: App, plugin: Plugin_WikilinkWhenPasteNoteName) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Plain text paste behavior',
				desc: 'When the clipboard text matches an existing note name.',
				control: {
					type: 'dropdown',
					key: 'plainTextMode',
					options: {
						'never': 'Never convert to wikilink',
						'selection-only': 'Only when text is selected',
						'always': 'Always (even without selection)',
					},
				},
			},
			{
				name: 'Timestamp pattern (12 digits) behavior',
				desc: 'When the clipboard text matches 12 digits (e.g. standard Zettelkasten note names) and matches an existing note.',
				control: {
					type: 'dropdown',
					key: 'timestampPatternMode',
					options: {
						'selection-only': 'Only when text is selected',
						'always': 'Always (even without selection)',
					},
				},
			},
			{
				name: 'Replace word under cursor without selection',
				desc: 'If no text is selected but the cursor is inside a word, automatically use the word under the cursor as the alias (hyphens are not included).',
				control: {
					type: 'toggle',
					key: 'replaceWordUnderCursor',
				},
			},
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Plain text paste behavior')
			.setDesc('When the clipboard text matches an existing note name.')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('never', 'Never convert to wikilink')
					.addOption('selection-only', 'Only when text is selected')
					.addOption('always', 'Always (even without selection)')
					.setValue(this.plugin.settings.plainTextMode)
					.onChange(async (value) => {
						this.plugin.settings.plainTextMode = value as TextPasteOption;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Timestamp pattern (12 digits) behavior')
			.setDesc(
				'When the clipboard text matches 12 digits (\\d{12}, e.g. standard new note names) and matches an existing note.',
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('selection-only', 'Only when text is selected')
					.addOption('always', 'Always (even without selection)')
					.setValue(this.plugin.settings.timestampPatternMode)
					.onChange(async (value) => {
						this.plugin.settings.timestampPatternMode = value as TimestampPasteOption;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Replace word under Cursor without selection')
			.setDesc(
				'If no text is selected but the Cursor is inside a word, use that word as the link alias (hyphen is treated as boundary).',
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.replaceWordUnderCursor)
					.onChange(async (value) => {
						this.plugin.settings.replaceWordUnderCursor = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
