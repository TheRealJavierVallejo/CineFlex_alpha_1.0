/*
 * 🎬 PAGE: SCRIPT EDITOR (True Page View)
 * Renders individual pages based on calculated pagination.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement, Scene } from '../../types';
import { FileText, Sparkles, RefreshCw, Save, Undo, Redo, Maximize2, Minimize2, AlignLeft, Moon, Sun, Download, Wand2 } from 'lucide-react';
import { ScriptChat } from './ScriptChat';
import { debounce } from '../../utils/debounce';
import { useHistory } from '../../hooks/useHistory';
import { enrichScriptElements, generateScriptFromScenes, generateFountainText, convertFountainToElements } from '../../services/scriptUtils'; 
import { parseFountain } from '../../lib/fountain'; 
import { exportToPDF, exportToFDX, exportToTXT } from '../../services/exportService';
import { EmptyProjectState } from './EmptyProjectState';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { getCharacters, getLocations } from '../../services/storage';
import { calculatePagination } from '../../services/pagination';

export const ScriptPage: React.FC = () => {
    const { project, updateScriptElements, importScript, handleUpdateProject, showToast } = useWorkspace();

    // History & State
    const {
        state: elements,
        set: setElements,
        undo,
        redo,
        canUndo,
        canRedo
    } = useHistory<ScriptElement[]>(project.scriptElements || []);

    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Pagination
    const [pageMap, setPageMap] = useState<Record<string, number>>({});

    // Theme (Light = Standard Paper, Dark = Night Mode Paper)
    const isGlobalLight = document.documentElement.classList.contains('light');
    const [localPaperWhite, setLocalPaperWhite] = useState(false);
    const isPaperWhite = isGlobalLight || localPaperWhite;

    const cursorTargetRef = useRef<{ id: string, position: number } | null>(null);

    // Sync Engine
    const debouncedSync = useCallback(
        debounce((currentElements: ScriptElement[]) => {
            setIsSyncing(true);
            const sequenced = currentElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
            const enriched = enrichScriptElements(sequenced);
            updateScriptElements(enriched);
            setTimeout(() => setIsSyncing(false), 500);
        }, 800),
        []
    );

    // Initial Load
    useEffect(() => {
        if (project.scriptElements && project.scriptElements.length > 0) {
            if (elements.length === 0) setElements(project.scriptElements);
            return;
        }
        if (project.scenes.length > 0 && elements.length === 0) {
            const generated = generateScriptFromScenes(project.scenes);
            setElements(generated);
        }
    }, [project.scriptElements, project.scenes]);

    // Recalculate Pagination
    useEffect(() => {
        const map = calculatePagination(elements);
        setPageMap(map);
    }, [elements]);

    // Group Elements by Page
    const pages = useMemo(() => {
        const grouped: Record<number, ScriptElement[]> = {};
        if (elements.length === 0) return {};
        
        elements.forEach(el => {
            const pageNum = pageMap[el.id] || 1;
            if (!grouped[pageNum]) grouped[pageNum] = [];
            grouped[pageNum].push(el);
        });
        return grouped;
    }, [elements, pageMap]);

    const handleContentChange = useCallback((id: string, newContent: string) => {
        setElements(prevElements => {
            const currentIndex = prevElements.findIndex(el => el.id === id);
            if (currentIndex === -1) return prevElements;
            
            const currentEl = prevElements[currentIndex];
            let newType = currentEl.type;
            const upper = newContent.toUpperCase();
            
            // Auto-detect Types
            if (currentEl.type !== 'scene_heading' && /^(INT\.|EXT\.|INT\/EXT|I\/E)(\s|$)/.test(upper)) {
                newType = 'scene_heading';
            }
            if (currentEl.type !== 'transition' && (upper.endsWith(' TO:') || upper === 'FADE OUT.')) {
                newType = 'transition';
            }

            if (currentEl.content === newContent && currentEl.type === newType) return prevElements;

            const updated = [...prevElements];
            updated[currentIndex] = { ...currentEl, content: newContent, type: newType };
            // Ensure uppercase for specific types
            if (['scene_heading', 'character', 'transition'].includes(newType)) {
                updated[currentIndex].content = updated[currentIndex].content.toUpperCase();
            }
            
            triggerSync(updated);
            return updated;
        });
    }, [setElements]);

    // ... (Keyboard/Nav logic same as before, simplified for this snippet)
    const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, type: ScriptElement['type'], cursorPosition: number, selectionEnd: number) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            e.shiftKey ? (canRedo && redo()) : (canUndo && undo());
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setElements(prevElements => {
                const index = prevElements.findIndex(el => el.id === id);
                if (index === -1) return prevElements;
                
                const currentEl = prevElements[index];
                const contentBefore = currentEl.content.slice(0, cursorPosition);
                const contentAfter = currentEl.content.slice(cursorPosition);
                
                let nextType: ScriptElement['type'] = 'action';
                if (type === 'scene_heading') nextType = 'action';
                else if (type === 'character') nextType = 'dialogue';
                else if (type === 'dialogue') nextType = 'character';
                else if (type === 'parenthetical') nextType = 'dialogue';
                else if (type === 'transition') nextType = 'scene_heading';

                const newId = crypto.randomUUID();
                const newElement: ScriptElement = { id: newId, type: nextType, content: contentAfter, sequence: index + 2 };
                
                const updated = [...prevElements];
                updated[index] = { ...currentEl, content: contentBefore }; 
                updated.splice(index + 1, 0, newElement);
                
                requestAnimationFrame(() => {
                    setActiveElementId(newId);
                    cursorTargetRef.current = { id: newId, position: 0 };
                });
                triggerSync(updated);
                return updated;
            });
        }
        if (e.key === 'Backspace' && cursorPosition === 0 && selectionEnd === 0) {
            setElements(prevElements => {
                const index = prevElements.findIndex(el => el.id === id);
                if (index <= 0) return prevElements;
                e.preventDefault();
                const prevIndex = index - 1;
                const prevEl = prevElements[prevIndex];
                const currentEl = prevElements[index];
                const newCursorPos = prevEl.content.length;
                const updated = [...prevElements];
                updated[prevIndex] = { ...prevEl, content: prevEl.content + currentEl.content };
                updated.splice(index, 1);
                
                requestAnimationFrame(() => {
                    setActiveElementId(prevEl.id);
                    cursorTargetRef.current = { id: prevEl.id, position: newCursorPos };
                });
                triggerSync(updated);
                return updated;
            });
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            setElements(prevElements => {
                const index = prevElements.findIndex(el => el.id === id);
                const types: ScriptElement['type'][] = ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
                const currentIdx = types.indexOf(type);
                const nextType = types[(currentIdx + 1) % types.length];
                const updated = [...prevElements];
                updated[index] = { ...updated[index], type: nextType };
                triggerSync(updated);
                return updated;
            });
        }
    }, [canUndo, canRedo, undo, redo, setElements]);

    const handleNavigation = useCallback((e: React.KeyboardEvent, id: string, cursorPosition: number, contentLength: number) => {
        // Simple nav logic
        const currentEls = elements; // Accessing from closure state
        const index = currentEls.findIndex(el => el.id === id);
        
        if (e.key === 'ArrowUp' && cursorPosition === 0 && index > 0) {
            e.preventDefault();
            setActiveElementId(currentEls[index - 1].id);
        }
        if (e.key === 'ArrowDown' && cursorPosition === contentLength && index < currentEls.length - 1) {
            e.preventDefault();
            setActiveElementId(currentEls[index + 1].id);
        }
    }, [elements]);

    const triggerSync = (newElements: ScriptElement[]) => debouncedSync(newElements);

    // --- RENDER HELPERS ---
    const getPageStyle = () => {
        if (isPaperWhite) {
            return "bg-white border-border shadow-xl text-black";
        }
        // Final Draft Dark Mode look: Dark Gray Paper, White Text
        return "bg-[#1E1E1E] border border-[#333] shadow-2xl text-[#E0E0E0]"; 
    };

    const tools: Tool[] = [
        {
            id: 'copilot',
            label: 'AI Writer',
            icon: <Sparkles className="w-5 h-5" />,
            content: <ScriptChat isOpen={true} onClose={() => { }} />
        }
    ];

    return (
        <PageWithToolRail tools={tools} defaultTool={null}>
            <div className={`relative h-full flex flex-col overflow-hidden font-sans ${isZenMode ? 'fixed inset-0 z-[100] w-screen h-screen' : ''} bg-[#0C0C0E]`}>
                
                {/* TOOLBAR (Simplified) */}
                <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10">
                    <div className="flex items-center gap-2 text-text-primary font-medium pl-2">
                        <FileText className="w-4 h-4 text-text-muted" />
                        <span>Script</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-surface-secondary rounded border border-border p-0.5">
                            <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-surface text-text-secondary disabled:opacity-30 rounded-sm"><Undo className="w-3.5 h-3.5" /></button>
                            <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-surface text-text-secondary disabled:opacity-30 rounded-sm"><Redo className="w-3.5 h-3.5" /></button>
                        </div>
                        <button onClick={() => setLocalPaperWhite(!localPaperWhite)} className="p-1.5 text-text-secondary hover:text-white">
                            {localPaperWhite ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* SCROLL AREA */}
                <div className="flex-1 overflow-y-auto w-full flex flex-col items-center bg-[#0C0C0E] pb-[50vh]">
                    {elements.length === 0 ? (
                        <div className="mt-20">
                            <EmptyProjectState 
                                title="Start Writing" 
                                description="Create your first scene." 
                                onCreate={() => {
                                    const id = crypto.randomUUID();
                                    setElements([{ id, type: 'scene_heading', content: 'INT. START - DAY', sequence: 1 }]);
                                    setActiveElementId(id);
                                }} 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-8 gap-8">
                            {Object.entries(pages).map(([pageNumStr, pageElements]) => {
                                const pageNum = parseInt(pageNumStr);
                                return (
                                    <div 
                                        key={pageNum}
                                        id={`page-${pageNum}`}
                                        className={`
                                            w-[8.5in] min-h-[11in] relative transition-colors duration-300
                                            pt-[1.0in] pb-[1.0in] pl-[1.5in] pr-[1.0in]
                                            ${getPageStyle()}
                                        `}
                                        onClick={(e) => {
                                            // Click empty space at bottom of page focuses last element
                                            if (e.target === e.currentTarget && pageElements.length > 0) {
                                                setActiveElementId(pageElements[pageElements.length - 1].id);
                                            }
                                        }}
                                    >
                                        {/* Page Number Header */}
                                        <div className="absolute top-[0.5in] right-[1.0in] text-[12pt] font-screenplay opacity-50 select-none">
                                            {pageNum}.
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-col">
                                            {pageElements.map((element, index) => (
                                                <ScriptBlock
                                                    key={element.id}
                                                    element={element}
                                                    isActive={activeElementId === element.id}
                                                    isFirstOnPage={index === 0}
                                                    isLightMode={isPaperWhite}
                                                    onChange={handleContentChange}
                                                    onKeyDown={(e, id, type, start, end) => {
                                                        handleNavigation(e, id, start, element.content.length);
                                                        handleKeyDown(e, id, type, start, end);
                                                    }}
                                                    onFocus={setActiveElementId}
                                                    cursorRequest={cursorTargetRef.current?.id === element.id ? cursorTargetRef.current.position : null}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </PageWithToolRail>
    );
};