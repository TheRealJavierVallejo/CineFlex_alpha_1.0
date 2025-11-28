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

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [element.content]);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && cursorRequest !== null && cursorRequest !== undefined && textareaRef.current) {
       textareaRef.current.setSelectionRange(cursorRequest, cursorRequest);
    }
  }, [cursorRequest, isActive]);

  // SCREENPLAY FORMATTING RULES
  // Using standard Tailwind classes to approximate industry margins (in inches/percentages)
  const getStyles = () => {
    const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-screenplay text-[16px] leading-relaxed text-black transition-colors duration-200 placeholder:opacity-30 border-none p-0 m-0 focus:ring-0";
    
    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-6 pb-2", // Scene headings have top padding
           input: `${base} font-bold uppercase`
        };
      case 'action':
        return {
           container: "pb-2",
           input: `${base}`
        };
      case 'character':
        return {
           container: "pt-4 pb-0 w-[60%] mx-auto", // Centered-ish, narrower width
           input: `${base} font-bold uppercase text-center`
        };
      case 'dialogue':
        return {
           container: "pb-2 w-[70%] mx-auto", // Wider than character, narrower than action
           input: `${base} text-center` // Ideally left-aligned within a centered box, but center aligns often look better on web responsive
        };
      case 'parenthetical':
        return {
           container: "pb-0 w-[55%] mx-auto",
           input: `${base} italic text-center` // Keep parentheticals tight
        };
      case 'transition':
        return {
           container: "pt-4 pb-4 flex justify-end",
           input: `${base} font-bold uppercase text-right w-[20%]`
        };
      default:
        return {
           container: "pb-2",
           input: `${base}`
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container} group/block`}>
       {/* Element Type Indicator (Left Margin) */}
       <div className="absolute -left-24 top-0 h-full w-20 flex items-start justify-end pr-4 opacity-0 group-hover/block:opacity-30 select-none pointer-events-none transition-opacity">
          <span className="text-[10px] font-sans font-bold uppercase text-zinc-400">
             {element.type.replace('_', ' ')}
          </span>
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
          spellCheck={false}
       />
    </div>
  );
};