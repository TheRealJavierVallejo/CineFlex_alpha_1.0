/**
 * PHASE 5: REAL-TIME VALIDATION ENGINE
 * 
 * Validates script elements as users type, returning markers for:
 * - Errors (red underlines)
 * - Warnings (yellow underlines)
 * - Suggested quick fixes
 * 
 * Like Final Draft's live validation, but better.
 */

import { ScriptElement } from '../../types';

export interface LiveValidationMarker {
    elementId: string;
    startOffset: number;
    endOffset: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    code: string;
    suggestedFix?: string;
}

export interface RealtimeValidationResult {
    elementId: string;
    markers: LiveValidationMarker[];
    isValid: boolean;
}

/**
 * Validate a single element in real-time
 */
export const validateElementRealtime = (
    element: ScriptElement
): RealtimeValidationResult => {
    const markers: LiveValidationMarker[] = [];

    // Skip empty elements
    if (!element.content || element.content.trim().length === 0) {
        return {
            elementId: element.id,
            markers: [],
            isValid: true
        };
    }

    const content = element.content;
    const trimmedContent = content.trim();

    // Validate based on element type
    switch (element.type) {
        case 'character':
            markers.push(...validateCharacterName(element, content));
            break;

        case 'parenthetical':
            markers.push(...validateParenthetical(element, content));
            break;

        case 'dialogue':
            markers.push(...validateDialogue(element, content));
            break;

        case 'action':
            markers.push(...validateAction(element, content));
            break;

        case 'scene_heading':
            markers.push(...validateSceneHeading(element, content));
            break;

        case 'transition':
            markers.push(...validateTransition(element, content));
            break;
    }

    return {
        elementId: element.id,
        markers,
        isValid: markers.filter(m => m.severity === 'error').length === 0
    };
};

/**
 * Validate character name formatting
 */
const validateCharacterName = (
    element: ScriptElement,
    content: string
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const trimmedContent = content.trim();

    // Check for lowercase letters (excluding extensions like (V.O.))
    const baseCharacter = trimmedContent.split('(')[0].trim();
    const hasLowercase = /[a-z]/.test(baseCharacter);

    if (hasLowercase) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'error',
            code: 'CHARACTER_NOT_UPPERCASE',
            message: 'Character names must be uppercase',
            suggestedFix: trimmedContent.toUpperCase()
        });
    }

    // Check for trailing whitespace
    if (content !== trimmedContent) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: content.length,
            severity: 'warning',
            code: 'TRAILING_WHITESPACE',
            message: 'Remove trailing whitespace',
            suggestedFix: trimmedContent
        });
    }

    // Check for empty character name
    if (trimmedContent.length === 0) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: 0,
            severity: 'error',
            code: 'EMPTY_CHARACTER',
            message: 'Character name cannot be empty'
        });
    }

    return markers;
};

/**
 * Validate parenthetical formatting
 */
const validateParenthetical = (
    element: ScriptElement,
    content: string
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const trimmedContent = content.trim();

    // Check if wrapped in parentheses
    const hasOpenParen = trimmedContent.startsWith('(');
    const hasCloseParen = trimmedContent.endsWith(')');

    if (!hasOpenParen || !hasCloseParen) {
        const innerContent = trimmedContent.replace(/^\(|\)$/g, '');
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'error',
            code: 'PARENTHETICAL_FORMAT',
            message: 'Parentheticals must be wrapped in parentheses',
            suggestedFix: `(${innerContent})`
        });
    }

    // Check for empty parenthetical
    const innerText = trimmedContent.replace(/^\(|\)$/g, '').trim();
    if (innerText.length === 0) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'error',
            code: 'EMPTY_PARENTHETICAL',
            message: 'Parenthetical cannot be empty'
        });
    }

    // Check for multiple parentheticals in one line
    const parenCount = (trimmedContent.match(/\(/g) || []).length;
    if (parenCount > 1) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'warning',
            code: 'MULTIPLE_PARENTHETICALS',
            message: 'Use separate lines for multiple parentheticals'
        });
    }

    return markers;
};

/**
 * Validate dialogue content
 */
const validateDialogue = (
    element: ScriptElement,
    content: string
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const trimmedContent = content.trim();

    // Check for empty dialogue
    if (trimmedContent.length === 0) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: 0,
            severity: 'error',
            code: 'EMPTY_DIALOGUE',
            message: 'Dialogue cannot be empty'
        });
    }

    // Check for excessive whitespace
    if (/\s{3,}/.test(content)) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: content.length,
            severity: 'warning',
            code: 'EXCESSIVE_WHITESPACE',
            message: 'Remove excessive whitespace',
            suggestedFix: content.replace(/\s{2,}/g, ' ')
        });
    }

    // Check for action lines in dialogue (often a mistake)
    if (/^(INT\.|EXT\.|FADE |CUT TO)/.test(trimmedContent)) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'warning',
            code: 'ACTION_IN_DIALOGUE',
            message: 'This looks like action or a scene heading, not dialogue'
        });
    }

    return markers;
};

/**
 * Validate action/description formatting
 */
