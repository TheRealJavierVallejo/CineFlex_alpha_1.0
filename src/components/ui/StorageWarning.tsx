import React from 'react';
import { AlertTriangle, HardDrive } from 'lucide-react';
import { useStorageQuota, formatBytes } from '../../utils/storageQuota';
import { garbageCollect } from '../../services/storage';

export const StorageWarning: React.FC = () => {
    const { quota, loading } = useStorageQuota();

    if (loading || !quota || !quota.isNearLimit) return null;

    const handleCleanup = async () => {
        if (confirm("Run garbage collection? This will remove orphaned images to free up space.")) {
            await garbageCollect();
            window.location.reload(); // Simple reload to refresh quota state
        }
    };

    return (
        <div className={`
            fixed bottom-4 left-4 z-50 p-4 rounded-md shadow-lg border backdrop-blur-md flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-4
            ${quota.isCritical ? 'bg-red-900/90 border-red-500 text-white' : 'bg-yellow-900/90 border-yellow-500 text-yellow-100'}
        `}>
            <div className="p-2 bg-white/10 rounded-full">
                {quota.isCritical ? <AlertTriangle className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            
            <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                    {quota.isCritical ? 'Storage Critical' : 'Storage Warning'}
                </h4>
                <p className="text-xs opacity-90 mb-2">
                    {formatBytes(quota.usage)} used of {formatBytes(quota.quota)} ({Math.round(quota.percentUsed)}%)
                </p>
                <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-500" 
                        style={{ width: `${quota.percentUsed}%` }} 
                    />
                </div>
                <button 
                    onClick={handleCleanup}
                    className="mt-2 text-[10px] underline font-bold hover:text-white"
                >
                    Run Cleanup Tool
                </button>
            </div>
        </div>
    );
};