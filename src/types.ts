export type TextPasteOption = 'never' | 'selection-only' | 'always';
export type TimestampPasteOption = 'selection-only' | 'always';

export interface WikilinkPasteSettings {
	plainTextMode: TextPasteOption;
	timestampPatternMode: TimestampPasteOption;
	replaceWordUnderCursor: boolean;
}

export const DEFAULT_SETTINGS: WikilinkPasteSettings = {
	plainTextMode: 'selection-only',
	timestampPatternMode: 'selection-only',
	replaceWordUnderCursor: false,
};
