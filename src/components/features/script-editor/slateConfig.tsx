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
    pageNumber: number = 1
) {
    const { attributes, children, element } = props;
    const { className, style } = getElementStyles(element.type, isFirstOnPage, isLightMode);

    return (
        <div
            {...attributes}
            className={className}
            style={style}
            data-element-type={element.type}
        >
            {/* Visual Page Break - Final Draft Style */}
            {isFirstOnPage && pageNumber > 1 && (
                <div 
                    contentEditable={false} 
                    className="relative w-full my-4 pointer-events-none select-none"
                    style={{ marginLeft: `-${style.marginLeft || '0px'}` }} // Counteract element margin so break spans full width
                >
                    {/* Thin horizontal line */}
                    <div className={`w-full border-t ${isLightMode ? 'border-zinc-300' : 'border-zinc-800'}`} />
                    
                    {/* Page number badge */}
                    <div 
                        className={`absolute -top-2 right-8 px-2 text-[10px] font-mono ${isLightMode ? 'bg-white text-zinc-400' : 'bg-[#1E1E1E] text-zinc-600'}`}
                    >
                        {pageNumber}.
                    </div>
                </div>
            )}
            
            {children}
        </div>
    );
}