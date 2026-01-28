import React, { useState } from 'react';
import { FileText, Download, X, Check, FileCode, Type } from 'lucide-react';
import { Project } from '../../../types';
import { ExportOptions, exportScript } from '../../../services/exportService';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import { ExportPreviewRenderer } from './ExportPreviewRenderer';
import { useToast } from '../../ui/ToastContainer';
import { useWorkspace } from '../../../layouts/WorkspaceLayout'; // NEW

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, project }: ExportDialogProps) => {
    const toast = useToast();
    const { triggerExportValidation } = useWorkspace(); // NEW: Get validation trigger
    
    const [options, setOptions] = useState<ExportOptions>({
        format: 'pdf',
        includeTitlePage: true,
        includeSceneNumbers: false,
        watermark: '',
        openInNewTab: true
    });

    const [pageCount, setPageCount] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    const formats = [
        { id: 'pdf', name: 'PDF', desc: 'Standard Screenplay', icon: <FileText className="w-5 h-5" /> },
        { id: 'fdx', name: 'Final Draft', desc: 'Industry Standard (.fdx)', icon: <FileCode className="w-5 h-5" /> },
        { id: 'fountain', name: 'Fountain', desc: 'Plain Text Markdown', icon: <Type className="w-5 h-5" /> },
        { id: 'txt', name: 'Plain Text', desc: 'Simple .txt file', icon: <FileText className="w-5 h-5" /> }
    ];

    // Basic validation before export
    const validateBasics = (): { valid: boolean; error?: string } => {
        // Check if script has content
        if (!project.scriptElements || project.scriptElements.length === 0) {
            return { valid: false, error: 'Your script is empty. Add some content before exporting.' };
        }

        // Check if at least one element has actual content
        const hasContent = project.scriptElements.some(el => el.content && el.content.trim().length > 0);
        if (!hasContent) {
            return { valid: false, error: 'Your script has no text content. Add dialogue or action before exporting.' };
        }

        // Check title page if included
        if (options.includeTitlePage) {
            if (!project.titlePage || (!project.titlePage.title && !project.name)) {
                return { valid: false, error: 'Please add a title to your script before exporting with a title page.' };
            }
        }

        return { valid: true };
    };

    // NEW: Export with validation gate
    const handleExportClick = async () => {
        // Basic validation first
        const basics = validateBasics();
        if (!basics.valid) {
            toast.error('Export Failed', basics.error);
            return;
        }

        // Warn about large scripts
        if (project.scriptElements.length > 1000) {
            toast.warning(
                'Large Script Detected',
                `This script has ${project.scriptElements.length} elements. Export may take 30-60 seconds.`
            );
        }

        // NEW: Use validation gate from WorkspaceLayout
        triggerExportValidation(async () => {
            await performExport();
        });
    };

    // Actual export execution
    const performExport = async (projectToExport: Project = project) => {
        setIsExporting(true);
        setExportProgress(0);

        try {
            // Simulate progress for non-PDF formats (they're instant)
            if (options.format !== 'pdf') {
                setExportProgress(50);
            }

            await exportScript(projectToExport, options, (progress) => {
                setExportProgress(progress);
            });

            setExportProgress(100);
            
            // Success notification
            const formatName = formats.find(f => f.id === options.format)?.name || options.format.toUpperCase();
            toast.success(
                'Export Successful',
                `Your script has been exported as ${formatName}.`
            );

            // Small delay to show 100% before closing
            setTimeout(() => {
                onClose();
                setExportProgress(0);
                setIsExporting(false);
            }, 500);

        } catch (error) {
            console.error('Export failed:', error);
            
            // User-friendly error messages
            let errorMessage = 'An unexpected error occurred during export.';
            
            if (error instanceof Error) {
                if (error.message.includes('memory')) {
                    errorMessage = 'Script is too large. Try exporting in smaller sections.';
                } else if (error.message.includes('permission')) {
                    errorMessage = 'Browser blocked the download. Please check your popup settings.';
                } else if (error.message.includes('network')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else {
                    errorMessage = error.message;
                }
            }

            toast.error('Export Failed', errorMessage);
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export Script"
            size="full"
        >
            <div className="flex flex-col h-full min-h-0">
                <div className="flex-1 min-h-0 flex gap-6 p-6">
                    {/* Left Pane - Format selection + options */}
                    <div className="flex-shrink-0 w-[380px] space-y-8 pr-6 border-r border-border">
                        {/* Format Selection */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Select Format</label>
                            <div className="grid grid-cols-2 gap-3">
                                {formats.map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setOptions({ ...options, format: f.id as any })}
                                        disabled={isExporting}
                                        className={`
                                            flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 bg-surface
                                            ${options.format === f.id
                                                ? 'border border-primary ring-1 ring-primary/20'
                                                : 'border-border hover:border-text-muted'}
                                            ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className={`p-2 rounded-lg border ${options.format === f.id ? 'border-primary bg-surface' : 'border-border bg-surface'}`}>
                                            {f.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-bold text-text-primary mb-0.5">{f.name}</div>
                                            <div className="text-[10px] text-text-muted leading-tight">{f.desc}</div>
                                        </div>
                                        {options.format === f.id && (
                                            <div className="shrink-0 pt-1">
                                                <Check className="w-4 h-4 text-primary" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Configuration Options */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Script Options</label>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={options.includeTitlePage}
                                                onChange={(e) => setOptions({ ...options, includeTitlePage: e.target.checked })}
                                                disabled={isExporting}
                                            />
                                            <div className={`w-9 h-5 rounded-full transition-colors ${options.includeTitlePage ? 'bg-primary' : 'bg-zinc-700'} ${isExporting ? 'opacity-50' : ''}`} />
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${options.includeTitlePage ? 'translate-x-4' : ''}`} />
                                        </div>
                                        <span className="text-sm font-medium text-text-primary group-hover:text-text-primary transition-colors">Include Title Page</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={options.includeSceneNumbers}
                                                onChange={(e) => setOptions({ ...options, includeSceneNumbers: e.target.checked })}
                                                disabled={isExporting}
                                            />
                                            <div className={`w-9 h-5 rounded-full transition-colors ${options.includeSceneNumbers ? 'bg-primary' : 'bg-zinc-700'} ${isExporting ? 'opacity-50' : ''}`} />
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${options.includeSceneNumbers ? 'translate-x-4' : ''}`} />
                                        </div>
                                        <span className="text-sm font-medium text-text-primary group-hover:text-text-primary transition-colors">Include Scene Numbers</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Advanced</label>

                                <div className="space-y-4">
                                    {options.format === 'pdf' && (
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={options.openInNewTab}
                                                    onChange={(e) => setOptions({ ...options, openInNewTab: e.target.checked })}
                                                    disabled={isExporting}
                                                />
                                                <div className={`w-9 h-5 rounded-full transition-colors ${options.openInNewTab ? 'bg-primary' : 'bg-zinc-700'} ${isExporting ? 'opacity-50' : ''}`} />
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${options.openInNewTab ? 'translate-x-4' : ''}`} />
                                            </div>
                                            <span className="text-sm font-medium text-text-primary group-hover:text-text-primary transition-colors">Open in New Tab</span>
                                        </label>
                                    )}

                                    <div className="space-y-1.5">
                                        <span className="text-xs text-text-secondary">Watermark (Optional)</span>
                                        <input
                                            type="text"
                                            value={options.watermark}
                                            onChange={(e) => setOptions({ ...options, watermark: e.target.value })}
                                            placeholder="DRAFT, CONFIDENTIAL..."
                                            disabled={isExporting}
                                            className="w-full bg-surface-secondary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:border-primary outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Pane - Preview Pane */}
                    <div className="flex-1 min-h-0 flex flex-col pl-6">
                        {/* Preview Header */}
                        <div className="flex-shrink-0 flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                                Preview
                            </label>
                            <div className="text-xs text-text-muted">
                                {pageCount > 0 ? `${pageCount} page${pageCount !== 1 ? 's' : ''}` : 'Calculating...'}
                            </div>
                        </div>

                        {/* Scrollable Preview Container */}
                        <div className="flex-1 min-h-0 border border-border rounded-lg bg-surface-secondary overflow-hidden">
                            <ExportPreviewRenderer
                                project={project}
                                options={options}
                                onPageCountChange={setPageCount}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions Footer - Fixed */}
                <div className="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
                    {/* Progress Bar */}
                    {isExporting && exportProgress > 0 && (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-text-muted">Exporting...</span>
                                <span className="text-xs text-text-muted">{Math.round(exportProgress)}%</span>
                            </div>
                            <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${exportProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={isExporting}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            icon={isExporting ? undefined : <Download className="w-4 h-4" />}
                            onClick={handleExportClick}
                            disabled={isExporting}
                        >
                            {isExporting ? `Exporting...` : 'Export Script'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
