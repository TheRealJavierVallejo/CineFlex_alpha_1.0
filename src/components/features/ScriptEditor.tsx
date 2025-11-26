/*
 * 📝 COMPONENT: SCRIPT EDITOR
 * Professional Screenplay Editor (Scrite/Final Draft style)
 * Fully integrated with CineSketch 'Twin-Engine'
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ScriptAtom, ScriptAtomType, ShowToastFn, Character } from '../../types';
import { getCharacters } from '../../services/storage';
import { FileText, Save, Hash, Type, AlignLeft, AlignCenter, User, MessageSquare, MoreHorizontal, Layout, StickyNote, ChevronRight, ChevronLeft, MapPin, PlusCircle, Check } from 'lucide-react';
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
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
    
    // Project Data
    const [projectCharacters, setProjectCharacters] = useState<Character[]>([]);

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
                    sequence: 0,
                    metadata: {}
                });
            }
            setAtoms(sorted);
        }
        
        // Load cast for sidebar suggestions
        getCharacters(project.id).then(setProjectCharacters);

    }, [project.id]);

    // --- COMPUTED DATA ---
    const activeSceneSlugline = useMemo(() => {
        return atoms.find(a => a.id === activeSceneId && a.type === 'slugline');
    }, [atoms, activeSceneId]);

    const activeVisualScene = useMemo(() => {
        return project.scenes.find(s => s.scriptSceneId === activeSceneId);
    }, [project.scenes, activeSceneId]);

    const charactersInScene = useMemo(() => {
        if (!activeSceneId) return [];
        // Filter atoms belonging to this scene
        const sceneAtoms = atoms.filter(a => a.sceneId === activeSceneId && a.type === 'character');
        const names = new Set(sceneAtoms.map(a => a.text.trim().toUpperCase()));
        return Array.from(names).filter(n => n.length > 0);
    }, [atoms, activeSceneId]);

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

    const debouncedSync = useRef(debounce((newAtoms: ScriptAtom[]) => syncToProject(newAtoms), 1000)).current;

    // --- ACTIONS ---

    const updateAtomText = (id: string, text: string) => {
        const newAtoms = atoms.map(a => a.id === id ? { ...a, text } : a);
        setAtoms(newAtoms);
        debouncedSync(newAtoms);
    };

    const updateAtomMetadata = (id: string, key: string, value: any) => {
        const newAtoms = atoms.map(a => {
            if (a.id === id) {
                return { 
                    ...a, 
                    metadata: { ...a.metadata, [key]: value } 
                };
            }
            return a;
        });
        setAtoms(newAtoms);
        debouncedSync(newAtoms);
    };

    const updateAtomType = (id: string, type: ScriptAtomType) => {
        const newAtoms = atoms.map(a => {
            if (a.id === id) {
                const newText = type === 'slugline' ? a.text.toUpperCase() : a.text;
                return { ...a, type, text: newText };
            }
            return a;
        });
        setAtoms(newAtoms);
        syncToProject(newAtoms); 
        setTimeout(() => atomRefs.current[id]?.focus(), 10);
    };

    // Insert a new Character block at current position
    const insertCharacter = (name: string) => {
        if (!activeAtomId) return;
        
        const index = atoms.findIndex(a => a.id === activeAtomId);
        if (index === -1) return;

        const currentAtom = atoms[index];
        
        // Logic: Insert after current, or replace if current is empty and generic
        const charAtom: ScriptAtom = {
            id: crypto.randomUUID(),
            type: 'character',
            text: name.toUpperCase(),
            sceneId: currentAtom.sceneId,
            sequence: currentAtom.sequence + 1,
            metadata: {}
        };
        
        // Also add a dialogue block after
        const dialAtom: ScriptAtom = {
            id: crypto.randomUUID(),
            type: 'dialogue',
            text: '',
            sceneId: currentAtom.sceneId,
            sequence: currentAtom.sequence + 2,
            metadata: {}
        };

        const newAtoms = [...atoms];
        newAtoms.splice(index + 1, 0, charAtom, dialAtom);
        newAtoms.forEach((a, i) => a.sequence = i);
        
        setAtoms(newAtoms);
        syncToProject(newAtoms);
        
        // Focus the dialogue block
        setTimeout(() => atomRefs.current[dialAtom.id]?.focus(), 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number, atom: ScriptAtom) => {
        // ENTER: New Block
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            // Smart Type Logic
            let nextType: ScriptAtomType = 'action';
            if (atom.type === 'slugline') nextType = 'action';
            else if (atom.type === 'character') nextType = 'dialogue';
            else if (atom.type === 'dialogue') nextType = 'character'; 
            else if (atom.type === 'parenthetical') nextType = 'dialogue';
            else if (atom.type === 'transition') nextType = 'slugline';

            const newAtom: ScriptAtom = {
                id: crypto.randomUUID(),
                type: nextType,
                text: '',
                sceneId: atom.type === 'slugline' ? atom.id : atom.sceneId,
                sequence: atom.sequence + 1,
                metadata: {}
            };

            const newAtoms = [...atoms];
            newAtoms.splice(index + 1, 0, newAtom);
            newAtoms.forEach((a, i) => a.sequence = i);
            
            setAtoms(newAtoms);
            syncToProject(newAtoms);
            
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
            
            // Special case: Dialogue -> Parenthetical
            if (atom.type === 'dialogue' && !e.shiftKey) {
                updateAtomType(atom.id, 'parenthetical');
                return;
            }

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

    // Auto-resize textarea
    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    // --- STYLES ---
    const getAtomClasses = (type: ScriptAtomType) => {
        const base = "w-full bg-transparent outline-none resize-none overflow-hidden font-screenplay text-[15px] leading-relaxed transition-colors selection:bg-accent/30 selection:text-white";
        switch (type) {
            case 'slugline': return `${base} font-bold text-accent uppercase mt-6 mb-2 pt-2 tracking-widest`;
            case 'action': return `${base} text-text-primary mb-2 text-left`;
            case 'character': return `${base} text-text-primary uppercase mt-4 mb-0 font-bold w-[60%] ml-[22%] tracking-wider`;
            case 'dialogue': return `${base} text-text-primary mb-2 w-[70%] ml-[15%]`;
            case 'parenthetical': return `${base} text-text-secondary italic mb-0 w-[50%] ml-[25%]`;
            case 'transition': return `${base} text-text-primary uppercase text-right mt-4 mb-4`;
            default: return `${base} text-text-primary mb-2`;
        }
    };

    return (
        <div className="flex h-full bg-[#18181B] text-[#CCCCCC] overflow-hidden">
            
            {/* 1. LEFT: STRUCTURE VIEW */}
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
                                        setActiveSceneId(slug.id); 
                                        setTimeout(() => atomRefs.current[slug.id]?.focus(), 100);
                                    }}
                                    className={`
                                        w-full text-left px-4 py-3 border-b border-[#252526] transition-all group flex flex-col gap-1
                                        ${isActive ? 'bg-accent/10 border-l-4 border-l-accent' : 'hover:bg-[#2A2D2E] border-l-4 border-l-transparent'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`text-[10px] font-mono px-1.5 rounded ${isActive ? 'bg-accent text-white' : 'bg-[#333] text-[#969696]'}`}>
                                            {i + 1}
                                        </div>
                                        <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-[#CCCCCC]'}`}>
                                            {slug.text || "UNTITLED SCENE"}
                                        </div>
                                    </div>
                                    {slug.metadata?.synopsis && (
                                        <div className="text-[10px] text-[#707070] line-clamp-2 pl-7 group-hover:text-[#969696] italic">
                                            {slug.metadata.synopsis}
                                        </div>
                                    )}
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
                             <Button variant="ghost" size="sm" onClick={() => setShowNotes(true)} icon={<StickyNote className="w-4 h-4" />}>Notebook</Button>
                        )}
                    </div>
                </div>

                {/* The "Page" Surface */}
                <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 flex justify-center" ref={editorContainerRef}>
                    <div className="w-full max-w-[850px] min-h-[1100px] bg-[#1E1E1E] shadow-2xl border border-[#333] relative">
                        <div className="px-[60px] py-[50px]">
                            {atoms.map((atom, index) => (
                                <div key={atom.id} className="relative group/line min-h-[1.5em]">
                                    <div className="absolute -left-10 top-0 text-[9px] text-[#444] font-mono w-6 text-right opacity-0 group-hover/line:opacity-100 select-none pt-1">
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
                                        onFocus={() => {
                                            setActiveAtomId(atom.id);
                                            if (atom.type === 'slugline') setActiveSceneId(atom.id);
                                            else setActiveSceneId(atom.sceneId);
                                        }}
                                        className={getAtomClasses(atom.type)}
                                        placeholder={atom.type === 'slugline' ? 'INT. SCENE - DAY' : ''}
                                        rows={1}
                                        spellCheck={false}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="h-32" />
                    </div>
                </div>
            </div>

            {/* 3. RIGHT: NOTES & PROPERTIES */}
            {showNotes && (
                <div className="w-[300px] bg-[#1E1E1E] border-l border-[#333] flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
                    <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
                        <span className="text-xs font-bold text-[#969696] uppercase tracking-wider">Notebook</span>
                        <Button variant="ghost" size="sm" onClick={() => setShowNotes(false)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                    
                    <div className="p-4 space-y-6 overflow-y-auto flex-1">
                        
                        {/* Context Info */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Active Scene
                            </h3>
                            <div className="p-3 bg-[#252526] rounded border border-[#333]">
                                <div className="text-xs font-bold text-accent mb-1 truncate">
                                    {activeSceneSlugline?.text || "No Scene Selected"}
                                </div>
                                <div className="text-[10px] text-[#707070]">
                                    {activeVisualScene ? (
                                        <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> Visuals Connected</span>
                                    ) : (
                                        <span className="text-warning flex items-center gap-1">○ Waiting for sync</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Synopsis Editor - Tied to Slugline Metadata */}
                        <div className="space-y-2">
                             <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <StickyNote className="w-3 h-3" /> Synopsis
                            </h3>
                            {activeSceneId && activeSceneSlugline ? (
                                <textarea 
                                    value={activeSceneSlugline.metadata?.synopsis || ''}
                                    onChange={(e) => updateAtomMetadata(activeSceneId, 'synopsis', e.target.value)}
                                    className="w-full h-32 bg-[#121212] border border-[#333] rounded p-3 text-xs text-[#CCCCCC] outline-none focus:border-accent resize-none placeholder-[#444]"
                                    placeholder="Write a summary of this scene..."
                                />
                            ) : (
                                <div className="text-xs text-[#505050] italic p-2">Select a scene to edit synopsis.</div>
                            )}
                        </div>

                        {/* Characters in Current Scene */}
                        <div className="space-y-2">
                             <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <User className="w-3 h-3" /> In This Scene
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {charactersInScene.length > 0 ? (
                                    charactersInScene.map(name => (
                                        <span key={name} className="text-[10px] bg-[#333] text-[#E8E8E8] px-2 py-1 rounded border border-[#444]">
                                            {name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[10px] text-[#505050] italic">No characters detected</span>
                                )}
                            </div>
                        </div>

                        {/* Global Cast Quick Insert */}
                        <div className="space-y-2 pt-4 border-t border-[#333]">
                             <h3 className="text-xs font-bold text-[#969696] uppercase flex items-center gap-2">
                                <PlusCircle className="w-3 h-3" /> Quick Insert Character
                            </h3>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {projectCharacters.length > 0 ? projectCharacters.map(char => (
                                    <button 
                                        key={char.id}
                                        onClick={() => insertCharacter(char.name)}
                                        className="w-full text-left text-xs px-2 py-1.5 hover:bg-[#2A2D2E] rounded flex items-center justify-between group"
                                    >
                                        <span className="text-[#CCC] group-hover:text-white">{char.name}</span>
                                        <PlusCircle className="w-3 h-3 text-accent opacity-0 group-hover:opacity-100" />
                                    </button>
                                )) : (
                                    <div className="text-xs text-[#505050] italic p-2">
                                        No cast members in project. Add them in Assets tab.
                                    </div>
                                )}
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
    </button>
);