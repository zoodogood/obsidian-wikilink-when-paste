import { Editor, MarkdownFileInfo, MarkdownView, Plugin } from 'obsidian';
import { handleDomPaste } from './dom-paste-handler';
import { insertWikilinkWithUndoSteps, ReplaceRangeSpec } from './editor-paste';
import { resolveWikilinkForPaste } from './link-handler';
import { SettingTab } from './settings';
import { DEFAULT_SETTINGS, WikilinkPasteSettings } from './types';
import { getWordAtOffset } from './word-helper';

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
					let selectedText = editor.getSelection();
					let targetRange: ReplaceRangeSpec | undefined;

					// If no text is selected and the option is enabled, check for word under cursor
					if (!selectedText && this.settings.replaceWordUnderCursor) {
						const cursor = editor.getCursor();
						const lineText = editor.getLine(cursor.line);
						const wordBoundary = getWordAtOffset(lineText, cursor.ch);

						if (wordBoundary) {
							selectedText = wordBoundary.word;
							const startOffset = editor.posToOffset({
								line: cursor.line,
								ch: wordBoundary.start,
							});
							const endOffset = editor.posToOffset({
								line: cursor.line,
								ch: wordBoundary.end,
							});
							targetRange = { from: startOffset, to: endOffset };
						}
					}

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
					insertWikilinkWithUndoSteps(
						editor,
						clipboardText,
						result.linkText,
						targetRange,
					);
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

	onunload() { }

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
