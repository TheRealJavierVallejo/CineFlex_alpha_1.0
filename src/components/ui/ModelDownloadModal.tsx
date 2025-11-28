import React from 'react';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { Download, Loader2, Cpu, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

interface ModelDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { isDownloading, downloadProgress, downloadText, error, isReady } = useLocalLlm();

  // If already ready, we don't need to show this, but handle just in case
  if (isReady && !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDownloading ? () => {} : onClose} // Prevent closing while downloading
      title={isDownloading ? "Initializing AI Studio" : "Enable Local Intelligence"}
      size="md"
    >
      <div className="space-y-6">
        
        {/* HERO SECTION */}
        <div className="flex flex-col items-center text-center space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDownloading ? 'bg-primary/10' : 'bg-surface-secondary'}`}>
                {error ? (
                    <AlertCircle className="w-8 h-8 text-red-500" />
                ) : isDownloading ? (
                    <Cpu className="w-8 h-8 text-primary animate-pulse" />
                ) : (
                    <Download className="w-8 h-8 text-text-secondary" />
                )}
            </div>
            
            <div>
                <h3 className="text-lg font-bold text-text-primary">
                    {isDownloading ? "Downloading Brain..." : "Download Local AI Model"}
                </h3>
                <p className="text-sm text-text-secondary max-w-xs mx-auto mt-2 leading-relaxed">
                    {isDownloading 
                        ? "We're setting up the neural network in your browser. This happens once." 
                        : "To use the AI Assistant for free, we need to download the model (~2GB) to your device. No cloud data usage."
                    }
                </p>
            </div>
        </div>

        {/* PROGRESS BAR */}
        {isDownloading && (
            <div className="space-y-2 bg-surface-secondary p-4 rounded-lg border border-border">
                <div className="flex justify-between text-xs font-mono uppercase tracking-wide">
                    <span className="text-primary font-bold">{downloadText.split(' ')[0] || "Loading..."}</span>
                    <span className="text-text-primary">{downloadProgress}%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-300 ease-out" 
                        style={{ width: `${downloadProgress}%` }}
                    />
                </div>
                <div className="text-[10px] text-text-muted truncate">
                    {downloadText}
                </div>
            </div>
        )}

        {/* ERROR STATE */}
        {error && (
            <div className="bg-red-900/20 border border-red-900/50 p-4 rounded text-center">
                <p className="text-red-200 text-xs font-bold mb-1">Initialization Failed</p>
                <p className="text-red-300/70 text-[10px]">{error}</p>
            </div>
        )}

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end pt-2">
            {!isDownloading && (
                <Button variant="ghost" onClick={onClose} disabled={isDownloading}>
                    Cancel
                </Button>
            )}
            
            {error ? (
                 <Button variant="secondary" onClick={onConfirm} icon={<RefreshCw className="w-4 h-4" />}>
                    Retry
                 </Button>
            ) : (
                !isDownloading && (
                    <Button 
                        variant="primary" 
                        onClick={onConfirm}
                        className="px-8 shadow-lg shadow-primary/20"
                        icon={<Download className="w-4 h-4" />}
                    >
                        Download & Initialize
                    </Button>
                )
            )}
        </div>

      </div>
    </Modal>
  );
};
import { RefreshCw } from 'lucide-react';