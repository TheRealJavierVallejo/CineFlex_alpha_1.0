import React, { useRef, useEffect } from 'react';
import { ScriptElement } from '../../types';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type']) => void;
  onFocus: (id: string) => void;
}

export const ScriptBlock: React.FC<ScriptBlockProps> = ({
  element,
  isActive,
  onChange,
  onKeyDown,
  onFocus
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [element.content]);

  // Focus management
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  const getStyles = () => {
    // Base font is explicitly Courier for screenplay look
    const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-mono text-base text-[#CCCCCC] leading-relaxed selection:bg-[#264F78] selection:text-white";
    
    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-8 pb-4 border-b border-white/5 mb-4 group/heading",
           input: `${base} font-bold uppercase tracking-widest text-[#E8E8E8]`
        };
      case 'action':
        return {
           container: "pb-4",
           input: `${base}`
        };
      case 'character':
        return {
           container: "pt-4 pb-0 flex justify-center",
           // Characters are typically centered but slightly to left of true center in standard format, but centered is fine for web
           input: `${base} font-bold uppercase text-center w-[60%] tracking-widest mt-2`
        };
      case 'dialogue':
        return {
           container: "pb-2 flex justify-center",
           input: `${base} text-center w-[70%] max-w-[480px]`
        };
      case 'parenthetical':
        return {
           container: "pb-0 flex justify-center",
           input: `${base} italic text-sm text-center w-[50%] text-[#969696]`
        };
      case 'transition':
        return {
           container: "pt-4 pb-4 flex justify-end pr-12",
           input: `${base} font-bold uppercase text-right w-[30%] tracking-widest`
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
    <div className={`relative ${styles.container}`}>
       {/* Visual Type Indicator (Left Margin) - Hidden unless hovered */}
       <div className="absolute -left-28 top-2 text-[9px] text-[#505050] uppercase opacity-0 group-hover:opacity-100 transition-opacity select-none w-24 text-right pr-4 border-r border-[#333]">
          {element.type.replace('_', ' ')}
       </div>

       <textarea
          ref={textareaRef}
          value={element.content}
          onChange={(e) => onChange(element.id, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, element.id, element.type)}
          onFocus={() => onFocus(element.id)}
          className={styles.input}
          rows={1}
          placeholder={element.type === 'scene_heading' ? 'INT. LOCATION - TIME' : ''}
          spellCheck={false}
       />
    </div>
  );
};