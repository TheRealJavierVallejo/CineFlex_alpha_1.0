import { BaseEditor, Descendant, Node } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';
import { ScriptElement } from '../../../types';
import { getElementMargins, getElementSpacing } from './slateFormatting';

// Extend Slate's type definitions
export type ScriptElementType = ScriptElement['type'];

export type CustomElement = {
    type: ScriptElementType;
    id: string; // Preserved from ScriptElement for tracking
    children: CustomText[];
};

export type CustomText = {
    text: string;
};

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

// Declare module augmentation for TypeScript
declare module 'slate' {
    interface CustomTypes {
        Editor: CustomEditor;
        Element: CustomElement;
        Text: CustomText;
    }
}

/**
 * Returns the appropriate CSS classes and inline styles for an element
 */
export function getElementStyles(
    type: ScriptElementType,
    isFirstOnPage: boolean,
    isLightMode: boolean
) {
    const margins = getElementMargins(type);
    const spacing = getElementSpacing(type, isFirstOnPage);

    // Base classes (matching ScriptBlock.tsx)
    const baseClasses = 'font-screenplay text-[12pt] leading-screenplay outline-none relative';

    // Color classes based on theme
    const colorClasses = isLightMode ? {
        heading: 'text-black',
        action: 'text-black',
        character: 'text-black',
        dialogue: 'text-black',
        parenthetical: 'text-black',
        transition: 'text-black',
    } : {
        heading: 'text-[#E0E0E0]',
        action: 'text-[#D4D4D4]',
        character: 'text-[#E0E0E0]',
        dialogue: 'text-[#D4D4D4]',
        parenthetical: 'text-[#A3A3A3]',
        transition: 'text-[#E0E0E0]',
    };

    switch (type) {
        case 'scene_heading':
            return {
                className: `${baseClasses} ${colorClasses.heading} font-bold uppercase ${spacing}`,
                style: margins
            };

        case 'action':
            return {
                className: `${baseClasses} ${colorClasses.action} ${spacing}`,
                style: margins
            };

        case 'character':
            return {
                className: `${baseClasses} ${colorClasses.character} font-bold uppercase ${spacing}`,
                style: margins
            };

        case 'dialogue':
            return {
                className: `${baseClasses} ${colorClasses.dialogue} pt-0`,
                style: margins
            };

        case 'parenthetical':
            return {
                className: `${baseClasses} ${colorClasses.parenthetical} italic pt-0`,
                style: margins
            };

        case 'transition':
            return {
                className: `${baseClasses} ${colorClasses.transition} font-bold uppercase text-right ${spacing}`,
                style: margins
            };

        default:
            return {
                className: `${baseClasses} ${colorClasses.action} ${spacing}`,
                style: { marginLeft: '0in', width: '100%' }
            };
    }
}

/**
 * Renders a script element with appropriate styling and visual page breaks
 *
 * @param props - Slate render element props
 * @param isLightMode - Whether light theme is active
 * @param isFirstOnPage - Whether this element starts a new page (affects top spacing)
 * @param isLastOnPage - Whether this element ends a page
 * @param pageNumber - The page number this element is on
 * @param shouldShowPageBreak - Whether to render the "Page X" visual separator
 * @param virtualHeader - Optional virtual character header (e.g., "JASON (CONT'D)") for page splits
 * @param showMore - Optional (MORE) indicator at bottom of element
 */
export function renderScriptElement(
    props: any,
    isLightMode: boolean,
    isFirstOnPage: boolean,
    isLastOnPage: boolean,
    pageNumber: number = 1,
    shouldShowPageBreak: boolean = false,
    virtualHeader?: string,
    showMore?: boolean
) {
    const { attributes, children, element } = props;
    const { className, style } = getElementStyles(element.type, isFirstOnPage, isLightMode);

    // Get styles for character (to style virtual header)
    const charStyles = getElementStyles('character', false, isLightMode);
    // Get styles for dialogue (to style MORE, aligned with dialogue)
    const dialogueStyles = getElementStyles('dialogue', false, isLightMode);

    return (
        <>
            {/* Visual Page Break - Clean/Minimal Style */}
            {shouldShowPageBreak && (
                <div 
                    contentEditable={false}
                    className="pointer-events-none select-none flex flex-col items-center justify-center"
                    style={{
                        marginLeft: '-1.5in', // Pull to left edge of paper container
                        marginRight: '-1in',  // Pull to right edge of paper container
                        width: '8.5in',       // Explicit width to match paper
                        height: '1in',        // Reduced height for cleaner look
                        marginTop: '0',
                        marginBottom: '0',
                        position: 'relative'
                    }}
                >
                    <div className={`flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase ${isLightMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        <div className={`w-8 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`} />
                        <span>Page {pageNumber}</span>
                        <div className={`w-8 border-t ${isLightMode ? 'border-zinc-200' : 'border-zinc-800'}`} />
                    </div>
                </div>
            )}
            
            {/* Virtual Character Header (for CONT'D at top of page) */}
            {virtualHeader && (
                <div
                    contentEditable={false}
                    className={`select-none ${charStyles.className}`}
                    style={{ ...charStyles.style, paddingTop: '1rem', paddingBottom: 0, opacity: 0.8 }}
                >
                    {virtualHeader}
                </div>
            )}

            {/* Element Content */}
            <div
                {...attributes}
                className={className}
                style={style}
                data-element-type={element.type}
            >
                {children}
            </div>

            {/* (MORE) indicator at bottom of page */}
            {showMore && (
                <div
                    contentEditable={false}
                    className={`select-none uppercase text-center ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}`}
                    style={{ 
                        marginLeft: dialogueStyles.style.marginLeft,
                        width: dialogueStyles.style.width,
                        marginTop: 0,
                        fontSize: '12pt',
                        lineHeight: '1.0'
                     }}
                >
                    (MORE)
                </div>
            )}
        </>
    );
}
