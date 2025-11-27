/*
 * 🎬 PAGE: SCRIPT EDITOR
 * A "Final Draft" style writing interface.
 * Implements Phase 1: Block-based editing with global sync.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement } from '../../types';
import { FileText, Plus, Download, Sparkles, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { ScriptChat } from './ScriptChat';
import { syncScriptToScenes } from '../../services/scriptUtils';

export const ScriptPage: React.FC = () => {
  const { project, handleUpdateProject, showToast } = useWorkspace();
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper to update the main project state
  const updateElements = (newElements: ScriptElement[]) => {
    // Re-sequence
    const sequenced = newElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
    handleUpdateProject({ ...project, scriptElements: sequenced });
  };

  // 1. UPDATE HANDLER (Global Sync)
  const handleContentChange = (id: string, newContent: string) => {
    if (!project.scriptElements) return;
    const updated = project.scriptElements.map(el => 
      el.id === id ? { ...el, content: newContent } : el
    );
    // Note: In a production app, we would debounce this or use local state
    // But for immediate sync requirements, we update the parent
    updateElements(updated);
  };

  // 2. LOGIC ENGINE
  const handleKeyDown = (e: React.KeyboardEvent, id: string, type: ScriptElement['type']) => {
    if (!project.scriptElements) return;
    const currentIndex = project.scriptElements.findIndex(el => el.id === id);
    if (currentIndex === -1) return;

    // --- TAB: CYCLE TYPES ---
    if (e.key === 'Tab') {
      e.preventDefault();
      const types: ScriptElement['type'][] = ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
      
      // Smart cycling based on current type
      let nextType: ScriptElement['type'] = 'action';
      if (type === 'scene_heading') nextType = 'action';
      else if (type === 'action') nextType = 'character';
      else if (type === 'character') nextType = 'transition';
      else if (type === 'transition') nextType = 'scene_heading';
      else if (type === 'dialogue') nextType = 'parenthetical';
      else if (type === 'parenthetical') nextType = 'dialogue';

      // Standard Screenwriting Software Logic:
      if (type === 'action' && !e.shiftKey) nextType = 'character';
      else if (type === 'character' && !e.shiftKey) nextType = 'transition';
      else if (type === 'transition' && !e.shiftKey) nextType = 'scene_heading';
      else if (type === 'scene_heading' && !e.shiftKey) nextType = 'action';
      else if (type === 'dialogue' && !e.shiftKey) nextType = 'parenthetical';
      else if (type === 'parenthetical' && !e.shiftKey) nextType = 'dialogue';
      
      const updated = [...project.scriptElements];
      updated[currentIndex] = { ...updated[currentIndex], type: nextType };
      
      // Auto-uppercase for certain types
      if (['scene_heading', 'character', 'transition'].includes(nextType)) {
          updated[currentIndex].content = updated[currentIndex].content.toUpperCase();
      }
      
      updateElements(updated);
    }

    // --- ENTER: NEW BLOCK ---
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      let nextType: ScriptElement['type'] = 'action';
      
      // Logic for what follows what
      switch (type) {
        case 'scene_heading': nextType = 'action'; break;
        case 'character': nextType = 'dialogue'; break;
        case 'parenthetical': nextType = 'dialogue'; break;
        case 'transition': nextType = 'scene_heading'; break;
        case 'dialogue': nextType = 'character'; break;
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
      
      // Focus the new element next render
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
     handleUpdateProject({ ...project, scriptElements: [el] });
     setTimeout(() => setActiveElementId(newId), 0);
  };

  const handleSync = () => {
     setIsSyncing(true);
     try {
        const syncedProject = syncScriptToScenes(project);
        handleUpdateProject(syncedProject);
        showToast(`Synced ${syncedProject.scenes.length} Scenes to Timeline`, 'success');
     } catch (e) {
        showToast("Sync failed", 'error');
     } finally {
        setIsSyncing(false);
     }
  };

  const hasElements = project.scriptElements && project.scriptElements.length > 0;

  return (
    <div className="relative h-full flex flex-col bg-[#111111] overflow-hidden">
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

             {/* Sync Button */}
             <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />}
                onClick={handleSync}
                title="Generate Timeline Scenes from Script Headings"
             >
                Sync to Timeline
             </Button>
             
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
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-4 pb-20">
                  <FileText className="w-16 h-16 opacity-20" />
                  <p>Start writing your masterpiece.</p>
                  <Button variant="primary" icon={<Plus className="w-4 h-4"/>} onClick={handleAddFirstElement}>
                      Add Scene Heading
                  </Button>
              </div>
          )}
        </div>

        {/* AI Sidebar */}
        <ScriptChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
      
      {/* Help Hint */}
      {!isChatOpen && (
        <div className="absolute bottom-4 left-6 text-[10px] text-text-tertiary bg-surface/80 p-2 rounded border border-border z-10">
            <span className="font-bold text-text-secondary">TAB</span> to change element type • <span className="font-bold text-text-secondary">ENTER</span> for new line
        </div>
      )}
    </div>
  );
};