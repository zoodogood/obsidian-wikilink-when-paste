import { App, MarkdownView } from 'obsidian';
import { resolveWikilinkForPaste } from './link-handler';
import { WikilinkPasteSettings } from './types';
import { getWordAtOffset } from './word-helper';

/**
 * Handles DOM-level paste events, especially for frontmatter GUI properties
 * inputs (.metadata-property, .metadata-container) and general contenteditable inputs.
 */
export function handleDomPaste(
	app: App,
	settings: WikilinkPasteSettings,
	evt: ClipboardEvent,
): void {
	if (evt.defaultPrevented) return;

	const target = evt.target as HTMLElement | null;
	if (!target) return;

	// Check if this paste is inside the Properties GUI or frontmatter container
	const isInMetadata = target.closest(
		'.metadata-container, .metadata-properties, .metadata-property, .metadata-input',
	);

	// If not inside frontmatter GUI, let the standard editor-paste handler or browser deal with it
	if (!isInMetadata) return;

	// Ignore if target is not an input, textarea, or contenteditable
	const isInput =
		target.instanceOf(HTMLInputElement) || target.instanceOf(HTMLTextAreaElement);
	const isContentEditable = target.isContentEditable;
	if (!isInput && !isContentEditable) return;

	const clipboardText = evt.clipboardData?.getData('text/plain') ?? '';
	if (!clipboardText) return;

	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	const sourcePath = activeView?.file?.path ?? '';

	let selectedText = '';
	let targetStart = 0;
	let targetEnd = 0;

	if (isInput) {
		const start = target.selectionStart ?? 0;
		const end = target.selectionEnd ?? 0;
		if (start !== end) {
			selectedText = target.value.substring(start, end);
			targetStart = start;
			targetEnd = end;
		} else if (settings.replaceWordUnderCursor) {
			const wordBoundary = getWordAtOffset(target.value, start);
			if (wordBoundary) {
				selectedText = wordBoundary.word;
				targetStart = wordBoundary.start;
				targetEnd = wordBoundary.end;
			} else {
				targetStart = start;
				targetEnd = end;
			}
		} else {
			targetStart = start;
			targetEnd = end;
		}
	} else if (isContentEditable) {
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			selectedText = sel.toString();
		}
	}

	const result = resolveWikilinkForPaste(
		app,
		clipboardText,
		selectedText,
		sourcePath,
		settings,
	);

	if (!result.shouldConvert || !result.linkText) {
		return;
	}

	evt.preventDefault();
	evt.stopPropagation();

	const linkToInsert = result.linkText;

	if (isInput) {
		target.setSelectionRange(targetStart, targetEnd);

		const doc = document as unknown as {
			execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
		};
		let executed = false;
		if (typeof doc.execCommand === 'function') {
			const plainSuccess = doc.execCommand('insertText', false, clipboardText);
			if (plainSuccess) {
				const start = (target.selectionStart ?? 0) - clipboardText.length;
				const end = target.selectionStart ?? 0;
				target.setSelectionRange(start, end);
				executed = doc.execCommand('insertText', false, linkToInsert);
			}
		}

		if (!executed) {
			target.setRangeText(linkToInsert, targetStart, targetEnd, 'end');
		}

		target.dispatchEvent(new Event('input', { bubbles: true }));
		target.dispatchEvent(new Event('change', { bubbles: true }));
	} else if (isContentEditable) {
		const doc = document as unknown as {
			execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
		};
		let executed = false;
		if (typeof doc.execCommand === 'function') {
			const plainSuccess = doc.execCommand('insertText', false, clipboardText);
			if (plainSuccess) {
				const sel = window.getSelection();
				if (sel && sel.rangeCount > 0) {
					for (let i = 0; i < clipboardText.length; i++) {
						sel.modify('extend', 'backward', 'character');
					}
					executed = doc.execCommand('insertText', false, linkToInsert);
				}
			}
		}

		if (!executed) {
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				const range = sel.getRangeAt(0);
				range.deleteContents();
				const textNode = document.createTextNode(linkToInsert);
				range.insertNode(textNode);
				range.setStartAfter(textNode);
				range.setEndAfter(textNode);
				sel.removeAllRanges();
				sel.addRange(range);
			}
		}
		target.dispatchEvent(new Event('input', { bubbles: true }));
	}
}
