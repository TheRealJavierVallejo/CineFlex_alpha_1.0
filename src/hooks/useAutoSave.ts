import { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from '../utils/debounce';
import { useSaveStatus } from '../context/SaveStatusContext';

interface UseAutoSaveOptions {
    delay?: number;
    onSave?: () => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
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

    const debouncedSave = useRef(
        debounce(async (dataToSave: T) => {
            if (!isMountedRef.current) return;
            try {
                console.log('[AUTOSAVE] start');
                setSaveStatus('saving');
                setSaving();
                onSave?.();
                await saveFunction(dataToSave);

                if (isMountedRef.current) {
                    console.log('[AUTOSAVE] success');
                    setSaveStatus('saved');
                    setSaved();
                    setLastSavedAt(new Date());
                    onSuccess?.();
                    if (statusResetTimerRef.current) clearTimeout(statusResetTimerRef.current);
                    statusResetTimerRef.current = setTimeout(() => {
                        if (isMountedRef.current) setSaveStatus('idle');
                        statusResetTimerRef.current = null;
                    }, 2000);
                }
            } catch (error) {
                if (isMountedRef.current) {
                    console.error('[AUTOSAVE] failed:', error);
                    setSaveStatus('error');
                    setGlobalError(error instanceof Error ? error.message : 'Save failed');
                    onError?.(error as Error);
                }
            }
        }, delay)
    ).current;

    useEffect(() => {
        if (previousDataRef.current === data) return;
        previousDataRef.current = data;
        console.log('[AUTOSAVE] scheduled');
        debouncedSave(data);
    }, [data, debouncedSave]);

    const saveNow = useCallback(async () => {
        console.log('[AUTOSAVE] saving now (flush)');
        debouncedSave.flush();
    }, [debouncedSave]);

    // EXPOSED CANCEL FUNCTION
    const cancel = useCallback(() => {
        debouncedSave.cancel();
    }, [debouncedSave]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') saveNow();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', saveNow);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', saveNow);
        };
    }, [saveNow]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (statusResetTimerRef.current) clearTimeout(statusResetTimerRef.current);
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    return { saveStatus, lastSavedAt, saveNow, cancel };
}
export default useAutoSave;
