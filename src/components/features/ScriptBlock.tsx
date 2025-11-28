import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { ScriptElement } from '../../types';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], selectionStart: number, selectionEnd: number) => void;
  onFocus: (id: string) => void;
  cursorRequest?: number | null;
}

export const ScriptBlock: React.FC<ScriptBlockProps> = ({
  element,
  isActive,
  onChange,
  onKeyDown,
  onFocus,
  cursorRequest
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resize Logic
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [element.content]);

  // Focus Logic
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  // Cursor Positioning
  useEffect(() => {
    if (isActive && cursorRequest !== null && cursorRequest !== undefined && textareaRef.current) {
       textareaRef.current.setSelectionRange(cursorRequest, cursorRequest);
    }
  }, [cursorRequest, isActive]);

  const getStyles = () => {
    // Base styles: Courier font, large comfortable size, transparent background
    // Standard screenplay font is 12pt Courier. 
    // In web pixels, 12pt is approx 16px. We use slightly larger for UI readability if needed, but 16-17px is good.
    const base = "block bg-transparent outline-none resize-none overflow-hidden font-screenplay text-[16px] leading-normal transition-colors duration-200 placeholder:opacity-30";
    
    // FORMATTING RULES (Based on Standard Screenplay Format)
    // 1 inch = ~96px / ~6rem
    // Page Width ~8.5"
    // Action: 6" wide
    // Dialogue: ~3.5" wide (approx 21rem)
    // Parenthetical: ~2.0" wide (approx 12rem)
    
    switch (element.type) {
      case 'scene_heading':
        return {
           // Scene Headings: Left aligned, Uppercase.
           // Standard: 1 line blank before, 1 line blank after.
           container: "pt-6 pb-2 group/heading",
           input: `${base} w-full font-bold uppercase tracking-wide text-[#E8E8E8] text-left`,
           placeholder: "INT. SCENE HEADING - DAY",
           indicator: "top-7"
        };
      case 'action':
        return {
           // Action: Full width (6 inches).
           container: "pb-4",
           input: `${base} w-full text-[#E8E8E8] text-left`,
           placeholder: "Action description...",
           indicator: "top-1"
        };
      case 'character':
        return {
           // Character: Centered relative to dialogue, UPPERCASE.
           // Indentation is typically ~2.2" from left margin.
           // In this centered layout, we use a centered column.
           container: "pt-4 pb-0",
           input: `${base} w-full max-w-[22rem] mx-auto font-bold uppercase tracking-widest text-[#E8E8E8] text-center`,
           placeholder: "CHARACTER",
           indicator: "top-5"
        };
      case 'dialogue':
        return {
           // Dialogue: ~3.5 inches wide, centered under character.
           container: "pb-2",
           input: `${base} w-full max-w-[24rem] mx-auto text-[#E8E8E8] text-left`,
           placeholder: "Dialogue...",
           indicator: "top-0"
        };
      case 'parenthetical':
        return {
           // Parenthetical: Inside dialogue width, indented further.
           container: "pb-0",
           input: `${base} w-full max-w-[16rem] mx-auto italic text-[#AAAAAA] text-left`,
           placeholder: "(parenthetical)",
           indicator: "top-0"
        };
      case 'transition':
        return {
           // Transition: Right aligned.
           container: "pt-4 pb-4",
           input: `${base} w-full font-bold uppercase tracking-widest text-right text-[#E8E8E8] pr-0`,
           placeholder: "CUT TO:",
           indicator: "top-6"
        };
      default:
        return {
           container: "pb-2",
           input: `${base} w-full text-[#E8E8E8]`,
           placeholder: "",
           indicator: "top-2"
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container}`}>
       {/* Type Indicator - Visual Guide on the left */}
       <div className={`
          absolute -left-32 text-[9px] uppercase transition-all duration-200 select-none w-24 text-right pr-4 border-r font-sans
          ${styles.indicator}
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'text-[#444] border-[#333] opacity-0 group-hover:opacity-50'}
       `}>
          {element.type.replace('_', ' ')}
       </div>

       <textarea
          ref={textareaRef}
          value={element.content}
          onChange={(e) => onChange(element.id, e.target.value)}
          onKeyDown={(e) => {
             const target = e.target as HTMLTextAreaElement;
             onKeyDown(e, element.id, element.type, target.selectionStart, target.selectionEnd);
          }}
          onFocus={() => onFocus(element.id)}
          className={styles.input}
          rows={1}
          placeholder={styles.placeholder}
          spellCheck={false}
       />
    </div>
  );
};