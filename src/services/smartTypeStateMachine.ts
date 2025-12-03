import { SCENE_PREFIXES } from './smartType';

// All possible states
export type SmartTypeState =
  | { status: 'idle' }
  | { status: 'showing', mode: 'prefix' | 'location' | 'time' | 'character' | 'transition', suggestions: string[], selectedIndex: number };

// All possible actions
export type SmartTypeAction =
  | { type: 'SHOW_SUGGESTIONS', mode: 'prefix' | 'location' | 'time' | 'character' | 'transition', suggestions: string[] }
  | { type: 'HIDE_MENU' }
  | { type: 'SELECT_NEXT' }
  | { type: 'SELECT_PREVIOUS' };

// Initial state
export const initialSmartTypeState: SmartTypeState = { status: 'idle' };

// State machine reducer
export function smartTypeReducer(state: SmartTypeState, action: SmartTypeAction): SmartTypeState {
    switch (action.type) {
        case 'SHOW_SUGGESTIONS':
            // Only show if we have suggestions
            if (action.suggestions.length === 0) {
                return { status: 'idle' };
            }
            return {
                status: 'showing',
                mode: action.mode,
                suggestions: action.suggestions,
                selectedIndex: 0
            };

        case 'SELECT_NEXT':
            if (state.status !== 'showing') return state;
            return {
                ...state,
                selectedIndex: (state.selectedIndex + 1) % state.suggestions.length
            };

        case 'SELECT_PREVIOUS':
            if (state.status !== 'showing') return state;
            return {
                ...state,
                selectedIndex: state.selectedIndex === 0 
                    ? state.suggestions.length - 1 
                    : state.selectedIndex - 1
            };

        case 'HIDE_MENU':
            return { status: 'idle' };

        default:
            return state;
    }
}

// Helper to check if exact match
export function isExactMatch(suggestions: string[], partial: string): boolean {
    if (suggestions.length !== 1) return false;
    return suggestions[0].toUpperCase() === partial.toUpperCase();
}

// Stage detection
export function parseSceneHeading(content: string) {
    const prefixMatch = content.match(/^(INT\.|EXT\.|I\/E)\s+/i);
    if (!prefixMatch) {
        return { stage: 1, prefix: '', location: content, time: '' };
    }
    const prefix = prefixMatch[0];
    const rest = content.substring(prefix.length);
    const parts = rest.split(/\s+-\s+/);
    if (parts.length > 1) {
        const location = parts.slice(0, parts.length - 1).join(' - ');
        const time = parts[parts.length - 1];
        return { stage: 3, prefix, location, time };
    } else {
        return { stage: 2, prefix, location: rest, time: '' };
    }
}