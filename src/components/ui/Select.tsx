import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    options: SelectOption[];
    placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({
        label,
        error,
        helperText,
        options,
        placeholder,
        className = '',
        ...props
    }, ref) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm text-text-primary font-medium">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`
              bg-[#252526] border text-text-primary text-sm h-7 px-2 pr-8 rounded-sm outline-none
              appearance-none w-full cursor-pointer
              transition-colors duration-100
              ${error ? 'border-status-error' : 'border-border focus:border-border-focus'}
              ${className}
            `}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                </div>
                {(error || helperText) && (
                    <div className="text-xs">
                        {error ? (
                            <span className="text-status-error">{error}</span>
                        ) : helperText ? (
                            <span className="text-text-muted">{helperText}</span>
                        ) : null}
                    </div>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
