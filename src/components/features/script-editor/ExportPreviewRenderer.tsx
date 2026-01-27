import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Project, ScriptElement } from '../../../types';
import { ExportOptions } from '../../../services/exportService';
import { calculatePagination } from '../../../services/pagination';
import { FileText } from 'lucide-react';
import {
    PAGE_WIDTH_IN,
    PAGE_HEIGHT_IN,
    MARGIN_TOP_IN,
    MARGIN_BOTTOM_IN,
    MARGIN_LEFT_IN,
    MARGIN_RIGHT_IN,
    FONT_FAMILY,
    FONT_SIZE_PT,
    LINE_HEIGHT_IN,
    INDENT_CHARACTER_IN,
    INDENT_DIALOGUE_IN,
    INDENT_DIALOGUE_RIGHT_IN,
    INDENT_PAREN_IN,
    PAGE_NUM_TOP_IN,
    PAGE_NUM_RIGHT_IN
} from '../../../services/screenplayLayout';

interface ExportPreviewRendererProps {
    project: Project;
    options: ExportOptions;
    onPageCountChange?: (pageCount: number) => void;
}

// Convert inches to pixels at 96 DPI (browser standard)
const INCH_TO_PX = 96;
const PAGE_WIDTH_PX = PAGE_WIDTH_IN * INCH_TO_PX; // 816px
const PAGE_HEIGHT_PX = PAGE_HEIGHT_IN * INCH_TO_PX; // 1056px
const MIN_SCALE = 0.5; // Don't scale below 50%
const MAX_SCALE = 1.0; // Don't scale above 100%

// Virtualization settings
const OVERSCAN_COUNT = 2; // Render 2 extra pages above/below viewport

// Typography-only styles (no margins - those come from elementMargins)
const elementStyles: Record<string, string> = {
    'scene_heading': 'font-bold uppercase',
    'action': '',
    'character': 'uppercase font-bold',
    'dialogue': '',
    'parenthetical': 'italic',
    'transition': 'uppercase font-bold',
    'shot': 'uppercase font-bold'
};

// Element margins using real inch values (relative to content area)
const elementMargins: Record<string, React.CSSProperties> = {
    'scene_heading': { marginLeft: '0', width: '100%' },
    'action': { marginLeft: '0', width: '100%' },
    'character': { marginLeft: `${INDENT_CHARACTER_IN}in`, width: 'auto' },
    'dialogue': { marginLeft: `${INDENT_DIALOGUE_IN}in`, marginRight: `${INDENT_DIALOGUE_RIGHT_IN}in`, width: 'auto' },
    'parenthetical': { marginLeft: `${INDENT_PAREN_IN}in`, width: 'auto' },
    'transition': { textAlign: 'right', width: '100%', marginRight: '0' }
};

