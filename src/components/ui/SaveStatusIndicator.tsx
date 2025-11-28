import React from 'react';
import { Check, Save, AlertCircle, Loader2 } from 'lucide-react';
import { SaveStatus } from '../../hooks/useAutoSave';

interface SaveStatusIndicatorProps {
    status: SaveStatus;
    lastSavedAt?: Date | null;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
    status,
    lastSavedAt
}) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'saving':
                return {
                    icon: Loader2,
                    text: 'Saving...',
                    color: 'text-blue-400',
                    iconClass: 'animate-spin'
                };
            case 'saved':
                return {
                    icon: Check,
                    text: 'Saved',
                    color: 'text-green-400',
                    iconClass: ''
                };
            case 'error':
                return {
                    icon: AlertCircle,
                    text: 'Save failed',
                    color: 'text-red-400',
                    iconClass: ''
                };
            default:
                return {
                    icon: Save,
                    text: lastSavedAt ? formatLastSaved(lastSavedAt) : 'Not saved',
                    color: 'text-text-muted',
                    iconClass: ''
                };
        }
    };

    const formatLastSaved = (date: Date): string => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className="flex items-center gap-2 text-xs">
            <Icon className={`w-3.5 h-3.5 ${config.color} ${config.iconClass}`} />
            <span className={config.color}>{config.text}</span>
        </div>
    );
};

export default SaveStatusIndicator;
