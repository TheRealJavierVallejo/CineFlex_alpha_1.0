import React, { useState, useCallback } from 'react';
import { SlateScriptEditor } from './script-editor/SlateScriptEditor';
import { ScriptElement } from '../../types';
import { Sun, Moon, RotateCcw } from 'lucide-react';

// Sample screenplay content for testing
const INITIAL_SAMPLE_CONTENT: ScriptElement[] = [
    {
        id: crypto.randomUUID(),
        type: 'scene_heading',
        content: 'INT. COFFEE SHOP - DAY',
        sequence: 1
    },
    {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'Sarah enters, scanning the room. Sunlight streams through tall windows.',
        sequence: 2
    },
    {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'BARISTA',
        sequence: 3
    },
    {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: 'Welcome! What can I get you?',
        sequence: 4
    },
    {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'SARAH',
        sequence: 5
    },
    {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: "Just a black coffee, please.",
        sequence: 6
    },
    {
        id: crypto.randomUUID(),
        type: 'parenthetical',
        content: '(looking nervous)',
        sequence: 7
    },
    {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: "I'm meeting someone here.",
        sequence: 8
    },
    {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'The door chimes. Mark steps inside, spotting Sarah immediately.',
        sequence: 9
    },
    {
        id: crypto.randomUUID(),
        type: 'character',
        content: 'MARK',
        sequence: 10
    },
    {
        id: crypto.randomUUID(),
        type: 'dialogue',
        content: "Sarah! It's been too long.",
        sequence: 11
    },
    {
        id: crypto.randomUUID(),
        type: 'transition',
        content: 'CUT TO:',
        sequence: 12
    },
    {
        id: crypto.randomUUID(),
        type: 'scene_heading',
        content: 'EXT. CITY STREET - CONTINUOUS',
        sequence: 13
    },
    {
        id: crypto.randomUUID(),
        type: 'action',
        content: 'The bustling city continues outside, oblivious to the reunion.',
        sequence: 14
    }
];

export const SlateScriptEditorTest: React.FC = () => {
    const [elements, setElements] = useState<ScriptElement[]>(INITIAL_SAMPLE_CONTENT);
    const [isLightMode, setIsLightMode] = useState(false);
    const [changeCount, setChangeCount] = useState(0);

    const handleChange = useCallback((newElements: ScriptElement[]) => {
        setElements(newElements);
        setChangeCount(prev => prev + 1);
    }, []);

    const handleReset = () => {
        setElements([...INITIAL_SAMPLE_CONTENT]);
        setChangeCount(0);
    };

    const toggleTheme = () => {
        setIsLightMode(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-app transition-colors duration-300">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-10 bg-surface border-b border-border shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Slate.js Script Editor Test</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Test rapid typing, Enter splits, Backspace merges, Tab cycling, Cmd+Z undo
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-text-secondary">
                            Elements: <span className="font-mono text-primary">{elements.length}</span>
                            {' • '}
                            Changes: <span className="font-mono text-primary">{changeCount}</span>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded bg-surface-hover hover:bg-border transition-colors"
                            title="Toggle Light/Dark Mode"
                        >
                            {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={handleReset}
                            className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Test Instructions */}
            <div className="max-w-7xl mx-auto px-6 pt-24 pb-8">
                <div className="bg-surface border border-border rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-bold text-text-primary mb-4">Test Checklist</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="font-bold text-primary mb-2">Typing Tests:</div>
                            <ul className="space-y-1 text-text-secondary">
                                <li>✓ Rapid typing (no cursor jumping)</li>
                                <li>✓ Type in any element type</li>
                                <li>✓ Uppercase auto-applies (scene/character/transition)</li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-bold text-primary mb-2">Keyboard Shortcuts:</div>
                            <ul className="space-y-1 text-text-secondary">
                                <li>✓ <kbd className="px-1 py-0.5 bg-surface-hover rounded text-xs">Enter</kbd> - Split element, create next</li>
                                <li>✓ <kbd className="px-1 py-0.5 bg-surface-hover rounded text-xs">Tab</kbd> - Cycle element types</li>
                                <li>✓ <kbd className="px-1 py-0.5 bg-surface-hover rounded text-xs">Backspace</kbd> - Merge with previous (at start)</li>
                                <li>✓ <kbd className="px-1 py-0.5 bg-surface-hover rounded text-xs">Cmd+Z</kbd> - Undo</li>
                                <li>✓ <kbd className="px-1 py-0.5 bg-surface-hover rounded text-xs">Cmd+Shift+Z</kbd> - Redo</li>
                                <li>✓ <kbd className="px-1 py-0.5 bg-surface-hover rounded text-xs">Cmd+1-6</kbd> - Quick type change</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Editor Container */}
                <div className="flex justify-center">
                    <div
                        className={`
              w-[8.5in] min-h-[11in] transition-colors duration-300
              pt-[1.0in] pb-[1.0in] pl-[1.5in] pr-[1.0in]
              ${isLightMode
                                ? 'bg-white border border-zinc-300 shadow-xl text-black'
                                : 'bg-[#1E1E1E] border border-[#333] shadow-2xl text-[#E0E0E0]'
                            }
            `}
                    >
                        <SlateScriptEditor
                            initialElements={elements}
                            onChange={handleChange}
                            isLightMode={isLightMode}
                            projectId="test-project"
                        />
                    </div>
                </div>

                {/* Debug Info */}
                <div className="mt-8 bg-surface border border-border rounded-lg p-4">
                    <details>
                        <summary className="cursor-pointer text-sm font-bold text-text-primary hover:text-primary">
                            Debug Info (click to expand)
                        </summary>
                        <pre className="mt-4 text-xs text-text-secondary overflow-auto max-h-96 font-mono">
                            {JSON.stringify(elements, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        </div>
    );
};
