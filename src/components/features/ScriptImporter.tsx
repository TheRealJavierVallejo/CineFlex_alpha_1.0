import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Project } from '../../types';
import { syncScriptToProject } from '../../services/scriptEngine';

interface ScriptImporterProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onUpdateProject: (project: Project) => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ScriptImporter: React.FC<ScriptImporterProps> = ({ 
    isOpen, 
    onClose, 
    project, 
    onUpdateProject,
    showToast 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stats, setStats] = useState<{ newScenes: number; updatedScenes: number; orphanedScenes: number } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.fdx') && !file.name.endsWith('.xml')) {
            showToast("Please upload a Final Draft XML (.fdx) file.", 'error');
            return;
        }

        setFileName(file.name);
        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const result = syncScriptToProject(project, content, file.name);
                
                // We delay the actual update until the user confirms, 
                // but for this UI flow we'll just show the stats first.
                // In a production app, we'd store 'result.project' in a temp state.
                // Here we'll just auto-apply for smoothness but show the result.
                
                onUpdateProject(result.project);
                setStats(result.stats);
                showToast("Script analyzed successfully", 'success');
            } catch (error) {
                console.error(error);
                showToast("Failed to parse script file", 'error');
                setFileName(null);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Script (Scrite/FDX)">
            <div className="space-y-6">
                {!stats ? (
                    /* UPLOAD STATE */
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-surface-secondary">
                        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
                            {isProcessing ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <FileText className="w-8 h-8 text-text-tertiary" />}
                        </div>
                        
                        <h3 className="text-text-primary font-medium mb-2">
                            {fileName ? fileName : "Upload .fdx Export"}
                        </h3>
                        
                        <p className="text-xs text-text-secondary text-center max-w-xs mb-6">
                            Export your screenplay from Scrite as "Final Draft XML (.fdx)". 
                            The engine will analyze scenes and sync them with your timeline.
                        </p>

                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".fdx,.xml" 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />

                        <Button 
                            variant="primary" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            {fileName ? "Select Different File" : "Select File"}
                        </Button>
                    </div>
                ) : (
                    /* RESULTS STATE */
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                            <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-text-primary font-medium text-sm">Sync Complete</h4>
                                <p className="text-xs text-text-secondary mt-1">Your visuals have been linked to the script.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-surface-secondary p-3 rounded border border-border text-center">
                                <div className="text-2xl font-bold text-primary">{stats.newScenes}</div>
                                <div className="text-[10px] uppercase text-text-tertiary font-bold">New Scenes</div>
                            </div>
                            <div className="bg-surface-secondary p-3 rounded border border-border text-center">
                                <div className="text-2xl font-bold text-text-primary">{stats.updatedScenes}</div>
                                <div className="text-[10px] uppercase text-text-tertiary font-bold">Linked</div>
                            </div>
                            <div className="bg-surface-secondary p-3 rounded border border-border text-center">
                                <div className="text-2xl font-bold text-warning">{stats.orphanedScenes}</div>
                                <div className="text-[10px] uppercase text-text-tertiary font-bold">Orphaned</div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="primary" onClick={onClose} icon={<ArrowRight className="w-4 h-4" />}>
                                Go to Timeline
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};