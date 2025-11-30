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
  
  // SmartType Props
  knownCharacters?: string[];
  knownLocations?: string[]; // Includes "INT.", "EXT." prefixes
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
  knownCharacters = [],
  knownLocations = []
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // SmartType State
  const [showMenu, setShowMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    } else {
        setShowMenu(false); // Close menu on blur
    }
  }, [isActive]);

  // Cursor Positioning
  useEffect(() => {
    if (isActive && cursorRequest !== null && cursorRequest !== undefined && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorRequest, cursorRequest);
    }
  }, [cursorRequest, isActive]);

  // --- SMART TYPE LOGIC ---
  useEffect(() => {
      if (!isActive) return;

      const text = element.content;
      
      // 1. CHARACTER MODE
      if (element.type === 'character') {
          if (text.length > 0) {
              const matches = knownCharacters.filter(c => 
                  c.toUpperCase().startsWith(text.toUpperCase()) && 
                  c.toUpperCase() !== text.toUpperCase() // Don't suggest if already typed fully
              ).slice(0, 5); // Limit to 5
              
              if (matches.length > 0) {
                  setSuggestions(matches);
                  setShowMenu(true);
                  setSelectedIndex(0);
                  return;
              }
          }
      }

      // 2. SCENE HEADING MODE
      if (element.type === 'scene_heading') {
          const upper = text.toUpperCase();
          
          // Case A: Just starting (Suggest INT/EXT)
          const prefixes = ["INT. ", "EXT. ", "I/E ", "INT./EXT. "];
          if (text.length < 5 && text.length > 0) {
               const matches = prefixes.filter(p => p.startsWith(upper) && p !== upper);
               if (matches.length > 0) {
                   setSuggestions(matches);
                   setShowMenu(true);
                   setSelectedIndex(0);
                   return;
               }
          }

          // Case B: Has Prefix, typing location (Suggest History)
          // Find if we have a prefix
          const prefix = prefixes.find(p => upper.startsWith(p));
          if (prefix && text.length >= prefix.length) {
              const locationPart = upper.substring(prefix.length); // Everything after "INT. "
              // Filter locations
              if (locationPart.length > 0) {
                  const locMatches = knownLocations.filter(l => 
                      l.startsWith(locationPart) && l !== locationPart
                  ).slice(0, 5);

                  if (locMatches.length > 0) {
                      // Map back to full strings: Prefix + Location
                      const fullSuggestions = locMatches.map(l => prefix + l);
                      setSuggestions(fullSuggestions);
                      setShowMenu(true);
                      setSelectedIndex(0);
                      return;
                  }
              }
          }
      }

      // Default: Hide
      setShowMenu(false);

  }, [element.content, element.type, isActive, knownCharacters, knownLocations]);

  const confirmSelection = (value: string) => {
      onChange(element.id, value.toUpperCase());
      setShowMenu(false);
      // Wait for React to update value, then move cursor to end
      setTimeout(() => {
          if (textareaRef.current) {
              textareaRef.current.setSelectionRange(value.length, value.length);
          }
      }, 0);
  };

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
      if (showMenu && suggestions.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev + 1) % suggestions.length);
              return;
          }
          if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
              return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              e.stopPropagation(); // Stop ScriptPage from creating new line
              confirmSelection(suggestions[selectedIndex]);
              return;
          }
          if (e.key === 'Escape') {
              e.preventDefault();
              setShowMenu(false);
              return;
          }
      }
      
      // Fallback to parent handler
      const target = e.target as HTMLTextAreaElement;
      onKeyDown(e, element.id, element.type, target.selectionStart, target.selectionEnd);
  };

  const getStyles = () => {
    // Styling Base
    // Added 'leading-screenplay' to enforce strict line height
    const base = "script-input-no-border block bg-transparent border-0 outline-none ring-0 shadow-none resize-none overflow-hidden font-screenplay text-[12pt] leading-screenplay transition-colors duration-200 w-full p-0 m-0 appearance-none focus:ring-0 focus:outline-none focus:border-0";

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

    // MAPPING:
    // mt-4 = 1rem = ~1 blank line (approx)
    // mt-8 = 2rem = ~2 blank lines (approx)
    // pt/pb are padding within the block, we generally use margins between blocks or padding on container.
    // To match 'pagination.ts', we use 'pt' classes on the container div to simulate top margin.

    if (element.type === 'action') {
        if (isNote) {
            return {
                container: "pt-4 pb-2 opacity-80", // 1 line
                input: `${base} ${colors.note} text-left italic ${colors.placeholder}`,
                placeholder: "[[Note]]",
                indicator: "top-4",
                style: { paddingLeft: '0in', maxWidth: '6.0in' },
                menuOffset: '0in'
            };
        }
        if (isCentered) {
            return {
                container: "pt-4 pb-2",
                input: `${base} ${colors.action} text-center ${colors.placeholder}`,
                placeholder: "> Centered <",
                indicator: "top-4",
                style: { paddingLeft: '0in', maxWidth: '6.0in' },
                menuOffset: '3.0in'
            };
        }
        if (isSection) {
            return {
                container: "pt-8 pb-2", // 2 lines
                input: `${base} ${colors.section} font-bold text-left ${colors.placeholder}`,
                placeholder: "# Section",
                indicator: "top-8",
                style: { paddingLeft: '0in', maxWidth: '6.0in' },
                menuOffset: '0in'
            };
        }
    }

    switch (element.type) {
      case 'scene_heading':
        return {
          container: "pt-8 pb-2 group/heading", // 2 blank lines before (Strictly 2 lines = 2.4rem approx, but pt-8 is 2rem. Close enough for MVP)
          input: `${base} font-bold uppercase text-left ${colors.heading} ${colors.placeholder}`,
          placeholder: "INT./EXT. SCENE LOCATION - DAY",
          indicator: "top-8", 
          style: { paddingLeft: '0in', maxWidth: '6.0in' },
          menuOffset: '0in'
        };
      case 'action':
        return {
          container: "pt-4 pb-0", // 1 blank line before
          input: `${base} text-left ${colors.action} ${colors.placeholder}`,
          placeholder: "Describe action...",
          indicator: "top-4",
          style: { paddingLeft: '0in', maxWidth: '6.0in' },
          menuOffset: '0in'
        };
      case 'character':
        return {
          container: "pt-4 pb-0", // 1 blank line before
          input: `${base} font-bold uppercase text-left ${colors.character} ${colors.placeholder}`,
          placeholder: "CHARACTER",
          indicator: "top-4",
          style: { paddingLeft: '2.0in', maxWidth: '5.5in' },
          menuOffset: '2.0in'
        };
      case 'dialogue':
        return {
          container: "pt-0 pb-0", // 0 blank lines
          input: `${base} text-left ${colors.dialogue} ${colors.placeholder}`,
          placeholder: "Dialogue",
          indicator: "top-0",
          style: { paddingLeft: '1.0in', maxWidth: '4.5in' },
          menuOffset: '1.0in' 
        };
      case 'parenthetical':
        return {
          container: "pt-0 pb-0", // 0 blank lines
          input: `${base} italic text-left ${colors.parenthetical} ${colors.placeholder}`,
          placeholder: "(parenthetical)",
          indicator: "top-0",
          style: { paddingLeft: '1.5in', maxWidth: '3.5in' },
          menuOffset: '1.5in' 
        };
      case 'transition':
        return {
          container: "pt-4 pb-0", // 1 blank line before
          input: `${base} font-bold uppercase text-right pr-4 ${colors.transition} ${colors.placeholder}`,
          placeholder: "CUT TO:",
          indicator: "top-4",
          style: { paddingLeft: '4.0in', maxWidth: '6.0in' },
          menuOffset: '4.0in' 
        };
      default:
        return {
          container: "pt-4 pb-0", 
          input: `${base} ${colors.action} ${colors.placeholder}`,
          placeholder: "",
          indicator: "top-4",
          style: { paddingLeft: '0in', maxWidth: '6.0in' },
          menuOffset: '0in'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`relative ${styles.container}`}>
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
              absolute -right-[1.5in] w-12 text-sm font-mono font-bold select-none text-left group/number
              ${styles.indicator}
              ${isLightMode ? 'text-zinc-400' : 'text-[#666]'}
          `}>
              {element.sceneNumber}
              
              {/* Delete Button (Hover) */}
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteSceneNumber?.(element.id); }}
                className="absolute left-full ml-2 text-text-muted hover:text-red-500 opacity-0 group-hover/number:opacity-100 transition-opacity"
                title="Remove Scene Number"
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

      {showMenu && (
          <AutocompleteMenu 
              suggestions={suggestions} 
              selectedIndex={selectedIndex} 
              onSelect={confirmSelection}
              leftOffset={styles.menuOffset}
          />
      )}
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
        prev.cursorRequest === next.cursorRequest &&
        // We assume knownCharacters/Locations don't change often enough to break this, 
        // or we accept they might be stale until next deep render.
        // For performance, we can do shallow compare on lengths.
        prev.knownCharacters?.length === next.knownCharacters?.length &&
        prev.knownLocations?.length === next.knownLocations?.length
    );
});