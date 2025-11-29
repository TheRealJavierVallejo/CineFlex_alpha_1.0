import React from 'react';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { Download, X, AlertTriangle, CheckCircle2, HardDrive, Shield, Cpu } from 'lucide-react';
import Button from './Button';

interface ModelDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { isDownloading, downloadProgress, downloadText, error, isReady } = useLocalLlm();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white text-zinc-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Header */}
                <div className="h-14 bg-zinc-900 text-white flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-2 font-bold text-sm tracking-widest uppercase">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        Download Local AI
                    </div>
                    {!isDownloading && (
                        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center text-center">
                    
                    {/* Icon State */}
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                        {isReady ? (
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        ) : error ? (
                            <AlertTriangle className="w-10 h-10 text-red-600" />
                        ) : isDownloading ? (
                            <div className="absolute inset-0 border-4 border-blue-100 rounded-full">
                                <div 
                                    className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"
                                />
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-600 text-sm">
                                    {downloadProgress}%
                                </div>
                            </div>
                        ) : (
                            <Download className="w-10 h-10 text-blue-500" />
                        )}
                    </div>

                    <h2 className="text-xl font-bold mb-2">
                        {isReady ? "AI Ready to Write" : error ? "Setup Failed" : isDownloading ? "Downloading Model..." : "Setup Local Intelligence"}
                    </h2>
                    
                    <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                        {isReady 
                            ? "The Llama 3 model is loaded and ready. You can now use the AI Writer offline."
                            : isDownloading 
                                ? downloadText 
                                : "To use the AI Writer for free, we need to download the Llama 3 model to your browser cache."
                        }
                    </p>

                    {/* Specs / Status */}
                    {!isReady && !error && !isDownloading && (
                        <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-8 text-xs space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500">Model Size:</span>
                                <span className="font-mono font-bold">~4.0 GB</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-500">Requirements:</span>
                                <span className="font-mono font-bold">GPU with 6GB+ VRAM</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-zinc-200 pt-3 mt-1">
                                <span className="text-zinc-500">Privacy:</span>
                                <span className="font-bold text-green-600 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> 100% Offline / Private
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error Box - MAX READABILITY */}
                    {error && (
                        <div className="w-full bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6 text-left flex gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-black font-semibold leading-relaxed break-words">
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full flex gap-3">
                        {isReady ? (
                            <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700" onClick={onClose}>
                                Start Writing
                            </Button>
                        ) : error ? (
                            <>
                                <Button variant="secondary" className="flex-1" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button variant="primary" className="flex-1" onClick={onConfirm}>
                                    Try Again
                                </Button>
                            </>
                        ) : isDownloading ? (
                            <div className="w-full h-10 bg-zinc-100 rounded flex items-center justify-center text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-wait">
                                Please Wait...
                            </div>
                        ) : (
                            <>
                                <Button variant="secondary" className="flex-1" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button variant="primary" className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20" onClick={onConfirm} icon={<Download className="w-4 h-4" />}>
                                    Download Model
                                </Button>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};