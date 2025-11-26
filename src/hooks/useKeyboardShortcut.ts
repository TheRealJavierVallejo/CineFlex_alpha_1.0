import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean; // Cmd on Mac, Win on Windows
    callback: (e: KeyboardEvent) => void;
    description?: string;
    preventDefault?: boolean;
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const useKeyboardShortcut = (shortcuts: KeyboardShortcut | KeyboardShortcut[], enabled = true) => {
    const shortcutsArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            for (const shortcut of shortcutsArray) {
                const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatches = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
                const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatches = shortcut.alt ? event.altKey : !event.altKey;
                const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey;

                if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
                    if (shortcut.preventDefault !== false) {
                        event.preventDefault();
                    }
                    shortcut.callback(event);
                    break;
                }
            }
        },
        [shortcutsArray, enabled]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export const formatShortcut = (shortcut: Omit<KeyboardShortcut, 'callback'>): string => {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
    if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
    if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
    if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');

    parts.push(shortcut.key.toUpperCase());

    return parts.join(isMac ? '' : '+');
};

export default useKeyboardShortcut;
