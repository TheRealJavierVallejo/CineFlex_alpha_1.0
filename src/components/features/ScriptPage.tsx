/*
 * 🎬 PAGE: SCRIPT EDITOR
 * White Paper Edition + Robust Autosave
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement } from '../../types';
import { FileText, Sparkles, RefreshCw, Save, Undo, Redo, Maximize2, Minimize2, AlignLeft } from 'lucide-react';
import { ScriptChat } from './ScriptChat';
import { debounce } from '../../utils/debounce';
import { useHistory } from '../../hooks/useHistory';
import { enrichScriptElements, generateScriptFromScenes } from '../../services/scriptUtils';
import { EmptyProjectState } from './EmptyProjectState';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';

export const ScriptPage: React.FC = () => {
  const { project, updateScriptElements, importScript } = useWorkspace();
  
  // --- 1. HISTORY STATE (Undo/Redo) ---
  const { 
      state: elements, 
      set: setElements, 
      undo, 
      redo, 
      canUndo, 
      canRedo 
  } = useHistory<ScriptElement[]>(project.scriptElements || []);

  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTargetRef = useRef<{ id: string, position: number } | null>(null);
  
  // --- DATA LOSS FIX: Keep a ref to the latest elements for unmount saving ---
  const latestElementsRef = useRef(elements);
  useEffect(() => { latestElementsRef.current = elements; }, [elements]);

  // --- 2. SYNC ENGINE (Robust) ---
  // We use a ref for the save function so we can call it on unmount without stale closures
  const saveToProject = useCallback((currentElements: ScriptElement[]) => {
      if (currentElements.length === 0) return;
      setIsSyncing(true);
      const sequenced = currentElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
      const enriched = enrichScriptElements(sequenced);
      updateScriptElements(enriched); // Writes to Project Context
      setTimeout(() => setIsSyncing(false), 500);
  }, [updateScriptElements]);

  // Debounced version for typing
  const debouncedSave = useCallback(
      debounce((elements: ScriptElement[]) => saveToProject(elements), 2000),
      [saveToProject]
  );

  // SAVE ON UNMOUNT (Critical Fix)
  useEffect(() => {
      return () => {
          if (latestElementsRef.current.length > 0) {
              // Force immediate save when leaving the page
              saveToProject(latestElementsRef.current);
          }
      };
  }, [saveToProject]);

  // INITIAL LOAD
  useEffect(() => {
    // If we have elements in project, load them.
    if (project.scriptElements && project.scriptElements.length > 0) {
       // Only load if local is empty (prevents overwriting local edits if re-mounting quickly)
       if (elements.length === 0) setElements(project.scriptElements);
       return;
    }
    // Fallback: Generate from Scenes if script is empty
    if (project.scenes.length > 0 && elements.length === 0) {
        const generated = generateScriptFromScenes(project.scenes);
        setElements(generated);
    }
  }, [project.scriptElements, project.scenes]); 

  // --- 3. EDITING LOGIC ---
  const updateLocal = (newElements: ScriptElement[]) => {
      setElements(newElements);
      debouncedSave(newElements); // Trigger auto-save
  };

  const handleContentChange = (id: string, newContent: string) => {
    const currentIndex = elements.findIndex(el => el.id === id);
    if (currentIndex === -1) return;
    const currentEl = elements[currentIndex];
    
    // Auto-detect formatting
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

    if (e.key === 'Escape') setIsZenMode(false);

    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;

    // ENTER: New Line Logic
    if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       const currentContent = elements[index].content;
       const contentBefore = currentContent.slice(0, cursorPosition);
       const contentAfter = currentContent.slice(cursorPosition);
       
       // Standard Screenplay Flow
       let nextType: ScriptElement['type'] = 'action';
       if (type === 'scene_heading') nextType = 'action';
       else if (type === 'character') nextType = 'dialogue';
       else if (type === 'dialogue') nextType = 'character'; // Dialogue -> Character (for rapid back-and-forth)
       else if (type === 'parenthetical') nextType = 'dialogue';
       else if (type === 'transition') nextType = 'scene_heading';

       // Empty character/dialogue -> revert to Action
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

    // BACKSPACE: Merge Lines
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

    // TAB: Cycle Types
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
     const el: ScriptElement = { id: newId, type: 'scene_heading', content: 'INT. START - DAY', sequence: 1 };
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
  
  // Navigation Helper
  const headings = elements.filter(el => el.type === 'scene_heading');
  const scrollToElement = (id: string) => setActiveElementId(id);

  // --- TOOL DEFINITIONS ---
  const tools: Tool[] = [
    {
        id: 'outline',
        label: 'Script Outline',
        icon: <AlignLeft className="w-5 h-5" />,
        content: (
            <div className="p-4 space-y-4">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Scenes</div>
                <div className="space-y-1">
                    {headings.length === 0 && <div className="text-zinc-600 italic text-xs">No scenes detected.</div>}
                    {headings.map((h, i) => (
                        <button 
                            key={h.id}
                            onClick={() => scrollToElement(h.id)}
                            className="w-full text-left px-2 py-2 rounded-sm hover:bg-[#18181b] flex gap-2 group transition-colors"
                        >
                            <span className="text-[10px] font-mono text-zinc-600 font-bold w-4 mt-0.5">{i + 1}.</span>
                            <span className="text-xs text-zinc-400 font-medium leading-tight group-hover:text-white">{h.content || "UNTITLED SCENE"}</span>
                        </button>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 'copilot',
        label: 'AI Writer',
        icon: <Sparkles className="w-5 h-5" />,
        content: (
            <div className="h-full flex flex-col">
                <ScriptChat isOpen={true} onClose={() => {}} /> 
            </div>
        )
    }
  ];

  return (
    <PageWithToolRail tools={tools} defaultTool={null}>
        <div className={`relative h-full flex flex-col bg-[#e5e5e5] overflow-hidden font-sans ${isZenMode ? 'fixed inset-0 z-[100] w-screen h-screen' : ''}`}>
        
        {/* Toolbar - White Theme */}
        {hasElements && (
            <div className="h-12 border-b border-zinc-300 bg-zinc-100 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 text-zinc-700 font-medium pl-2">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span>Script Editor</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white rounded border border-zinc-300 p-0.5 shadow-sm">
                        <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-zinc-100 text-zinc-500 hover:text-black disabled:opacity-30 rounded-sm transition-colors" title="Undo"><Undo className="w-3.5 h-3.5" /></button>
                        <div className="w-[1px] h-4 bg-zinc-200 mx-1" />
                        <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-zinc-100 text-zinc-500 hover:text-black disabled:opacity-30 rounded-sm transition-colors" title="Redo"><Redo className="w-3.5 h-3.5" /></button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isSyncing ? (
                            <span className="text-xs text-blue-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</span>
                        ) : (
                            <span className="text-xs text-zinc-400 flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>
                        )}
                    </div>
                    
                    <div className="h-4 w-[1px] bg-zinc-300" />
                    
                    <button 
                        onClick={() => setIsZenMode(!isZenMode)}
                        className={`p-1.5 rounded transition-colors ${isZenMode ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-black hover:bg-zinc-200'}`}
                        title={isZenMode ? "Exit Zen Mode (Esc)" : "Enter Zen Mode"}
                    >
                        {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        )}

        <div className="flex-1 flex overflow-hidden relative">
            <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto w-full flex flex-col items-center p-8 pb-[50vh] cursor-text transition-all duration-300 bg-[#e5e5e5] custom-scrollbar-light" 
                onClick={(e) => {
                    if (e.target === containerRef.current && hasElements) {
                        setActiveElementId(elements[elements.length - 1].id);
                    }
                }}
            >
            {hasElements ? (
                // WHITE PAPER CONTAINER (US Letter Approx)
                <div className="w-full max-w-[850px] bg-white shadow-xl min-h-[1100px] h-fit flex-none p-[80px] border border-zinc-300 relative transition-transform">
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
                    title="Start Your Script"
                    description="Write comfortably in standard screenplay format. We'll automatically build scenes from your headers."
                />
            )}
            </div>
        </div>
        </div>
    </PageWithToolRail>
  );
};