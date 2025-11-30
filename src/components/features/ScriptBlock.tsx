import React, { useRef, useEffect, useLayoutEffect, memo } from 'react';
import { ScriptElement } from '../../types';
import { Columns } from 'lucide-react';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], selectionStart: number, selectionEnd: number) => void;
  onFocus: (id: string) => void;
  cursorRequest?: number | null;
  isLightMode?: boolean;
}

const ScriptBlockComponent: React.FC<ScriptBlockProps> = ({
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
    // Styling Base
    const base = "script-input-no-border block bg-transparent border-0 outline-none ring-0 shadow-none resize-none overflow-hidden font-screenplay text-[12pt] leading-snug transition-colors duration-200 w-full p-0 m-0 appearance-none focus:ring-0 focus:outline-none focus:border-0";

    // Theme Colors
    const colors = isLightMode ? {
      heading: "text-black",
      action: "text-black",
      character: "text-black",
      dialogue: "text-black",
      parenthetical: "text-black",
      transition: "text-black",
      placeholder: "placeholder:text-zinc-400",
      note: "text-zinc-500",
      section: "text-zinc-400"
    } : {
      heading: "text-[#E8E8E8]",
      action: "text-[#E8E8E8]",
      character: "text-[#E8E8E8]",
      dialogue: "text-[#E8E8E8]",
      parenthetical: "text-[#E8E8E8]",
      transition: "text-[#E8E8E8]",
      placeholder: "placeholder:text-[#555]",
      note: "text-[#888]",
      section: "text-[#666]"
    };

    // Detection for "Pseudo-Types" (Notes, Centered, Sections)
    const text = element.content.trim();
    const isNote = text.startsWith('[[') && text.endsWith(']]');
    const isCentered = text.startsWith('>') && text.endsWith('<');
    const isSection = text.startsWith('#');

    // Override Action styles if it detects special formatting
    if (element.type === 'action') {
        if (isNote) {
            return {
                container: "pt-4 pb-4 opacity-80",
                input: `${base} ${colors.note} text-left italic ${colors.placeholder}`,
                placeholder: "[[Note]]",
                indicator: "top-4",
                style: { paddingLeft: '0in', maxWidth: '6.0in' }
            };
        }
        if (isCentered) {
            return {
                container: "pt-4 pb-4",
                input: `${base} ${colors.action} text-center ${colors.placeholder}`,
                placeholder: "> Centered <",
                indicator: "top-4",
                style: { paddingLeft: '0in', maxWidth: '6.0in' }
            };
        }
        if (isSection) {
            return {
                container: "pt-8 pb-4", 
                input: `${base} ${colors.section} font-bold text-left ${colors.placeholder}`,
                placeholder: "# Section",
                indicator: "top-8",
                style: { paddingLeft: '0in', maxWidth: '6.0in' }
            };
        }
    }

    switch (element.type) {
      case 'scene_heading':
        return {
          container: "pt-8 pb-4 group/heading", 
          input: `${base} font-bold uppercase text-left ${colors.heading} ${colors.placeholder}`,
          placeholder: "INT./EXT. SCENE LOCATION - DAY",
          indicator: "top-8", 
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
      case 'action':
        return {
          container: "pt-4", 
          input: `${base} text-left ${colors.action} ${colors.placeholder}`,
          placeholder: "Describe action...",
          indicator: "top-4",
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
      case 'character':
        return {
          container: "pt-4", 
          input: `${base} font-bold uppercase text-left ${colors.character} ${colors.placeholder}`,
          placeholder: "CHARACTER",
          indicator: "top-4",
          style: { paddingLeft: '2.0in', maxWidth: '5.5in' }
        };
      case 'dialogue':
        return {
          container: "pt-0", 
          input: `${base} text-left ${colors.dialogue} ${colors.placeholder}`,
          placeholder: "Dialogue",
          indicator: "top-0",
          style: { paddingLeft: '1.0in', maxWidth: '4.5in' } 
        };
      case 'parenthetical':
        return {
          container: "pt-0", 
          input: `${base} italic text-left ${colors.parenthetical} ${colors.placeholder}`,
          placeholder: "(parenthetical)",
          indicator: "top-0",
          style: { paddingLeft: '1.5in', maxWidth: '3.5in' } 
        };
      case 'transition':
        return {
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

      {/* Left Indicator (Type) */}
      <div className={`
          absolute -left-[240px] w-32 text-[10px] uppercase transition-all duration-200 select-none text-right pr-4 font-sans border-r flex items-center justify-end gap-2
          ${styles.indicator}
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'border-transparent opacity-0 group-hover:opacity-30'}
          ${isLightMode && !isActive ? 'text-zinc-400' : ''}
          ${!isLightMode && !isActive ? 'text-[#444]' : ''}
       `}>
        {element.dual && <Columns className="w-3 h-3 text-text-muted" title="Dual Dialogue" />}
        {element.type.replace('_', ' ')}
      </div>

      {/* Right Indicator (Scene Number) */}
      {element.type === 'scene_heading' && element.sceneNumber && (
          <div className={`
              absolute -right-[1.5in] w-12 text-sm font-mono font-bold select-none text-left
              ${styles.indicator}
              ${isLightMode ? 'text-zinc-400' : 'text-[#666]'}
          `}>
              {element.sceneNumber}
          </div>
      )}

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

export const ScriptBlock = memo(ScriptBlockComponent, (prev, next) => {
    // Custom Comparator to prevent re-renders when other lines change
    return (
        prev.element.id === next.element.id &&
        prev.element.content === next.element.content &&
        prev.element.type === next.element.type &&
        prev.element.dual === next.element.dual &&
        prev.element.sceneNumber === next.element.sceneNumber &&
        prev.isActive === next.isActive &&
        prev.isLightMode === next.isLightMode &&
        prev.cursorRequest === next.cursorRequest
    );
});