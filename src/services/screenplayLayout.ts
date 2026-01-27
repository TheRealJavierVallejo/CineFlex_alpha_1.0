/**
 * SCREENPLAY LAYOUT CONSTANTS
 * Industry-standard screenplay formatting for Letter (8.5 x 11) paper.
 * Used by both preview renderer and PDF export to ensure consistency.
 */

// Page dimensions (inches)
export const PAGE_WIDTH_IN = 8.5;
export const PAGE_HEIGHT_IN = 11;

// Page margins (inches) - industry standard
export const MARGIN_TOP_IN = 1.0;
export const MARGIN_BOTTOM_IN = 1.0;
export const MARGIN_LEFT_IN = 1.5;
export const MARGIN_RIGHT_IN = 1.0;

// Derived content area
export const CONTENT_WIDTH_IN = PAGE_WIDTH_IN - MARGIN_LEFT_IN - MARGIN_RIGHT_IN; // 6.0in

// Typography
export const FONT_FAMILY = 'Courier, "Courier New", monospace';
export const FONT_SIZE_PT = 12;
export const LINE_HEIGHT_IN = 1 / 6; // 0.166... inches per line (12pt Courier standard)

// Preview scaling factor (controls how small the preview appears)
export const PREVIEW_SCALE = 0.65;

// Element indents relative to content area left edge (inches)
// These are offsets FROM the left margin, not from the page edge
export const INDENT_CHARACTER_IN = 2.0;
export const INDENT_DIALOGUE_IN = 1.0;
export const INDENT_DIALOGUE_RIGHT_IN = 1.5; // Right margin for dialogue
export const INDENT_PAREN_IN = 1.5;
export const INDENT_TRANSITION_IN = 4.0;

// Element max widths (inches)
export const WIDTH_SCENE_HEADING = 6.0;
export const WIDTH_ACTION = 6.0;
export const WIDTH_CHARACTER = 3.5;
export const WIDTH_DIALOGUE = 3.5;
export const WIDTH_PAREN = 3.0;
export const WIDTH_TRANSITION = 2.0;

// Page number position (inches from page edges)
export const PAGE_NUM_TOP_IN = 0.5;
export const PAGE_NUM_RIGHT_IN = 1.0;

// Spacing multipliers (in line heights)
export const SPACE_BEFORE_SCENE_HEADING = 2; // 2 blank lines before scene heading
export const SPACE_BEFORE_ACTION = 1;
export const SPACE_BEFORE_CHARACTER = 1;
