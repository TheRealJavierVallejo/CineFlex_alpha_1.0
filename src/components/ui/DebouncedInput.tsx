import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '../../utils/debounce';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    debounceTime?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
    value: initialValue,
    onChange,
    debounceTime = 300, // 🔥 CHANGED: 500ms → 300ms
    ...props
}) => {
    const [localValue, setLocalValue] = useState(initialValue);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync external value changes to local state
    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);

    // 🔥 NEW: Force immediate save (no debounce)
    const forceSave = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        // Only save if value actually changed
        if (localValue !== initialValue) {
            onChange(localValue);
        }
    }, [localValue, initialValue, onChange]);

    // 🔥 NEW: Save on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            // Final save on unmount if changed
            if (localValue !== initialValue) {
                onChange(localValue);
            }
        };
    }, [localValue, initialValue, onChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            onChange(val);
            debounceTimerRef.current = null;
        }, debounceTime);
    };

    return (
        <input
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={forceSave} // 🔥 NEW: Save on blur
        />
    );
};