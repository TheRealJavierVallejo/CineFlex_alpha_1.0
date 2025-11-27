/*
 * 🎬 PAGE: SCRIPT EDITOR
 * Optimized for Consumer Use - Import vs New Workflow
 */

import React, { useState, useRef } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement } from '../../types';
import { FileText, Plus, RefreshCw, Sparkles, Upload, FilePlus, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { ScriptChat } from './ScriptChat';
import { syncScriptToScenes } from '../../services/scriptUtils';
import { parseScript } from '../../services/scriptParser';

export const ScriptPage: React.FC = () => {
  const { project, handleUpdateProject, updateScriptElements, importScript, showToast } = useWorkspace();
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to update via central brain
  const updateElements = (newElements: ScriptElement[]) => {
    // Re-sequence
    const sequenced = newElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
    updateScriptElements(sequenced); // Auto-syncs to timeline!
  };

  // 1. SMART UPDATE HANDLER
  const handleContentChange = (id: string, newContent: string) => {
    if (!project.scriptElements) return;

    const currentEl = project.scriptElements.find(el => el.id === id);
    if (!currentEl) return;

    let newType = currentEl.type;

    // --- AUTO-FORMATTING LOGIC (Fountain Style) ---
    const upper = newContent.toUpperCase();
    
    // Detect Scene Headings (INT./EXT.)
    if (currentEl.type !== 'scene_heading') {
        if (/^(INT\.|EXT\.|INT\/EXT|I\/E)(\s|$)/.test(upper)) {
            newType = 'scene_heading';
        }
    }

    // Detect Transitions (Ends with TO:)
    if (currentEl.type !== 'transition') {
        if (upper.endsWith(' TO:') || upper === 'FADE OUT.') {
            newType = 'transition';
        }
    }

    // Detect Characters (All Caps, short line, not scene heading)
    // Only apply if user just typed it fresh (simple heuristic)
    /* 
       Note: Auto-detecting character names while typing is tricky because shouting in action
       looks like a character name. We'll leave character auto-detect to the 'Enter' key behavior 
       or manual Tab, but we force Uppercase if it IS a character.
    */
    
    // Auto-uppercase Scene Headings and Characters
    let finalContent = newContent;
    if (newType === 'scene_heading' || newType === 'character' || newType === 'transition') {
        finalContent = newContent.toUpperCase();
    }

    const updated = project.scriptElements.map(el => 
      el.id === id ? { ...el, content: finalContent, type: newType } : el
    );
    updateElements(updated);
  };

  // 2. LOGIC ENGINE (Keyboard nav)
  const handleKeyDown = (e: React.KeyboardEvent, id: string, type: ScriptElement['type']) => {
    if (!project.scriptElements) return;
    const currentIndex = project.scriptElements.findIndex(el => el.id === id);
    if (currentIndex === -1) return;

    // --- TAB: CYCLE TYPES ---
    if (e.key === 'Tab') {
      e.preventDefault();
      
      let nextType: ScriptElement['type'] = 'action';
      if (type === 'scene_heading' && !e.shiftKey) nextType = 'action';
      else if (type === 'action' && !e.shiftKey) nextType = 'character';
      else if (type === 'character' && !e.shiftKey) nextType = 'transition';
      else if (type === 'transition' && !e.shiftKey) nextType = 'scene_heading';
      else if (type === 'dialogue' && !e.shiftKey) nextType = 'parenthetical';
      else if (type === 'parenthetical' && !e.shiftKey) nextType = 'dialogue';
      
      const updated = [...project.scriptElements];
      updated[currentIndex] = { ...updated[currentIndex], type: nextType };
      
      if (['scene_heading', 'character', 'transition'].includes(nextType)) {
          updated[currentIndex].content = updated[currentIndex].content.toUpperCase();
      }
      
      updateElements(updated);
    }

    // --- ENTER: NEW BLOCK ---
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      let nextType: ScriptElement['type'] = 'action';
      
      // Standard Screenplay Flow
      switch (type) {
        case 'scene_heading': nextType = 'action'; break;
        case 'character': nextType = 'dialogue'; break;
        case 'parenthetical': nextType = 'dialogue'; break;
        case 'transition': nextType = 'scene_heading'; break;
        case 'dialogue': nextType = 'character'; break; // Fast dialogue back-and-forth
        case 'action': nextType = 'action'; break;
      }

      const newId = crypto.randomUUID();
      const newElement: ScriptElement = {
        id: newId,
        type: nextType,
        content: '',
        sequence: currentIndex + 2
      };

      const updated = [...project.scriptElements];
      updated.splice(currentIndex + 1, 0, newElement);
      updateElements(updated);
      
      setTimeout(() => setActiveElementId(newId), 0);
    }

    // --- BACKSPACE: MERGE/DELETE ---
    if (e.key === 'Backspace' && project.scriptElements[currentIndex].content === '') {
       e.preventDefault();
       if (currentIndex > 0) {
          const prevId = project.scriptElements[currentIndex - 1].id;
          const updated = [...project.scriptElements];
          updated.splice(currentIndex, 1);
          updateElements(updated);
          setTimeout(() => setActiveElementId(prevId), 0);
       }
    }

    // --- ARROW KEYS: NAVIGATION ---
    if (e.key === 'ArrowUp' && currentIndex > 0) {
        const target = e.target as HTMLTextAreaElement;
        if (target.selectionStart === 0) {
            e.preventDefault();
            setActiveElementId(project.scriptElements[currentIndex - 1].id);
        }
    }
    if (e.key === 'ArrowDown' && currentIndex < project.scriptElements.length - 1) {
        const target = e.target as HTMLTextAreaElement;
        if (target.selectionStart === target.value.length) {
            e.preventDefault();
            setActiveElementId(project.scriptElements[currentIndex + 1].id);
        }
    }
  };
  
  const handleAddFirstElement = () => {
     const newId = crypto.randomUUID();
     const el: ScriptElement = {
         id: newId,
         type: 'scene_heading',
         content: '',
         sequence: 1
     };
     updateScriptElements([el]);
     setTimeout(() => setActiveElementId(newId), 0);
  };

  const handleImportScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    await importScript(file);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasElements = project.scriptElements && project.scriptElements.length > 0;

  return (
    <div className="relative h-full flex flex-col bg-[#111111] overflow-hidden font-sans">
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".fountain,.txt" 
          onChange={handleImportScript} 
      />

      {/* Toolbar */}
      <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10">
         <div className="flex items-center gap-2 text-text-primary font-medium">
             <FileText className="w-4 h-4 text-primary" />
             <span>Screenplay Editor</span>
         </div>
         <div className="flex items-center gap-4">
             <div className="text-xs text-text-tertiary">
                 {hasElements ? `${project.scriptElements?.length} Blocks` : 'Empty'}
             </div>

             <div className="h-4 w-[1px] bg-border" />
             
             {/* Toggle Chat */}
             <Button 
                variant={isChatOpen ? "primary" : "secondary"}
                size="sm"
                icon={<Sparkles className="w-3 h-3" />}
                onClick={() => setIsChatOpen(!isChatOpen)}
             >
                AI Co-Pilot
             </Button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* The "Paper" Container */}
        <div 
          className="flex-1 overflow-y-auto w-full flex justify-center p-8 cursor-text transition-all duration-300" 
          style={{ paddingRight: isChatOpen ? '350px' : '32px' }}
          onClick={() => {
             if (hasElements) {
                 const lastId = project.scriptElements![project.scriptElements!.length - 1].id;
                 setActiveElementId(lastId);
             }
          }}
        >
          {hasElements ? (
              <div className="w-full max-w-[850px] bg-[#1E1E1E] shadow-2xl min-h-[1100px] p-[100px] border border-[#333] mb-20 relative transition-transform">
                 <div className="flex flex-col">
                    {project.scriptElements!.map(element => (
                       <ScriptBlock 
                          key={element.id}
                          element={element}
                          isActive={activeElementId === element.id}
                          onChange={handleContentChange}
                          onKeyDown={handleKeyDown}
                          onFocus={setActiveElementId}
                       />
                    ))}
                 </div>
              </div>
          ) : (
              // ZERO STATE UI
              <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-10">
                      <div className="w-16 h-16 bg-surface-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
                          <FileText className="w-8 h-8 text-text-tertiary" />
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary mb-2">No Script Found</h2>
                      <p className="text-text-secondary text-sm max-w-md mx-auto">
                          Import a .fountain file or start writing. We'll automatically build your Timeline scenes as you type headings.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-8">
                      {/* Option 1: Import */}
                      <button 
                          onClick={(e) => {
                             e.stopPropagation();
                             fileInputRef.current?.click();
                          }}
                          className="group flex flex-col items-center p-6 bg-surface border border-border rounded-xl hover:border-primary hover:bg-surface-secondary transition-all text-left relative overflow-hidden"
                      >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                             {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                          </div>
                          <h3 className="text-base font-bold text-text-primary mb-1">Import Script</h3>
                          <p className="text-xs text-text-tertiary text-center">Upload a .fountain or .txt file.</p>
                      </button>

                      {/* Option 2: Create New */}
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              handleAddFirstElement();
                          }}
                          className="group flex flex-col items-center p-6 bg-surface border border-border rounded-xl hover:border-primary hover:bg-surface-secondary transition-all text-left relative overflow-hidden"
                      >
                          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors text-text-primary border border-border group-hover:border-transparent">
                             <FilePlus className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-bold text-text-primary mb-1">Start Fresh</h3>
                          <p className="text-xs text-text-tertiary text-center">Write from scratch.</p>
                      </button>
                  </div>
              </div>
          )}
        </div>

        {/* AI Sidebar */}
        <ScriptChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
      
      {/* Help Hint */}
      {!isChatOpen && hasElements && (
        <div className="absolute bottom-4 left-6 text-[10px] text-text-tertiary bg-surface/80 p-2 rounded border border-border z-10 pointer-events-none">
            <span className="font-bold text-text-secondary">TAB</span> to change type • <span className="font-bold text-text-secondary">ENTER</span> new line • <span className="text-primary">INT./EXT.</span> auto-detects scene
        </div>
      )}
    </div>
  );
};