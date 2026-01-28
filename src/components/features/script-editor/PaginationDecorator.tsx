/**
 * PAGINATION DECORATOR
 * Renders page numbers in the left gutter while writing.
 * Final Draft-style live pagination feedback.
 */

import React, { useMemo } from 'react';
import { ScriptElement } from '../../../types';
import { paginateScript } from '../../../services/pagination';

interface PaginationDecoratorProps {
    elements: ScriptElement[];
    isVisible?: boolean;
}

export const PaginationDecorator: React.FC<PaginationDecoratorProps> = ({ 
    elements, 
    isVisible = true 
}) => {
    // Memoize pagination calculation (expensive for large scripts)
    const paginationMap = useMemo(() => {
        if (!elements || elements.length === 0) return new Map<string, number>();
        
        try {
            const pages = paginateScript(elements);
            const map = new Map<string, number>();
            
            pages.forEach(page => {
                page.elements.forEach(el => {
                    // Strip -part1/-contd suffixes to get original ID
                    const originalId = el.id.split('-part')[0].split('-contd')[0];
                    if (!map.has(originalId)) {
                        map.set(originalId, page.pageNumber);
                    }
                });
            });
            
            return map;
        } catch (err) {
            console.error('[Pagination Decorator] Failed to calculate pages:', err);
            return new Map<string, number>();
        }
    }, [elements]);

    // Track when page numbers change
    const pageBreaks = useMemo(() => {
        const breaks: Array<{ elementId: string; pageNumber: number }> = [];
        let lastPage = 0;
        
        elements.forEach(el => {
            const page = paginationMap.get(el.id);
            if (page && page !== lastPage) {
                breaks.push({ elementId: el.id, pageNumber: page });
                lastPage = page;
            }
        });
        
        return breaks;
    }, [elements, paginationMap]);

    if (!isVisible || pageBreaks.length === 0) return null;

    return (
        <>
            {pageBreaks.map(({ elementId, pageNumber }) => (
                <PageBreakMarker 
                    key={elementId} 
                    elementId={elementId} 
                    pageNumber={pageNumber} 
                />
            ))}
        </>
    );
};

/**
 * Individual page break marker
 * Positions itself absolutely at the corresponding element
 */
interface PageBreakMarkerProps {
    elementId: string;
    pageNumber: number;
}

const PageBreakMarker: React.FC<PageBreakMarkerProps> = ({ elementId, pageNumber }) => {
    // Find the DOM element by data-element-id attribute (assumes Slate nodes have this)
    const elementRef = React.useRef<HTMLElement | null>(null);
    const [position, setPosition] = React.useState<{ top: number } | null>(null);

    React.useEffect(() => {
        // Query for the element with matching ID
        const element = document.querySelector(`[data-element-id="${elementId}"]`);
        if (element) {
            elementRef.current = element as HTMLElement;
            const rect = element.getBoundingClientRect();
            const container = document.querySelector('.slate-editor-container'); // Adjust selector as needed
            const containerRect = container?.getBoundingClientRect();
            
            if (containerRect) {
                const relativeTop = rect.top - containerRect.top;
                setPosition({ top: relativeTop });
            }
        }
    }, [elementId]);

    if (!position) return null;

    return (
        <div 
            className="absolute left-0 flex items-center gap-2 pointer-events-none z-10"
            style={{ top: `${position.top - 8}px` }}
        >
            {/* Page Number Badge */}
            <div className="bg-primary/20 border border-primary/40 rounded-full px-3 py-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-mono font-bold text-primary">
                    PAGE {pageNumber}
                </span>
            </div>
            
            {/* Dotted Line Extending Right */}
            <div className="flex-1 border-t border-dashed border-primary/30" style={{ width: '60px' }} />
        </div>
    );
};

/**
 * Hook to calculate current page number for status bar
 */
export const useCurrentPage = (elements: ScriptElement[], cursorElementId?: string): number => {
    return useMemo(() => {
        if (!cursorElementId || !elements.length) return 1;
        
        try {
            const pages = paginateScript(elements);
            for (const page of pages) {
                if (page.elements.some(el => el.id.startsWith(cursorElementId))) {
                    return page.pageNumber;
                }
            }
        } catch (err) {
            console.error('[useCurrentPage] Error:', err);
        }
        
        return 1;
    }, [elements, cursorElementId]);
};

/**
 * Lightweight component for status bar display
 */
export const PageCountDisplay: React.FC<{ elements: ScriptElement[] }> = ({ elements }) => {
    const totalPages = useMemo(() => {
        if (!elements || elements.length === 0) return 0;
        try {
            const pages = paginateScript(elements);
            return pages.length;
        } catch {
            return 0;
        }
    }, [elements]);

    return (
        <div className="text-xs font-mono text-text-secondary flex items-center gap-2">
            <span className="font-bold text-primary">{totalPages}</span>
            <span>pages</span>
        </div>
    );
};
