/**
 * 🧠 SMARTTYPE MANAGER
 * UI for viewing and editing SmartType autocomplete data
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Download, Upload, RotateCcw } from 'lucide-react';
import {
    getSmartTypeData,
    addSmartTypeEntry,
    removeSmartTypeEntry,
    updateSmartTypeEntry,
    clearLearnedData,
    exportSmartTypeData,
    importSmartTypeData,
    SmartTypeEntry
} from '../../../services/smartType';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

interface SmartTypeManagerProps {
    projectId: string;
    onClose: () => void;
}

type TabType = 'characters' | 'sceneHeaders' | 'transitions' | 'times';

export const SmartTypeManager: React.FC<SmartTypeManagerProps> = ({ projectId, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('characters');
    const [data, setData] = useState(getSmartTypeData(projectId));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newValue, setNewValue] = useState('');

    const refreshData = () => {
        setData(getSmartTypeData(projectId));
    };

    const handleAdd = () => {
        if (!newValue.trim()) return;

        const typeMap: Record<TabType, SmartTypeEntry['type']> = {
            'characters': 'character',
            'sceneHeaders': 'location', // We use 'location' type for scene headers internally
            'transitions': 'transition',
            'times': 'time_of_day'
        };

        addSmartTypeEntry(projectId, typeMap[activeTab], newValue.trim(), true);
        setNewValue('');
        refreshData();
    };

    const handleDelete = (entryId: string) => {
        removeSmartTypeEntry(projectId, entryId);
        refreshData();
    };

    const handleStartEdit = (entry: SmartTypeEntry) => {
        setEditingId(entry.id);
        setEditValue(entry.value);
    };

    const handleSaveEdit = () => {
        if (editingId && editValue.trim()) {
            updateSmartTypeEntry(projectId, editingId, editValue.trim());
            setEditingId(null);
            setEditValue('');
            refreshData();
        }
    };

    const handleClearLearned = () => {
        if (confirm('Clear all auto-learned data? User-defined entries will be kept.')) {
            clearLearnedData(projectId);
            refreshData();
        }
    };

    const handleExport = () => {
        const jsonData = exportSmartTypeData(projectId);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smarttype_${projectId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const jsonData = e.target?.result as string;
                        importSmartTypeData(projectId, jsonData);
                        refreshData();
                        alert('SmartType data imported successfully');
                    } catch (error) {
                        alert('Error importing data: Invalid format');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const getCurrentEntries = (): SmartTypeEntry[] => {
        switch (activeTab) {
            case 'characters': return data.characters;
            case 'sceneHeaders': return data.sceneHeaders;
            case 'transitions': return data.transitions;
            case 'times': return data.timesOfDay;
        }
    };

    const entries = getCurrentEntries().sort((a, b) => {
        // User-defined first, then by frequency
        if (a.userDefined !== b.userDefined) {
            return a.userDefined ? -1 : 1;
        }
        return b.frequency - a.frequency;
    });

    return (
        <div className="h-full flex flex-col bg-surface text-text-primary">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-bold">SmartType Manager</h2>
                <p className="text-sm text-text-muted mt-1">
                    Manage autocomplete suggestions for screenplay elements
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 pt-4 border-b border-border">
                {[
                    { key: 'characters' as TabType, label: 'Characters' },
                    { key: 'sceneHeaders' as TabType, label: 'Scene Headers' },
                    { key: 'transitions' as TabType, label: 'Transitions' },
                    { key: 'times' as TabType, label: 'Times of Day' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-muted hover:text-text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Add New Entry */}
            <div className="p-4 border-b border-border bg-surface-secondary">
                <div className="flex gap-2">
                    <Input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={`Add new ${activeTab.slice(0, -1)}...`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                        className="flex-1"
                    />
                    <Button
                        variant="primary"
                        onClick={handleAdd}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Add
                    </Button>
                </div>
            </div>

            {/* Entries List */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                    {entries.length === 0 ? (
                        <div className="text-center py-8 text-text-muted">
                            <p>No entries yet</p>
                            <p className="text-sm mt-2">Add manually or type in the script editor to learn</p>
                        </div>
                    ) : (
                        entries.map(entry => (
                            <div
                                key={entry.id}
                                className="flex items-center gap-2 p-2 bg-surface-secondary border border-border rounded hover:bg-surface group"
                            >
                                {editingId === entry.id ? (
                                    <>
                                        <Input
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                    setEditValue('');
                                                }
                                            }}
                                            className="flex-1 text-sm"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveEdit}
                                            className="px-2 py-1 text-xs bg-primary text-white rounded"
                                        >
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="font-mono text-sm">{entry.value}</span>
                                            {entry.userDefined && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                                                    USER
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-text-muted">
                                                {entry.frequency > 0 && `Used ${entry.frequency}×`}
                                            </span>
                                            <button
                                                onClick={() => handleStartEdit(entry)}
                                                className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border bg-surface-secondary">
                <div className="flex gap-2 justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={handleClearLearned}
                            className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Clear Learned
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                        <button
                            onClick={handleImport}
                            className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary flex items-center gap-1.5"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Import
                        </button>
                    </div>
                </div>
                <div className="text-xs text-text-muted mt-2">
                    {entries.filter(e => e.userDefined).length} user-defined • {entries.filter(e => !e.userDefined).length} auto-learned
                </div>
            </div>
        </div>
    );
};
