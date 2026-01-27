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
const PAGE_WIDTH_PX = PAGE_WIDTH_IN * INCH_TO_PX;
const PAGE_HEIGHT_PX = PAGE_HEIGHT_IN * INCH_TO_PX;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.0;
const OVERSCAN_COUNT = 2;

// Dual dialogue dimensions (matching PDF export)
const DUAL_LEFT_CHAR_INDENT = 0.5;
const DUAL_LEFT_DIALOGUE_INDENT = 0.0;
const DUAL_RIGHT_CHAR_INDENT = 3.5;
const DUAL_RIGHT_DIALOGUE_INDENT = 3.0;
const DUAL_COLUMN_WIDTH = 2.8;

const elementStyles: Record<string, string> = {
    'scene_heading': 'font-bold uppercase',
    'action': '',
    'character': 'uppercase font-bold',
    'dialogue': '',
    'parenthetical': 'italic',
    'transition': 'uppercase font-bold',
    'shot': 'uppercase font-bold'
};

export const ExportPreviewRenderer: React.FC<ExportPreviewRendererProps> = ({
    project,
    options,
    onPageCountChange
}) => {
    const elements = project.scriptElements || [];
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState<number | null>(null);
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

    const calculateScale = useCallback(() => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        const padding = 32;
        const availableWidth = containerWidth - padding;
        const calculatedScale = availableWidth / PAGE_WIDTH_PX;
        const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, calculatedScale));
        setScale(clampedScale);
    }, []);

    const updateVisibleRange = useCallback(() => {
        if (!scrollContainerRef.current || scale === null) return;

        const scrollTop = scrollContainerRef.current.scrollTop;
        const containerHeight = scrollContainerRef.current.clientHeight;
        const scaledPageHeight = PAGE_HEIGHT_PX * scale;
        const gap = 16;
        const totalPageHeight = scaledPageHeight + gap;

        const startIndex = Math.max(0, Math.floor(scrollTop / totalPageHeight) - OVERSCAN_COUNT);
        const endIndex = Math.min(
            pages.length + (options.includeTitlePage ? 1 : 0),
            Math.ceil((scrollTop + containerHeight) / totalPageHeight) + OVERSCAN_COUNT
        );

        setVisibleRange({ start: startIndex, end: endIndex });
    }, [scale, pages.length, options.includeTitlePage]);

    useEffect(() => {
        const timer = setTimeout(calculateScale, 50);
        window.addEventListener('resize', calculateScale);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateScale);
        };
    }, [calculateScale]);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        updateVisibleRange();

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

    // Render page content with dual dialogue support
    const renderPageContent = (page: ScriptElement[]) => {
        const rendered: JSX.Element[] = [];
        let i = 0;

        while (i < page.length) {
            const el = page[i];
            const nextEl = page[i + 1];

            // Check if this starts a dual dialogue block
            const isDualStart = el.type === 'character' && nextEl?.type === 'character' && nextEl.dual;

            if (isDualStart) {
                // Collect dual dialogue elements
                const leftColumn: ScriptElement[] = [el];
                const rightColumn: ScriptElement[] = [];
                
                i++; // Move past first character
                
                // Collect left column dialogue/parentheticals
                while (i < page.length && !page[i].dual && page[i].type !== 'character') {
                    if (page[i].type === 'dialogue' || page[i].type === 'parenthetical') {
                        leftColumn.push(page[i]);
                    } else {
                        break;
                    }
                    i++;
                }

                // Collect right column (character + dialogue)
                if (i < page.length && page[i].dual && page[i].type === 'character') {
                    rightColumn.push(page[i]);
                    i++;

                    while (i < page.length && page[i].dual) {
                        if (page[i].type === 'dialogue' || page[i].type === 'parenthetical') {
                            rightColumn.push(page[i]);
                        }
                        i++;
                    }
                }

                // Render dual dialogue block
                rendered.push(
                    <div key={`dual-${el.id}`} className="flex" style={{ marginTop: `${LINE_HEIGHT_IN}in` }}>
                        {/* Left Column */}
                        <div style={{ width: '50%' }}>
                            {leftColumn.map(elem => renderSingleElement(elem, true))}
                        </div>
                        {/* Right Column */}
                        <div style={{ width: '50%' }}>
                            {rightColumn.map(elem => renderSingleElement(elem, true))}
                        </div>
                    </div>
                );
            } else {
                // Regular element
                rendered.push(renderSingleElement(el, false, i === 0));
                i++;
            }
        }

        return rendered;
    };

    // Render a single element with proper styling
    const renderSingleElement = (element: ScriptElement, isDual: boolean, isFirstOnPage: boolean = false) => {
        const styleClass = elementStyles[element.type] || '';
        let text = element.content || '';

        // Add (CONT'D) to character names
        if (element.type === 'character' && element.isContinued) {
            text += " (CONT'D)";
        }

        // Spacing
        let spacingStyle: React.CSSProperties = {};
        if (!isFirstOnPage && !isDual) {
            if (element.type === 'scene_heading') {
                spacingStyle = { marginTop: `${LINE_HEIGHT_IN * 2}in` };
            } else if (element.type !== 'dialogue' && element.type !== 'parenthetical') {
                spacingStyle = { marginTop: `${LINE_HEIGHT_IN}in` };
            }
        }

        // Positioning based on dual dialogue or not
        let positionStyle: React.CSSProperties = {};
        
        if (isDual) {
            // Dual dialogue positioning
            const isRight = element.dual;
            if (element.type === 'character') {
                positionStyle = {
                    marginLeft: isRight ? `${DUAL_RIGHT_CHAR_INDENT}in` : `${DUAL_LEFT_CHAR_INDENT}in`,
                    width: `${DUAL_COLUMN_WIDTH}in`
                };
            } else if (element.type === 'dialogue') {
                positionStyle = {
                    marginLeft: isRight ? `${DUAL_RIGHT_DIALOGUE_INDENT}in` : `${DUAL_LEFT_DIALOGUE_INDENT}in`,
                    width: `${DUAL_COLUMN_WIDTH}in`
                };
            } else if (element.type === 'parenthetical') {
                positionStyle = {
                    marginLeft: isRight ? `${DUAL_RIGHT_DIALOGUE_INDENT + 0.3}in` : `${DUAL_LEFT_DIALOGUE_INDENT + 0.3}in`,
                    width: `${DUAL_COLUMN_WIDTH - 0.6}in`
                };
            }
        } else {
            // Regular positioning
            if (element.type === 'character') {
                positionStyle = { marginLeft: `${INDENT_CHARACTER_IN}in`, width: 'auto' };
            } else if (element.type === 'dialogue') {
                positionStyle = { marginLeft: `${INDENT_DIALOGUE_IN}in`, marginRight: `${INDENT_DIALOGUE_RIGHT_IN}in`, width: 'auto' };
            } else if (element.type === 'parenthetical') {
                positionStyle = { marginLeft: `${INDENT_PAREN_IN}in`, width: 'auto' };
            } else if (element.type === 'transition') {
                positionStyle = { textAlign: 'right', width: '100%', marginRight: '0' };
            } else {
                positionStyle = { marginLeft: '0', width: '100%' };
            }
        }

        // Scene numbers
        if (element.type === 'scene_heading' && options.includeSceneNumbers) {
            const sceneNumber = element.sceneNumber || '';
            return (
                <div key={element.id} className={`${styleClass} relative`} style={{ ...positionStyle, ...spacingStyle }}>
                    <span className="absolute" style={{ left: '-0.6in', opacity: 0.5 }}>{sceneNumber}</span>
                    {text}
                    <span className="absolute" style={{ right: '-0.6in', opacity: 0.5 }}>{sceneNumber}</span>
                </div>
            );
        }

        return (
            <div key={element.id} className={styleClass} style={{ ...positionStyle, ...spacingStyle }}>
                {text}
            </div>
        );
    };

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
                {/* Title Page */}
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
                        <div className="bg-white text-black shadow-2xl relative rounded-sm" style={pageStyle}>
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

                {/* Script Pages */}
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
                            <div className="bg-white text-black shadow-2xl relative rounded-sm" style={pageStyle}>
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

                                <div>
                                    {renderPageContent(page)}
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
                    );
                })}
            </div>
        </div>
    );
};
