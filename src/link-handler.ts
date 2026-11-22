import { App, TFile } from 'obsidian';
import { WikilinkPasteSettings } from './types';

const TWELVE_DIGITS_REGEX = /^\d{12}$/;

export interface ResolvePasteResult {
	shouldConvert: boolean;
	targetFile?: TFile;
	linkText?: string;
}

/**
 * Checks whether the pasted text corresponds to an existing note in the vault
 * and whether the current settings / selection state allow wikilink conversion.
 */
export function resolveWikilinkForPaste(
	app: App,
	clipboardText: string,
	selectedText: string,
	sourcePath: string,
	settings: WikilinkPasteSettings,
	forceSelectionOnly = false,
): ResolvePasteResult {
	const trimmedClipboard = clipboardText.trim();
	if (!trimmedClipboard) {
		return { shouldConvert: false };
	}

	// 1. Check if note exists in vault
	const targetFile = app.metadataCache.getFirstLinkpathDest(trimmedClipboard, sourcePath);
	if (!targetFile) {
		return { shouldConvert: false };
	}

	// 2. Check rules for 12-digit pattern vs regular text
	const is12Digits = TWELVE_DIGITS_REGEX.test(trimmedClipboard);
	const hasSelection = selectedText.length > 0;

	let shouldConvert = false;
	if (is12Digits) {
		const mode = settings.timestampPatternMode;
		if (mode === 'always') {
			shouldConvert = !forceSelectionOnly || hasSelection;
		} else if (mode === 'selection-only') {
			shouldConvert = hasSelection;
		}
	} else {
		const mode = settings.plainTextMode;
		if (mode === 'always') {
			shouldConvert = !forceSelectionOnly || hasSelection;
		} else if (mode === 'selection-only') {
			shouldConvert = hasSelection;
		} else {
			shouldConvert = false;
		}
	}

	if (!shouldConvert) {
		return { shouldConvert: false };
	}

	// 3. Generate link using Obsidian's fileManager API
	const alias = hasSelection ? selectedText : undefined;
	const linkText = app.fileManager.generateMarkdownLink(
		targetFile,
		sourcePath,
		'',
		alias,
	);

	return {
		shouldConvert: true,
		targetFile,
		linkText,
	};
}
