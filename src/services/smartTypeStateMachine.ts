import { SCENE_PREFIXES } from './smartType';

// All possible states
export type SmartTypeState =
  | { status: 'idle' }
  | { status: 'showing', mode: 'prefix', suggestions: string[], selectedIndex: number }
  | { status: 'showing', mode: 'location', suggestions: string[], selectedIndex: number }
  | { status: 'showing', mode: 'time', suggestions: string[], selectedIndex: number }
  | { status: 'showing', mode: 'character', suggestions: string[], selectedIndex: number }
  | { status: 'showing', mode: 'transition', suggestions: string[], selectedIndex: number }
  | { status: 'closed_exact_match', lastContent: string }
  | { status: 'closed_selection', lastPath: string };

// All possible actions
export type SmartTypeAction =
  | { type: 'SHOW_SUGGESTIONS', mode: 'prefix' | 'location' | 'time' | 'character' | 'transition', suggestions: string[] }
  | { type: 'HIDE_MENU' }
  | { type: 'SELECT_NEXT' }
  | { type: 'SELECT_PREVIOUS' }
  | { type: 'CLOSE_EXACT_MATCH', content: string }
  | { type: 'CLOSE_AFTER_SELECTION', path: string }
  | { type: 'RESET_ON_EDIT' };

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

        case 'CLOSE_EXACT_MATCH':
            return {
                status: 'closed_exact_match',
                lastContent: action.content
            };

        case 'CLOSE_AFTER_SELECTION':
            return {
                status: 'closed_selection',
                lastPath: action.path
            };

        case 'RESET_ON_EDIT':
            // If user edits after selection/exact match, go back to idle
            if (state.status === 'closed_exact_match' || state.status === 'closed_selection') {
                return { status: 'idle' };
            }
            return state;

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