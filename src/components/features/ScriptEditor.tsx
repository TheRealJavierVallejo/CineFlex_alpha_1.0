/*
 * 📝 COMPONENT: SCRIPT EDITOR (Scrite Structure Mode)
 * 
 * CORE FEATURES:
 * 1. Editor: Standard Screenplay Formatting
 * 2. Structure: Drag & Drop Scene Reordering (Moves entire text blocks)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Project, ScriptAtom, ScriptAtomType, ShowToastFn } from '../../types';
import { Layout, ChevronLeft, GripVertical } from 'lucide-react';
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
    const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);

    // Refs
    const atomRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
    
    // --- INITIALIZATION ---
    useEffect(() => {
        if (project.script) {
            const sorted = [...project.script.atoms].sort((a, b) => a.sequence - b.sequence);
            if (sorted.length === 0) {
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

    const debouncedSync = useRef(debounce((newAtoms: ScriptAtom[]) => syncToProject(newAtoms), 1000)).current;

    // --- DRAG & DROP LOGIC (The Scrite Feature) ---
    
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedSceneId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Make ghost transparent
        e.dataTransfer.setDragImage(e.currentTarget as Element, 0, 0);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetSceneId: string) => {
        e.preventDefault();
        if (!draggedSceneId || draggedSceneId === targetSceneId) return;

        // 1. Identify the full block of atoms for the dragged scene
        const allAtoms = [...atoms];
        
        // Find start indices
        const dragStartIndex = allAtoms.findIndex(a => a.id === draggedSceneId);
        const targetStartIndex = allAtoms.findIndex(a => a.id === targetSceneId);
        
        if (dragStartIndex === -1 || targetStartIndex === -1) return;

        // Find end indices (the start of the NEXT slugline)
        let dragEndIndex = dragStartIndex + 1;
        while (dragEndIndex < allAtoms.length && allAtoms[dragEndIndex].type !== 'slugline') {
            dragEndIndex++;
        }

        // Extract the moving block
        const movingBlock = allAtoms.slice(dragStartIndex, dragEndIndex);
        
        // Remove from old position
        const atomsWithoutMoved = allAtoms.filter(a => !movingBlock.includes(a));
        
        // Calculate new insertion index
        // We need to find where the target scene is NOW in the filtered array
        const newTargetIndex = atomsWithoutMoved.findIndex(a => a.id === targetSceneId);
        
        // Insert before or after? Standard behavior is usually "insert before" 
        // but if we drag down, it feels like "insert after". 
        // For simplicity, let's insert BEFORE the target scene.
        
        atomsWithoutMoved.splice(newTargetIndex, 0, ...movingBlock);
        
        // Re-sequence everyone
        atomsWithoutMoved.forEach((a, i) => a.sequence = i);

        setAtoms(atomsWithoutMoved);
        syncToProject(atomsWithoutMoved);
        setDraggedSceneId(null);
        showToast("Scene reordered", 'success');
    };

    // --- TEXT EDITOR LOGIC ---

    const updateAtomText = (id: string, text: string) => {
        const newAtoms = atoms.map(a => a.id === id ? { ...a, text } : a);
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

    const handleKeyDown = (e: React.KeyboardEvent, index: number, atom: ScriptAtom) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
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
                sequence: atom.sequence + 1
            };

            const newAtoms = [...atoms];
            newAtoms.splice(index + 1, 0, newAtom);
            newAtoms.forEach((a, i) => a.sequence = i);
            setAtoms(newAtoms);
            syncToProject(newAtoms);
            setTimeout(() => atomRefs.current[newAtom.id]?.focus(), 10);
        }

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

        if (e.key === 'Tab') {
            e.preventDefault();
            const types: ScriptAtomType[] = ['slugline', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];
            const currentIndex = types.indexOf(atom.type);
            const nextType = types[e.shiftKey ? (currentIndex - 1 + types.length) % types.length : (currentIndex + 1) % types.length];
            updateAtomType(atom.id, nextType);
        }

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

    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    const getTypeStyles = (type: ScriptAtomType) => {
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
            
            {/* 1. LEFT: STRUCTURE VIEW (Drag & Drop) */}
            {showStructure && (
                <div className="w-[280px] bg-[#1E1E1E] border-r border-[#333] flex flex-col shrink-0 animate-in slide-in-from-left-4 duration-200">
                    <div className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
                        <span className="text-xs font-bold text-[#969696] uppercase tracking-wider">Structure</span>
                        <Button variant="ghost" size="sm" onClick={() => setShowStructure(false)}><ChevronLeft className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {atoms.filter(a => a.type === 'slugline').map((slug, i) => {
                            const isDragging = draggedSceneId === slug.id;
                            const isActive = slug.id === activeAtomId;

                            return (
                                <div
                                    key={slug.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, slug.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, slug.id)}
                                    className={`
                                        w-full flex items-center gap-2 px-3 py-3 border-b border-[#252526] cursor-grab active:cursor-grabbing transition-all
                                        ${isDragging ? 'opacity-50 bg-[#333]' : 'hover:bg-[#2A2D2E]'}
                                        ${isActive ? 'bg-accent/10 border-l-4 border-l-accent' : 'border-l-4 border-l-transparent'}
                                    `}
                                    onClick={() => {
                                        atomRefs.current[slug.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setTimeout(() => atomRefs.current[slug.id]?.focus(), 100);
                                    }}
                                >
                                    <GripVertical className="w-4 h-4 text-[#505050] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono bg-[#333] px-1.5 rounded text-[#969696]">{i + 1}</span>
                                            <span className="text-xs font-bold truncate text-[#CCCCCC]">{slug.text || "UNTITLED SCENE"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 2. CENTER: SCRIPT EDITOR */}
            <div className="flex-1 flex flex-col relative bg-[#121212] items-center">
                
                {/* Formatting Toolbar */}
                <div className="w-full h-10 bg-[#252526] border-b border-[#333] flex items-center justify-between px-4 shrink-0 z-10 shadow-md">
                    <div className="flex items-center gap-2">
                        {!showStructure && (
                             <Button variant="ghost" size="sm" onClick={() => setShowStructure(true)} icon={<Layout className="w-4 h-4" />}>Structure</Button>
                        )}
                    </div>
                    
                    <div className="flex bg-[#1E1E1E] rounded-md p-0.5 border border-[#333]">
                        <ElementTypeButton active={atoms.find(a => a.id === activeAtomId)?.type === 'slugline'} onClick={() => activeAtomId && updateAtomType(activeAtomId, 'slugline')} label="Heading" />
                        <ElementTypeButton active={atoms.find(a => a.id === activeAtomId)?.type === 'action'} onClick={() => activeAtomId && updateAtomType(activeAtomId, 'action')} label="Action" />
                        <ElementTypeButton active={atoms.find(a => a.id === activeAtomId)?.type === 'character'} onClick={() => activeAtomId && updateAtomType(activeAtomId, 'character')} label="Character" />
                        <ElementTypeButton active={atoms.find(a => a.id === activeAtomId)?.type === 'parenthetical'} onClick={() => activeAtomId && updateAtomType(activeAtomId, 'parenthetical')} label="Paren" />
                        <ElementTypeButton active={atoms.find(a => a.id === activeAtomId)?.type === 'dialogue'} onClick={() => activeAtomId && updateAtomType(activeAtomId, 'dialogue')} label="Dialogue" />
                    </div>

                    <div className="w-20" /> {/* Spacer for balance */}
                </div>

                {/* The "Page" Surface */}
                <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-[850px] min-h-[1100px] bg-[#1E1E1E] shadow-2xl border border-[#333] relative">
                        <div className="px-[60px] py-[50px]">
                            {atoms.map((atom, index) => (
                                <div key={atom.id} className="relative group/line min-h-[1.5em]">
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
                        </div>
                        <div className="h-32" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Toolbar Helper
const ElementTypeButton = ({ active, onClick, label }: any) => (
    <button
        onClick={onClick}
        className={`
            px-3 py-1.5 text-[10px] font-medium transition-colors rounded-sm
            ${active ? 'bg-accent text-white shadow-sm' : 'text-[#969696] hover:bg-[#333] hover:text-[#E8E8E8]'}
        `}
    >
        {label}
    </button>
);