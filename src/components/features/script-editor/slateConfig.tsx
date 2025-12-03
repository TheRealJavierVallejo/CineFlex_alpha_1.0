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
 */
export function renderScriptElement(
    props: any,
    isLightMode: boolean,
    isFirstOnPage: boolean,
    isLastOnPage: boolean,
    pageNumber: number = 1
) {
    const { attributes, children, element } = props;
    const { className, style } = getElementStyles(element.type, isFirstOnPage, isLightMode);

    return (
        <>
            {/* Visual Page Break - Gap style */}
            {isFirstOnPage && pageNumber > 1 && (
                <div 
                    contentEditable={false}
                    className="pointer-events-none select-none"
                    style={{
                        marginLeft: '-1.5in', // Pull to left edge of paper
                        marginRight: '-1in',  // Pull to right edge of paper
                        width: '8.5in',       // Explicit width to match paper
                        marginTop: '0',
                        marginBottom: '0',
                        height: '2in',
                        position: 'relative',
                        display: 'block'
                    }}
                >
                    {/* Page End Shadow (previous page bottom) */}
                    <div
                        className={isLightMode ? 'bg-gradient-to-b from-transparent to-gray-300/20' : 'bg-gradient-to-b from-transparent to-black/30'}
                        style={{ height: '0.25in', width: '100%' }}
                    />
                    
                    {/* Gap between pages (shows background) */}
                    <div
                        className={isLightMode ? 'bg-zinc-100' : 'bg-[#1a1a1a]'}
                        style={{
                            height: '1.5in',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderTop: isLightMode ? '1px solid #e5e7eb' : '1px solid #27272a',
                            borderBottom: isLightMode ? '1px solid #e5e7eb' : '1px solid #27272a'
                        }}
                    >
                        <div className={`text-xs font-mono ${isLightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Page {pageNumber}
                        </div>
                    </div>
                    
                    {/* New Page Shadow */}
                    <div
                        className={isLightMode ? 'bg-gradient-to-b from-gray-300/20 to-transparent' : 'bg-gradient-to-b from-black/30 to-transparent'}
                        style={{ height: '0.25in', width: '100%' }}
                    />
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
        </>
    );
}