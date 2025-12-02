import React, { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface FieldWithSydProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    multiline?: boolean;
    onRequestSyd: (element: HTMLElement) => void;
    isActiveSyd: boolean;
    placeholder?: string;
    minHeight?: string;
}

export const FieldWithSyd: React.FC<FieldWithSydProps> = ({
    id,
    label,
    value,
    onChange,
    readOnly = false,
    multiline = false,
    onRequestSyd,
    isActiveSyd,
    placeholder,
    minHeight = '80px'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (multiline && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = Math.max(scrollHeight, parseInt(minHeight)) + 'px';
        }
    }, [value, multiline, minHeight]);

    const handleSydClick = () => {
        if (containerRef.current) {
            onRequestSyd(containerRef.current);
        }
    };

    const inputClasses = `
        w-full px-4 py-3 rounded-md text-sm transition-all placeholder:text-text-muted/50
        ${readOnly 
            ? 'bg-primary/5 border border-primary text-text-secondary cursor-text focus:outline-none' 
            : 'bg-surface-secondary border border-border text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none'}
    `;

    return (
        <div className="space-y-2 group" ref={containerRef}>
            <div className="flex items-center justify-between">
                <label htmlFor={id} className={`text-xs font-bold uppercase tracking-wider transition-colors ${readOnly ? 'text-primary' : 'text-text-secondary'}`}>
                    {label}
                </label>
                {isActiveSyd && (
                    <span className="text-[10px] text-primary flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3" /> Syd Active
                    </span>
                )}
            </div>
            
            <div className="relative">
                {multiline ? (
                    <textarea
                        ref={textareaRef}
                        id={id}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={readOnly}
                        placeholder={placeholder}
                        className={`${inputClasses} resize-none leading-relaxed`}
                        style={{ minHeight }}
                    />
                ) : (
                    <input
                        id={id}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={readOnly}
                        placeholder={placeholder}
                        className={inputClasses}
                    />
                )}

                {/* Floating Syd Button (Hidden if readOnly) */}
                {!readOnly && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={handleSydClick}
                            className={`
                                p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm backdrop-blur-sm
                                ${isActiveSyd
                                    ? 'bg-primary text-white border border-primary'
                                    : 'bg-surface/80 border border-border text-text-secondary hover:text-primary hover:border-primary/50'}
                            `}
                            title="Ask Syd for help with this field"
                            type="button"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};