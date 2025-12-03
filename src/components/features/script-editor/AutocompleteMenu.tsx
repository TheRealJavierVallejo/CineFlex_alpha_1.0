import React from 'react';

interface AutocompleteMenuProps {
    suggestions: string[];
    selectedIndex: number;
    position: { top: number; left: number };
    getMenuProps: () => any;
    getItemProps: (index: number) => any;
}

export const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({
    suggestions,
    selectedIndex,
    position,
    getMenuProps,
    getItemProps
}) => {
    return (
        <div
            {...getMenuProps()}
            className="z-50 w-64 bg-surface/95 backdrop-blur-md border border-border/50 shadow-xl rounded-lg overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 origin-top-left ring-1 ring-black/5"
            style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                maxHeight: '300px',
                overflowY: 'auto'
            }}
        >
            <div className="p-1">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={`${suggestion}-${index}`}
                        {...getItemProps(index)}
                        className={`px-3 py-2 text-sm font-mono cursor-pointer transition-all rounded-md truncate flex items-center gap-2 ${
                            index === selectedIndex
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                        }`}
                    >
                        {suggestion}
                    </div>
                ))}
            </div>
        </div>
    );
};