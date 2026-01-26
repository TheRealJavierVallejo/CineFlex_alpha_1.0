import { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from '../utils/debounce';
import { useSaveStatus } from '../context/SaveStatusContext';

interface UseAutoSaveOptions {
    delay?: number; // Debounce delay in milliseconds (default: 1000)
    onSave?: () => void; // Callback when save starts
    onSuccess?: () => void; // Callback when save succeeds
    onError?: (error: Error) => void; // Callback when save fails
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave<T>(
    data: T,
    saveFunction: (data: T) => Promise<void> | void,
    options: UseAutoSaveOptions = {}
) {
    const { delay = 1000, onSave, onSuccess, onError } = options;
    const { setSaving, setSaved, setError: setGlobalError } = useSaveStatus();

    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const isMountedRef = useRef(true);
    const previousDataRef = useRef<T>(data);
    const statusResetTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced save function
    const debouncedSave = useRef(
        debounce(async (dataToSave: T) => {
            if (!isMountedRef.current) return;

            try {
                setSaveStatus('saving');
                setSaving();
                onSave?.();

                await saveFunction(dataToSave);

                if (isMountedRef.current) {
                    setSaveStatus('saved');
                    setSaved();
                    setLastSavedAt(new Date());
                    onSuccess?.();

                    // Reset to idle after 2 seconds
                    if (statusResetTimerRef.current) {
                        clearTimeout(statusResetTimerRef.current);
                    }
                    statusResetTimerRef.current = setTimeout(() => {
                        if (isMountedRef.current) {
                            setSaveStatus('idle');
                        }
                        statusResetTimerRef.current = null;
                    }, 2000);
                }
            } catch (error) {
                if (isMountedRef.current) {
                    setSaveStatus('error');
                    setGlobalError(error instanceof Error ? error.message : 'Save failed');
                    onError?.(error as Error);
                    console.error('Auto-save failed:', error);
                }
            }
        }, delay)
    ).current;

    // Trigger save when data changes
    useEffect(() => {
        // Skip first render (initial data load)
        if (previousDataRef.current === data) {
            return;
        }

        previousDataRef.current = data;
        debouncedSave(data);
    }, [data, debouncedSave]);

    // Manual save function (bypasses debounce)
    const saveNow = useCallback(async () => {
        try {
            setSaveStatus('saving');
            setSaving();
            onSave?.();

            await saveFunction(data);

            if (isMountedRef.current) {
                setSaveStatus('saved');
                setSaved();
                setLastSavedAt(new Date());
                onSuccess?.();

                if (statusResetTimerRef.current) {
                    clearTimeout(statusResetTimerRef.current);
                }
                statusResetTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setSaveStatus('idle');
                    }
                    statusResetTimerRef.current = null;
                }, 2000);
            }
        } catch (error) {
            if (isMountedRef.current) {
                setSaveStatus('error');
                setGlobalError(error instanceof Error ? error.message : 'Save failed');
                onError?.(error as Error);
            }
        }
    }, [data, saveFunction, onSave, onSuccess, onError]);

    // Handle visibility change (tab switch/close)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Force immediate save when tab becomes hidden
                saveNow();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', saveNow); // Try to save on close (best effort)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', saveNow);
        };
    }, [saveNow]);

    // Cleanup on unmount - Force save if pending and clear timers
    useEffect(() => {
        return () => {
            isMountedRef.current = false;

            // Clear any pending status reset timer
            if (statusResetTimerRef.current) {
                clearTimeout(statusResetTimerRef.current);
            }

            // If we have unsaved changes (status is saving or idle with pending debounce), try to save
            // Note: We can't guarantee async completion on unmount, but we can trigger the request.
            // For critical data, visibilitychange is more reliable.
            saveNow();
        };
    }, [saveNow]);

    // Cancel pending auto-save
    const cancelAutoSave = useCallback(() => {
        debouncedSave.cancel();
        if (statusResetTimerRef.current) {
            clearTimeout(statusResetTimerRef.current);
            statusResetTimerRef.current = null;
        }
        if (saveStatus === 'saving' || saveStatus === 'idle') {
            setSaveStatus('idle'); // Reset if we canceled in-flight or pending
        }
    }, [debouncedSave, saveStatus]);

    return {
        saveStatus,
        lastSavedAt,
        saveNow,
        cancel: cancelAutoSave
    };
}

export default useAutoSave;
