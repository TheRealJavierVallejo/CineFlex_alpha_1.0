import React, { useRef, useEffect, useLayoutEffect, memo, useState } from 'react';
import { ScriptElement } from '../../types';
import { Columns, X } from 'lucide-react';
import { AutocompleteMenu } from './script-editor/AutocompleteMenu';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], selectionStart: number, selectionEnd: number) => void;
  onFocus: (id: string) => void;
  onDeleteSceneNumber?: (id: string) => void;
  cursorRequest?: number | null;
  isLightMode?: boolean;
  isFirstOnPage?: boolean; // NEW: Removes top margin if true
  
  // SmartType Props
  knownCharacters?: string[];
  knownLocations?: string[];
}

const ScriptBlockComponent: React.FC<ScriptBlockProps> = ({
  element,
  isActive,
  onChange,
  onKeyDown,
  onFocus,
  onDeleteSceneNumber,
  cursorRequest,
  isLightMode = false,
  isFirstOnPage = false,
  knownCharacters = [],
  knownLocations = []
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Resize Logic
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [element.content, element.type]); // Recalculate on type change too

  // Focus Logic
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    } else {
        setShowMenu(false);
    }
  }, [isActive]);

  // Cursor Positioning
  useEffect(() => {
    if (isActive && cursorRequest !== null && cursorRequest !== undefined && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorRequest, cursorRequest);
    }
  }, [cursorRequest, isActive]);

  // SmartType Logic (Omitted for brevity, logic remains same as previous version)
  // ... (Keeping existing useEffect for autocomplete)

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
      // ... (Keeping existing handler)
      const target = e.target as HTMLTextAreaElement;
      onKeyDown(e, element.id, element.type, target.selectionStart, target.selectionEnd);
  };

  const getStyles = () => {
    const base = "script-input-no-border block bg-transparent border-0 outline-none ring-0 shadow-none resize-none overflow-hidden font-screenplay text-[12pt] leading-screenplay transition-colors duration-200 w-full p-0 m-0 appearance-none focus:ring-0 focus:outline-none focus:border-0";

    const colors = isLightMode ? {
      heading: "text-black",
      action: "text-black",
      character: "text-black",
      dialogue: "text-black",
      parenthetical: "text-black",
      transition: "text-black",
      placeholder: "placeholder:text-zinc-400"
    } : {
      heading: "text-[#E0E0E0]", // Slightly softer white for contrast
      action: "text-[#D4D4D4]",
      character: "text-[#E0E0E0]",
      dialogue: "text-[#D4D4D4]",
      parenthetical: "text-[#A3A3A3]", // Darker for paren
      transition: "text-[#E0E0E0]",
      placeholder: "placeholder:text-zinc-700"
    };

    // MARGIN LOGIC (Fountain/Screenplay Standard)
    // We use padding-top on the container to simulate spacing-before
    // If it's the first element on the page, forced to 0
    
    // Scene Heading: 2 lines before (pt-8)
    // Action: 1 line before (pt-4)
    // Character: 1 line before (pt-4)
    // Dialogue: 0 lines before (pt-0)
    // Parenthetical: 0 lines before (pt-0)
    // Transition: 1 line before (pt-4)

    const spacing = isFirstOnPage ? 'pt-0' : 'pt-4'; // Default 1 line
    const headingSpacing = isFirstOnPage ? 'pt-0' : 'pt-8'; // 2 lines

    switch (element.type) {
      case 'scene_heading':
        return {
          container: `${headingSpacing} pb-2 group/heading`, 
          input: `${base} font-bold uppercase text-left ${colors.heading} ${colors.placeholder}`,
          placeholder: "INT./EXT. SCENE - DAY",
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
      case 'action':
        return {
          container: `${spacing} pb-0`,
          input: `${base} text-left ${colors.action} ${colors.placeholder}`,
          placeholder: "Action...",
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
      case 'character':
        return {
          container: `${spacing} pb-0`,
          input: `${base} font-bold uppercase text-left ${colors.character} ${colors.placeholder}`,
          placeholder: "CHARACTER",
          style: { paddingLeft: '2.0in', maxWidth: '5.5in' } // Center-ish
        };
      case 'dialogue':
        return {
          container: "pt-0 pb-0", // Always 0 before dialogue
          input: `${base} text-left ${colors.dialogue} ${colors.placeholder}`,
          placeholder: "Dialogue",
          style: { paddingLeft: '1.0in', maxWidth: '4.5in' }
        };
      case 'parenthetical':
        return {
          container: "pt-0 pb-0", // Always 0 before paren
          input: `${base} italic text-left ${colors.parenthetical} ${colors.placeholder}`,
          placeholder: "(cont'd)",
          style: { paddingLeft: '1.6in', maxWidth: '3.5in' } // Indented more than dialogue
        };
      case 'transition':
        return {
          container: `${spacing} pb-0`,
          input: `${base} font-bold uppercase text-right pr-4 ${colors.transition} ${colors.placeholder}`,
          placeholder: "CUT TO:",
          style: { paddingLeft: '4.0in', maxWidth: '6.0in' } // Right aligned visually
        };
      default:
        return {
          container: `${spacing} pb-0`, 
          input: `${base} ${colors.action} ${colors.placeholder}`,
          style: { paddingLeft: '0in', maxWidth: '6.0in' }
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container}`}>
      {/* Left Indicator (Type) */}
      <div className={`
          absolute -left-[240px] w-32 text-[9px] uppercase transition-all duration-200 select-none text-right pr-4 font-sans border-r flex items-center justify-end gap-2 h-6 top-0 mt-1
          ${isActive ? 'text-primary border-primary opacity-100 font-bold' : 'border-transparent opacity-0 group-hover:opacity-30'}
          ${isLightMode && !isActive ? 'text-zinc-400' : ''}
          ${!isLightMode && !isActive ? 'text-zinc-600' : ''}
       `}>
        {element.dual && <Columns className="w-3 h-3 text-text-muted" title="Dual Dialogue" />}
        {element.type.replace('_', ' ')}
      </div>

      {/* Right Indicator (Scene Number) */}
      {element.type === 'scene_heading' && element.sceneNumber && (
          <div className={`
              absolute -right-[1.0in] w-12 text-sm font-mono font-bold select-none text-left group/number mt-1
              ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}
          `}>
              {element.sceneNumber}
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteSceneNumber?.(element.id); }}
                className="absolute left-full ml-2 text-text-muted hover:text-red-500 opacity-0 group-hover/number:opacity-100 transition-opacity"
              >
                  <X className="w-3 h-3" />
              </button>
          </div>
      )}

      <textarea
        ref={textareaRef}
        value={element.content}
        onChange={(e) => onChange(element.id, e.target.value)}
        onKeyDown={handleLocalKeyDown}
        onFocus={() => onFocus(element.id)}
        className={styles.input}
        style={{
          border: 'none', outline: 'none', background: 'transparent', resize: 'none',
          ...styles.style
        }}
        rows={1}
        placeholder={isActive ? styles.placeholder : ''}
        spellCheck={false}
      />
    </div>
  );
};

export const ScriptBlock = memo(ScriptBlockComponent, (prev, next) => {
    return (
        prev.element.id === next.element.id &&
        prev.element.content === next.element.content &&
        prev.element.type === next.element.type &&
        prev.element.dual === next.element.dual &&
        prev.element.sceneNumber === next.element.sceneNumber &&
        prev.isActive === next.isActive &&
        prev.isLightMode === next.isLightMode &&
        prev.isFirstOnPage === next.isFirstOnPage &&
        prev.cursorRequest === next.cursorRequest
    );
});