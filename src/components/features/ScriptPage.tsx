/*
 * 🎬 PAGE: SCRIPT EDITOR
 * Optimized for Pro Writers: Zero-Latency Typing & Advanced Editing Logic
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { ScriptBlock } from './ScriptBlock';
import { ScriptElement, Scene } from '../../types';
import { FileText, Sparkles, RefreshCw, Save, Undo, Redo, Maximize2, Minimize2, AlignLeft, Moon, Sun } from 'lucide-react';
import { ScriptChat } from './ScriptChat';
import { debounce } from '../../utils/debounce';
import { useHistory } from '../../hooks/useHistory';
import { enrichScriptElements, generateScriptFromScenes } from '../../services/scriptUtils';
import { EmptyProjectState } from './EmptyProjectState';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { FeatureGate } from '../ui/FeatureGate';

export const ScriptPage: React.FC = () => {
    const { project, updateScriptElements, importScript, handleUpdateProject } = useWorkspace(); // Added handleUpdateProject

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
    // Check Global Theme (This is static per session unless we listen to changes, but usually settings requires navigation)
    const isGlobalLight = document.documentElement.classList.contains('light');

    // Local Toggle: Only active in Dark Mode. Defaults to Dark Paper (false).
    const [localPaperWhite, setLocalPaperWhite] = useState(false);

    // Effective State: If Global Light -> Force White Paper. Else -> Use Local Toggle.
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

    useEffect(() => {
        // Priority: If script elements exist in DB, use them.
        if (project.scriptElements && project.scriptElements.length > 0) {
            if (elements.length === 0) setElements(project.scriptElements);
            return;
        }
        // Fallback: If no script exists, try to rebuild from scenes (only on first load)
        if (project.scenes.length > 0 && elements.length === 0) {
            const generated = generateScriptFromScenes(project.scenes);
            setElements(generated);
        }
    }, [project.scriptElements, project.scenes]);

    // --- 3. EDITING LOGIC ---
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

    const handleStartWriting = () => {
        // Initialize project if starting fresh
        const sceneId = crypto.randomUUID();
        const firstScene: Scene = { id: sceneId, sequence: 1, heading: 'INT. EXAMPLE - DAY', actionNotes: '' };
        const firstElement: ScriptElement = { id: crypto.randomUUID(), type: 'scene_heading', content: 'INT. EXAMPLE - DAY', sceneId, sequence: 1 };

        // Save to global project state to unlock other views
        handleUpdateProject({
            ...project,
            scenes: [firstScene],
            scriptElements: [firstElement]
        });

        // Set local state
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

    // Navigation Helper
    const headings = elements.filter(el => el.type === 'scene_heading');
    const scrollToElement = (id: string) => {
        setActiveElementId(id);
        const el = document.getElementById(id);
    };

    // --- TOOL DEFINITIONS ---
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

                            {/* Paper Mode Switch - ONLY VISIBLE IN DARK MODE */}
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
                        // "Desk" Background: In Light Mode = App Background. In Dark Mode = Black (Void).
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
                        w-full max-w-[850px] shadow-2xl min-h-[1100px] h-fit flex-none p-[100px] border relative transition-colors duration-300
                        ${isPaperWhite
                                        ? 'bg-white border-zinc-200 shadow-zinc-900/10' // WHITE PAPER (Used in Global Light Mode OR Local Toggle)
                                        : 'bg-[#121212] border-[#333] shadow-[0_0_50px_rgba(0,0,0,0.5)]'} // DARK PAPER (Hardcoded Dark Grey)
                    `}
                            >
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
                                            isLightMode={isPaperWhite} // This passes true if global light OR local toggle
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