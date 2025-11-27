/*
 * 🎬 PAGE: SCRIPT EDITOR
 * Optimized for Pro Writers: Zero-Latency Typing & Advanced Editing Logic
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement } from '../../types';
import { FileText, Plus, RefreshCw, Sparkles, Upload, FilePlus, Loader2, Save } from 'lucide-react';
import Button from '../ui/Button';
import { ScriptChat } from './ScriptChat';
import { debounce } from '../../utils/debounce';

export const ScriptPage: React.FC = () => {
  const { project, updateScriptElements, importScript } = useWorkspace();
  
  // --- 1. LOCAL STATE (For Speed) ---
  // We mirror the project elements here to avoid DB lag on every keystroke
  const [elements, setElements] = useState<ScriptElement[]>(project.scriptElements || []);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for cursor management during splits/merges
  const cursorTargetRef = useRef<{ id: string, position: number } | null>(null);

  // --- 2. SYNC ENGINE ---
  
  // Sync local changes to global project (Debounced 1s)
  const debouncedSync = useCallback(
      debounce((currentElements: ScriptElement[]) => {
          setIsSyncing(true);
          // Re-sequence before saving to ensure order is correct
          const sequenced = currentElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
          updateScriptElements(sequenced);
          setTimeout(() => setIsSyncing(false), 500);
      }, 2000),
      []
  );

  // Initial Load / External Update Sync
  useEffect(() => {
      // Only sync FROM project if we aren't currently typing/syncing
      // This prevents "fighting" if the DB updates while we type
      if (project.scriptElements && !isSyncing && project.scriptElements.length !== elements.length) {
          setElements(project.scriptElements);
      }
  }, [project.scriptElements]);

  // --- 3. EDITING LOGIC ---

  const updateLocal = (newElements: ScriptElement[]) => {
      setElements(newElements);
      debouncedSync(newElements);
  };

  const handleContentChange = (id: string, newContent: string) => {
    const currentIndex = elements.findIndex(el => el.id === id);
    if (currentIndex === -1) return;
    
    const currentEl = elements[currentIndex];
    let newType = currentEl.type;
    const upper = newContent.toUpperCase();

    // Smart Type Detection
    if (currentEl.type !== 'scene_heading' && /^(INT\.|EXT\.|INT\/EXT|I\/E)(\s|$)/.test(upper)) {
        newType = 'scene_heading';
    }
    if (currentEl.type !== 'transition' && (upper.endsWith(' TO:') || upper === 'FADE OUT.')) {
        newType = 'transition';
    }

    // Auto-Upper
    let finalContent = newContent;
    if (['scene_heading', 'character', 'transition'].includes(newType)) {
        finalContent = newContent.toUpperCase();
    }

    const updated = [...elements];
    updated[currentIndex] = { ...currentEl, content: finalContent, type: newType };
    updateLocal(updated);
  };

  // The Big One: Handling Keys
  const handleKeyDown = (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], cursorPosition: number, selectionEnd: number) => {
    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;

    // --- ENTER: SPLIT BLOCK ---
    if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();

       const currentContent = elements[index].content;
       
       // 1. Text Before Cursor
       const contentBefore = currentContent.slice(0, cursorPosition);
       // 2. Text After Cursor (moves to new block)
       const contentAfter = currentContent.slice(cursorPosition);

       // Determine Next Type
       let nextType: ScriptElement['type'] = 'action';
       if (type === 'scene_heading') nextType = 'action';
       else if (type === 'character') nextType = 'dialogue';
       else if (type === 'dialogue') nextType = 'character'; // Ping-pong
       else if (type === 'parenthetical') nextType = 'dialogue';
       else if (type === 'transition') nextType = 'scene_heading';

       // Special Case: Empty Character line -> Action (escape out of dialogue mode)
       if (type === 'character' && currentContent.trim() === '') {
           const updated = [...elements];
           updated[index].type = 'action';
           updateLocal(updated);
           return;
       }
       // Special Case: Empty Dialogue -> Action (escape)
       if (type === 'dialogue' && currentContent.trim() === '') {
           const updated = [...elements];
           updated[index].type = 'action';
           updateLocal(updated);
           return;
       }

       const newId = crypto.randomUUID();
       const newElement: ScriptElement = {
           id: newId,
           type: nextType,
           content: contentAfter, // Move rest of line to new block
           sequence: index + 2
       };

       const updated = [...elements];
       // Update current block to only have text before cursor
       updated[index] = { ...updated[index], content: contentBefore };
       // Insert new block
       updated.splice(index + 1, 0, newElement);
       
       updateLocal(updated);
       
       // Focus new block at start
       setTimeout(() => {
           setActiveElementId(newId);
           cursorTargetRef.current = { id: newId, position: 0 };
       }, 0);
    }

    // --- BACKSPACE: MERGE PREVIOUS ---
    if (e.key === 'Backspace' && cursorPosition === 0 && selectionEnd === 0) {
       // Only merge if we aren't at the very top
       if (index > 0) {
           e.preventDefault();
           const prevIndex = index - 1;
           const prevEl = elements[prevIndex];
           const currentEl = elements[index];

           // Calculate where cursor should go (at end of previous content)
           const newCursorPos = prevEl.content.length;

           // Merge content
           const mergedContent = prevEl.content + currentEl.content;
           
           const updated = [...elements];
           updated[prevIndex] = { ...prevEl, content: mergedContent };
           updated.splice(index, 1); // Delete current
           
           updateLocal(updated);

           // Focus previous and set cursor
           setTimeout(() => {
               setActiveElementId(prevEl.id);
               cursorTargetRef.current = { id: prevEl.id, position: newCursorPos };
           }, 0);
       }
    }

    // --- TAB: CYCLE TYPES ---
    if (e.key === 'Tab') {
       e.preventDefault();
       const types: ScriptElement['type'][] = ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
       const currentIdx = types.indexOf(type);
       const nextType = types[(currentIdx + 1) % types.length];
       
       const updated = [...elements];
       updated[index] = { ...updated[index], type: nextType };
       if (['scene_heading', 'character', 'transition'].includes(nextType)) {
           updated[index].content = updated[index].content.toUpperCase();
       }
       updateLocal(updated);
    }

    // --- ARROWS: NAVIGATION ---
    if (e.key === 'ArrowUp' && index > 0 && cursorPosition === 0) {
        e.preventDefault();
        setActiveElementId(elements[index - 1].id);
    }
    if (e.key === 'ArrowDown' && index < elements.length - 1 && cursorPosition === elements[index].content.length) {
        e.preventDefault();
        setActiveElementId(elements[index + 1].id);
    }
  };

  const handleAddFirstElement = () => {
     const newId = crypto.randomUUID();
     const el: ScriptElement = { id: newId, type: 'scene_heading', content: '', sequence: 1 };
     updateLocal([el]);
     setActiveElementId(newId);
  };

  const handleImportScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    await importScript(file);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasElements = elements.length > 0;

  return (
    <div className="relative h-full flex flex-col bg-[#111111] overflow-hidden font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept=".fountain,.txt" onChange={handleImportScript} />

      {/* Toolbar */}
      <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10">
         <div className="flex items-center gap-2 text-text-primary font-medium">
             <FileText className="w-4 h-4 text-primary" />
             <span>Screenplay Editor</span>
         </div>
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                {isSyncing ? (
                    <span className="text-xs text-primary flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</span>
                ) : (
                    <span className="text-xs text-text-tertiary flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>
                )}
             </div>
             <div className="h-4 w-[1px] bg-border" />
             <Button variant={isChatOpen ? "primary" : "secondary"} size="sm" icon={<Sparkles className="w-3 h-3" />} onClick={() => setIsChatOpen(!isChatOpen)}>
                AI Co-Pilot
             </Button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div 
          className="flex-1 overflow-y-auto w-full flex justify-center p-8 cursor-text transition-all duration-300 bg-[#111111]" 
          style={{ paddingRight: isChatOpen ? '350px' : '32px' }}
          onClick={() => hasElements && setActiveElementId(elements[elements.length - 1].id)}
        >
          {hasElements ? (
              <div className="w-full max-w-[850px] bg-[#1E1E1E] shadow-2xl min-h-[1100px] p-[100px] border border-[#333] mb-20 relative transition-transform">
                 <div className="flex flex-col">
                    {elements.map(element => (
                       <ScriptBlock 
                          key={element.id}
                          element={element}
                          isActive={activeElementId === element.id}
                          onChange={handleContentChange}
                          onKeyDown={handleKeyDown}
                          onFocus={setActiveElementId}
                          cursorRequest={cursorTargetRef.current?.id === element.id ? cursorTargetRef.current.position : null}
                       />
                    ))}
                 </div>
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-10">
                      <div className="w-16 h-16 bg-surface-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
                          <FileText className="w-8 h-8 text-text-tertiary" />
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary mb-2">No Script Found</h2>
                      <p className="text-text-secondary text-sm max-w-md mx-auto">
                          Import a .fountain file or start writing. We'll automatically build your Timeline scenes.
                      </p>
                  </div>
                  <div className="flex gap-4 justify-center">
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Import Script</Button>
                      <Button variant="primary" onClick={handleAddFirstElement}>Start Writing</Button>
                  </div>
              </div>
          )}
        </div>
        <ScriptChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    </div>
  );
};