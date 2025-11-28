import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from '../../utils/debounce';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    debounceTime?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        debouncedOnChange(val);
    };

    return (
        <input
            {...props}
            value={localValue}
            onChange={handleChange}
        />
    );
};