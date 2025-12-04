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
    
    // DIALOGUE BLOCK DETECTION: If currently in dialogue-related elements
    const dialogueBlock = ['character', 'dialogue', 'parenthetical'];
    const inDialogueBlock = dialogueBlock.includes(currentType);
    const prevInDialogueBlock = previousType ? dialogueBlock.includes(previousType) : false;
    
    // If in dialogue block, stay in dialogue block
    if (inDialogueBlock || prevInDialogueBlock) {
        // Define explicit cycle order for dialogue block
        const dialogueCycle: ScriptElement['type'][] = ['character', 'parenthetical', 'dialogue'];
        
        // Find current position or default to character
        let currentIndex = dialogueCycle.indexOf(currentType);
        
        // If current type isn't in the cycle (e.g. action -> character), start at appropriate point
        if (currentIndex === -1) {
            // If coming from outside into dialogue block via tab, default to Character
            return 'character';
        }
        
        if (shiftKey) {
            const prevIndex = (currentIndex - 1 + dialogueCycle.length) % dialogueCycle.length;
            return dialogueCycle[prevIndex];
        } else {
            const nextIndex = (currentIndex + 1) % dialogueCycle.length;
            return dialogueCycle[nextIndex];
        }
    }
    
    // Standard cycling for non-dialogue elements
    const standardCycle: ScriptElement['type'][] = [
        'scene_heading',
        'action',
        'character',
        'transition'
    ];
    
    const currentIndex = standardCycle.indexOf(currentType);
    
    if (currentIndex === -1) {
        // Default entry point
        return 'scene_heading';
    }
    
    if (shiftKey) {
        const prevIndex = (currentIndex - 1 + standardCycle.length) % standardCycle.length;
        return standardCycle[prevIndex];
    } else {
        const nextIndex = (currentIndex + 1) % standardCycle.length;
        return standardCycle[nextIndex];
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

    if (type === 'scene_heading') return 'pt-8'; // 32px
    if (type === 'dialogue' || type === 'parenthetical') return 'pt-0';
    return 'pt-4'; // 16px
}