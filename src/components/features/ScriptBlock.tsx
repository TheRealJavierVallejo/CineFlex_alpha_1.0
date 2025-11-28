import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { ScriptElement } from '../../types';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  // Updated onKeyDown signature to include cursor position
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], selectionStart: number, selectionEnd: number) => void;
  onFocus: (id: string) => void;
  cursorRequest?: number | null; // New prop: Parent asks to move cursor here
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

  // Resize Logic (UseLayoutEffect prevents visual jitter)
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

  // Forced Cursor Positioning (For Merges/Splits)
  useEffect(() => {
    if (isActive && cursorRequest !== null && cursorRequest !== undefined && textareaRef.current) {
       textareaRef.current.setSelectionRange(cursorRequest, cursorRequest);
    }
  }, [cursorRequest, isActive]);

  const getStyles = () => {
    const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-mono text-base leading-relaxed selection:bg-primary/40 selection:text-white transition-colors duration-200 placeholder:opacity-20";
    
    // No active box styling
    const activeClass = "";

    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-8 pb-4 border-b border-white/5 mb-4 group/heading",
           input: `${base} font-bold uppercase tracking-widest text-text-primary ${activeClass}`,
           placeholder: "INT. SCENE HEADING - DAY",
           indicator: "top-10" // Matches pt-8 (32px) offset
        };
      case 'action':
        return {
           container: "pb-4",
           input: `${base} text-text-primary ${activeClass}`,
           placeholder: "Action...",
           indicator: "top-1" // Standard alignment
        };
      case 'character':
        return {
           container: "pt-4 pb-0 flex justify-center",
           input: `${base} font-bold uppercase text-center w-[60%] tracking-widest mt-2 text-text-primary ${activeClass}`,
           placeholder: "CHARACTER",
           indicator: "top-8" // Matches pt-4 (16px) + mt-2 (8px) = 24px offset
        };
      case 'dialogue':
        return {
           container: "pb-2 flex justify-center",
           input: `${base} text-center w-[70%] max-w-[480px] text-text-primary ${activeClass}`,
           placeholder: "Dialogue...",
           indicator: "top-1" // Standard alignment
        };
      case 'parenthetical':
        return {
           container: "pb-0 flex justify-center",
           input: `${base} italic text-sm text-center w-[50%] text-text-secondary ${activeClass}`,
           placeholder: "(parenthetical)",
           indicator: "top-0.5" // Slightly tighter alignment for smaller text
        };
      case 'transition':
        return {
           container: "pt-4 pb-4 flex justify-end pr-12",
           input: `${base} font-bold uppercase text-right w-[30%] tracking-widest text-text-primary ${activeClass}`,
           placeholder: "CUT TO:",
           indicator: "top-6" // Matches pt-4 (16px) offset
        };
      default:
        return {
           container: "pb-2",
           input: `${base} text-text-primary ${activeClass}`,
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
          absolute -left-28 text-[9px] uppercase transition-all duration-200 select-none w-24 text-right pr-4 border-r
          ${styles.indicator}
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'text-text-muted border-[#333] opacity-0 group-hover:opacity-100'}
       `}>
          {element.type.replace('_', ' ')}
       </div>

       <textarea
          ref={textareaRef}
          value={element.content}
          onChange={(e) => onChange(element.id, e.target.value)}
          onKeyDown={(e) => {
             // Pass precise cursor info to parent
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