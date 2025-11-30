import React, { useRef, useEffect, useLayoutEffect, memo, useState, useMemo } from 'react';
import { ScriptElement } from '../../types';
import { Columns, X } from 'lucide-react';
import { AutocompleteMenu } from './script-editor/AutocompleteMenu';
import { getSuggestions, addSmartTypeEntry } from '../../services/smartType';

interface ScriptBlockProps {
  element: ScriptElement;
  isActive: boolean;
  onChange: (id: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], selectionStart: number, selectionEnd: number) => void;
  onFocus: (id: string) => void;
  onDeleteSceneNumber?: (id: string) => void;
  cursorRequest?: number | null;
  isLightMode?: boolean;
  isFirstOnPage?: boolean;
  projectId?: string; 
}

// Helper to robustly parse scene headings
const parseSceneHeading = (content: string) => {
  const prefixMatch = content.match(/^(INT\.?\/?\s?EXT\.?|EXT\.?\/?\s?INT\.?|INT\.?|EXT\.?|I\/?E\.?)\s*/i);

  if (!prefixMatch) {
    return { stage: 1, prefix: '', location: content, time: '' };
  }

  const prefix = prefixMatch[0];
  const rest = content.substring(prefix.length);
  const parts = rest.split(/\s+-\s*/);

  if (parts.length > 1) {
    const time = parts[parts.length - 1];
    const location = parts.slice(0, parts.length - 1).join(' - ');
    return { stage: 3, prefix, location, time };
  } else {
    return { stage: 2, prefix, location: rest, time: '' };
  }
};

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
  projectId
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Resize Logic: Auto-grow textarea height based on content
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [element.content, element.type]); 

  // Focus Logic: Handle cursor placement when block becomes active
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
      
      // FIX: If no specific cursor position requested, move to END
      // This prevents the "typing behind" issue where cursor defaults to index 0
      if (cursorRequest === null || cursorRequest === undefined) {
         const len = textareaRef.current.value.length;
         textareaRef.current.setSelectionRange(len, len);
      }
    } else {
      setShowMenu(false);
    }
  }, [isActive]);

  // Specific Cursor Request (e.g. splitting a line or backspacing)
  useEffect(() => {
    if (isActive && cursorRequest !== null && cursorRequest !== undefined && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursorRequest, cursorRequest);
        }
      });
    }
  }, [cursorRequest, isActive]);

  // Track previous active state to prevent menu popping up immediately on focus
  const prevActiveRef = useRef(isActive);

  // --- SMARTTYPE LOGIC ---
  useEffect(() => {
    const justBecameActive = isActive && !prevActiveRef.current;
    prevActiveRef.current = isActive;

    if (!isActive || !projectId) {
      setShowMenu(false);
      return;
    }

    if (justBecameActive && element.content.length > 0) return;

    const getDebounceTime = () => {
      if (element.type === 'character') return 0; 
      if (element.type === 'transition') return 0; 
      if (element.type === 'scene_heading') {
        const parsed = parseSceneHeading(element.content.toUpperCase());
        if (parsed.stage === 1 || parsed.stage === 3) return 0; 
        return 50; 
      }
      return 150; 
    };

    const timeoutId = setTimeout(() => {
      const content = element.content.toUpperCase();
      let newSuggestions: string[] = [];
      let shouldShow = false;

      if (element.type === 'character') {
        newSuggestions = getSuggestions(projectId, 'character', content, 10);
        shouldShow = content.length > 0 && newSuggestions.length > 0;
      }

      if (element.type === 'scene_heading') {
        const parsed = parseSceneHeading(content);
        if (parsed.stage === 1 && content.trim().length > 0) {
            newSuggestions = getSuggestions(projectId, 'location', content, 10);
            shouldShow = newSuggestions.length > 0;
        } else if (parsed.stage === 2 && parsed.location.trim().length > 0) {
            newSuggestions = getSuggestions(projectId, 'location', parsed.location.trim(), 10);
            shouldShow = newSuggestions.length > 0;
        } else if (parsed.stage === 3 && parsed.time.trim().length > 0) {
            newSuggestions = getSuggestions(projectId, 'time_of_day', parsed.time.trim(), 10);
            shouldShow = newSuggestions.length > 0;
        }
      }

      if (element.type === 'transition') {
        newSuggestions = getSuggestions(projectId, 'transition', content, 10);
        shouldShow = content.length > 0 && newSuggestions.length > 0;
      }

      if (newSuggestions.length === 1 && newSuggestions[0] === content) {
        shouldShow = false;
      }

      setSuggestions(newSuggestions);
      setShowMenu(shouldShow);
      setSelectedIndex(0);
    }, getDebounceTime()); 

    return () => clearTimeout(timeoutId);
  }, [element.content, element.type, isActive, projectId]);

  // --- KEYBOARD HANDLERS ---
  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
    // CMD+1-6 Type Switching shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const typeMap: Record<string, ScriptElement['type']> = {
        '1': 'scene_heading', '2': 'action', '3': 'character',
        '4': 'dialogue', '5': 'parenthetical', '6': 'transition'
      };
      if (e.key in typeMap) {
        e.preventDefault();
        let newContent = element.content;
        const newType = typeMap[e.key];
        if (['scene_heading', 'character', 'transition'].includes(newType)) {
          newContent = newContent.toUpperCase();
        }
        onChange(element.id, newContent);
        return;
      }
    }

    // Handle Tab to switch element type
    if (e.key === 'Tab' && !showMenu) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      onKeyDown(e, element.id, element.type, target.selectionStart, target.selectionEnd);
      return;
    }

    // Handle Autocomplete navigation
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
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return; 
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMenu(false);
        return;
      }
    }

    // Pass other keys to parent (Enter, Backspace, Arrow keys for navigation)
    const target = e.target as HTMLTextAreaElement;
    onKeyDown(e, element.id, element.type, target.selectionStart, target.selectionEnd);
  };

  const handleBlur = () => {
    // Auto-uppercase certain elements on blur
    if (['scene_heading', 'character', 'transition'].includes(element.type)) {
      let formatted = element.content.toUpperCase();
      if (element.type === 'scene_heading') {
        formatted = formatted.replace(/^(INT|EXT)(\s)/i, '$1.$2');
        formatted = formatted.replace(/^(INT|EXT)$/i, '$1.');
        formatted = formatted.replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
      }
      if (formatted !== element.content) {
        onChange(element.id, formatted);
      }
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (!projectId) return;
    let newContent = suggestion;

    if (element.type === 'scene_heading') {
      const current = element.content.toUpperCase();
      const parsed = parseSceneHeading(current);
      if (parsed.stage === 1) newContent = `${suggestion} `;
      else if (parsed.stage === 2) newContent = `${parsed.prefix.trim()} ${suggestion}`;
      else if (parsed.stage === 3) newContent = `${parsed.prefix.trim()} ${parsed.location.trim()} - ${suggestion}`;
    }

    onChange(element.id, newContent);
    setShowMenu(false);
    if (textareaRef.current) textareaRef.current.focus();

    const typeMap = { 'character': 'character', 'scene_heading': 'location', 'transition': 'transition' } as const;
    if (element.type in typeMap) {
        addSmartTypeEntry(projectId, typeMap[element.type as keyof typeof typeMap], suggestion, false);
    }
  };

  // --- STYLING & METRICS ---

  // Calculate Vertical Spacing (Standard Screenplay Rules)
  const paddingTop = useMemo(() => {
    if (isFirstOnPage) return 0;
    switch (element.type) {
      case 'scene_heading': return 32; // ~2 lines before
      case 'action':
      case 'character':
      case 'transition': return 16; // ~1 line before
      default: return 0;
    }
  }, [element.type, isFirstOnPage]);

  // FIX: Using MARGINS instead of Padding for indentation.
  // This prevents the text box from squishing the content and behaves like real tab stops.
  const getStyles = () => {
    const base = "script-input-no-border block bg-transparent border-0 outline-none ring-0 shadow-none resize-none overflow-hidden font-screenplay text-[12pt] leading-screenplay transition-colors duration-200 p-0 m-0 appearance-none focus:ring-0 focus:outline-none focus:border-0";
    
    const colors = isLightMode ? {
      heading: "text-black", action: "text-black", character: "text-black",
      dialogue: "text-black", parenthetical: "text-black", transition: "text-black",
      placeholder: "placeholder:text-zinc-400"
    } : {
      heading: "text-[#E0E0E0]", action: "text-[#D4D4D4]", character: "text-[#E0E0E0]",
      dialogue: "text-[#D4D4D4]", parenthetical: "text-[#A3A3A3]", transition: "text-[#E0E0E0]",
      placeholder: "placeholder:text-zinc-700"
    };

    const spacingClass = isFirstOnPage ? 'pt-0' : (element.type === 'scene_heading' ? 'pt-8' : (['dialogue', 'parenthetical'].includes(element.type) ? 'pt-0' : 'pt-4'));

    // Widths relative to the ~6.0in printable width (Page is 8.5in, Margins 1.5+1.0 = 2.5)
    // We use marginLeft on the INPUT to push it over, while the CONTAINER stays full width.
    switch (element.type) {
      case 'scene_heading': return {
          container: `${spacingClass} pb-0`,
          input: `${base} font-bold uppercase ${colors.heading} ${colors.placeholder}`,
          placeholder: "INT. SCENE HEADER - DAY",
          style: { width: '100%', marginLeft: '0in' }
      };
      case 'action': return {
          container: `${spacingClass} pb-0`,
          input: `${base} ${colors.action} ${colors.placeholder}`,
          placeholder: "Action...",
          style: { width: '100%', marginLeft: '0in' }
      };
      case 'character': return {
          container: `${spacingClass} pb-0`,
          input: `${base} font-bold uppercase ${colors.character} ${colors.placeholder}`, 
          placeholder: "CHARACTER",
          style: { marginLeft: '2.0in', maxWidth: '3.5in' } // Standard indentation
      };
      case 'dialogue': return {
          container: "pt-0 pb-0",
          input: `${base} text-left ${colors.dialogue} ${colors.placeholder}`,
          placeholder: "Dialogue",
          style: { marginLeft: '1.0in', maxWidth: '3.5in' } // Standard indentation
      };
      case 'parenthetical': return {
          container: "pt-0 pb-0",
          input: `${base} italic text-left ${colors.parenthetical} ${colors.placeholder}`,
          placeholder: "(cont'd)",
          style: { marginLeft: '1.6in', maxWidth: '3.0in' } // Standard indentation
      };
      case 'transition': return {
          container: `${spacingClass} pb-0`,
          input: `${base} font-bold uppercase text-right pr-4 ${colors.transition} ${colors.placeholder}`,
          placeholder: "CUT TO:",
          style: { marginLeft: '4.0in', maxWidth: '2.0in' } // Right alignment
      };
      default: return {
          container: `${spacingClass} pb-0`,
          input: `${base} ${colors.action} ${colors.placeholder}`,
          style: { width: '100%', marginLeft: '0in' }
      };
    }
  };

  const styles = getStyles();

  let displayContent = element.content;
  if (element.type === 'character' && element.isContinued) {
    displayContent = element.content + " (CONT'D)";
  }

  // Calculate top offset for side indicators
  const indicatorTop = Math.max(paddingTop, 4); 

  return (
    <div className={`relative ${styles.container}`}>
      
      {/* 1. INDICATOR LABEL (Off Page - Gutter Left) */}
      <div
        className={`
          absolute w-28 text-[10px] uppercase transition-all duration-200 select-none text-right pr-2 font-mono flex items-center justify-end gap-2
          ${isActive ? 'text-primary opacity-100 font-bold tracking-wide' : 'text-text-muted opacity-0 group-hover:opacity-50'}
        `}
        style={{ 
            top: indicatorTop,
            marginTop: '2px', 
            left: '-18rem', 
            width: '7rem'
        }}
      >
        {element.dual && <Columns className="w-3 h-3 text-text-muted" />}
        {element.type.replace('_', ' ')}
      </div>

      {/* 2. VERTICAL LINE (FIX: Fixed Height "Tick") */}
      {/* This prevents the line from growing with the paragraph */}
      <div
        className={`
          absolute w-[2px] transition-all duration-200 rounded-full
          ${isActive ? 'bg-primary opacity-100' : 'bg-zinc-700 opacity-0 group-hover:opacity-30'}
        `}
        style={{ 
            top: indicatorTop,
            marginTop: '3px',
            height: '14px', // Hardcoded height so it doesn't stretch
            left: '-10.5rem' 
        }}
      />

      {/* 3. SCENE NUMBER INDICATOR */}
      {element.type === 'scene_heading' && element.sceneNumber && (
        <div 
            className={`absolute -right-[1.0in] w-12 text-sm font-mono font-bold select-none text-left group/number ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}`}
            style={{ top: indicatorTop }}
        >
          {element.sceneNumber}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteSceneNumber?.(element.id); }}
            className="absolute left-full ml-2 text-text-muted hover:text-red-500 opacity-0 group-hover/number:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 4. MAIN INPUT */}
      <textarea
        ref={textareaRef}
        value={displayContent}
        onChange={(e) => {
          let rawContent = e.target.value;
          if (element.type === 'character' && element.isContinued) {
            rawContent = rawContent.replace(/\s*\(CONT'D\)\s*$/i, '');
          }
          onChange(element.id, rawContent);
        }}
        onKeyDown={handleLocalKeyDown}
        onFocus={() => onFocus(element.id)}
        onBlur={handleBlur}
        className={styles.input}
        style={{
          border: 'none', outline: 'none', background: 'transparent', resize: 'none',
          ...styles.style
        }}
        rows={1}
        placeholder={isActive ? styles.placeholder : ''}
        spellCheck={false}
      />

      {showMenu && suggestions.length > 0 && (
        <AutocompleteMenu
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSelectSuggestion}
          leftOffset={element.type === 'character' ? '2.0in' : element.type === 'dialogue' ? '1.0in' : element.type === 'transition' ? '4.0in' : element.type === 'parenthetical' ? '1.6in' : '0in'}
        />
      )}

      {element.continuesNext && (
        <div className={`text-center font-screenplay text-[12pt] leading-screenplay mt-2 select-none ${isLightMode ? 'text-black/60' : 'text-zinc-500'}`}>
          (MORE)
        </div>
      )}
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
    prev.cursorRequest === next.cursorRequest &&
    prev.projectId === next.projectId 
  );
});