import React, { useState } from 'react';
import { FileText, Download, X, Check, FileCode, Type } from 'lucide-react';
import { Project } from '../../../types';
import { ExportOptions, exportScript } from '../../../services/exportService';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, project }) => {
    const [options, setOptions] = useState<ExportOptions>({
        format: 'pdf',
        includeTitlePage: true,
        includeSceneNumbers: false,
        watermark: ''
    });

    const formats = [
        { id: 'pdf', name: 'PDF', desc: 'Standard Screenplay', icon: <FileText className="w-5 h-5" color="#FF4B4B" /> },
        { id: 'fdx', name: 'Final Draft', desc: 'Industry Standard (.fdx)', icon: <FileCode className="w-5 h-5" color="#3B82F6" /> },
        { id: 'fountain', name: 'Fountain', desc: 'Plain Text Markdown', icon: <Type className="w-5 h-5" color="#10B981" /> },
        { id: 'txt', name: 'Plain Text', desc: 'Simple .txt file', icon: <FileText className="w-5 h-5" color="#64748B" /> }
    ];

    const handleExport = () => {
        exportScript(project, options);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export Script"
            size="md"
        >
            <div className="space-y-8 py-2">
                {/* Format Selection */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Select Format</label>
                    <div className="grid grid-cols-2 gap-3">
                        {formats.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setOptions({ ...options, format: f.id as any })}
                                className={`
                                    flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200
                                    ${options.format === f.id
                                        ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary'
                                        : 'bg-surface-secondary border-border hover:border-text-muted hover:bg-surface'}
                                `}
                            >
                                <div className={`p-2 rounded-lg ${options.format === f.id ? 'bg-primary/10' : 'bg-surface border border-border'}`}>
                                    {f.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-text-primary mb-0.5">{f.name}</div>
                                    <div className="text-[11px] text-text-muted leading-tight">{f.desc}</div>
                                </div>
                                {options.format === f.id && (
                                    <div className="ml-auto">
                                        <Check className="w-4 h-4 text-primary" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Configuration Options */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Script Options</label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={options.includeTitlePage}
                                    onChange={(e) => setOptions({ ...options, includeTitlePage: e.target.checked })}
                                />
                                <div className={`w-10 h-5 rounded-full transition-colors ${options.includeTitlePage ? 'bg-primary' : 'bg-zinc-700'}`} />
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${options.includeTitlePage ? 'translate-x-5' : ''}`} />
                            </div>
                            <span className="text-sm font-medium text-text-primary group-hover:text-white transition-colors">Include Title Page</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={options.includeSceneNumbers}
                                    onChange={(e) => setOptions({ ...options, includeSceneNumbers: e.target.checked })}
                                />
                                <div className={`w-10 h-5 rounded-full transition-colors ${options.includeSceneNumbers ? 'bg-primary' : 'bg-zinc-700'}`} />
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${options.includeSceneNumbers ? 'translate-x-5' : ''}`} />
                            </div>
                            <span className="text-sm font-medium text-text-primary group-hover:text-white transition-colors">Include Scene Numbers</span>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Advanced</label>
                        <div className="space-y-1.5">
                            <span className="text-xs text-text-secondary">Watermark (Optional)</span>
                            <input
                                type="text"
                                value={options.watermark}
                                onChange={(e) => setOptions({ ...options, watermark: e.target.value })}
                                placeholder="DRAFT, CONFIDENTIAL..."
                                className="w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:border-primary outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        icon={<Download className="w-4 h-4" />}
                        onClick={handleExport}
                    >
                        Export Script
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
