import { Editor, MarkdownFileInfo, MarkdownView, Plugin } from 'obsidian';
import { handleDomPaste } from './dom-paste-handler';
import { insertWikilinkWithUndoSteps } from './editor-paste';
import { resolveWikilinkForPaste } from './link-handler';
import { SettingTab } from './settings';
import { DEFAULT_SETTINGS, WikilinkPasteSettings } from './types';

export default class Plugin_WikilinkWhenPasteNoteName extends Plugin {
	settings!: WikilinkPasteSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingTab(this.app, this));

		// 1. Handle paste in standard Markdown editor (Live Preview & Source Mode)
		this.registerEvent(
			this.app.workspace.on(
				'editor-paste',
				(evt: ClipboardEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
					if (evt.defaultPrevented) return;

					const clipboardText = evt.clipboardData?.getData('text/plain') ?? '';
					if (!clipboardText) return;

					const sourcePath = info.file?.path ?? '';
					const selectedText = editor.getSelection();

					const result = resolveWikilinkForPaste(
						this.app,
						clipboardText,
						selectedText,
						sourcePath,
						this.settings,
					);

					if (!result.shouldConvert || !result.linkText) {
						return;
					}

					evt.preventDefault();
					insertWikilinkWithUndoSteps(editor, clipboardText, result.linkText);
				},
			),
		);

		// 2. Handle paste in GUI Frontmatter (Properties UI inputs & controls)
		this.registerDomEvent(
			window,
			'paste',
			(evt: ClipboardEvent) => {
				handleDomPaste(this.app, this.settings, evt);
			},
			true,
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<WikilinkPasteSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
