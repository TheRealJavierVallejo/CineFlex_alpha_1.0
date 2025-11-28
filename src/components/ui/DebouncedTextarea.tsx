import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from '../../utils/debounce';

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    debounceTime?: number;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
    value: initialValue,
    onChange,
    debounceTime = 500,
    ...props
}) => {
    const [localValue, setLocalValue] = useState(initialValue);

    useEffect(() => {
        setLocalValue(initialValue);
    }, [initialValue]);

    const debouncedOnChange = useCallback(
        debounce((val: string) => {
            onChange(val);
        }, debounceTime),
        [onChange, debounceTime]
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        debouncedOnChange(val);
    };

    return (
        <textarea
            {...props}
            value={localValue}
            onChange={handleChange}
        />
    );
};