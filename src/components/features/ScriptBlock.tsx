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
    const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-[family-name:var(--font-family-screenplay)] text-lg text-text-primary leading-relaxed selection:bg-primary/30";
    
    switch (element.type) {
      case 'scene_heading':
        return {
           container: "pt-8 pb-4 border-b border-border/10 mb-4",
           input: `${base} font-bold uppercase tracking-wider`
        };
      case 'action':
        return {
           container: "pb-4",
           input: `${base}`
        };
      case 'character':
        return {
           container: "pt-4 pb-0 flex justify-center",
           input: `${base} font-bold uppercase text-center w-[60%] tracking-wide`
        };
      case 'dialogue':
        return {
           container: "pb-2 flex justify-center",
           input: `${base} text-center w-[50%] max-w-[400px]`
        };
      case 'parenthetical':
        return {
           container: "pb-0 flex justify-center",
           input: `${base} italic text-sm text-center w-[40%]`
        };
      case 'transition':
        return {
           container: "pt-4 pb-4 flex justify-end pr-12",
           input: `${base} font-bold uppercase text-right w-[30%]`
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
    <div className={`group relative ${styles.container}`}>
       {/* Visual Type Indicator (Left Margin) */}
       <div className="absolute -left-24 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary uppercase opacity-0 group-hover:opacity-50 select-none w-20 text-right">
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