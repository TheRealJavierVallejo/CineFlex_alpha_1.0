/*
 * 📝 COMPONENT: SCRIPT EDITOR
 * Professional Screenplay Editor (Scrite/Final Draft style)
 * Fully integrated with CineSketch 'Twin-Engine'
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, ScriptAtom, ScriptAtomType, ShowToastFn } from '../../types';
import { FileText, Save, Hash, Type, AlignLeft, AlignCenter, User, MessageSquare, MoreHorizontal } from 'lucide-react';
import { debounce } from '../../utils/debounce';

interface ScriptEditorProps {
    project: Project;
    onUpdateProject: (project: Project) => void;
    showToast: ShowToastFn;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ project, onUpdateProject, showToast }) => {
    // We maintain a local state for performance, then debounce sync to project
    const [atoms, setAtoms] = useState<ScriptAtom[]>([]);
    const [activeAtomId, setActiveAtomId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const atomRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

    // Initialize from project
    useEffect(() => {
        if (project.script) {
            // Sort by sequence just in case
            const sorted = [...project.script.atoms].sort((a, b) => a.sequence - b.sequence);
            
            // If empty, create one default line
            if (sorted.length === 0) {
                const init: ScriptAtom = {
                    id: crypto.randomUUID(),
                    type: 'slugline',
                    text: 'INT. UNTITLED SCENE - DAY',
                    sceneId: 'START',
                    sequence: 0
                };
                sorted.push(init);
            }
            setAtoms(sorted);
        }
    }, [project.id]); // Only reset on project switch, not every update to avoid loop

    // --- SYNC ENGINE ---
    const syncToProject = (updatedAtoms: ScriptAtom[]) => {
        if (!project.script) return;
        
        // We create a new script document
        const updatedScript = {
            ...project.script,
            atoms: updatedAtoms,
            metadata: {
                ...project.script.metadata,
                lastSync: Date.now()
            }
        };

        onUpdateProject({
            ...project,
            script: updatedScript
        });
    };

    // Debounced version for typing
    const debouncedSync = useRef(debounce((newAtoms: ScriptAtom[]) => syncToProject(newAtoms), 1000)).current;

    // --- ACTIONS ---

    const updateAtomText = (id: string, text: string) => {
        const newAtoms = atoms.map(a => a.id === id ? { ...a, text } : a);
        setAtoms(newAtoms);
        debouncedSync(newAtoms);
    };

    const updateAtomType = (id: string, type: ScriptAtomType) => {
        const newAtoms = atoms.map(a => {
            if (a.id === id) {
                // If turning into Slugline, force uppercase
                const newText = type === 'slugline' ? a.text.toUpperCase() : a.text;
                return { ...a, type, text: newText };
            }
            return a;
        });
        setAtoms(newAtoms);
        syncToProject(newAtoms); // Immediate sync for type changes
        
        // Refocus to ensure cursor stays
        setTimeout(() => atomRefs.current[id]?.focus(), 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number, atom: ScriptAtom) => {
        // ENTER: Create new block
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            let nextType: ScriptAtomType = 'action';
            
            // Smart Type Logic
            if (atom.type === 'slugline') nextType = 'action';
            else if (atom.type === 'character') nextType = 'dialogue';
            else if (atom.type === 'dialogue') nextType = 'character'; // Fast dialogue switching
            else if (atom.type === 'parenthetical') nextType = 'dialogue';
            else if (atom.type === 'transition') nextType = 'slugline';
            else if (atom.type === 'action') nextType = 'action';

            const newAtom: ScriptAtom = {
                id: crypto.randomUUID(),
                type: nextType,
                text: '',
                sceneId: atom.sceneId, // inherit scope
                sequence: atom.sequence + 1 // We'll re-index anyway
            };

            const newAtoms = [...atoms];
            newAtoms.splice(index + 1, 0, newAtom);
            
            // Re-sequence
            newAtoms.forEach((a, i) => a.sequence = i);
            
            setAtoms(newAtoms);
            syncToProject(newAtoms);
            
            // Focus new atom
            setTimeout(() => atomRefs.current[newAtom.id]?.focus(), 10);
        }

        // BACKSPACE: Merge with previous if empty
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
            const nextType = types[(currentIndex + 1) % types.length];
            updateAtomType(atom.id, nextType);
        }

        // UP ARROW
        if (e.key === 'ArrowUp') {
            const cursorStart = (e.target as HTMLTextAreaElement).selectionStart;
            // Only move if at top/start or explicitly navigating
            if (cursorStart === 0 && index > 0) {
                e.preventDefault();
                atomRefs.current[atoms[index - 1].id]?.focus();
            }
        }

        // DOWN ARROW
        if (e.key === 'ArrowDown') {
            const cursorEnd = (e.target as HTMLTextAreaElement).selectionEnd;
            const len = (e.target as HTMLTextAreaElement).value.length;
            if (cursorEnd === len && index < atoms.length - 1) {
                e.preventDefault();
                atomRefs.current[atoms[index + 1].id]?.focus();
            }
        }
    };

    // Auto-resize textarea
    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    // --- RENDERERS ---

    // Define styles for each script element type
    const getTypeStyles = (type: ScriptAtomType) => {
        const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-screenplay leading-relaxed transition-colors";
        
        switch (type) {
            case 'slugline':
                return `${base} font-bold text-accent uppercase mt-6 mb-2 tracking-widest`;
            case 'action':
                return `${base} text-text-primary mb-2`;
            case 'character':
                return `${base} text-text-primary uppercase text-center w-[60%] mx-auto mt-4 mb-0 tracking-wide font-semibold`;
            case 'dialogue':
                return `${base} text-text-primary text-center w-[70%] mx-auto mb-2`;
            case 'parenthetical':
                return `${base} text-text-secondary text-center w-[50%] mx-auto italic mb-0`;
            case 'transition':
                return `${base} text-text-primary uppercase text-right mt-4 mb-4`;
            default:
                return `${base} text-text-primary mb-2`;
        }
    };

    return (
        <div className="flex h-full bg-[#18181B] text-[#CCCCCC] overflow-hidden">
            
            {/* 1. SCENE NAVIGATOR (Left Panel) */}
            <div className="w-64 bg-[#1E1E1E] border-r border-[#333] flex flex-col shrink-0">
                <div className="h-9 border-b border-[#333] flex items-center px-4 text-xs font-bold text-[#969696] uppercase tracking-wider bg-[#252526]">
                    SCENE NAVIGATOR
                </div>
                <div className="flex-1 overflow-y-auto">
                    {atoms.filter(a => a.type === 'slugline').map((slug, i) => (
                        <button
                            key={slug.id}
                            onClick={() => {
                                atomRefs.current[slug.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                atomRefs.current[slug.id]?.focus();
                            }}
                            className="w-full text-left px-4 py-3 text-xs border-b border-[#252526] hover:bg-[#2A2D2E] hover:text-white transition-colors truncate"
                        >
                            <span className="font-mono text-accent mr-2">{i+1}.</span>
                            {slug.text || "UNTITLED SCENE"}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. MAIN EDITOR SURFACE (Center) */}
            <div className="flex-1 flex flex-col relative bg-[#121212]">
                
                {/* Formatting Toolbar */}
                <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center justify-center gap-1 shrink-0 z-10 shadow-md">
                    <ElementTypeButton 
                        active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'slugline' : false}
                        onClick={() => activeAtomId && updateAtomType(activeAtomId, 'slugline')}
                        label="Heading"
                        shortcut="CMD+1"
                    />
                    <ElementTypeButton 
                        active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'action' : false}
                        onClick={() => activeAtomId && updateAtomType(activeAtomId, 'action')}
                        label="Action"
                        shortcut="CMD+2"
                    />
                    <ElementTypeButton 
                        active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'character' : false}
                        onClick={() => activeAtomId && updateAtomType(activeAtomId, 'character')}
                        label="Character"
                        shortcut="CMD+3"
                    />
                    <ElementTypeButton 
                        active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'parenthetical' : false}
                        onClick={() => activeAtomId && updateAtomType(activeAtomId, 'parenthetical')}
                        label="Paren"
                        shortcut="CMD+4"
                    />
                    <ElementTypeButton 
                        active={activeAtomId ? atoms.find(a => a.id === activeAtomId)?.type === 'dialogue' : false}
                        onClick={() => activeAtomId && updateAtomType(activeAtomId, 'dialogue')}
                        label="Dialogue"
                        shortcut="CMD+5"
                    />
                    <div className="w-[1px] h-4 bg-[#3E3E42] mx-2" />
                    <div className="text-[10px] text-[#707070]">
                        {atoms.length} Lines • {atoms.filter(a => a.type === 'slugline').length} Scenes
                    </div>
                </div>

                {/* The "Page" Container */}
                <div className="flex-1 overflow-y-auto p-8" onClick={() => {
                    // Clicking empty space focuses last line
                    if (atoms.length > 0) atomRefs.current[atoms[atoms.length-1].id]?.focus();
                }}>
                    <div className="max-w-[850px] mx-auto min-h-[1100px] bg-[#1E1E1E] shadow-2xl border border-[#333] p-[50px] relative">
                        {atoms.map((atom, index) => (
                            <div key={atom.id} className="relative group/line">
                                {/* Gutter / Line Number (Optional, usually hidden in clean mode) */}
                                <div className="absolute -left-12 top-0 text-[10px] text-[#333] font-mono w-8 text-right opacity-0 group-hover/line:opacity-100 select-none pt-1">
                                    {index + 1}
                                </div>
                                
                                <textarea
                                    ref={el => {
                                        atomRefs.current[atom.id] = el;
                                        if (el) adjustHeight(el);
                                    }}
                                    value={atom.text}
                                    onChange={(e) => {
                                        adjustHeight(e.target);
                                        updateAtomText(atom.id, e.target.value);
                                        if (atom.type === 'slugline') e.target.value = e.target.value.toUpperCase();
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, index, atom)}
                                    onFocus={() => setActiveAtomId(atom.id)}
                                    className={getTypeStyles(atom.type)}
                                    placeholder={atom.type === 'slugline' ? 'INT. SCENE - DAY' : ''}
                                    rows={1}
                                    spellCheck={false}
                                />
                            </div>
                        ))}
                        
                        {/* Page Padding Bottom */}
                        <div className="h-32" />
                    </div>
                </div>

            </div>

            {/* 3. RIGHT PANEL (Stats/Metadata - Placeholder for now) */}
            {/* Can be collapsed or show Character info */}
        </div>
    );
};

// Helper Component for Toolbar
const ElementTypeButton = ({ active, onClick, label, shortcut }: any) => (
    <button
        onClick={onClick}
        className={`
            px-3 py-1 text-[11px] font-medium rounded-sm transition-colors flex flex-col items-center gap-0.5 min-w-[60px]
            ${active ? 'bg-[#007ACC] text-white' : 'text-[#CCCCCC] hover:bg-[#3E3E42]'}
        `}
    >
        <span>{label}</span>
        {/* <span className="text-[9px] opacity-50">{shortcut}</span> */}
    </button>
);