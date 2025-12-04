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
export function cycleElementType(
    currentType: ScriptElement['type'], 
    shiftKey: boolean = false,
    previousType: ScriptElement['type'] | null = null
): ScriptElement['type'] {
    
    // Dialogue block elements
    const dialogueElements: ScriptElement['type'][] = ['character', 'dialogue', 'parenthetical'];
    
    // Check if current or previous element is in dialogue block
    const inDialogue = dialogueElements.includes(currentType);
    const prevInDialogue = previousType ? dialogueElements.includes(previousType) : false;
    
    // If in dialogue block, cycle within dialogue only
    if (inDialogue || prevInDialogue) {
        const cycle: ScriptElement['type'][] = ['character', 'dialogue', 'parenthetical'];
        let index = cycle.indexOf(currentType);
        
        // If somehow not in cycle (shouldn't happen), default to character
        if (index === -1) index = 0;
        
        if (shiftKey) {
            return cycle[(index - 1 + cycle.length) % cycle.length];
        } else {
            return cycle[(index + 1) % cycle.length];
        }
    }
    
    // Outside dialogue block: standard cycling
    const standardCycle: ScriptElement['type'][] = ['scene_heading', 'action', 'character', 'transition'];
    let index = standardCycle.indexOf(currentType);
    
    if (index === -1) index = 0; // Default to scene_heading
    
    if (shiftKey) {
        return standardCycle[(index - 1 + standardCycle.length) % standardCycle.length];
    } else {
        return standardCycle[(index + 1) % standardCycle.length];
    }
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
 * Final Draft Industry Standards
 * Note: Page container has 1.5in padding-left, so these margins are relative to that.
 */
export function getElementMargins(type: ScriptElement['type']): { marginLeft: string; width: string } {
    const margins: Record<ScriptElement['type'], { marginLeft: string; width: string }> = {
        'scene_heading': { marginLeft: '0in', width: '6.0in' },      // Flush left within page margins
        'action': { marginLeft: '0in', width: '6.0in' },             // Flush left within page margins
        'character': { marginLeft: '2.2in', width: '3.3in' },        // 3.7" from page edge (1.5" + 2.2")
        'dialogue': { marginLeft: '1.0in', width: '3.5in' },         // 2.5" from page edge (1.5" + 1.0")
        'parenthetical': { marginLeft: '1.6in', width: '2.3in' },    // 3.1" from page edge (1.5" + 1.6")
        'transition': { marginLeft: '4.5in', width: '1.5in' }        // 6.0" from page edge (1.5" + 4.5")
    };

    return margins[type];
}

/**
 * Returns top padding based on element type and position
 */
export function getElementSpacing(type: ScriptElement['type'], isFirstOnPage: boolean): string {
    if (isFirstOnPage) return 'pt-0';

    // Industry standard: Scene Heading gets 2 blank lines, others get 1 blank line
    // With 12pt font and line-height 1.0, blank lines are exactly 12pt
    if (type === 'scene_heading') return 'pt-[24pt]'; // 2 blank lines
    if (type === 'dialogue' || type === 'parenthetical') return 'pt-0'; // No spacing (continues dialogue block)
    return 'pt-[12pt]'; // 1 blank line (action, character, transition)
}