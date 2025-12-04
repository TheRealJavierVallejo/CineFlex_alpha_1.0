import { ScriptElement } from '../../../types';

/**
 * Returns the next element type when Enter is pressed
 * Based on screenplay formatting conventions
 */
export function getNextElementType(currentType: ScriptElement['type']): ScriptElement['type'] {
    const typeMap: Record<ScriptElement['type'], ScriptElement['type']> = {
        'scene_heading': 'action',
        'action': 'action',
        'character': 'dialogue',
        'dialogue': 'action',
        'parenthetical': 'dialogue',
        'transition': 'scene_heading'
    };

    return typeMap[currentType] || 'action';
}

/**
 * Returns the next element type when Tab is pressed
 * Smart tab cycling - only cycles through top 3 most logical options for each type
 */
export function cycleElementType(currentType: ScriptElement['type'], shiftKey: boolean = false): ScriptElement['type'] {
    // Define top 3 most logical next elements for each type
    const smartTabOrder: Record<ScriptElement['type'], ScriptElement['type'][]> = {
        'scene_heading': ['action', 'character', 'transition'],
        'action': ['character', 'action', 'scene_heading'],
        'character': ['dialogue', 'parenthetical', 'action'],
        'dialogue': ['character', 'action', 'parenthetical'],
        'parenthetical': ['dialogue', 'character', 'action'],
        'transition': ['scene_heading', 'action', 'character']
    };
    
    const nextOptions = smartTabOrder[currentType] || ['action', 'character', 'scene_heading'];
    
    // Track current position in the cycle (use modulo to loop through top 3)
    const currentCycleIndex = nextOptions.indexOf(currentType);
    let nextIndex: number;
    
    if (currentCycleIndex === -1) {
        // Current type not in next options, start at first option
        nextIndex = shiftKey ? nextOptions.length - 1 : 0;
    } else {
        // Cycle through the 3 options
        nextIndex = shiftKey
            ? (currentCycleIndex - 1 + nextOptions.length) % nextOptions.length
            : (currentCycleIndex + 1) % nextOptions.length;
    }
    
    return nextOptions[nextIndex];
}

/**
 * Returns true if element type should be uppercase
 */
export function shouldUppercase(type: ScriptElement['type']): boolean {
    return type === 'scene_heading' || type === 'character' || type === 'transition';
}

/**
 * Auto-formats scene heading (adds periods, normalizes spacing)
 */
export function formatSceneHeading(content: string): string {
    let formatted = content.toUpperCase();

    // Add period after INT or EXT if missing
    formatted = formatted.replace(/^(INT|EXT)(\s)/i, '$1.$2');
    formatted = formatted.replace(/^(INT|EXT)$/i, '$1.');

    // Normalize dashes and spacing
    formatted = formatted.replace(/\s*-\s*/g, ' - ');
    formatted = formatted.replace(/\s+/g, ' ');
    formatted = formatted.trim();

    return formatted;
}

/**
 * Returns margin-left and width for each element type
 */
export function getElementMargins(type: ScriptElement['type']): { marginLeft: string; width: string } {
    const margins: Record<ScriptElement['type'], { marginLeft: string; width: string }> = {
        'scene_heading': { marginLeft: '0in', width: '100%' },
        'action': { marginLeft: '0in', width: '100%' },
        'character': { marginLeft: '2.0in', width: '3.7in' },
        'dialogue': { marginLeft: '1.0in', width: '3.5in' },
        'parenthetical': { marginLeft: '1.6in', width: '2.3in' },
        'transition': { marginLeft: '4.0in', width: '2.0in' }
    };

    return margins[type];
}

/**
 * Returns top padding based on element type and position
 */
export function getElementSpacing(type: ScriptElement['type'], isFirstOnPage: boolean): string {
    if (isFirstOnPage) return 'pt-0';

    if (type === 'scene_heading') return 'pt-8'; // 32px
    if (type === 'dialogue' || type === 'parenthetical') return 'pt-0';
    return 'pt-4'; // 16px
}
