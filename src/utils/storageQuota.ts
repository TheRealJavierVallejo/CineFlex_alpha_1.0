/**
 * Storage Quota Monitoring Utility
 * Monitors IndexedDB storage usage and provides warnings
 */

export interface StorageQuota {
    usage: number;
    quota: number;
    percentUsed: number;
    isNearLimit: boolean;
    isCritical: boolean;
}

/**
 * Get current storage quota information
 */
export async function getStorageQuota(): Promise<StorageQuota | null> {
    if (!navigator.storage?.estimate) {
        console.warn('Storage API not supported');
        return null;
    }

    try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

        return {
            usage,
            quota,
            percentUsed,
            isNearLimit: percentUsed > 75, // Warning at 75%
            isCritical: percentUsed > 90,  // Critical at 90%
        };
    } catch (error) {
        console.error('Failed to get storage quota:', error);
        return null;
    }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Hook for monitoring storage quota
 */
import { useState, useEffect } from 'react';

export function useStorageQuota(interval: number = 60000) {
    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkQuota = async () => {
            const result = await getStorageQuota();
            setQuota(result);
            setLoading(false);
        };

        // Check immediately
        checkQuota();

        // Then check periodically
        const intervalId = setInterval(checkQuota, interval);

        return () => clearInterval(intervalId);
    }, [interval]);

    return { quota, loading };
}

/**
 * Request persistent storage (helps prevent eviction)
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage?.persist) {
        console.warn('Persistent storage not supported');
        return false;
    }

    try {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
            return true;
        }

        const result = await navigator.storage.persist();
        return result;
    } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
    }
}

export default {
    getStorageQuota,
    formatBytes,
    useStorageQuota,
    requestPersistentStorage,
};