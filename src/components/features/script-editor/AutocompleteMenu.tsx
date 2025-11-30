import React, { useEffect, useRef } from 'react';

interface AutocompleteMenuProps {
    suggestions: string[];
    selectedIndex: number;
    onSelect: (value: string) => void;
    leftOffset?: string; // To align with text indentation (e.g. Character center)
}

export const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({ 
    suggestions, 
    selectedIndex, 
    onSelect,
    leftOffset = '0px'
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
            className="absolute z-50 top-full mt-1 w-64 bg-surface border border-border shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-left"
            style={{ left: leftOffset }}
        >
            <div className="text-[9px] uppercase font-bold text-text-tertiary px-3 py-1 bg-surface-secondary border-b border-border tracking-wider">
                SmartType
            </div>
            <div ref={listRef} className="max-h-48 overflow-y-auto bg-surface">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        ref={index === selectedIndex ? selectedRef : null}
                        className={`px-3 py-2 text-xs font-mono cursor-pointer transition-colors truncate ${
                            index === selectedIndex
                                ? 'bg-primary text-white'
                                : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                        }`}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent focus loss from textarea
                            onSelect(suggestion);
                        }}
                    >
                        {suggestion}
                    </div>
                ))}
            </div>
        </div>
    );
};