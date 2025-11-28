/*
 * 🎬 PAGE: SCRIPT EDITOR
 * Optimized for Pro NLE Layout
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudio } from '../../layouts/StudioLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement } from '../../types';
import { FileText, Sparkles, RefreshCw, Save, Undo, Redo, Maximize2, Minimize2 } from 'lucide-react';
import Button from '../ui/Button';
import { ScriptChat } from './ScriptChat';
import { debounce } from '../../utils/debounce';
import { useHistory } from '../../hooks/useHistory';
import { enrichScriptElements, generateScriptFromScenes } from '../../services/scriptUtils';
import { EmptyProjectState } from './EmptyProjectState';

export const ScriptPage: React.FC = () => {
  const { project, updateScriptElements, importScript } = useStudio();
  
  const { 
      state: elements, 
      set: setElements, 
      undo, 
      redo, 
      canUndo, 
      canRedo 
  } = useHistory<ScriptElement[]>(project.scriptElements || []);

  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTargetRef = useRef<{ id: string, position: number } | null>(null);

  const debouncedSync = useCallback(
      debounce((currentElements: ScriptElement[]) => {
          setIsSyncing(true);
          const sequenced = currentElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
          const enriched = enrichScriptElements(sequenced);
          updateScriptElements(enriched);
          setTimeout(() => setIsSyncing(false), 500);
      }, 2000),
      []
  );

  useEffect(() => {
    if (project.scriptElements && project.scriptElements.length > 0) {
       if (elements.length === 0) setElements(project.scriptElements);
       return;
    }
    if (project.scenes.length > 0 && elements.length === 0) {
        setElements(generateScriptFromScenes(project.scenes));
    }
  }, [project.scriptElements, project.scenes]); 

  const updateLocal = (newElements: ScriptElement[]) => {
      const enriched = enrichScriptElements(newElements);
      setElements(enriched);
      debouncedSync(enriched);
  };

  const handleContentChange = (id: string, newContent: string) => {
    const currentIndex = elements.findIndex(el => el.id === id);
    if (currentIndex === -1) return;
    const currentEl = elements[currentIndex];
    let newType = currentEl.type;
    const upper = newContent.toUpperCase();
    if (currentEl.type !== 'scene_heading' && /^(INT\.|EXT\.|INT\/EXT|I\/E)(\s|$)/.test(upper)) {
        newType = 'scene_heading';
    }
    if (currentEl.type !== 'transition' && (upper.endsWith(' TO:') || upper === 'FADE OUT.')) {
        newType = 'transition';
    }
    let finalContent = newContent;
    if (['scene_heading', 'character', 'transition'].includes(newType)) {
        finalContent = newContent.toUpperCase();
    }
    const updated = [...elements];
    updated[currentIndex] = { ...currentEl, content: finalContent, type: newType };
    updateLocal(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, type: ScriptElement['type'], cursorPosition: number, selectionEnd: number) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? (canRedo && redo()) : (canUndo && undo());
        return;
    }

    if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
    }

    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;

    if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       const currentContent = elements[index].content;
       const contentBefore = currentContent.slice(0, cursorPosition);
       const contentAfter = currentContent.slice(cursorPosition);
       let nextType: ScriptElement['type'] = 'action';
       if (type === 'scene_heading') nextType = 'action';
       else if (type === 'character') nextType = 'dialogue';
       else if (type === 'dialogue') nextType = 'character';
       else if (type === 'parenthetical') nextType = 'dialogue';
       else if (type === 'transition') nextType = 'scene_heading';

       if ((type === 'character' || type === 'dialogue') && currentContent.trim() === '') {
           const updated = [...elements];
           updated[index].type = 'action';
           updateLocal(updated);
           return;
       }

       const newId = crypto.randomUUID();
       const newElement: ScriptElement = { id: newId, type: nextType, content: contentAfter, sequence: index + 2 };
       const updated = [...elements];
       updated[index] = { ...updated[index], content: contentBefore };
       updated.splice(index + 1, 0, newElement);
       updateLocal(updated);
       setTimeout(() => {
           setActiveElementId(newId);
           cursorTargetRef.current = { id: newId, position: 0 };
       }, 0);
    }

    if (e.key === 'Backspace' && cursorPosition === 0 && selectionEnd === 0) {
       if (index > 0) {
           e.preventDefault();
           const prevIndex = index - 1;
           const prevEl = elements[prevIndex];
           const currentEl = elements[index];
           const newCursorPos = prevEl.content.length;
           const mergedContent = prevEl.content + currentEl.content;
           const updated = [...elements];
           updated[prevIndex] = { ...prevEl, content: mergedContent };
           updated.splice(index, 1);
           updateLocal(updated);
           setTimeout(() => {
               setActiveElementId(prevEl.id);
               cursorTargetRef.current = { id: prevEl.id, position: newCursorPos };
           }, 0);
       }
    }

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
  };

  const hasElements = elements.length > 0;

  return (
    <div className={`relative h-full flex flex-col bg-[#09090b] overflow-hidden font-sans ${isZenMode ? 'fixed inset-0 z-[100] w-screen h-screen' : ''}`}>
      
      {/* Toolbar */}
      {hasElements && (
        <div className={`h-10 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0 z-10 ${isZenMode ? 'bg-[#111111] border-[#222]' : ''}`}>
           <div className="flex items-center gap-2 text-text-primary font-medium text-xs">
               <FileText className="w-3.5 h-3.5 text-primary" />
               <span className="uppercase tracking-wide font-bold">Script Editor</span>
           </div>
           <div className="flex items-center gap-3">
               <div className="flex items-center bg-[#252526] rounded-sm border border-border p-0.5">
                  <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-[#3E3E42] text-text-tertiary hover:text-white disabled:opacity-30 rounded-sm transition-colors" title="Undo"><Undo className="w-3 h-3" /></button>
                  <div className="w-[1px] h-3 bg-border mx-1" />
                  <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-[#3E3E42] text-text-tertiary hover:text-white disabled:opacity-30 rounded-sm transition-colors" title="Redo"><Redo className="w-3 h-3" /></button>
               </div>
               
               <div className="flex items-center gap-2 min-w-[60px] justify-end">
                  {isSyncing ? (
                      <span className="text-[9px] text-primary flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving</span>
                  ) : (
                      <span className="text-[9px] text-text-tertiary flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>
                  )}
               </div>
               
               <div className="h-3 w-[1px] bg-border" />
               
               <button 
                  onClick={() => setIsZenMode(!isZenMode)}
                  className={`p-1 rounded-sm transition-colors ${isZenMode ? 'bg-primary text-white' : 'text-text-tertiary hover:text-white hover:bg-[#2A2D2E]'}`}
                  title={isZenMode ? "Exit Zen Mode (Esc)" : "Enter Zen Mode"}
               >
                  {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
               </button>

               <Button variant={isChatOpen ? "primary" : "secondary"} size="sm" icon={<Sparkles className="w-3 h-3" />} onClick={() => setIsChatOpen(!isChatOpen)}>
                  AI Co-Pilot
               </Button>
           </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto w-full flex flex-col items-center p-8 pb-[50vh] cursor-text transition-all duration-300 bg-[#09090b]" 
          style={{ paddingRight: isChatOpen ? '350px' : '32px' }}
          onClick={(e) => {
              if (e.target === containerRef.current && hasElements) {
                  setActiveElementId(elements[elements.length - 1].id);
              }
          }}
        >
          {hasElements ? (
              <div className="w-full max-w-[850px] bg-[#121212] shadow-[0_0_0_1px_#27272a] min-h-[1100px] h-fit flex-none p-[100px] relative transition-transform">
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
              <EmptyProjectState 
                 onImport={handleImportScript}
                 onCreate={handleAddFirstElement}
                 isImporting={isImporting}
              />
          )}
        </div>
        <ScriptChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    </div>
  );
};