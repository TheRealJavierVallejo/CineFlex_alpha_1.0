import React, { createContext, useContext, useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusContextType {
    status: SaveStatus;
    lastSavedAt?: Date;
    lastError?: string;
    setSaving: () => void;
    setSaved: () => void;
    setError: (error: string) => void;
    errorMessage?: string; // Legacy field, keeping for compatibility if needed elsewhere
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(undefined);

export const SaveStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date>();
    const [lastError, setLastError] = useState<string>();
    const [errorMessage, setErrorMessage] = useState<string>();

    const setSaving = useCallback(() => {
        setStatus('saving');
        setErrorMessage(undefined);
        setLastError(undefined);
    }, []);

    const setSaved = useCallback(() => {
        setStatus('saved');
        setErrorMessage(undefined);
        setLastError(undefined);
        setLastSavedAt(new Date());
        // Reset to idle after a delay
        setTimeout(() => setStatus('idle'), 2000);
    }, []);

    const setError = useCallback((error: string) => {
        setStatus('error');
        setErrorMessage(error);
        setLastError(error);
    }, []);

    return (
        <SaveStatusContext.Provider value={{
            status,
            lastSavedAt,
            lastError,
            setSaving,
            setSaved,
            setError,
            errorMessage
        }}>
            {children}
        </SaveStatusContext.Provider>
    );
};

export const useSaveStatus = () => {
    const context = useContext(SaveStatusContext);
    if (!context) throw new Error('useSaveStatus must be used within SaveStatusProvider');
    return context;
};
