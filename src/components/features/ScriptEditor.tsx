/*
 * 📝 COMPONENT: SCRIPT EDITOR (Pro Edition)
 * Inspired by Scrite/Final Draft
 * 
 * Features:
 * - 3-Pane Layout (Structure | Editor | Notes)
 * - Strict Screenplay Formatting (Margins/Widths)
 * - Smart Typing (Enter/Tab logic)
 * - Sync with Visual Engine
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, ScriptAtom, ScriptAtomType, ShowToastFn, Scene } from '../../types';
import { FileText, Save, Hash, Type, AlignLeft, AlignCenter, User, MessageSquare, MoreHorizontal, Layout, StickyNote, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { debounce } from '../../utils/debounce';
import Button from '../ui/Button';

interface ScriptEditorProps {
    project: Project;
    onUpdateProject: (project: Project) => void;
    showToast: ShowToastFn;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ project, onUpdateProject, showToast }) => {
    // --- STATE ---
    const [atoms, setAtoms] = useState<ScriptAtom[]>([]);
    const [activeAtomId, setActiveAtomId] = useState<string | null>(null);
    const [showStructure, setShowStructure] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    
    // Derived state for the active scene (based on cursor position)
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

    // Refs
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const atomRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
    
    // --- INITIALIZATION ---
    useEffect(() => {
        if (project.script) {
            const sorted = [...project.script.atoms].sort((a, b) => a.sequence - b.sequence);
            if (sorted.length === 0) {
                // Seed with initial slugline
                sorted.push({
                    id: crypto.randomUUID(),
                    type: 'slugline',
                    text: 'INT. UNTITLED SCENE - DAY',
                    sceneId: 'START',
                    sequence: 0
                });
            }
            setAtoms(sorted);
        }
    }, [project.id]);

    // --- SYNC ENGINE ---
    const syncToProject = (updatedAtoms: ScriptAtom[]) => {
        if (!project.script) return;
        const updatedScript = {
            ...project.script,
            atoms: updatedAtoms,
            metadata: { ...project.script.metadata, lastSync: Date.now() }
        };
        onUpdateProject({ ...project, script: updatedScript });
    };

    const debouncedSync = useRef(debounce((newAtoms: ScriptAtom[]) => syncToProject(newAtoms), 2000)).current;

    // --- HELPERS ---
    
    // Determine which scene holds the active atom
    useEffect(() => {
        if (!activeAtomId) return;
        const atom = atoms.find(a => a.id === activeAtomId);
        if (atom) {
            setActiveSceneId(atom.sceneId || null);
        }
    }, [activeAtomId, atoms]);

    const getSceneForAtom = (atomId: string) => {
        const atom = atoms.find(a => a.id === atomId);
        return atom?.sceneId;
    };

    // Auto-resize textarea
    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    // --- ACTIONS ---

    const updateAtomText = (id: string, text: string) => {
        const newAtoms = atoms.map(a => a.id === id ? { ...a, text } : a);
        setAtoms(newAtoms);
        debouncedSync(newAtoms);
    };

    const updateAtomType = (id: string, type: ScriptAtomType) => {
        const newAtoms = atoms.map(a => {
            if (a.id === id) {
                const newText = type === 'slugline' ? a.text.toUpperCase() : a.text;
                // If becoming a slugline, it starts a new scope. 
                // In a full implementation, we'd update sceneIds of following atoms, 
                // but for now we rely on the parser to fix structure on sync.
                return { ...a, type, text: newText };
            }
            return a;
        });
        setAtoms(newAtoms);
        syncToProject(newAtoms); // Immediate sync for structure changes
        setTimeout(() => atomRefs.current[id]?.focus(), 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number, atom: ScriptAtom) => {
        // ENTER: New Block
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            // Smart Type Logic
            let nextType: ScriptAtomType = 'action';
            if (atom.type === 'slugline') nextType = 'action';
            else if (atom.type === 'character') nextType = 'dialogue';
            else if (atom.type === 'dialogue') nextType = 'character'; // Fast toggle
            else if (atom.type === 'parenthetical') nextType = 'dialogue';
            else if (atom.type === 'transition') nextType = 'slugline';

            // Detect INT./EXT. for auto-slugline
            const currentLine = atom.text.toUpperCase();
            if (atom.type === 'action' && (currentLine.startsWith('INT.') || currentLine.startsWith('EXT.'))) {
               // User typed a slugline in an action block, convert previous block
               // This is a common screenplay editor feature, implemented simply here:
               // Actually, usually happens *after* typing. 
               // For now, let's keep it simple.
            }

            const newAtom: ScriptAtom = {
                id: crypto.randomUUID(),
                type: nextType,
                text: '',
                sceneId: atom.type === 'slugline' ? atom.id : atom.sceneId, // If prev was slug, it starts new scene
                sequence: atom.sequence + 1
            };

            const newAtoms = [...atoms];
            newAtoms.splice(index + 1, 0, newAtom);
            newAtoms.forEach((a, i) => a.sequence = i); // Re-index
            
            setAtoms(newAtoms);
            syncToProject(newAtoms);
            
            // Focus next
            setTimeout(() => atomRefs.current[newAtom.id]?.focus(), 10);
        }

        // BACKSPACE: Merge/Delete
        if (e.key === 'Backspace' && atom.text === '' && index > 0) {
            e.preventDefault();
            const prevAtom = atoms[index - 1];
            const newAtoms = atoms.filter(a => a.id !== atom.id);
            setAtoms(newAtoms);
            syncToProject(newAtoms);
            setTimeout(() => {
                const el = atomRefs.current[prevAtom.id];
                if (el) {
                    el.focus();
                    el.setSelectionRange(el.value.length, el.value.length);
                }
            }, 10);
        }

        // TAB: Cycle Types
        if (e.key === 'Tab') {
            e.preventDefault();
            const types: ScriptAtomType[] = ['slugline', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
            const currentIndex = types.indexOf(atom.type);
            const nextType = types[e.shiftKey ? (currentIndex - 1 + types.length) % types.length : (currentIndex + 1) % types.length];
            updateAtomType(atom.id, nextType);
        }

        // ARROWS: Navigation
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            const el = e.target as HTMLTextAreaElement;
            const cursor = el.selectionStart;
            if (e.key === 'ArrowUp' && cursor === 0 && index > 0) {
                e.preventDefault();
                atomRefs.current[atoms[index-1].id]?.focus();
            }
            if (e.key === 'ArrowDown' && cursor === el.value.length && index < atoms.length - 1) {
                e.preventDefault();
                atomRefs.current[atoms[index+1].id]?.focus();
            }
        }
    };

    // --- STYLES ---

    // Accurate Screenplay Margins (Standard US Letter approximation)
    const getAtomClasses = (type: ScriptAtomType) => {
        const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-screenplay text-[15px] leading-relaxed transition-colors selection:bg-accent/30 selection:text-white";
        
        // CSS Grid/Margin simulation of standard script formats
        // Action: Full width (approx 6 inches)
        // Dialogue: Centered strip (approx 3.5 inches)
        // Character: Offset center (approx 4 inches from left)
        
        switch (type) {
            case 'slugline':
                return `${base} font-bold text-accent uppercase mt-6 mb-2 pt-2 tracking-widest`; // Extra top margin
            case 'action':
                return `${base} text-text-primary mb-2 text-left`;
            case 'character':
                // Character name is roughly 2.0-2.2 inches from left margin. 
                // We use a large left padding/margin to simulate this indentation.
                return `${base} text-text-primary uppercase mt-4 mb-0 font-bold w-[60%] ml-[22%] tracking-wider`;
            case 'dialogue':
                // Dialogue is roughly 1.0-1.5 inches from left, ending 1.0 inch from right.
                // It sits narrower than action.
                return `${base} text-text-primary mb-2 w-[70%] ml-[15%]`;
            case 'parenthetical':
                // Parentheticals are indented further, inside dialogue block.
                return `${base} text-text-secondary italic mb-0 w-[50%] ml-[25%]`;
            case 'transition':
                return `${base} text-text-primary uppercase text-right mt-4 mb-4`;
            default:
                return `${base} text-text-primary mb-2`;
        }
    };

    // Get Active Scene info
    const activeVisualScene = project.scenes.find(s => {
        // Find by matching slugline ID
        const atom = atoms.find(a => a.id === activeSceneId && a.type === 'slugline');
        // This logic is simplified; in a real app we'd map robustly.
        return s.scriptSceneId === activeSceneId;
    });

    return (
        <div className="flex h-full bg-[#18181B] text-[#CCCCCC] overflow-hidden">
            
            {/* 1. LEFT: STRUCTURE VIEW (Scrite "Structure" Pane) */}
            {showStructure && (
                <div className="w-[280px] bg-[#1E1E1E] border-r border-[#333] flex flex-col shrink-0 animate-in slide-in-from-left-4 duration-200">
                    <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
                        <span className="text-xs font-bold text-[#969696] uppercase tracking-wider">Structure</span>
                        <Button variant="ghost" size="sm" onClick={() => setShowStructure(false)}><ChevronLeft className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {atoms.filter(a => a.type === 'slugline').map((slug, i) => {
                            const isActive = slug.id === activeSceneId;
                            return (
                                <button
                                    key={slug.id}
                                    onClick={() => {
                                        atomRefs.current[slug.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setActiveSceneId(slug.id); // Manually set active for highlight
                                    }}
                                    className={`
                                        w-full text-left px-4 py-3 border-b border-[#252526] transition-all group
                                        ${isActive ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-[#2A2D2E] border-l-4 border-l-transparent'}
                                    `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`text-[10px] font-mono px-1.5 rounded ${isActive ? 'bg-accent text-white' : 'bg-[#333] text-[#969696]'}`}>
                                            {i + 1}
                                        </div>
                                        <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-[#CCCCCC]'}`}>
                                            {slug.text || "UNTITLED SCENE"}
                                        </div>
                                    </div>
                                    {/* Synopsis Placeholder - could be real data later */}
                                    <div className="text-[10px] text-[#707070] line-clamp-2 pl-7 group-hover:text-[#969696]">
                                        Click to jump to scene...
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 2. CENTER: SCRIPT PAGE */}
            <div className="flex-1 flex flex-col relative bg-[#121212] items-center">
                
                {/* Formatting Toolbar */}
                <div className="w-full h-10 bg-[#252526] border-b border-[#333] flex items-center justify-between px-4 shrink-0 z-10 shadow-md">
                    <div className="flex items-center gap-2">
                        {!showStructure && (
                             <Button variant="ghost" size="sm" onClick={() => setShowStructure(true)} icon={<Layout className="w-4 h-4" />}>Structure</Button>
                        )}
                    </div>
                    
                    <div className="flex bg-[#1E1E1E] rounded-md p-0.5 border border-[#333]">
                        <ElementTypeButton 
                            active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'slugline' : false}
                            onClick={() => activeAtomId && updateAtomType(activeAtomId, 'slugline')}
                            label="Heading"
                            shortcut="1"
                        />
                        <ElementTypeButton 
                            active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'action' : false}
                            onClick={() => activeAtomId && updateAtomType(activeAtomId, 'action')}
                            label="Action"
                            shortcut="2"
                        />
                        <ElementTypeButton 
                            active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'character' : false}
                            onClick={() => activeAtomId && updateAtomType(activeAtomId, 'character')}
                            label="Character"
                            shortcut="3"
                        />
                        <ElementTypeButton 
                            active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'parenthetical' : false}
                            onClick={() => activeAtomId && updateAtomType(activeAtomId, 'parenthetical')}
                            label="Paren"
                            shortcut="4"
                        />
                        <ElementTypeButton 
                            active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'dialogue' : false}
                            onClick={() => activeAtomId && updateAtomType(activeAtomId, 'dialogue')}
                            label="Dialogue"
                            shortcut="5"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                         {!showNotes && (
                             <Button variant="ghost" size="sm" onClick={() => setShowNotes(true)} icon={<StickyNote className="w-4 h-4" />}>Notes</Button>
                        )}
                    </div>
                </div>

                {/* The "Page" Surface */}
                <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 flex justify-center" ref={editorContainerRef}>
                    {/* The Page Itself */}
                    <div className="w-full max-w-[850px] min-h-[1100px] bg-[#1E1E1E] shadow-2xl border border-[#333] relative">
                        {/* Page Content Padding (Standard ~1 inch margins) */}
                        <div className="px-[60px] py-[50px]">
                            {atoms.map((atom, index) => (
                                <div key={atom.id} className="relative group/line min-h-[1.5em]">
                                    {/* Line Number Gutter */}
                                    <div className="absolute -left-10 top-0 text-[9px] text-[#444] font-mono w-6 text-right opacity-0 group-hover/line:opacity-100 select-none pt-1">
                                        {index + 1}
                                    </div>
                                    
                                    <textarea
                                        ref={el => {
                                            atomRefs.current[atom.id] = el;
                                            if (el) adjustHeight(el); // Ensure height correct on mount
                                        }}
                                        value={atom.text}
                                        onChange={(e) => {
                                            adjustHeight(e.target);
                                            updateAtomText(atom.id, e.target.value);
                                            if (atom.type === 'slugline') e.target.value = e.target.value.toUpperCase();
                                        }}
                                        onKeyDown={(e) => handleKeyDown(e, index, atom)}
                                        onFocus={() => {
                                            setActiveAtomId(atom.id);
                                            if (atom.type === 'slugline') setActiveSceneId(atom.id);
                                        }}
                                        className={getAtomClasses(atom.type)}
                                        placeholder={atom.type === 'slugline' ? 'INT. SCENE - DAY' : ''}
                                        rows={1}
                                        spellCheck={false}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        {/* Bottom Padding */}
                        <div className="h-32" />
                    </div>
                </div>
            </div>

            {/* 3. RIGHT: NOTES & PROPERTIES (Scrite "Notebook" Pane) */}
            {showNotes && (
                <div className="w-[300px] bg-[#1E1E1E] border-l border-[#333] flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
                    <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
                        <span className="text-xs font-bold text-[#969696] uppercase tracking-wider">Notebook</span>
                        <Button variant="ghost" size="sm" onClick={() => setShowNotes(false)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                    
                    <div className="p-4 space-y-6 overflow-y-auto">
                        
                        {/* Context Info */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Active Scene
                            </h3>
                            <div className="p-3 bg-[#252526] rounded border border-[#333]">
                                <div className="text-xs font-bold text-accent mb-1">
                                    {atoms.find(a => a.id === activeSceneId)?.text || "No Scene Selected"}
                                </div>
                                <div className="text-[10px] text-[#707070]">
                                    {activeVisualScene?.id ? (
                                        <span className="text-success flex items-center gap-1">● Linked to Visual Timeline</span>
                                    ) : (
                                        <span className="text-warning flex items-center gap-1">○ Not yet synced</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Scene Synopsis */}
                        <div className="space-y-2">
                             <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <StickyNote className="w-3 h-3" /> Synopsis
                            </h3>
                            <textarea 
                                className="w-full h-32 bg-[#121212] border border-[#333] rounded p-2 text-xs text-[#CCCCCC] outline-none focus:border-accent resize-none placeholder-[#444]"
                                placeholder="Write a summary of this scene..."
                            />
                        </div>

                        {/* Characters in Scene */}
                        <div className="space-y-2">
                             <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <User className="w-3 h-3" /> Characters
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {/* This would be dynamic in a full implementation */}
                                <div className="text-[10px] bg-[#333] text-[#CCC] px-2 py-1 rounded">DETECTING...</div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

// Toolbar Helper
const ElementTypeButton = ({ active, onClick, label, shortcut }: any) => (
    <button
        onClick={onClick}
        className={`
            px-3 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 rounded-sm
            ${active ? 'bg-accent text-white shadow-sm' : 'text-[#969696] hover:bg-[#333] hover:text-[#E8E8E8]'}
        `}
        title={`Shortcut: Tab or Ctrl+${shortcut}`}
    >
        {label}
        {/* <span className="opacity-50 text-[9px] font-mono">{shortcut}</span> */}
    </button>
);