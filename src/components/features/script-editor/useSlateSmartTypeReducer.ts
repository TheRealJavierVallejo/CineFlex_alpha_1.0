import { Reducer } from 'react';

export type SmartTypeState =
    | { status: 'idle' }
    | { status: 'loading' }
    | {
        status: 'showing';
        suggestions: string[];
        selectedIndex: number;
        menuPosition: { top: number; left: number };
    };

export type SmartTypeAction =
    | { type: 'HIDE_MENU' }
    | { type: 'SHOW_SUGGESTIONS'; suggestions: string[]; position: { top: number; left: number } }
    | { type: 'SELECT_NEXT' }
    | { type: 'SELECT_PREVIOUS' }
    | { type: 'UPDATE_POSITION'; position: { top: number; left: number } };

export const smartTypeReducer: Reducer<SmartTypeState, SmartTypeAction> = (state, action) => {
    switch (action.type) {
        case 'HIDE_MENU':
            return { status: 'idle' };

        case 'SHOW_SUGGESTIONS':
            if (action.suggestions.length === 0) {
                return { status: 'idle' };
            }
            return {
                status: 'showing',
                suggestions: action.suggestions,
                selectedIndex: 0,
                menuPosition: action.position
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
                selectedIndex: (state.selectedIndex - 1 + state.suggestions.length) % state.suggestions.length
            };

        case 'UPDATE_POSITION':
            if (state.status !== 'showing') return state;
            return {
                ...state,
                menuPosition: action.position
            };

        default:
            return state;
    }
};
