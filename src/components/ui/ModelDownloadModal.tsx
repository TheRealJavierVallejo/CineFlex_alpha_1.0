import React from 'react';
import { useLocalLlm } from '../../context/LocalLlmContext';
import Modal from './Modal';
import { Cpu, Download, Check, AlertCircle, Database, Loader2 } from 'lucide-react';
import Button from './Button';
import ProgressBar from './ProgressBar';

interface ModelDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { isDownloading, isReady, downloadProgress, downloadText, error, isSupported } = useLocalLlm();

    // 1. UNSUPPORTED STATE
    if (!isSupported) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Hardware Incompatible">
                <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">WebGPU Not Found</h3>
                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                        The Local AI model requires WebGPU, which isn't available in your current browser.
                        <br /><br />
                        Please try Chrome, Edge, or Arc on a Desktop computer.
                    </p>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Modal>
        );
    }

    // 2. READY STATE (Success)
    if (isReady) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="AI Ready">
                <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mb-4 border border-green-900/50">
                        <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Model Loaded</h3>
                    <p className="text-sm text-text-secondary mb-6">
                        Llama 3 is running locally on your device. You can now chat offline.
                    </p>
                    <Button variant="primary" onClick={onClose} className="w-full">Start Chatting</Button>
                </div>
            </Modal>
        );
    }

    // 3. DOWNLOADING / LOADING STATE
    if (isDownloading) {
        return (
            <Modal isOpen={isOpen} onClose={() => {}} title="Setting up AI">
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-surface-secondary rounded flex items-center justify-center shrink-0 animate-pulse">
                             <Cpu className="w-6 h-6 text-primary" />
                         </div>
                         <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-text-primary text-sm truncate">Llama-3-8B-Instruct</h4>
                             <p className="text-xs text-text-muted truncate">{downloadText || "Initializing..."}</p>
                         </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                            <span>Progress</span>
                            <span>{Math.round(downloadProgress)}%</span>
                        </div>
                        <ProgressBar progress={downloadProgress} className="h-2" />
                    </div>

                    <div className="bg-surface-secondary border border-border rounded p-3 text-xs text-text-secondary flex gap-3">
                        <Database className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <strong className="block text-text-primary mb-1">Smart Caching</strong>
                            If you've used this model before, we'll just verify the files. Otherwise, we'll download ~4GB of data once.
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }

    // 4. INITIAL START PROMPT (Confirm Download)
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Download Local AI">
            <div className="p-6 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <Download className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Setup Local Intelligence</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        To use the AI Writer for free, we need to download the <strong>Llama 3</strong> model to your browser cache.
                    </p>
                </div>

                <div className="bg-surface-secondary border border-border rounded p-4 text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Model Size:</span>
                        <span className="font-mono text-text-primary">~4.0 GB</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Requirements:</span>
                        <span className="font-mono text-text-primary">GPU with 6GB+ VRAM</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Privacy:</span>
                        <span className="font-mono text-green-400">100% Offline / Private</span>
                    </div>
                </div>

                {error && (
                     <div className="bg-red-900/20 border border-red-900/50 p-3 rounded text-xs text-red-200 flex items-center gap-2">
                         <AlertCircle className="w-4 h-4" />
                         {error}
                     </div>
                )}

                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button variant="primary" onClick={onConfirm} className="flex-[2]" icon={<Download className="w-4 h-4" />}>
                        Download Model
                    </Button>
                </div>
            </div>
        </Modal>
    );
};