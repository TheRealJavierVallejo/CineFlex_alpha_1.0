import React from 'react';

interface PageDividerProps {
    pageNumber: number;
}

export const PageDivider: React.FC<PageDividerProps> = ({ pageNumber }) => {
    return (
        <div className="relative w-full h-16 bg-[#0C0C0E] my-4 flex flex-col items-center justify-center select-none group/divider">
            
            {/* Top Shadow (Bottom of Previous Page) */}
            <div className="absolute top-0 w-full h-1 bg-gradient-to-b from-black/20 to-transparent" />
            
            {/* Bottom Shadow (Top of Next Page) */}
            <div className="absolute bottom-0 w-full h-1 bg-gradient-to-t from-black/20 to-transparent" />

            {/* The Visual Gap */}
            <div className="w-full h-full border-t border-b border-border/50 flex items-center justify-between px-12 text-[10px] font-mono text-text-tertiary">
                <span className="opacity-50">END OF PAGE {pageNumber - 1}</span>
                
                {/* Hole Punches (Just for fun aesthetic) */}
                <div className="flex gap-2 opacity-20">
                    <div className="w-3 h-3 rounded-full bg-background border border-border" />
                    <div className="w-3 h-3 rounded-full bg-background border border-border" />
                    <div className="w-3 h-3 rounded-full bg-background border border-border" />
                </div>

                <span className="text-primary font-bold">PAGE {pageNumber}</span>
            </div>
        </div>
    );
};