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
    // Styling Base: 
    // - leading-snug (approx 1.375) provides standard readable line height without being too loose.
    // - font-screenplay ensures Courier Prime.
    const base = "script-input-no-border block bg-transparent border-0 outline-none ring-0 shadow-none resize-none overflow-hidden font-screenplay text-[12pt] leading-snug transition-colors duration-200 w-full p-0 m-0 appearance-none focus:ring-0 focus:outline-none focus:border-0";

    // Theme Colors
    const colors = isLightMode ? {
      heading: "text-black",
      action: "text-black",
      character: "text-black",
      dialogue: "text-black",
      parenthetical: "text-black",
      transition: "text-black",
      placeholder: "placeholder:text-zinc-400"
    } : {
      heading: "text-[#E8E8E8]",
      action: "text-[#E8E8E8]",
      character: "text-[#E8E8E8]",
      dialogue: "text-[#E8E8E8]",
      parenthetical: "text-[#E8E8E8]",
      transition: "text-[#E8E8E8]",
      placeholder: "placeholder:text-[#555]"
    };

    // SPACING LOGIC (Top Padding Strategy)
    // 1 rem = 16px (approx 1 line at 12pt font)
    // pt-4 = 1 blank line before
    // pt-8 = 2 blank lines before
    // pt-0 = 0 blank lines before (tight connection)

    switch (element.type) {
      case 'scene_heading':
        return {
          // Scene Heading: Usually 2 blank lines before. 
          // Note: If it's the absolute first element, parent container padding handles it.
          container: "pt-8 group/heading", 
          input: `${base} font-bold uppercase text-left ${colors.heading} ${colors.placeholder}`,
          placeholder: "INT./EXT. SCENE LOCATION - DAY",
          indicator: "top-8", // Aligned with pt-8
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
      case 'action':
        return {
          // Action: 1 blank line before (standard paragraph break)
          container: "pt-4", 
          input: `${base} text-left ${colors.action} ${colors.placeholder}`,
          placeholder: "Describe action...",
          indicator: "top-4",
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
      case 'character':
        return {
          // Character: 1 blank line before
          container: "pt-4", 
          input: `${base} font-bold uppercase text-left ${colors.character} ${colors.placeholder}`,
          placeholder: "CHARACTER",
          indicator: "top-4",
          style: { paddingLeft: '2.0in', maxWidth: '5.5in' } // Standard indent
        };
      case 'dialogue':
        return {
          // Dialogue: 0 blank lines before (follows Character or Parenthetical)
          container: "pt-0", 
          input: `${base} text-left ${colors.dialogue} ${colors.placeholder}`,
          placeholder: "Dialogue",
          indicator: "top-0",
          style: { paddingLeft: '1.0in', maxWidth: '4.5in' } // Standard indent
        };
      case 'parenthetical':
        return {
          // Parenthetical: 0 blank lines before
          container: "pt-0", 
          input: `${base} italic text-left ${colors.parenthetical} ${colors.placeholder}`,
          placeholder: "(parenthetical)",
          indicator: "top-0",
          style: { paddingLeft: '1.5in', maxWidth: '3.5in' } // Standard indent
        };
      case 'transition':
        return {
          // Transition: 1 blank line before
          container: "pt-4", 
          input: `${base} font-bold uppercase text-right pr-4 ${colors.transition} ${colors.placeholder}`,
          placeholder: "CUT TO:",
          indicator: "top-4",
          style: { paddingLeft: '4.0in', maxWidth: '6.0in' } 
        };
      default:
        return {
          container: "pt-4", 
          input: `${base} ${colors.action} ${colors.placeholder}`,
          placeholder: "",
          indicator: "top-4",
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container}`}>
      {/* FORCE STYLES override for input cleanliness */}
      <style>{`
         .script-input-no-border {
           outline: none !important;
           border-width: 0px !important;
           border-style: none !important;
           border-color: transparent !important;
           box-shadow: none !important;
           background-image: none !important;
           --tw-ring-color: transparent !important;
         }
         .script-input-no-border:focus,
         .script-input-no-border:active,
         .script-input-no-border:focus-visible {
           outline: none !important;
           border-width: 0px !important;
           border-style: none !important;
           border-color: transparent !important;
           box-shadow: none !important;
           background-image: none !important;
           ring: 0 !important;
         }
         .script-input-no-border::placeholder {
            opacity: 1 !important; 
         }
       `}</style>

      {/* Type Indicator (Sidebar) */}
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
        style={{
          border: '0px solid transparent',
          outline: 'none',
          boxShadow: 'none',
          background: 'transparent',
          resize: 'none',
          ...styles.style
        }}
        rows={1}
        placeholder={styles.placeholder}
        spellCheck={false}
      />
    </div>
  );
};