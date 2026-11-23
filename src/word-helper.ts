export interface WordBoundary {
	start: number;
	end: number;
	word: string;
}

/**
 * Checks whether a single character is a word character.
 * Supports Unicode letters, numbers, and underscore, but explicitly excludes hyphens (-).
 */
export function isWordChar(char: string | undefined): boolean {
	if (!char) return false;
	return /[\p{L}\p{N}_]/u.test(char);
}

/**
 * Finds the boundary and text of the word at a given character offset in a line of text.
 * Hyphens (-) are strictly treated as non-word boundaries.
 */
export function getWordAtOffset(lineText: string, ch: number): WordBoundary | null {
	if (!lineText || ch < 0 || ch > lineText.length) {
		return null;
	}

	let targetCh = ch;
	if (targetCh === lineText.length || !isWordChar(lineText[targetCh])) {
		if (targetCh > 0 && isWordChar(lineText[targetCh - 1])) {
			targetCh = targetCh - 1;
		} else {
			return null;
		}
	}

	let start = targetCh;
	while (start > 0 && isWordChar(lineText[start - 1])) {
		start--;
	}

	let end = targetCh;
	while (end < lineText.length && isWordChar(lineText[end])) {
		end++;
	}

	if (start >= end) {
		return null;
	}

	return {
		start,
		end,
		word: lineText.slice(start, end),
	};
}
