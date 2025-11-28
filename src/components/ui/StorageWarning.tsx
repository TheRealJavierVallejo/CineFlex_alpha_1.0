import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { StorageQuota, formatBytes } from '../../utils/storageQuota';

interface StorageWarningProps {
    quota: StorageQuota;
    onDismiss?: () => void;
}

export const StorageWarning: React.FC<StorageWarningProps> = ({ quota, onDismiss }) => {
    if (!quota.isNearLimit) return null;

    const severity = quota.isCritical ? 'critical' : 'warning';
    const bgColor = severity === 'critical' ? 'bg-red-900/20' : 'bg-yellow-900/20';
    const borderColor = severity === 'critical' ? 'border-red-500/50' : 'border-yellow-500/50';
    const textColor = severity === 'critical' ? 'text-red-400' : 'text-yellow-400';

    return (
        <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-4`}>
            <div className="flex items-start gap-3">
                <div className={`shrink-0 ${textColor}`}>
                    {severity === 'critical' ? (
                        <AlertTriangle className="w-5 h-5" />
                    ) : (
                        <Database className="w-5 h-5" />
                    )}
                </div>

                <div className="flex-1">
                    <h3 className={`font-semibold ${textColor} mb-1`}>
                        {severity === 'critical' ? 'Storage Almost Full' : 'Storage Running Low'}
                    </h3>
                    <p className="text-sm text-text-secondary mb-2">
                        You're using {formatBytes(quota.usage)} of {formatBytes(quota.quota)} ({Math.round(quota.percentUsed)}%).
                        {severity === 'critical'
                            ? ' Please free up space by deleting unused projects or images.'
                            : ' Consider cleaning up old data to prevent issues.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden mb-2">
                        <div
                            className={`h-full transition-all ${severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ width: `${Math.min(quota.percentUsed, 100)}%` }}
                        />
                    </div>
                </div>

                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="shrink-0 text-text-muted hover:text-text-primary"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

export default StorageWarning;
