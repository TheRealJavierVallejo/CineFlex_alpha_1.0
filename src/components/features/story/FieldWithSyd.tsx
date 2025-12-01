import React, { useRef } from 'react';
import { Sparkles, Check } from 'lucide-react';

interface FieldWithSydProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    multiline?: boolean;
    onRequestSyd: (element: HTMLElement) => void;
    isActiveSyd: boolean;
    placeholder?: string;
}

export const FieldWithSyd: React.FC<FieldWithSydProps> = ({
    id,
    label,
    value,
    onChange,
    disabled = false,
    multiline = false,
    onRequestSyd,
    isActiveSyd,
    placeholder
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSydClick = () => {
        if (containerRef.current) {
            onRequestSyd(containerRef.current);
        }
    };

    return (
        <div className="space-y-1.5" ref={containerRef}>
            <label htmlFor={id} className="block text-xs font-medium text-text-secondary">
                {label}
            </label>
            <div className="flex gap-2 items-start">
                {multiline ? (
                    <textarea
                        id={id}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        placeholder={placeholder}
                        rows={3}
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm focus:border-primary focus:outline-none resize-none disabled:opacity-50 transition-colors"
                    />
                ) : (
                    <input
                        id={id}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded text-text-primary text-sm focus:border-primary focus:outline-none disabled:opacity-50 transition-colors"
                    />
                )}

                <button
                    onClick={handleSydClick}
                    disabled={disabled}
                    className={`
                        shrink-0 px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 transition-all
                        ${isActiveSyd
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary/50'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${multiline ? 'h-fit' : 'h-full'}
                    `}
                    title={isActiveSyd ? "Connected to Syd" : "Ask Syd for help"}
                >
                    {isActiveSyd ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Connected</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ask Syd</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};