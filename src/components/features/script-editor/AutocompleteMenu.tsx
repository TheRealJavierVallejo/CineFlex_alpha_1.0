import React, { useEffect, useRef } from 'react';

interface AutocompleteMenuProps {
    suggestions: string[];
    selectedIndex: number;
    onSelect: (value: string) => void;
    leftOffset?: string; // Legacy support
    position?: { top: number; left: number }; // New absolute positioning
}

export const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({
    suggestions,
    selectedIndex,
    onSelect,
    leftOffset = '0px',
    position
}) => {
    const listRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to selected item
    useEffect(() => {
        if (selectedRef.current && listRef.current) {
            const { offsetTop, offsetHeight } = selectedRef.current;
            const { scrollTop, clientHeight } = listRef.current;

            if (offsetTop < scrollTop) {
                listRef.current.scrollTop = offsetTop;
            } else if (offsetTop + offsetHeight > scrollTop + clientHeight) {
                listRef.current.scrollTop = offsetTop + offsetHeight - clientHeight;
            }
        }
    }, [selectedIndex]);

    if (suggestions.length === 0) return null;

    return (
        <div
            className={`z-50 w-64 bg-surface/95 backdrop-blur-md border border-border/50 shadow-xl rounded-lg overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 origin-top-left ring-1 ring-black/5 ${position ? 'fixed' : 'absolute top-full mt-2'}`}
            style={
                position ? {
                    top: `${position.top}px`,
                    left: `${position.left}px`
                } : {
                    left: leftOffset
                }
            }
        >
            <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        ref={index === selectedIndex ? selectedRef : null}
                        className={`px-3 py-2 text-sm font-mono cursor-pointer transition-all rounded-md truncate flex items-center gap-2 ${index === selectedIndex
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                            }`}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent focus loss from textarea
                            onSelect(suggestion);
                        }}
                    >
                        {/* Optional: Add icon based on type if we had it, for now just text */}
                        {suggestion}
                    </div>
                ))}
            </div>
        </div>
    );
};