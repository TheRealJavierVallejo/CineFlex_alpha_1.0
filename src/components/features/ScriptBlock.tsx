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
    // UPDATED: Using 'font-screenplay' (Courier Prime) and slightly larger text for readability
    const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-screenplay text-[17px] leading-relaxed transition-colors duration-200 placeholder:opacity-30";
    
    // Default text color logic from previous version (No color changes requested)
    // Base Text: #CCCCCC
    
    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-8 pb-4 border-b border-white/5 mb-4 group/heading",
           // Bold, Uppercase, Standard Left Align
           input: `${base} font-bold uppercase tracking-wider text-[#E8E8E8]`,
           placeholder: "INT. SCENE HEADING - DAY",
           indicator: "top-10"
        };
      case 'action':
        return {
           container: "pb-4",
           // Standard Left Align
           input: `${base} text-[#CCCCCC]`,
           placeholder: "Action...",
           indicator: "top-1"
        };
      case 'character':
        return {
           container: "pt-4 pb-0",
           // UPDATED: Indented ~40% from left, text-left (Standard Screenplay Format)
           // Instead of centering, we push it to the character column.
           input: `${base} font-bold uppercase tracking-widest text-[#E8E8E8] pl-[37%]`,
           placeholder: "CHARACTER",
           indicator: "top-5"
        };
      case 'dialogue':
        return {
           container: "pb-2",
           // UPDATED: Indented ~25% from left, constrained width ~75% (Standard Screenplay Format)
           input: `${base} text-[#CCCCCC] pl-[25%] pr-[25%]`,
           placeholder: "Dialogue...",
           indicator: "top-1"
        };
      case 'parenthetical':
        return {
           container: "pb-0",
           // UPDATED: Indented ~30% from left
           input: `${base} italic text-sm text-[#969696] pl-[31%]`,
           placeholder: "(parenthetical)",
           indicator: "top-0.5"
        };
      case 'transition':
        return {
           container: "pt-4 pb-4",
           // Right Aligned
           input: `${base} font-bold uppercase tracking-widest text-right text-[#E8E8E8] pr-12`,
           placeholder: "CUT TO:",
           indicator: "top-6"
        };
      default:
        return {
           container: "pb-2",
           input: `${base} text-[#CCCCCC]`,
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
          absolute -left-28 text-[9px] uppercase transition-all duration-200 select-none w-24 text-right pr-4 border-r font-sans
          ${styles.indicator}
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'text-[#505050] border-[#333] opacity-0 group-hover:opacity-100'}
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