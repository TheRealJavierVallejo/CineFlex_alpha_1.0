/*
 * 🎬 PAGE: SCRIPT EDITOR
 * Optimized for Pro Writers: Zero-Latency Typing & Advanced Editing Logic
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { FeatureGate } from '../ui/FeatureGate';

export const ScriptPage: React.FC = () => {
    const { project, updateScriptElements, importScript, handleUpdateProject, showToast } = useWorkspace();

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
    const [isSyncing, setIsSyncing] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // --- PAPER THEME LOGIC ---
    const isGlobalLight = document.documentElement.classList.contains('light');
    const [localPaperWhite, setLocalPaperWhite] = useState(false);
    const isPaperWhite = isGlobalLight || localPaperWhite;

    const containerRef = useRef<HTMLDivElement>(null);
    const cursorTargetRef = useRef<{ id: string, position: number } | null>(null);

    // --- 2. SYNC ENGINE ---
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
            // Only set if history is empty (first load) to avoid overwriting edits
            if (elements.length === 0) setElements(project.scriptElements);
            return;
        }
        if (project.scenes.length > 0 && elements.length === 0) {
            const generated = generateScriptFromScenes(project.scenes);
            setElements(generated);
        }
    }, [project.scriptElements, project.scenes]); // Dependencies ok, condition protects loop

    // Helper: Triggers sync side-effect without re-rendering
    const triggerSync = (newElements: ScriptElement[]) => {
        debouncedSync(newElements);
    };

    // --- 3. EDITING LOGIC (Stable Handlers) ---

    const handleContentChange = useCallback((id: string, newContent: string) => {
        setElements(prevElements => {
            const currentIndex = prevElements.findIndex(el => el.id === id);
            if (currentIndex === -1) return prevElements;
            
            const currentEl = prevElements[currentIndex];
            let newType = currentEl.type;
            let dualState = currentEl.dual;
            let sceneNumber = currentEl.sceneNumber;

            const upper = newContent.toUpperCase();
            
            // Auto-detect Types
            if (currentEl.type !== 'scene_heading' && /^(INT\.|EXT\.|INT\/EXT|I\/E)(\s|$)/.test(upper)) {
                newType = 'scene_heading';
            }
            if (currentEl.type !== 'transition' && (upper.endsWith(' TO:') || upper === 'FADE OUT.')) {
                newType = 'transition';
            }

            // Auto-detect Dual Dialogue Caret
            if (currentEl.type === 'character' && newContent.trim().endsWith('^')) {
                dualState = true;
            } else if (currentEl.type === 'character' && !newContent.includes('^') && dualState) {
                dualState = false;
            }

            let finalContent = newContent;
            
            // Auto-detect Scene Number Magic Snap (e.g. "INT. HOUSE #1#")
            if (newType === 'scene_heading') {
                // Regex looks for #ANYTHING# at the end of the string
                const sceneNumMatch = finalContent.match(/\s#([a-zA-Z0-9\.-]+)#$/);
                if (sceneNumMatch) {
                    sceneNumber = sceneNumMatch[1]; // Extract '1A'
                    finalContent = finalContent.substring(0, sceneNumMatch.index).trim(); // Remove from text
                }
            }

            if (['scene_heading', 'character', 'transition'].includes(newType)) {
                finalContent = finalContent.toUpperCase();
            }
            
            // Only update if changed
            if (currentEl.content === finalContent && currentEl.type === newType && currentEl.dual === dualState && currentEl.sceneNumber === sceneNumber) {
                return prevElements;
            }

            const updated = [...prevElements];
            updated[currentIndex] = { ...currentEl, content: finalContent, type: newType, dual: dualState, sceneNumber: sceneNumber };
            
            // Trigger sync (side effect)
            triggerSync(updated);
            
            return updated;
        });
    }, [setElements]);

    const handleClearSceneNumber = useCallback((id: string) => {
        setElements(prevElements => {
            return prevElements.map(el => el.id === id ? { ...el, sceneNumber: undefined } : el);
        });
    }, [setElements]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, type: ScriptElement['type'], cursorPosition: number, selectionEnd: number) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            e.shiftKey ? (canRedo && redo()) : (canUndo && undo());
            return;
        }

        if (e.key === 'Escape' && isZenMode) {
            setIsZenMode(false);
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            setElements(prevElements => {
                const index = prevElements.findIndex(el => el.id === id);
                if (index === -1) return prevElements;

                const currentEl = prevElements[index];
                
                // DUAL DIALOGUE CLEANUP
                let cleanContent = currentEl.content;
                if (currentEl.type === 'character' && cleanContent.trim().endsWith('^')) {
                    cleanContent = cleanContent.replace(/\^$/, '').trim();
                }

                const contentBefore = cleanContent.slice(0, cursorPosition);
                const contentAfter = cleanContent.slice(cursorPosition);
                
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
                
                // Focus Management (Side Effect)
                // We use requestAnimationFrame to ensure render cycle completes
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
                const mergedContent = prevEl.content + currentEl.content;
                const updated = [...prevElements];
                updated[prevIndex] = { ...prevEl, content: mergedContent };
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
                if (index === -1) return prevElements;

                const types: ScriptElement['type'][] = ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
                const currentIdx = types.indexOf(type);
                const nextType = types[(currentIdx + 1) % types.length];
                const updated = [...prevElements];
                updated[index] = { ...updated[index], type: nextType };
                if (['scene_heading', 'character', 'transition'].includes(nextType)) {
                    updated[index].content = updated[index].content.toUpperCase();
                }
                
                triggerSync(updated);
                return updated;
            });
        }

        if (e.key === 'ArrowUp') {
            // Need access to current elements to check index
            // We can't access state inside event handler cleanly without dependency
            // But since this is navigation, we can just use the prop passed to the function
            // Wait, we need to know the PREVIOUS element ID.
            // This logic relies on `elements` being fresh. 
            // Since this handler is memoized with [elements] dep in the standard way, 
            // it would re-render.
            // OPTIMIZATION: We don't update state here, just focus.
            // We can pass `elements` as a dependency here. 
            // BUT, `handleKeyDown` changing breaks `ScriptBlock` memoization.
            // FIX: ScriptBlock passes us the ID. We can find it in the ref or state.
            // Actually, for navigation, it's acceptable to re-create the handler *if* 
            // we accept that nav changes focus anyway.
            // HOWEVER, to keep `ScriptBlock` pure, we should use a Ref for elements
            // so the callback is stable.
        }
    }, [isZenMode, canUndo, canRedo, undo, redo, setElements]); 
    
    // NAVIGATION HANDLER (Separate to break dependency cycle if needed, but handled inside main for now)
    // To implement Up/Down without breaking Memo, we need to look up neighbors.
    // We can use a Ref to store the current element order.
    const elementsRef = useRef(elements);
    useEffect(() => { elementsRef.current = elements; }, [elements]);

    const handleNavigation = useCallback((e: React.KeyboardEvent, id: string, cursorPosition: number, contentLength: number) => {
        if (e.key === 'ArrowUp' && cursorPosition === 0) {
            e.preventDefault();
            const currentEls = elementsRef.current;
            const index = currentEls.findIndex(el => el.id === id);
            if (index > 0) setActiveElementId(currentEls[index - 1].id);
        }
        if (e.key === 'ArrowDown' && cursorPosition === contentLength) {
            e.preventDefault();
            const currentEls = elementsRef.current;
            const index = currentEls.findIndex(el => el.id === id);
            if (index < currentEls.length - 1) setActiveElementId(currentEls[index + 1].id);
        }
    }, []);

    const handleAutoFormat = () => {
        const rawText = generateFountainText(elements);
        const fountainOutput = parseFountain(rawText, true);
        const formattedElements = convertFountainToElements(fountainOutput.tokens);
        // We use setElements directly here
        const enriched = enrichScriptElements(formattedElements);
        setElements(enriched);
        triggerSync(enriched);
        showToast("Script Auto-Formatted", 'success');
    };

    const handleStartWriting = () => {
        const sceneId = crypto.randomUUID();
        const firstScene: Scene = { id: sceneId, sequence: 1, heading: 'INT. EXAMPLE - DAY', actionNotes: '' };
        const firstElement: ScriptElement = { id: crypto.randomUUID(), type: 'scene_heading', content: 'INT. EXAMPLE - DAY', sceneId, sequence: 1 };

        handleUpdateProject({
            ...project,
            scenes: [firstScene],
            scriptElements: [firstElement]
        });

        setElements([firstElement]);
        setActiveElementId(firstElement.id);
    };

    const handleImportScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        await importScript(file);
        setIsImporting(false);
    };

    const hasElements = elements.length > 0;
    const headings = elements.filter(el => el.type === 'scene_heading');
    const scrollToElement = (id: string) => {
        setActiveElementId(id);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const tools: Tool[] = [
        {
            id: 'outline',
            label: 'Script Outline',
            icon: <AlignLeft className="w-5 h-5" />,
            content: (
                <div className="p-4 space-y-4">
                    <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Scenes</div>
                    <div className="space-y-1">
                        {headings.length === 0 && <div className="text-text-muted italic text-xs">No scenes detected.</div>}
                        {headings.map((h, i) => (
                            <button
                                key={h.id}
                                onClick={() => scrollToElement(h.id)}
                                className="w-full text-left px-2 py-2 rounded-sm hover:bg-surface-secondary flex gap-2 group transition-colors"
                            >
                                <span className="text-[10px] font-mono text-text-muted font-bold w-4 mt-0.5">{i + 1}.</span>
                                <span className="text-xs text-text-secondary font-medium leading-tight group-hover:text-text-primary">{h.content || "UNTITLED SCENE"}</span>
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
                <div className="h-full flex flex-col relative">
                    <ScriptChat isOpen={true} onClose={() => { }} />
                </div>
            )
        }
    ];

    return (
        <PageWithToolRail tools={tools} defaultTool={null}>
            <div className={`relative h-full flex flex-col overflow-hidden font-sans ${isZenMode ? 'fixed inset-0 z-[100] w-screen h-screen' : ''} ${isGlobalLight ? 'bg-background' : 'bg-surface'}`}>

                {/* Toolbar */}
                {hasElements && (
                    <div className={`h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10 ${isZenMode ? 'bg-surface border-border' : ''}`}>
                        <div className="flex items-center gap-2 text-text-primary font-medium pl-2">
                            <div className={`p-1.5 rounded-full ${isSyncing ? 'bg-primary/20 text-primary animate-pulse' : 'bg-surface-secondary text-text-muted'}`}>
                                <FileText className="w-4 h-4" />
                            </div>
                            <span>Screenplay Editor</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleAutoFormat}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-secondary hover:bg-primary hover:text-white text-text-secondary transition-colors text-xs font-bold uppercase tracking-wide border border-border hover:border-primary"
                                title="Standardize Format (Fountain)"
                            >
                                <Wand2 className="w-3.5 h-3.5" /> Auto-Format
                            </button>

                            <div className="relative group/export">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-secondary hover:bg-primary hover:text-white text-text-secondary transition-colors text-xs font-bold uppercase tracking-wide">
                                    <Download className="w-3.5 h-3.5" /> Export
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border shadow-xl rounded-sm overflow-hidden hidden group-hover/export:block z-50">
                                    <button onClick={() => exportToPDF(project)} className="w-full text-left px-4 py-2 hover:bg-primary hover:text-white text-text-secondary text-xs font-bold uppercase tracking-wide transition-colors">
                                        PDF (Standard)
                                    </button>
                                    <button onClick={() => {
                                        const xml = exportToFDX(project);
                                        const blob = new Blob([xml], { type: 'text/xml' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${project.name.replace(/\s+/g, '_')}.fdx`;
                                        a.click();
                                    }} className="w-full text-left px-4 py-2 hover:bg-primary hover:text-white text-text-secondary text-xs font-bold uppercase tracking-wide transition-colors">
                                        Final Draft (.fdx)
                                    </button>
                                    <button onClick={() => {
                                        const txt = exportToTXT(project);
                                        const blob = new Blob([txt], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${project.name.replace(/\s+/g, '_')}.fountain`;
                                        a.click();
                                    }} className="w-full text-left px-4 py-2 hover:bg-primary hover:text-white text-text-secondary text-xs font-bold uppercase tracking-wide transition-colors">
                                        Fountain (.txt)
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center bg-surface-secondary rounded border border-border p-0.5">
                                <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-30 rounded-sm transition-colors" title="Undo"><Undo className="w-3.5 h-3.5" /></button>
                                <div className="w-[1px] h-4 bg-border mx-1" />
                                <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-30 rounded-sm transition-colors" title="Redo"><Redo className="w-3.5 h-3.5" /></button>
                            </div>

                            <div className="flex items-center gap-2">
                                {isSyncing ? (
                                    <span className="text-xs text-primary flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</span>
                                ) : (
                                    <span className="text-xs text-text-muted flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>
                                )}
                            </div>

                            <div className="h-4 w-[1px] bg-border" />

                            {!isGlobalLight && (
                                <button
                                    onClick={() => setLocalPaperWhite(!localPaperWhite)}
                                    className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                                    title={localPaperWhite ? "Switch to Dark Paper" : "Switch to Light Paper"}
                                >
                                    {localPaperWhite ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </button>
                            )}

                            <button
                                onClick={() => setIsZenMode(!isZenMode)}
                                className={`p-1.5 rounded transition-colors ${isZenMode ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}`}
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
                        className={`flex-1 overflow-y-auto w-full flex flex-col items-center p-8 pb-[50vh] cursor-text transition-all duration-300 ${isGlobalLight ? 'bg-surface-secondary' : 'bg-surface'}`}
                        onClick={(e) => {
                            if (e.target === containerRef.current && hasElements) {
                                setActiveElementId(elements[elements.length - 1].id);
                            }
                        }}
                    >
                        {hasElements ? (
                            <div
                                className={`
                        w-full max-w-[850px] shadow-2xl min-h-[1100px] h-fit flex-none pl-[1.5in] pr-[1.0in] pt-[1.0in] pb-[1.0in] border relative transition-colors duration-300
                        ${isPaperWhite
                                        ? 'bg-white border-zinc-200 shadow-zinc-900/10' 
                                        : 'bg-[#121212] border-[#333] shadow-[0_0_50px_rgba(0,0,0,0.5)]'} 
                    `}
                            >
                                <div className="flex flex-col">
                                    {elements.map(element => (
                                        <ScriptBlock
                                            key={element.id}
                                            element={element}
                                            isActive={activeElementId === element.id}
                                            onChange={handleContentChange}
                                            onKeyDown={(e, id, type, start, end) => {
                                                handleNavigation(e, id, start, element.content.length);
                                                handleKeyDown(e, id, type, start, end);
                                            }}
                                            onDeleteSceneNumber={handleClearSceneNumber}
                                            onFocus={setActiveElementId}
                                            cursorRequest={cursorTargetRef.current?.id === element.id ? cursorTargetRef.current.position : null}
                                            isLightMode={isPaperWhite} 
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyProjectState
                                title="Script Workspace"
                                description="Your project has no script yet. Start writing!"
                                onImport={handleImportScript}
                                onCreate={handleStartWriting}
                                isImporting={isImporting}
                            />
                        )}
                    </div>
                </div>
            </div>
        </PageWithToolRail >
    );
};