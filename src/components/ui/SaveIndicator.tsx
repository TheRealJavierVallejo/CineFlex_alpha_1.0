import React from 'react';
import { Check, Loader2, AlertCircle, Save } from 'lucide-react';
import { useSaveStatus } from '../../context/SaveStatusContext';

interface SaveIndicatorProps {
    status?: 'idle' | 'saving' | 'saved' | 'error';
    errorMessage?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status: propStatus, errorMessage: propError }) => {
    const context = useSaveStatus();
    const status = propStatus || context.status;
    const errorMessage = propError || context.errorMessage;

    if (status === 'saved' || status === 'idle') {
        return (
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                {status === 'saved' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                <span>{status === 'saved' ? 'Saved' : 'Auto-save on'}</span>
            </div>
        );
    }

    if (status === 'saving') {
        return (
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Saving...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400" title={errorMessage}>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Save Failed</span>
        </div>
    );
};
