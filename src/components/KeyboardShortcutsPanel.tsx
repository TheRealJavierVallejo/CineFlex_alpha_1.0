import React, { useState } from 'react';
import { Search, X, Command } from 'lucide-react';
import { useKeyboardShortcut, formatShortcut } from '../hooks/useKeyboardShortcut';
import Modal from './ui/Modal';
import Input from './ui/Input';

interface Shortcut {
    keys: string;
    description: string;
    category: string;
}

const shortcuts: Shortcut[] = [
    // Global
    { keys: '⌘K', description: 'Open command palette', category: 'Global' },
    { keys: 'Esc', description: 'Close modal/editor', category: 'Global' },
    { keys: '?', description: 'Show keyboard shortcuts', category: 'Global' },

    // Navigation
    { keys: '⌘1', description: 'Go to Dashboard', category: 'Navigation' },
    { keys: '⌘2', description: 'Go to Timeline', category: 'Navigation' },
    { keys: '⌘3', description: 'Go to Assets', category: 'Navigation' },
    { keys: '⌘4', description: 'Go to Settings', category: 'Navigation' },

    // Actions
    { keys: '⌘N', description: 'New shot', category: 'Actions' },
    { keys: '⌘S', description: 'Save project', category: 'Actions' },
    { keys: '⌘Enter', description: 'Generate shot (in editor)', category: 'Actions' },
    { keys: '⌘D', description: 'Duplicate shot', category: 'Actions' },
    { keys: 'Delete', description: 'Delete selected item', category: 'Actions' },

    // Editor
    { keys: 'Tab', description: 'Next tab', category: 'Editor' },
    { keys: '⇧Tab', description: 'Previous tab', category: 'Editor' },
];

interface KeyboardShortcutsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredShortcuts = shortcuts.filter(
        (shortcut) =>
            shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shortcut.keys.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                        placeholder="Search shortcuts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="space-y-6">
                    {categories.map((category) => {
                        const categoryShortcuts = filteredShortcuts.filter((s) => s.category === category);
                        if (categoryShortcuts.length === 0) return null;

                        return (
                            <div key={category}>
                                <h3 className="text-sm font-semibold text-text-primary mb-2">{category}</h3>
                                <div className="space-y-1">
                                    {categoryShortcuts.map((shortcut, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between py-2 px-3 rounded hover:bg-app-hover"
                                        >
                                            <span className="text-sm text-text-secondary">{shortcut.description}</span>
                                            <kbd className="px-2 py-1 text-xs font-mono bg-[#2D2D30] border border-border rounded">
                                                {shortcut.keys}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredShortcuts.length === 0 && (
                    <div className="text-center py-8 text-text-muted">
                        No shortcuts found matching "{searchQuery}"
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default KeyboardShortcutsPanel;
