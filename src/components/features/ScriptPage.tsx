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
import { SmartTypeManager } from './script-editor/SmartTypeManager';
import { ScriptPageToolbar } from './script-editor/ScriptPageToolbar';
import { debounce } from '../../utils/debounce';
import { useHistory } from '../../hooks/useHistory';
import { enrichScriptElements, generateScriptFromScenes, generateFountainText, convertFountainToElements } from '../../services/scriptUtils';
import { parseFountain } from '../../lib/fountain';
import { exportToPDF, exportToFDX, exportToTXT } from '../../services/exportService';
import { EmptyProjectState } from './EmptyProjectState';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { getCharacters, getLocations } from '../../services/storage';
import { calculatePagination } from '../../services/pagination';
import { learnFromScript } from '../../services/smartType';

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
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isImporting, setIsImporting] = useState(false);

    // Pagination
    const [pageMap, setPageMap] = useState<Record<string, number>>({});

    // Theme (Observer Pattern for Reactivity)
    const [isGlobalLight, setIsGlobalLight] = useState(document.documentElement.classList.contains('light'));
    const [localPaperWhite, setLocalPaperWhite] = useState(false);
    const isPaperWhite = isGlobalLight || localPaperWhite;

    const cursorTargetRef = useRef<{ id: string, position: number } | null>(null);

    // Watch for Theme Changes
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsGlobalLight(document.documentElement.classList.contains('light'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    // Sync to Project (Debounced)
    const debouncedSync = useCallback(
        debounce((newElements: ScriptElement[]) => {
            setSaveStatus('saving');
            setIsSyncing(true);
            const sequenced = newElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
            const enriched = enrichScriptElements(sequenced);
            updateScriptElements(enriched);

            // Simulate save completion
            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 500);

            setIsSyncing(false);
        }, 1000),
        [updateScriptElements]
    );

    // Initial Load & SmartType Learning
    const [lastScriptHash, setLastScriptHash] = useState('');

    useEffect(() => {
        if (project.scriptElements && project.scriptElements.length > 0) {
            if (elements.length === 0) setElements(project.scriptElements);

            // Optimize learning: only run if script content has changed
            const scriptHash = JSON.stringify(project.scriptElements.map(e => e.id + e.content));
            if (scriptHash !== lastScriptHash) {
                learnFromScript(project.id, project.scriptElements);
                setLastScriptHash(scriptHash);
            }
            return;
        }
        if (project.scenes.length > 0 && elements.length === 0) {
            const generated = generateScriptFromScenes(project.scenes);
            setElements(generated);
        }
    }, [project.scriptElements, project.scenes, project.id]);

    // Recalculate Pagination (memoized for performance)
    const calculatedPageMap = useMemo(() => {
        return calculatePagination(elements);
    }, [elements]);

    useEffect(() => {
        setPageMap(calculatedPageMap);
    }, [calculatedPageMap]);

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

    // Calculate current page for page indicator
    const currentPageNum = useMemo(() => {
        if (!activeElementId) return 1;
        const pageNum = pageMap[activeElementId];
        return pageNum || 1;
    }, [activeElementId, pageMap]);

    const totalPages = Object.keys(pages).length || 1;

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
            // REMOVED: Real-time uppercase conversion (now happens on blur)

            triggerSync(updated);
            return updated;
        });
    }, [setElements]);

    // Keydown Logic
    const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, type: ScriptElement['type'], cursorPosition: number, selectionEnd: number) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            e.shiftKey ? (canRedo && redo()) : (canUndo && undo());
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            // Generate ID upfront
            const newId = crypto.randomUUID();

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

                const newElement: ScriptElement = { id: newId, type: nextType, content: contentAfter, sequence: index + 2 };

                const updated = [...prevElements];
                updated[index] = { ...currentEl, content: contentBefore };
                updated.splice(index + 1, 0, newElement);

                triggerSync(updated);
                return updated;
            });

            // Update active state immediately (batched with setElements)
            setActiveElementId(newId);
            cursorTargetRef.current = { id: newId, position: 0 };
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
        const currentEls = elements;
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

    const handleImportScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            await importScript(file);
            // The useEffect listening to project.scriptElements will pick this up 
            // and populate the editor because elements.length is 0.
        } catch (e) {
            console.error(e);
        } finally {
            setIsImporting(false);
        }
    };

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (!activeElementId) return;

            // Tab for indentation / element cycling
            if (e.key === 'Tab') {
                e.preventDefault();
            }

            // Ctrl+Enter / Cmd+Enter to force Scene Heading
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                setElements(prev => {
                    const index = prev.findIndex(el => el.id === activeElementId);
                    if (index === -1) return prev;

                    const updated = [...prev];
                    updated[index] = { ...updated[index], type: 'scene_heading', content: updated[index].content.toUpperCase() };
                    triggerSync(updated);
                    return updated;
                });
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [activeElementId]);

    // --- RENDER HELPERS ---
    // Memoize page style to avoid recalculating on every render
    const pageStyle = useMemo(() => {
        if (isPaperWhite) {
            return "bg-white border-border shadow-xl text-black";
        }
        return "bg-[#1E1E1E] border border-[#333] shadow-2xl text-[#E0E0E0]";
    }, [isPaperWhite]);

    const tools: Tool[] = [
        {
            id: 'copilot',
            label: 'AI Writer',
            icon: <Sparkles className="w-5 h-5" />,
            content: <ScriptChat isOpen={true} onClose={() => { }} />
        },
        {
            id: 'smarttype',
            label: 'SmartType',
            icon: <Wand2 className="w-5 h-5" />,
            content: <SmartTypeManager projectId={project.id} onClose={() => { }} />
        }
    ];

    return (
        <PageWithToolRail tools={tools} defaultTool={null}>
            {/* The outer container uses app background (silver in light mode, charcoal in dark mode) */}
            <div className={`relative h-full flex flex-col overflow-hidden font-sans ${isZenMode ? 'fixed inset-0 z-[100] w-screen h-screen' : ''} bg-app transition-colors duration-300`}>

                {/* TOOLBAR */}
                <ScriptPageToolbar
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    isPaperWhite={isPaperWhite}
                    onTogglePaper={() => setLocalPaperWhite(!localPaperWhite)}
                    onExport={() => exportToPDF(project)}
                    saveStatus={saveStatus}
                    currentPage={currentPageNum}
                    totalPages={totalPages}
                />

                {/* SCROLL AREA */}
                <div className="flex-1 overflow-y-auto w-full flex flex-col items-center pb-[50vh]">
                    {elements.length === 0 ? (
                        <div className="mt-20">
                            {/* FIX: Ensure Import button is visible */}
                            <EmptyProjectState
                                title="Start Writing"
                                description="Create your first scene or import an existing screenplay."
                                onCreate={() => {
                                    const id = crypto.randomUUID();
                                    setElements([{ id, type: 'scene_heading', content: 'INT. START - DAY', sequence: 1 }]);
                                    setActiveElementId(id);
                                }}
                                onImport={handleImportScript}
                                isImporting={isImporting}
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
                                            ${pageStyle}
                                        `}
                                        // FIX: Removed logic that jumped to bottom on click
                                        onClick={(e) => {
                                            // Optional: If user clicks page but not element, we could focus *closest* element, 
                                            // but for now, do nothing to prevent the annoying jump.
                                        }}
                                    >
                                        {/* Page Number Header */}
                                        <div className={`absolute top-[0.5in] right-[1.0in] text-[12pt] font-screenplay select-none ${isPaperWhite ? 'text-black opacity-50' : 'text-zinc-500'}`}>
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
                                                    projectId={project.id}
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