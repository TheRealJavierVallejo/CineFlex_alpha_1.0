import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Sparkles, FileText } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import {
    getStoryNotes,
    saveStoryNotes,
    createStoryNote,
    updateStoryNote,
    deleteStoryNote
} from '../../services/storage';
import { StoryNote, StoryNotesData } from '../../types';
import { SydPopoutPanel } from './SydPopoutPanel';
import { selectContextForAgent, SydContext } from '../../services/sydContext';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { useSubscription } from '../../context/SubscriptionContext';

export const StoryNotesEditor: React.FC = () => {
    const { project, showToast } = useWorkspace();
    const { tier } = useSubscription();
    const { generateMicroAgent } = useLocalLlm();

    const [notesData, setNotesData] = useState<StoryNotesData>({ notes: [], activeNoteId: null });
    const [activeNote, setActiveNote] = useState<StoryNote | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // SYD Agent State
    const [activeSydField, setActiveSydField] = useState<string | null>(null);
    const [sydContext, setSydContext] = useState<SydContext | null>(null);
    const [sydAnchor, setSydAnchor] = useState<HTMLElement | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Load notes on mount
    useEffect(() => {
        loadNotes();
    }, [project.id]);

    // Load active note when activeNoteId changes
    useEffect(() => {
        if (notesData.activeNoteId) {
            const note = notesData.notes.find(n => n.id === notesData.activeNoteId);
            setActiveNote(note || null);
        } else if (notesData.notes.length > 0) {
            // Auto-select first note if none active
            setActiveNote(notesData.notes[0]);
            setNotesData(prev => ({ ...prev, activeNoteId: notesData.notes[0].id }));
        } else {
            setActiveNote(null);
        }
    }, [notesData.activeNoteId, notesData.notes]);

    const loadNotes = async () => {
        const data = await getStoryNotes(project.id);
        setNotesData(data);

        // If no notes exist, create first blank note
        if (data.notes.length === 0) {
            await handleCreateNote();
        }
    };

    const handleCreateNote = async () => {
        const newNote = await createStoryNote(project.id);
        await loadNotes();
        showToast('New note created', 'success');
        // Auto-focus title field
        setTimeout(() => titleInputRef.current?.focus(), 100);
    };

    const handleSelectNote = async (noteId: string) => {
        setNotesData(prev => ({ ...prev, activeNoteId: noteId }));
        const note = notesData.notes.find(n => n.id === noteId);
        setActiveNote(note || null);
    };

    const handleUpdateTitle = async (title: string) => {
        if (!activeNote) return;
        setActiveNote({ ...activeNote, title });
        await updateStoryNote(project.id, activeNote.id, { title });
    };

    const handleUpdateContent = async (content: string) => {
        if (!activeNote) return;
        setActiveNote({ ...activeNote, content });

        // Debounced save
        if (window._contentSaveTimer) clearTimeout(window._contentSaveTimer);
        window._contentSaveTimer = setTimeout(async () => {
            await updateStoryNote(project.id, activeNote.id, { content });
        }, 500);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (notesData.notes.length === 1) {
            showToast('Cannot delete the last note', 'error');
            return;
        }

        await deleteStoryNote(project.id, noteId);
        await loadNotes();
        showToast('Note deleted', 'success');
    };

    // SYD Integration
    const handleRequestSyd = async (fieldId: string, anchorEl: HTMLElement) => {
        if (activeSydField === fieldId) {
            handleCloseSyd();
            return;
        }

        if (!activeNote) return;

        // Build context for SYD with current note content
        const context = selectContextForAgent(
            'story_notes' as any, // New agent type
            {}, // Plot data (if needed)
            undefined, // Character
            [], // Beats
            { lastUpdated: Date.now() } // Metadata
        );

        // Inject current note into context
        context.contextFields = {
            ...context.contextFields,
            currentNoteTitle: activeNote.title,
            currentNoteContent: activeNote.content,
            allNoteTitles: notesData.notes.map(n => n.title).join(', ')
        };

        setSydContext(context);
        setSydAnchor(anchorEl);
        setActiveSydField(fieldId);
    };

    const handleCloseSyd = () => {
        setActiveSydField(null);
        setSydContext(null);
        setSydAnchor(null);
    };

    const handleSydMessage = async (message: string, messageHistory?: Array<{ role: string, content: string }>): Promise<string> => {
        if (!sydContext) return '';

        const raw = await generateMicroAgent(
            sydContext.systemPrompt,
            { ...sydContext.contextFields, userMessage: message },
            sydContext.maxOutputTokens,
            messageHistory
        );

        return raw;
    };

    if (!project) {
        return <div className="p-8 text-text-secondary">No project loaded</div>;
    }

    return (
        <>
            <div className="h-full flex bg-background w-full">
                {/* LEFT SIDEBAR - Notes List */}
                <div className="w-64 bg-surface-secondary border-r border-border flex flex-col shrink-0">
                    {/* Header */}
                    <div className="h-12 border-b border-border flex items-center justify-between px-4">
                        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Story Notes</h2>
                        <button
                            onClick={handleCreateNote}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface rounded transition-colors"
                            title="New Note"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Notes List */}
                    <div className="flex-1 overflow-y-auto">
                        {notesData.notes.map(note => (
                            <div
                                key={note.id}
                                onClick={() => handleSelectNote(note.id)}
                                className={`
                                    px-4 py-3 border-b border-border cursor-pointer transition-colors
                                    ${activeNote?.id === note.id
                                        ? 'bg-surface border-l-2 border-l-primary'
                                        : 'hover:bg-surface/50'
                                    }
                                `}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-text-primary truncate">
                                            {note.title || 'Untitled Note'}
                                        </h3>
                                        <p className="text-xs text-text-muted mt-1 line-clamp-2">
                                            {note.content || 'Empty note...'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteNote(note.id);
                                        }}
                                        className="p-1 text-text-muted hover:text-red-500 transition-colors shrink-0"
                                        title="Delete Note"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT - Editor */}
                <div ref={scrollContainerRef} className="flex-1 flex flex-col overflow-hidden relative">
                    {activeNote ? (
                        <>
                            {/* Title Bar */}
                            <div className="h-16 border-b border-border px-8 flex items-center gap-4 bg-background/95 backdrop-blur shrink-0">
                                <FileText className="w-5 h-5 text-text-muted" />
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={activeNote.title}
                                    onChange={(e) => handleUpdateTitle(e.target.value)}
                                    placeholder="Note Title..."
                                    className="flex-1 text-xl font-bold text-text-primary bg-transparent border-none outline-none placeholder:text-text-muted"
                                />
                                <button
                                    onClick={(e) => handleRequestSyd('note-content', e.currentTarget)}
                                    className={`
                                        p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium
                                        ${activeSydField === 'note-content'
                                            ? 'bg-primary text-white'
                                            : 'bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary/50'
                                        }
                                    `}
                                    title="Ask SYD for help"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Ask SYD</span>
                                </button>
                            </div>

                            {/* Content Editor */}
                            <div className="flex-1 overflow-y-auto p-8">
                                <textarea
                                    ref={contentTextareaRef}
                                    value={activeNote.content}
                                    onChange={(e) => handleUpdateContent(e.target.value)}
                                    placeholder="Start writing your notes here..."
                                    className="w-full h-full min-h-[600px] bg-transparent text-text-primary text-base leading-relaxed resize-none border-none outline-none placeholder:text-text-muted font-mono"
                                    style={{
                                        fontFamily: 'ui-monospace, monospace',
                                        lineHeight: '1.6'
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-text-secondary">
                            <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="text-sm">No notes yet</p>
                                <button
                                    onClick={handleCreateNote}
                                    className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold uppercase tracking-wide hover:bg-primary-hover transition-colors"
                                >
                                    Create First Note
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SYD Popout Panel */}
            <SydPopoutPanel
                isOpen={!!activeSydField}
                context={sydContext}
                anchorElement={sydAnchor}
                scrollContainer={scrollContainerRef.current}
                onClose={handleCloseSyd}
                onSendMessage={handleSydMessage}
            />
        </>
    );
};

// Add to window for debounce timer
declare global {
    interface Window {
        _contentSaveTimer?: NodeJS.Timeout;
    }
}