export const ExportPreviewRenderer: React.FC<ExportPreviewRendererProps> = ({
    project,
    options,
    onPageCountChange
}) => {
    const elements = project.scriptElements || [];
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState<number | null>(null); // null = loading
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

    const pages = useMemo(() => {
        if (!elements.length) return [];

        const pageMap = calculatePagination(elements);
        const groupedPages: ScriptElement[][] = [];

        elements.forEach(el => {
            const pageNum = pageMap[el.id] || 1;
            if (!groupedPages[pageNum - 1]) {
                groupedPages[pageNum - 1] = [];
            }
            groupedPages[pageNum - 1].push(el);
        });

        return groupedPages;
    }, [elements, project.id]);

    // Calculate responsive scale based on container width
    const calculateScale = useCallback(() => {
        if (!containerRef.current) return;
        
        const containerWidth = containerRef.current.clientWidth;
        const padding = 32; // Account for padding on both sides
        const availableWidth = containerWidth - padding;
        
        // Calculate scale to fit page width
        const calculatedScale = availableWidth / PAGE_WIDTH_PX;
        
        // Clamp between MIN_SCALE and MAX_SCALE
        const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, calculatedScale));
        
        setScale(clampedScale);
    }, []);

    // Calculate which pages should be rendered based on scroll position
    const updateVisibleRange = useCallback(() => {
        if (!scrollContainerRef.current || scale === null) return;

        const scrollTop = scrollContainerRef.current.scrollTop;
        const containerHeight = scrollContainerRef.current.clientHeight;
        
        // Calculate scaled page height (including gap)
        const scaledPageHeight = PAGE_HEIGHT_PX * scale;
        const gap = 16; // gap-4 = 16px
        const totalPageHeight = scaledPageHeight + gap;

        // Calculate visible range
        const startIndex = Math.max(0, Math.floor(scrollTop / totalPageHeight) - OVERSCAN_COUNT);
        const endIndex = Math.min(
            pages.length + (options.includeTitlePage ? 1 : 0),
            Math.ceil((scrollTop + containerHeight) / totalPageHeight) + OVERSCAN_COUNT
        );

        setVisibleRange({ start: startIndex, end: endIndex });
    }, [scale, pages.length, options.includeTitlePage]);

    // Setup scale calculation with proper cleanup
    useEffect(() => {
        const timer = setTimeout(calculateScale, 50);
        
        window.addEventListener('resize', calculateScale);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateScale);
        };
    }, [calculateScale]);

    // Setup scroll listener for virtualization
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        // Initial calculation
        updateVisibleRange();

        // Throttled scroll handler for performance
        let rafId: number | null = null;
        const handleScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                updateVisibleRange();
                rafId = null;
            });
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [updateVisibleRange]);

    // Recalculate visible range when scale changes
    useEffect(() => {
        if (scale !== null) {
            updateVisibleRange();
        }
    }, [scale, updateVisibleRange]);

    useEffect(() => {
        if (onPageCountChange) {
            const totalPages = pages.length + (options.includeTitlePage ? 1 : 0);
            onPageCountChange(totalPages);
        }
    }, [pages.length, options.includeTitlePage, onPageCountChange]);

    const renderElement = (element: ScriptElement, index: number, isFirstOnPage: boolean) => {
        const styleClass = elementStyles[element.type] || '';
        const margins = elementMargins[element.type] || {};
        const text = element.content || '';

        // Industry standard spacing (in line heights)
        let spacingStyle: React.CSSProperties = {};
        if (!isFirstOnPage) {
            if (element.type === 'scene_heading') {
                spacingStyle = { marginTop: `${LINE_HEIGHT_IN * 2}in` };
            } else if (element.type !== 'dialogue' && element.type !== 'parenthetical') {
                spacingStyle = { marginTop: `${LINE_HEIGHT_IN}in` };
            }
        }

        if (element.type === 'scene_heading' && options.includeSceneNumbers) {
            const sceneNumber = element.sceneNumber || '';
            return (
                <div key={element.id} className={`${styleClass} relative`} style={{ ...margins, ...spacingStyle }}>
                    <span className="absolute" style={{ left: '-0.6in', opacity: 0.5 }}>{sceneNumber}</span>
                    {text}
                    <span className="absolute" style={{ right: '-0.6in', opacity: 0.5 }}>{sceneNumber}</span>
                </div>
            );
        }

        return (
            <div key={element.id} className={styleClass} style={{ ...margins, ...spacingStyle }}>
                {text}
            </div>
        );
    };

    // Page styles using real inch dimensions with aspect ratio
    const pageStyle: React.CSSProperties = {
        width: `${PAGE_WIDTH_IN}in`,
        aspectRatio: `${PAGE_WIDTH_IN} / ${PAGE_HEIGHT_IN}`,
        paddingTop: `${MARGIN_TOP_IN}in`,
        paddingBottom: `${MARGIN_BOTTOM_IN}in`,
        paddingLeft: `${MARGIN_LEFT_IN}in`,
        paddingRight: `${MARGIN_RIGHT_IN}in`,
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        fontSize: `${FONT_SIZE_PT}pt`,
        lineHeight: `${LINE_HEIGHT_IN}in`
    };

    // Empty state
    if (!elements.length) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                    <FileText className="w-12 h-12 text-text-muted mx-auto opacity-50" />
                    <p className="text-sm text-text-muted">Preview will appear here</p>
                    <p className="text-xs text-text-muted/70">Start writing to see preview</p>
                </div>
            </div>
        );
    }

    // Loading state while calculating scale
    if (scale === null) {
        return (
            <div ref={containerRef} className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-text-muted">Loading preview...</p>
                </div>
            </div>
        );
    }

    const totalPages = pages.length + (options.includeTitlePage ? 1 : 0);
    const scaledPageHeight = PAGE_HEIGHT_PX * scale;
    const gap = 16;

    // Calculate total height for virtualization
    const totalHeight = totalPages * (scaledPageHeight + gap);

    return (
        <div ref={scrollContainerRef} className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div 
                ref={containerRef} 
                className="relative mx-auto"
                style={{ 
                    height: `${totalHeight}px`,
                    width: `${PAGE_WIDTH_PX * scale}px`,
                    paddingTop: '16px',
                    paddingBottom: '16px'
                }}
            >
                {/* Title Page - Virtualized */}
                {options.includeTitlePage && project.titlePage && 
                 visibleRange.start <= 0 && visibleRange.end > 0 && (
                    <div 
                        className="absolute"
                        style={{
                            top: '16px',
                            left: '0',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left'
                        }}
                    >
                        <div
                            className="bg-white text-black shadow-2xl relative rounded-sm"
                            style={pageStyle}
                        >
                            <div className="flex flex-col h-full justify-center items-center text-center">
                                <h1 className="text-2xl font-bold mb-4 uppercase">
                                    {project.titlePage.title || project.name || 'Untitled'}
                                </h1>
                                {project.titlePage.authors && project.titlePage.authors.length > 0 && (
                                    <div style={{ marginTop: `${LINE_HEIGHT_IN * 4}in` }}>
                                        <p className="mb-4">{project.titlePage.credit || 'Written by'}</p>
                                        {project.titlePage.authors.map((author, i) => (
                                            <p key={i} className="font-bold">{author}</p>
                                        ))}
                                    </div>
                                )}

                                <div
                                    className="absolute text-left"
                                    style={{
                                        bottom: `${MARGIN_BOTTOM_IN}in`,
                                        left: `${MARGIN_LEFT_IN}in`
                                    }}
                                >
                                    {project.titlePage.contact && (
                                        <p className="whitespace-pre-wrap">{project.titlePage.contact}</p>
                                    )}
                                </div>
                            </div>
                            {options.watermark && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-10 overflow-hidden">
                                    <div className="text-8xl font-bold rotate-[-45deg] text-black whitespace-nowrap">
                                        {options.watermark}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Script Pages - Virtualized */}
                {pages.map((page, pageIndex) => {
                    const adjustedIndex = options.includeTitlePage ? pageIndex + 1 : pageIndex;
                    const isVisible = adjustedIndex >= visibleRange.start && adjustedIndex < visibleRange.end;
                    
                    if (!isVisible) return null;

                    const topPosition = 16 + (adjustedIndex * (scaledPageHeight + gap));

                    return (
                        <div 
                            key={pageIndex}
                            className="absolute"
                            style={{
                                top: `${topPosition}px`,
                                left: '0',
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <div
                                className="bg-white text-black shadow-2xl relative rounded-sm"
                                style={pageStyle}
                            >
                                {/* Page number */}
                                <div
                                    className="absolute"
                                    style={{
                                        top: `${PAGE_NUM_TOP_IN}in`,
                                        right: `${PAGE_NUM_RIGHT_IN}in`,
                                        fontFamily: FONT_FAMILY,
                                        fontSize: `${FONT_SIZE_PT}pt`
                                    }}
                                >
                                    {pageIndex + 1}.
                                </div>

                                {/* Page content */}
                                <div>
                                    {page.map((element, idx) => renderElement(element, idx, idx === 0))}
                                </div>

                                {/* Watermark */}
                                {options.watermark && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-10 overflow-hidden">
                                        <div className="text-8xl font-bold rotate-[-45deg] text-black whitespace-nowrap">
                                            {options.watermark}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
