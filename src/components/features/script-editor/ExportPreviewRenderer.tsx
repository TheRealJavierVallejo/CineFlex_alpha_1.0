import React, { useEffect, useMemo } from 'react';
import { Project, ScriptElement } from '../../../types';
import { ExportOptions } from '../../../services/exportService';
import { calculatePagination } from '../../../services/pagination';
import { FileText } from 'lucide-react';

interface ExportPreviewRendererProps {
    project: Project;
    options: ExportOptions;
    onPageCountChange?: (pageCount: number) => void;
}

const elementStyles: Record<string, string> = {
    'scene_heading': 'font-bold uppercase mb-4',
    'action': 'mb-4',
    'character': 'uppercase ml-[35%] mb-1 font-bold',
    'dialogue': 'ml-[15%] mr-[15%] mb-4',
    'parenthetical': 'ml-[25%] mb-1 italic',
    'transition': 'uppercase text-right mb-4 font-bold',
    'shot': 'uppercase mb-4 font-bold'
};

// Scaled margins (60% of actual size for preview)
const elementMargins: Record<string, React.CSSProperties> = {
    'scene_heading': { marginLeft: '0', width: '100%' },
    'action': { marginLeft: '0', width: '100%' },
    'character': { marginLeft: '120px', width: 'auto' },  // 60% of 2in (192px * 0.6)
    'dialogue': { marginLeft: '60px', marginRight: '60px', width: 'auto' },  // 60% of 1in
    'parenthetical': { marginLeft: '90px', width: 'auto' },  // 60% of 1.5in
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

        // Industry standard spacing (scaled to 60%)
        let spacingStyle: React.CSSProperties = {};
        if (!isFirstOnPage) {
            if (element.type === 'scene_heading') {
                spacingStyle = { marginTop: '2em' };
            } else if (element.type !== 'dialogue' && element.type !== 'parenthetical') {
                spacingStyle = { marginTop: '1em' };
            }
        }

        if (element.type === 'scene_heading' && options.includeSceneNumbers) {
            const sceneNumber = element.sceneNumber || '';
            return (
                <div key={element.id} className={`${styleClass} relative`} style={{ ...margins, ...spacingStyle }}>
                    <span className="absolute -left-12 opacity-50">{sceneNumber}</span>
                    {text}
                    <span className="absolute -right-12 opacity-50">{sceneNumber}</span>
                </div>
            );
        }

        return (
            <div key={element.id} className={styleClass} style={{ ...margins, ...spacingStyle }}>
                {text}
            </div>
        );
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
        <div className="w-full h-full flex items-start justify-center overflow-y-auto bg-zinc-900 p-8">
            <div className="flex flex-col items-center gap-8">
                {/* Title Page */}
                {options.includeTitlePage && project.titlePage && (
                    <div
                        className="preview-page bg-white text-black shadow-2xl relative shrink-0 rounded-sm"
                        style={{
                            width: '510px',  // 60% of 8.5in (816px * 0.6)
                            height: '660px', // 60% of 11in (1056px * 0.6)
                            padding: '60px', // 60% of 1in margins
                            boxSizing: 'border-box',
                            transform: 'scale(1)',
                            transformOrigin: 'top center'
                        }}
                    >
                        <div className="flex flex-col h-full justify-center items-center text-center font-mono">
                            <h1 className="text-xl font-bold mb-4 uppercase">
                                {project.titlePage.title || project.name || 'Untitled'}
                            </h1>
                            {project.titlePage.authors && project.titlePage.authors.length > 0 && (
                                <div className="mt-12">
                                    <p className="text-xs mb-4">{project.titlePage.credit || 'Written by'}</p>
                                    {project.titlePage.authors.map((author, i) => (
                                        <p key={i} className="text-xs font-bold">{author}</p>
                                    ))}
                                </div>
                            )}

                            <div className="absolute bottom-[60px] left-[60px] text-left" style={{ fontSize: '7.2pt' }}>
                                {project.titlePage.contact && (
                                    <p className="whitespace-pre-wrap">{project.titlePage.contact}</p>
                                )}
                            </div>
                        </div>
                        {/* Watermark */}
                        {options.watermark && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-10 overflow-hidden">
                                <div className="text-5xl font-bold rotate-[-45deg] text-black whitespace-nowrap">
                                    {options.watermark}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Script Pages */}
                {pages.map((page, pageIndex) => (
                    <div
                        key={pageIndex}
                        className="preview-page bg-white text-black shadow-2xl relative shrink-0 rounded-sm"
                        style={{
                            width: '510px',  // 60% of 8.5in
                            minHeight: '660px', // 60% of 11in
                            padding: '60px', // 60% of 1in margins
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Page number */}
                        <div className="absolute top-[30px] right-[60px] font-mono" style={{ fontSize: '7.2pt' }}>
                            {pageIndex + 1}.
                        </div>

                        {/* Page content */}
                        <div
                            className="font-mono"
                            style={{
                                fontFamily: 'Courier, "Courier New", monospace',
                                fontSize: '7.2pt',  // 60% of 12pt
                                lineHeight: '14.4pt', // 60% of 24pt
                                width: '390px'  // 60% of 6.5in (650px * 0.6)
                            }}
                        >
                            {page.map((element, idx) => renderElement(element, idx, idx === 0))}
                        </div>

                        {/* Watermark */}
                        {options.watermark && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-10 overflow-hidden">
                                <div className="text-5xl font-bold rotate-[-45deg] text-black whitespace-nowrap">
                                    {options.watermark}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
