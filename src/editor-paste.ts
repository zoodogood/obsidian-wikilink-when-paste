import { Editor } from 'obsidian';
import { Annotation } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Custom annotation to isolate undo/redo history boundaries in CodeMirror 6.
 * Equivalent to isolateHistory.of("full") from @codemirror/commands.
 */
const isolateHistory = Annotation.define<string>();

interface ExtendedEditor extends Editor {
	cm?: EditorView;
}

export interface ReplaceRangeSpec {
	from: number;
	to: number;
}

/**
 * Inserts plain clipboard text first, then immediately replaces it with the wikilink.
 * By isolating history or using separate transactions with paste/userEvent origin,
 * CodeMirror creates two distinct steps in the undo stack:
 *
 * 1. Ctrl+Z once: reverts wikilink back to the raw pasted clipboard text.
 * 2. Ctrl+Z twice: reverts back to the original text before paste.
 * 3. Ctrl+Shift+Z / Ctrl+Y: reapplies the wikilink transformation.
 */
export function insertWikilinkWithUndoSteps(
	editor: Editor,
	clipboardText: string,
	linkText: string,
	targetRange?: ReplaceRangeSpec,
): void {
	const extEditor = editor as ExtendedEditor;
	const view = extEditor.cm;

	if (view && view.state && typeof view.dispatch === 'function') {
		const state = view.state;
		const rangeFrom = targetRange ? targetRange.from : state.selection.main.from;
		const rangeTo = targetRange ? targetRange.to : state.selection.main.to;

		// Step 1: Replace target range with the raw clipboard text as an isolated input.paste event
		const tr1 = state.update({
			changes: {
				from: rangeFrom,
				to: rangeTo,
				insert: clipboardText,
			},
			annotations: [
				isolateHistory.of('full'),
			],
			userEvent: 'input.paste',
		});
		view.dispatch(tr1);

		// Step 2: In the updated state, replace the newly inserted raw text with the formatted wikilink
		const afterTr1State = view.state;
		const linkStart = rangeFrom;
		const linkEnd = rangeFrom + clipboardText.length;

		const tr2 = afterTr1State.update({
			changes: {
				from: linkStart,
				to: linkEnd,
				insert: linkText,
			},
			annotations: [
				isolateHistory.of('full'),
			],
			userEvent: 'input.format',
		});
		view.dispatch(tr2);
		return;
	}

	// Fallback for standard Editor interface (e.g. mobile or legacy CM)
	if (targetRange) {
		const fromPos = editor.offsetToPos(targetRange.from);
		const toPos = editor.offsetToPos(targetRange.to);
		editor.replaceRange(clipboardText, fromPos, toPos, 'paste');
		const endOffset = targetRange.from + clipboardText.length;
		const endPos = editor.offsetToPos(endOffset);
		editor.replaceRange(linkText, fromPos, endPos, 'format');
	} else {
		editor.replaceSelection(clipboardText, 'paste');
		const cursor = editor.getCursor();
		const from = { line: cursor.line, ch: cursor.ch - clipboardText.length };
		editor.replaceRange(linkText, from, cursor, 'format');
	}
}
