
/*
 * 📜 COMPONENT: SCRIPT ELEMENT CARD
 * Commercial Quality Update
 */

import React from 'react';
import { ScriptElement, Shot } from '../../types';
import { Film, X, Link as LinkIcon, Plus } from 'lucide-react';
import Button from '../ui/Button';

interface ScriptElementCardProps {
  element: ScriptElement;
  linkedShots: Shot[];
  onLinkShot: (elementId: string) => void;
  onUnlinkShot: (elementId: string, shotId: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string) => void;
  isActive?: boolean;
}

export const ScriptElementCard: React.FC<ScriptElementCardProps> = ({
  element,
  linkedShots,
  onLinkShot,
  onUnlinkShot,
  onUpdateContent,
  onKeyDown,
  isActive
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [element.content]);

  // Screenplay Formatting Logic
  const getScreenplayStyles = () => {
    const base = "font-[family-name:var(--font-family-screenplay)] text-base leading-relaxed bg-transparent outline-none resize-none overflow-hidden w-full";

    switch (element.type) {
      case 'scene_heading':
        return {
          wrapper: `py-6 border-b border-border/30 bg-surface-secondary`,
          text: `${base} font-bold uppercase text-text-primary tracking-wider`
        };
      case 'action':
        return {
          wrapper: `py-2`,
          text: `${base} text-text-primary`
        };
      case 'character':
        return {
          wrapper: `pt-4 pb-0 flex justify-center`,
          text: `${base} font-bold uppercase text-text-primary tracking-wide text-center`
        };
      case 'dialogue':
        return {
          wrapper: `pb-2 flex justify-center`,
          text: `${base} text-text-primary max-w-[350px] text-center`
        };
      case 'parenthetical':
        return {
          wrapper: `py-0 flex justify-center`,
          text: `${base} text-text-secondary italic text-sm text-center`
        };
      case 'transition':
        return {
          wrapper: `py-4 flex justify-end pr-12`,
          text: `${base} font-bold uppercase text-text-primary text-right`
        };
      default:
        return {
          wrapper: `py-2`,
          text: `${base} text-text-primary`
        };
    }
  };

  const styles = getScreenplayStyles();

  return (
    <div className="grid grid-cols-2 hover:bg-white/5 transition-colors group/row min-h-[120px]">

      {/* LEFT COLUMN: VISUALS (Shot Box) */}
      <div className="p-4 flex flex-col items-center gap-4 relative border-r border-border/10">
        {linkedShots.length > 0 ? (
          linkedShots.map(shot => (
            <div key={shot.id} className="relative group/shot w-full aspect-video shrink-0 shadow-sm">
              <div className="w-full h-full bg-background border-2 border-primary/20 rounded-sm overflow-hidden cursor-pointer hover:border-primary transition-colors">
                {shot.generatedImage ? (
                  <img
                    src={shot.generatedImage}
                    className="w-full h-full object-cover"
                    alt={`Shot ${shot.sequence}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-secondary">
                    <Film className="w-6 h-6 text-text-tertiary" />
                  </div>
                )}
              </div>

              <button
                onClick={() => onUnlinkShot(element.id, shot.id)}
                className="absolute -top-2 -right-2 bg-surface border border-border rounded-full p-1 opacity-0 group-hover/shot:opacity-100 transition-opacity text-text-primary hover:text-error shadow-md z-10"
                title="Unlink shot"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        ) : (
          // Empty Shot Placeholder
          <button
            onClick={() => onLinkShot(element.id)}
            className="w-full aspect-video border-2 border-dashed border-border/20 rounded-sm flex items-center justify-center text-text-tertiary hover:border-primary/50 hover:text-primary transition-colors group/placeholder opacity-0 group-hover/row:opacity-100"
          >
            <div className="flex flex-col items-center gap-1 opacity-50 group-hover/placeholder:opacity-100">
              <Plus className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Shot</span>
            </div>
          </button>
        )}
      </div>

      {/* RIGHT COLUMN: SCRIPT EDITOR (No Borders) */}
      <div className={`px-8 relative flex flex-col justify-center ${styles.wrapper}`}>
        <textarea
          ref={textareaRef}
          value={element.content}
          onChange={(e) => onUpdateContent(element.id, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, element.id)}
          className={styles.text}
          rows={1}
          placeholder={element.type === 'scene_heading' ? 'INT. SCENE - DAY' : 'Type here...'}
        />

        {/* Type Indicator (Subtle) */}
        <div className="absolute right-2 top-2 text-[9px] text-text-tertiary uppercase opacity-0 group-hover/row:opacity-50 pointer-events-none">
          {element.type.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
};