const validateAction = (
    element: ScriptElement,
    content: string
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const trimmedContent = content.trim();

    // Check for character names in action (common mistake)
    if (/^[A-Z][A-Z\s]+$/.test(trimmedContent) && trimmedContent.length < 50) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'info',
            code: 'POSSIBLE_CHARACTER',
            message: 'This looks like a character name. Change element type?'
        });
    }

    // REMOVED: Excessive capitalization check per user request (it's a stylistic choice)

    return markers;
};

/**
 * Validate scene heading formatting
 */
const validateSceneHeading = (
    element: ScriptElement,
    content: string
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const trimmedContent = content.trim();

    // Check for proper INT/EXT prefix
    const hasValidPrefix = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/.test(trimmedContent);
    if (!hasValidPrefix) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: Math.min(10, trimmedContent.length),
            severity: 'error',
            code: 'INVALID_SCENE_PREFIX',
            message: 'Scene headings must start with INT., EXT., or INT/EXT.',
            suggestedFix: `INT. ${trimmedContent}`
        });
    }

    // REMOVED: Time of day check per user request (not always necessary)

    // Check if not uppercase
    if (trimmedContent !== trimmedContent.toUpperCase()) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'error',
            code: 'SCENE_NOT_UPPERCASE',
            message: 'Scene headings must be uppercase',
            suggestedFix: trimmedContent.toUpperCase()
        });
    }

    return markers;
};

/**
 * Validate transition formatting
 */
const validateTransition = (
    element: ScriptElement,
    content: string
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const trimmedContent = content.trim();

    // Check if ends with colon
    if (!trimmedContent.endsWith(':')) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'error',
            code: 'TRANSITION_NO_COLON',
            message: 'Transitions should end with a colon',
            suggestedFix: `${trimmedContent}:`
        });
    }

    // Check if uppercase
    if (trimmedContent !== trimmedContent.toUpperCase()) {
        markers.push({
            elementId: element.id,
            startOffset: 0,
            endOffset: trimmedContent.length,
            severity: 'error',
            code: 'TRANSITION_NOT_UPPERCASE',
            message: 'Transitions should be uppercase',
            suggestedFix: trimmedContent.toUpperCase()
        });
    }

    return markers;
};

/**
 * Validate multiple elements for structural issues
 */
export const validateElementSequence = (
    elements: ScriptElement[],
    currentIndex: number
): LiveValidationMarker[] => {
    const markers: LiveValidationMarker[] = [];
    const currentElement = elements[currentIndex];
    const prevElement = currentIndex > 0 ? elements[currentIndex - 1] : null;
    const nextElement = currentIndex < elements.length - 1 ? elements[currentIndex + 1] : null;

    // Check for dialogue without character
    if (currentElement.type === 'dialogue' && prevElement?.type !== 'character' && prevElement?.type !== 'parenthetical') {
        markers.push({
            elementId: currentElement.id,
            startOffset: 0,
            endOffset: currentElement.content.length,
            severity: 'error',
            code: 'DIALOGUE_WITHOUT_CHARACTER',
            message: 'Dialogue must follow a character name'
        });
    }

    // Check for parenthetical without context
    if (currentElement.type === 'parenthetical') {
        if (prevElement?.type !== 'character' && prevElement?.type !== 'dialogue') {
            markers.push({
                elementId: currentElement.id,
                startOffset: 0,
                endOffset: currentElement.content.length,
                severity: 'error',
                code: 'ORPHANED_PARENTHETICAL',
                message: 'Parentheticals must follow a character or dialogue'
            });
        }
    }

    // Check for character without dialogue
    if (currentElement.type === 'character') {
        if (nextElement && nextElement.type !== 'dialogue' && nextElement.type !== 'parenthetical') {
            markers.push({
                elementId: currentElement.id,
                startOffset: 0,
                endOffset: currentElement.content.length,
                severity: 'warning',
                code: 'CHARACTER_WITHOUT_DIALOGUE',
                message: 'Character name should be followed by dialogue'
            });
        }
    }

    return markers;
};

/**
 * Batch validate all elements (debounced)
 */
export const validateAllElements = (
    elements: ScriptElement[]
): Map<string, RealtimeValidationResult> => {
    const results = new Map<string, RealtimeValidationResult>();

    elements.forEach((element, index) => {
        // Validate element content
        const elementResult = validateElementRealtime(element);
        
        // Add sequence validation
        const sequenceMarkers = validateElementSequence(elements, index);
        elementResult.markers.push(...sequenceMarkers);
        
        // Update validity
        elementResult.isValid = elementResult.markers.filter(m => m.severity === 'error').length === 0;
        
        results.set(element.id, elementResult);
    });

    return results;
};

/**
 * Apply quick fix to element
 */
export const applyQuickFix = (
    element: ScriptElement,
    marker: LiveValidationMarker
): ScriptElement | null => {
    if (!marker.suggestedFix) {
        return null;
    }

    return {
        ...element,
        content: marker.suggestedFix
    };
};

/**
 * Get validation statistics
 */
export const getValidationStats = (
    results: Map<string, RealtimeValidationResult>
) => {
    let errors = 0;
    let warnings = 0;
    let infos = 0;

    results.forEach(result => {
        result.markers.forEach(marker => {
            if (marker.severity === 'error') errors++;
            else if (marker.severity === 'warning') warnings++;
            else if (marker.severity === 'info') infos++;
        });
    });

    return { errors, warnings, infos };
};

console.log('[Phase 5] Real-time validation engine initialized');