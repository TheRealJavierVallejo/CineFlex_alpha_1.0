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
    const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-mono text-base text-[#CCCCCC] leading-relaxed selection:bg-[#264F78] selection:text-white transition-colors duration-200 placeholder:opacity-20";
    
    // Active line highlighting (Subtle)
    const activeClass = isActive ? "bg-[#252526]/50 rounded-sm ring-1 ring-[#333]" : "";

    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-8 pb-4 border-b border-white/5 mb-4 group/heading",
           input: `${base} font-bold uppercase tracking-widest text-[#E8E8E8] ${activeClass}`,
           placeholder: "INT. SCENE HEADING - DAY"
        };
      case 'action':
        return {
           container: "pb-4",
           input: `${base} ${activeClass}`,
           placeholder: "Action..."
        };
      case 'character':
        return {
           container: "pt-4 pb-0 flex justify-center",
           input: `${base} font-bold uppercase text-center w-[60%] tracking-widest mt-2 ${activeClass}`,
           placeholder: "CHARACTER"
        };
      case 'dialogue':
        return {
           container: "pb-2 flex justify-center",
           input: `${base} text-center w-[70%] max-w-[480px] ${activeClass}`,
           placeholder: "Dialogue..."
        };
      case 'parenthetical':
        return {
           container: "pb-0 flex justify-center",
           input: `${base} italic text-sm text-center w-[50%] text-[#969696] ${activeClass}`,
           placeholder: "(parenthetical)"
        };
      case 'transition':
        return {
           container: "pt-4 pb-4 flex justify-end pr-12",
           input: `${base} font-bold uppercase text-right w-[30%] tracking-widest ${activeClass}`,
           placeholder: "CUT TO:"
        };
      default:
        return {
           container: "pb-2",
           input: `${base} ${activeClass}`,
           placeholder: ""
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container}`}>
       {/* Type Indicator */}
       <div className={`
          absolute -left-28 top-2 text-[9px] uppercase transition-all duration-200 select-none w-24 text-right pr-4 border-r
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'text-[#505050] border-[#333] opacity-0 group-hover:opacity-100'}
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