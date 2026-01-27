import React, { useEffect, useMemo } from 'react';
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
    PREVIEW_SCALE,
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

    // Page styles using real inch dimensions
    const pageStyle: React.CSSProperties = {
        width: `${PAGE_WIDTH_IN}in`,
        minHeight: `${PAGE_HEIGHT_IN}in`,
        paddingTop: `${MARGIN_TOP_IN}in`,
        paddingBottom: `${MARGIN_BOTTOM_IN}in`,
        paddingLeft: `${MARGIN_LEFT_IN}in`,
        paddingRight: `${MARGIN_RIGHT_IN}in`,
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        fontSize: `${FONT_SIZE_PT}pt`,
        lineHeight: `${LINE_HEIGHT_IN}in`
    };

    // Scale wrapper to shrink pages for preview
    const scaleWrapperStyle: React.CSSProperties = {
        transform: `scale(${PREVIEW_SCALE})`,
        transformOrigin: 'top center'
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

    return (
        <div className="w-full h-full flex justify-center overflow-y-auto overflow-x-hidden bg-zinc-900 p-8">
            <div className="flex flex-col items-center gap-8">
                {/* Title Page */}
                {options.includeTitlePage && project.titlePage && (
                    <div style={scaleWrapperStyle}>
                        <div
                            className="bg-white text-black shadow-2xl relative rounded-sm"
                            style={{ ...pageStyle, height: `${PAGE_HEIGHT_IN}in` }}
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
                )}

                {/* Script Pages */}
                {pages.map((page, pageIndex) => (
                    <div key={pageIndex} style={scaleWrapperStyle}>
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
                ))}
            </div>
        </div>
    );
};
