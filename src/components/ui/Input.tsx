import React, { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react';

interface BaseInputProps {
    label?: string;
    error?: string;
    helperText?: string;
    maxLength?: number;
    showCount?: boolean;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
    variant?: 'text' | 'number';
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
    autoResize?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({
        label,
        error,
        helperText,
        maxLength,
        showCount = false,
        className = '',
        variant = 'text',
        ...props
    }, ref) => {
        const [charCount, setCharCount] = useState(0);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setCharCount(e.target.value.length);
            props.onChange?.(e);
        };

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm text-text-primary font-medium">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    type={variant}
                    className={`
            bg-[#252526] border text-text-primary text-sm h-7 px-2 rounded-sm outline-none
            transition-colors duration-100 selectable
            ${error ? 'border-status-error' : 'border-border focus:border-border-focus'}
            ${className}
          `}
                    maxLength={maxLength}
                    onChange={handleChange}
                    {...props}
                />
                {(error || helperText || (showCount && maxLength)) && (
                    <div className="flex items-center justify-between text-xs">
                        {error ? (
                            <span className="text-status-error">{error}</span>
                        ) : helperText ? (
                            <span className="text-text-muted">{helperText}</span>
                        ) : (
                            <span />
                        )}
                        {showCount && maxLength && (
                            <span className="text-text-muted">
                                {charCount}/{maxLength}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({
        label,
        error,
        helperText,
        maxLength,
        showCount = false,
        autoResize = false,
        className = '',
        ...props
    }, ref) => {
        const [charCount, setCharCount] = useState(0);
        const textareaRef = useRef<HTMLTextAreaElement | null>(null);

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setCharCount(e.target.value.length);

            if (autoResize && textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }

            props.onChange?.(e);
        };

        useEffect(() => {
            if (autoResize && textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        }, [autoResize]);

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm text-text-primary font-medium">
                        {label}
                    </label>
                )}
                <textarea
                    ref={(node) => {
                        textareaRef.current = node;
                        if (typeof ref === 'function') {
                            ref(node);
                        } else if (ref) {
                            ref.current = node;
                        }
                    }}
                    className={`
            bg-[#252526] border text-text-primary text-sm p-2 rounded-sm outline-none
            transition-colors duration-100 selectable resize-none
            ${error ? 'border-status-error' : 'border-border focus:border-border-focus'}
            ${className}
          `}
                    maxLength={maxLength}
                    onChange={handleChange}
                    {...props}
                />
                {(error || helperText || (showCount && maxLength)) && (
                    <div className="flex items-center justify-between text-xs">
                        {error ? (
                            <span className="text-status-error">{error}</span>
                        ) : helperText ? (
                            <span className="text-text-muted">{helperText}</span>
                        ) : (
                            <span />
                        )}
                        {showCount && maxLength && (
                            <span className="text-text-muted">
                                {charCount}/{maxLength}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Input;
