import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { SlateScriptEditor } from './script-editor/SlateScriptEditor';
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
import { calculatePagination } from '../../services/pagination';
import { learnFromScript } from '../../services/smartType';

export const ScriptPage: React.FC = () => {
    const { project, updateScriptElements, importScript } = useWorkspace();

    // History & State
    const {
        state: elements,
        set: setElements,
        // undo, redo, canUndo, canRedo - Temporarily unused with Slate integration
    } = useHistory<ScriptElement[]>(project.scriptElements || []);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isImporting, setIsImporting] = useState(false);

    // Pagination State
    const [pageMap, setPageMap] = useState<Record<string, number>>({});

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
    useEffect(() => {
        // If project.scriptElements has changed externally (e.g., loaded from storage, imported script)
        // and it's different from the current history state's present, update the history state.
        // We use JSON.stringify for a deep comparison to avoid unnecessary updates if content is the same.
        if (JSON.stringify(project.scriptElements) !== JSON.stringify(elements)) {
            setElements(project.scriptElements || []);
        }

        // Always learn from the latest project.scriptElements when it changes
        if (project.scriptElements && project.scriptElements.length > 0) {
            learnFromScript(project.id, project.scriptElements);
        }
    }, [project.scriptElements, project.id, setElements, elements]);

    // Recalculate Pagination
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

    const currentPageNum = 1; // TODO: Slate selection-based page tracking

    const totalPages = Object.keys(pages).length || 1;

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

    const pageStyle = useMemo(() => {
        if (isPaperWhite) {
            return "bg-white border-border shadow-xl text-black";
        }
        return "bg-[#1E1E1E] border border-[#333] shadow-2xl text-[#E0E0E0]";
    }, [isPaperWhite]);

    // DEFINING TOOLS
    const tools: Tool[] = [
        {
            id: 'copilot',
            label: 'SYD',
            icon: <Sparkles className="w-5 h-5" />,
            content: <ScriptChat isOpen={true} onClose={() => { }} />,
            noScroll: true // ScriptChat handles its own scrolling
        },
        {
            id: 'story',
            label: 'Story',
            icon: <BookOpen className="w-5 h-5" />,
            content: <StoryPanel />,
            width: '600px', // Wider panel for comfortable writing
            noScroll: true // StoryPanel handles its own scrolling
        },
        {
            id: 'smarttype',
            label: 'SmartType',
            icon: <Wand2 className="w-5 h-5" />,
            content: <SmartTypeManager projectId={project.id} onClose={() => { }} />,
            noScroll: true
        }
    ];

    return (
        <PageWithToolRail tools={tools} defaultTool={null}>
            <div className="relative h-full flex flex-col overflow-hidden font-sans bg-app transition-colors duration-300">

                <ScriptPageToolbar
                    canUndo={false}
                    canRedo={false}
                    onUndo={() => {}}
                    onRedo={() => {}}
                    isPaperWhite={isPaperWhite}
                    onTogglePaper={() => setLocalPaperWhite(!localPaperWhite)}
                    onExport={() => exportToPDF(project)}
                    saveStatus={saveStatus}
                    currentPage={currentPageNum}
                    totalPages={totalPages}
                />

                <div className="flex-1 overflow-y-auto w-full flex flex-col items-center pb-[50vh]">
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
                                        style={{
                                            contentVisibility: 'auto',
                                            containIntrinsicSize: '11in 11in'
                                        }}
                                    >
                                        <div className={`absolute top-[0.5in] right-[1.0in] text-[12pt] font-screenplay select-none ${isPaperWhite ? 'text-black opacity-50' : 'text-zinc-500'}`}>
                                            {pageNum}.
                                        </div>

                                        <SlateScriptEditor
                                            initialElements={pageElements}
                                            onChange={(updatedPageElements) => {
                                                setElements(prevElements => {
                                                    const allOtherPages = prevElements.filter(el => pageMap[el.id] !== pageNum);
                                                    const merged = [...allOtherPages, ...updatedPageElements].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
                                                    debouncedSync(merged);
                                                    return merged;
                                                });
                                            }}
                                            isLightMode={isPaperWhite}
                                            projectId={project.id}
                                        />
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