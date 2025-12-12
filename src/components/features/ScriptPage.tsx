import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { SlateScriptEditor, SlateScriptEditorRef } from './script-editor/SlateScriptEditor';
import { ScriptElement } from '../../types';
import {
    Sparkles,
    BookOpen,
    Wand2
} from 'lucide-react';
import { ScriptChat } from './ScriptChat';
import { SmartTypeManager } from './script-editor/SmartTypeManager';
import { ScriptPageToolbar } from './script-editor/ScriptPageToolbar';
import { StoryPanel } from './StoryPanel';
import { debounce } from '../../utils/debounce';
import { useHistory } from '../../hooks/useHistory';
import { enrichScriptElements } from '../../services/scriptUtils';
import { exportToPDF } from '../../services/exportService';
import { EmptyProjectState } from './EmptyProjectState';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';
import { learnFromScript } from '../../services/smartType';

export const ScriptPage: React.FC = () => {
    const { project, updateScriptElements, importScript } = useWorkspace();

    // History & State
    const {
        state: elements,
        set: setElements,
    } = useHistory<ScriptElement[]>(project.scriptElements || []);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isImporting, setIsImporting] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Editor State
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const editorRef = useRef<SlateScriptEditorRef>(null);

    // Theme Detection
    const [isGlobalLight, setIsGlobalLight] = useState(document.documentElement.classList.contains('light'));
    const [localPaperWhite, setLocalPaperWhite] = useState(false);
    const isPaperWhite = isGlobalLight || localPaperWhite;

    // Observer for Theme Changes
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

    const projectId = project.id;

    const debouncedSync = useMemo(
        () => debounce((newElements: ScriptElement[]) => {
            setSaveStatus('saving');

            // 1. Enrich/Sequence
            const sequenced = newElements.map((el, idx) => ({ ...el, sequence: idx + 1 }));
            const enriched = enrichScriptElements(sequenced);

            // 2. Update Context
            updateScriptElements(enriched);

            // 3. Learn SmartTypes (Async)
            learnFromScript(projectId, newElements);

            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 500);
        }, 1000),
        [updateScriptElements, projectId]
    );

    // Sync elements with project.scriptElements and learn from script
    // Only responds to external changes (project load, import), not internal edits
    useEffect(() => {
        setElements(project.scriptElements || []);

        if (project.scriptElements && project.scriptElements.length > 0) {
            learnFromScript(project.id, project.scriptElements);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.scriptElements, project.id]);

    const handleImportScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            await importScript(file);
        } catch (e) {
            console.error(e);
        } finally {
            setIsImporting(false);
        }
    };



    // DEFINING TOOLS (Syd removed for custom split view)
    const tools: Tool[] = [
        {
            id: 'story',
            label: 'Story',
            icon: <BookOpen className="w-5 h-5" />,
            content: <StoryPanel />,
            width: '600px',
            noScroll: true
        },
        {
            id: 'smarttype',
            label: 'SmartType',
            icon: <Wand2 className="w-5 h-5" />,
            content: <SmartTypeManager projectId={project.id} onClose={() => { }} />,
            noScroll: true
        }
    ];

    const [sydOpen, setSydOpen] = useState(false);

    return (
        <PageWithToolRail tools={tools} defaultTool={null}>
            {/* ADD overflow-hidden HERE to prevent horizontal scroll */}
            <div className="relative h-full flex flex-col font-sans bg-app transition-colors duration-300 overflow-hidden">

                <ScriptPageToolbar
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={() => editorRef.current?.undo()}
                    onRedo={() => editorRef.current?.redo()}
                    isPaperWhite={isPaperWhite}
                    onTogglePaper={() => setLocalPaperWhite(!localPaperWhite)}
                    onExport={() => exportToPDF(project)}
                    saveStatus={saveStatus}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    sydOpen={sydOpen}
                    onToggleSyd={() => setSydOpen(!sydOpen)}
                />

                {/* MAIN SPLIT CONTENT - FIXED ARCHITECTURE */}
                <div className="flex flex-row w-full flex-1 min-h-0 overflow-hidden">
                    {/* LEFT: Editor Area - TRULY CENTERED */}
                    <div
                        className={`h-full flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden ${sydOpen ? 'w-1/2' : 'w-full'
                            }`}
                    >
                        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
                            {/* PERFECT CENTER - No padding, no black bars */}
                            <div className="min-h-full flex items-center justify-center pb-[50vh]">
                                {/* Fixed 850px width, perfectly centered */}
                                <div className="w-[850px]">
                                    {elements.length === 0 ? (
                                        <div className="mt-20">
                                            <EmptyProjectState
                                                title="Start Writing"
                                                description="Create your first scene or import an existing screenplay."
                                                onCreate={() => {
                                                    const id = crypto.randomUUID();
                                                    setElements([{ id, type: 'scene_heading', content: 'INT. START - DAY', sequence: 1 }]);
                                                }}
                                                onImport={handleImportScript}
                                                isImporting={isImporting}
                                            />
                                        </div>
                                    ) : (
                                        <SlateScriptEditor
                                            ref={editorRef}
                                            initialElements={elements}
                                            onChange={(updatedElements) => {
                                                setElements(updatedElements);
                                                debouncedSync(updatedElements);
                                            }}
                                            onUndoRedoChange={(undo, redo) => {
                                                setCanUndo(undo);
                                                setCanRedo(redo);
                                            }}
                                            onPageChange={(curr, total) => {
                                                setCurrentPage(curr);
                                                setTotalPages(total);
                                            }}
                                            isLightMode={isPaperWhite}
                                            projectId={project.id}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Keyboard Shortcut Helper (unchanged) */}
                        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
                            <div className="pointer-events-auto">
                                {showShortcuts && (
                                    <div className="bg-surface border border-border rounded-lg shadow-xl p-4 mb-2 min-w-[200px] animate-in slide-in-from-bottom-2 fade-in duration-200">
                                        <div className="flex justify-between items-center mb-3 border-b border-border pb-2">
                                            <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider">Shortcuts</h3>
                                            <button onClick={() => setShowShortcuts(false)} className="text-text-muted hover:text-text-primary text-lg leading-none">×</button>
                                        </div>
                                        <div className="text-[10px] space-y-1.5 font-mono text-text-secondary">
                                            <div className="flex justify-between"><span>Scene Heading</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">⌘1</span></div>
                                            <div className="flex justify-between"><span>Action</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">⌘2</span></div>
                                            <div className="flex justify-between"><span>Character</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">⌘3</span></div>
                                            <div className="flex justify-between"><span>Dialogue</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">⌘4</span></div>
                                            <div className="flex justify-between"><span>Parenthetical</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">⌘5</span></div>
                                            <div className="flex justify-between"><span>Transition</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">⌘6</span></div>
                                            <div className="border-t border-border my-1"></div>
                                            <div className="flex justify-between"><span>Cycle Type</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">Tab</span></div>
                                            <div className="flex justify-between"><span>New Element</span> <span className="bg-surface-secondary px-1 rounded border border-border text-text-primary">Enter</span></div>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowShortcuts(!showShortcuts)}
                                    className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all ${showShortcuts ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text-primary hover:border-primary'}`}
                                    title="Keyboard Shortcuts"
                                >
                                    <span className="font-mono text-sm font-bold">?</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Syd Panel - PROPERLY SPLIT, NOT OVERLAY */}
                    {sydOpen && (
                        <div className="w-1/2 h-full border-l border-border overflow-hidden bg-surface">
                            <ScriptChat onClose={() => setSydOpen(false)} />
                        </div>
                    )}
                </div>
            </div>
        </PageWithToolRail>
    );
};