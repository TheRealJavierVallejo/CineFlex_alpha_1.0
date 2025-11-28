import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { ScriptElement } from '../../types';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], selectionStart: number, selectionEnd: number) => void;
  onFocus: (id: string) => void;
  cursorRequest?: number | null;
  isLightMode?: boolean;
}

export const ScriptBlock: React.FC<ScriptBlockProps> = ({
  element,
  isActive,
  onChange,
  onKeyDown,
  onFocus,
  cursorRequest,
  isLightMode = false
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
    // NUCLEAR OPTION for removing borders: using specific class 'script-input-no-border'
    // This class is targeted by the style tag below to force override defaults
    const base = "script-input-no-border block bg-transparent resize-none overflow-hidden font-screenplay text-[16px] leading-normal transition-colors duration-200 placeholder:opacity-30 w-full p-0 m-0 appearance-none";
    
    // Theme Colors
    const colors = isLightMode ? {
        heading: "text-black",
        action: "text-black",
        character: "text-black",
        dialogue: "text-zinc-900",
        parenthetical: "text-zinc-600",
        transition: "text-black",
        placeholder: "placeholder:text-zinc-300"
    } : {
        heading: "text-[#E8E8E8]",
        action: "text-[#E8E8E8]",
        character: "text-[#E8E8E8]",
        dialogue: "text-[#E8E8E8]",
        parenthetical: "text-[#AAAAAA]",
        transition: "text-[#E8E8E8]",
        placeholder: "placeholder:text-[#444]"
    };

    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-6 pb-2 group/heading",
           input: `${base} font-bold uppercase tracking-wide text-left ${colors.heading} ${colors.placeholder}`,
           placeholder: "INT. SCENE HEADING - DAY",
           indicator: "top-7"
        };
      case 'action':
        return {
           container: "pb-4",
           input: `${base} text-left ${colors.action} ${colors.placeholder}`,
           placeholder: "Action description...",
           indicator: "top-1"
        };
      case 'character':
        return {
           container: "pt-4 pb-0",
           input: `${base} max-w-[22rem] mx-auto font-bold uppercase tracking-widest text-center ${colors.character} ${colors.placeholder}`,
           placeholder: "CHARACTER",
           indicator: "top-5"
        };
      case 'dialogue':
        return {
           container: "pb-2",
           input: `${base} max-w-[24rem] mx-auto text-left ${colors.dialogue} ${colors.placeholder}`,
           placeholder: "Dialogue...",
           indicator: "top-0"
        };
      case 'parenthetical':
        return {
           container: "pb-0",
           input: `${base} max-w-[16rem] mx-auto italic text-left ${colors.parenthetical} ${colors.placeholder}`,
           placeholder: "(parenthetical)",
           indicator: "top-0"
        };
      case 'transition':
        return {
           container: "pt-4 pb-4",
           input: `${base} font-bold uppercase tracking-widest text-right pr-0 ${colors.transition} ${colors.placeholder}`,
           placeholder: "CUT TO:",
           indicator: "top-6"
        };
      default:
        return {
           container: "pb-2",
           input: `${base} ${colors.action} ${colors.placeholder}`,
           placeholder: "",
           indicator: "top-2"
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container}`}>
       {/* FORCE STYLES: This style tag ensures no external CSS can force a border on our inputs */}
       <style>{`
         .script-input-no-border {
           outline: none !important;
           border: none !important;
           box-shadow: none !important;
           ring: 0 !important;
         }
         .script-input-no-border:focus {
           outline: none !important;
           border: none !important;
           box-shadow: none !important;
           ring: 0 !important;
         }
         .script-input-no-border:focus-visible {
           outline: none !important;
           border: none !important;
           box-shadow: none !important;
           ring: 0 !important;
         }
       `}</style>

       {/* 
         TYPE INDICATOR POSITIONING CORRECTION:
         - Paper Padding: 100px. Content starts at x=0 relative to this block.
         - Paper Edge: -100px relative to this block.
         - Indicator Width: w-32 (128px).
         - Desired Gap: 12px outside paper.
         - Target Right Edge of Indicator: -112px.
         - Calculation: Left = TargetRight - Width = -112 - 128 = -240px.
         - Result: -left-[240px].
       */}
       <div className={`
          absolute -left-[240px] w-32 text-[10px] uppercase transition-all duration-200 select-none text-right pr-4 font-sans border-r
          ${styles.indicator}
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'border-transparent opacity-0 group-hover:opacity-30'}
          ${isLightMode && !isActive ? 'text-zinc-400' : ''}
          ${!isLightMode && !isActive ? 'text-[#444]' : ''}
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
          style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }} 
          rows={1}
          placeholder={styles.placeholder}
          spellCheck={false}
       />
    </div>
  );
};