import React, { useState, useRef, useEffect } from 'react';
import { User, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { CharacterDevelopment } from '../../../types';
import { FieldWithSyd } from './FieldWithSyd';

interface CharacterCardProps {
    character: CharacterDevelopment;
    onChange: (updates: Partial<CharacterDevelopment>) => void;
    onDelete: () => void;
    onRequestSyd: (field: string, element: HTMLElement) => void;
    activeSydField: string | null;
}

const ARCHETYPES_DATA = [
    { name: "Dynamic Character", desc: "Changes significantly throughout the story (e.g., Breaking Bad's Walter White)" },
    { name: "Flat Character", desc: "Stays the same from start to finish, no major growth (e.g., Sherlock Holmes)" },
    { name: "Round Character", desc: "Complex and realistic with multiple dimensions (e.g., Harry Potter)" },
    { name: "Stock Character", desc: "Stereotypical role with predictable traits (e.g., 'the mentor' or 'comic relief')" },
    { name: "Foil Character", desc: "Contrasts with protagonist to highlight their traits (e.g., Draco Malfoy to Harry Potter)" },
    { name: "Static Character", desc: "Remains unchanged despite events (e.g., James Bond)" }
];

export const CharacterCard: React.FC<CharacterCardProps> = ({
    character,
    onChange,
    onDelete,
    onRequestSyd,
    activeSydField
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Check if current archetype is in our known list
    const isKnownArchetype = ARCHETYPES_DATA.some(a => a.name === character.archetype);
    const [isCustomArchetype, setIsCustomArchetype] = useState(
        !!character.archetype && !isKnownArchetype
    );
    const [isArchetypeOpen, setIsArchetypeOpen] = useState(false);
    const archetypeRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (archetypeRef.current && !archetypeRef.current.contains(event.target as Node)) {
                setIsArchetypeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-surface border border-border rounded-lg p-5 space-y-5 relative transition-colors hover:border-border/80">
            {/* Header / Basic Info */}
            <div className="space-y-5">
                {/* Top Bar: Icon + Role + Delete */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center border border-border">
                            <User className="w-4 h-4 text-text-secondary" />
                        </div>
                        <select
                            value={character.role}
                            onChange={(e) => onChange({ role: e.target.value as 'protagonist' | 'antagonist' | 'supporting' })}
                            className="text-[9px] font-bold uppercase tracking-wider text-text-muted bg-surface-secondary px-2.5 py-1 rounded border border-border/50 cursor-pointer hover:bg-surface hover:text-text-primary transition-colors appearance-none outline-none text-center"
                        >
                            <option value="protagonist">PROTAGONIST</option>
                            <option value="antagonist">ANTAGONIST</option>
                            <option value="supporting">SUPPORTING</option>
                        </select>
                    </div>
                    
                    <button
                        onClick={onDelete}
                        className="text-text-secondary hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-surface-secondary opacity-50 hover:opacity-100"
                        title="Delete Character"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Name (Full Width) */}
                <div className="mb-4">
                    <FieldWithSyd
                        id={`char-name-${character.id}`}
                        label="Character Name"
                        value={character.name}
                        onChange={(val) => onChange({ name: val })}
                        onRequestSyd={(el) => onRequestSyd('identity', el)}
                        isActiveSyd={activeSydField === 'identity'}
                        placeholder="Enter name..."
                    />
                </div>

                {/* Basic Details Grid */}
                <div className="grid grid-cols-2 gap-5">
                    <FieldWithSyd
                        id={`char-age-${character.id}`}
                        label="Age"
                        value={character.age || ''}
                        onChange={(val) => onChange({ age: val })}
                        onRequestSyd={(el) => onRequestSyd('identity', el)}
                        isActiveSyd={activeSydField === 'identity'}
                        placeholder="e.g. 30s"
                    />

                    {/* Archetype Selector */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">
                                Character Archetype
                            </label>
                            {isCustomArchetype && (
                                <button 
                                    onClick={() => {
                                        setIsCustomArchetype(false);
                                        onChange({ archetype: '' });
                                    }}
                                    className="text-[10px] text-primary hover:underline"
                                >
                                    Use List
                                </button>
                            )}
                        </div>
                        
                        {isCustomArchetype ? (
                            <input
                                value={character.archetype || ''}
                                onChange={(e) => onChange({ archetype: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-text-muted/50"
                                placeholder="Custom archetype..."
                                autoFocus
                            />
                        ) : (
                            <div className="relative" ref={archetypeRef}>
                                <button
                                    onClick={() => setIsArchetypeOpen(!isArchetypeOpen)}
                                    className="w-full px-4 py-3 bg-surface-secondary border border-border rounded-md text-text-primary text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-left flex items-center justify-between transition-all"
                                >
                                    <span className={!character.archetype ? "text-text-muted/50" : ""}>
                                        {character.archetype || "Select Archetype..."}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isArchetypeOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isArchetypeOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-surface border border-border shadow-xl rounded-md z-50 max-h-60 overflow-y-auto">
                                        <div className="p-1 space-y-0.5">
                                            {ARCHETYPES_DATA.map((item) => (
                                                <button
                                                    key={item.name}
                                                    onClick={() => {
                                                        onChange({ archetype: item.name });
                                                        setIsArchetypeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-sm transition-colors flex flex-col gap-0.5 group ${
                                                        character.archetype === item.name 
                                                            ? 'bg-primary/10' 
                                                            : 'hover:bg-surface-secondary'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-xs font-medium ${
                                                            character.archetype === item.name ? 'text-primary' : 'text-text-primary'
                                                        }`}>
                                                            {item.name}
                                                        </span>
                                                        {character.archetype === item.name && (
                                                            <Check className="w-3 h-3 text-primary" />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-text-muted group-hover:text-text-secondary leading-tight">
                                                        {item.desc}
                                                    </span>
                                                </button>
                                            ))}
                                            
                                            <div className="h-[1px] bg-border my-1" />
                                            
                                            <button
                                                onClick={() => {
                                                    setIsCustomArchetype(true);
                                                    onChange({ archetype: '' });
                                                    setIsArchetypeOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-surface-secondary rounded-sm font-medium transition-colors"
                                            >
                                                Custom Archetype...
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description (Full Width) */}
                <FieldWithSyd
                    id={`char-desc-${character.id}`}
                    label="Description"
                    value={character.description || ''}
                    onChange={(val) => onChange({ description: val })}
                    onRequestSyd={(el) => onRequestSyd('identity', el)}
                    isActiveSyd={activeSydField === 'identity'}
                    placeholder="Appearance, personality, role in story..."
                    multiline
                    minHeight="60px"
                />
            </div>

            {/* Toggle for Deep Fields */}
            <div className="pt-2 border-t border-border/50 mt-4">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center py-2 text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors uppercase tracking-widest gap-2"
                >
                    {isExpanded ? (
                        <>Hide Character Arc <ChevronUp className="w-3 h-3" /></>
                    ) : (
                        <>Develop Character Arc <ChevronDown className="w-3 h-3" /></>
                    )}
                </button>
            </div>

            {/* Deep Arc Fields */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-1">
                    {/* Row 1: Goals */}
                    <FieldWithSyd
                        id={`char-want-${character.id}`}
                        label="Want (External Goal)"
                        value={character.want || ''}
                        onChange={(val) => onChange({ want: val })}
                        onRequestSyd={(el) => onRequestSyd('want', el)}
                        isActiveSyd={activeSydField === 'want'}
                        placeholder="What concrete goal are they chasing?"
                        multiline
                    />
                    <FieldWithSyd
                        id={`char-need-${character.id}`}
                        label="Need (Internal Growth)"
                        value={character.need || ''}
                        onChange={(val) => onChange({ need: val })}
                        onRequestSyd={(el) => onRequestSyd('need', el)}
                        isActiveSyd={activeSydField === 'need'}
                        placeholder="What spiritual lesson do they need to learn?"
                        multiline
                    />
                    
                    {/* Row 2: Conflict */}
                    <FieldWithSyd
                        id={`char-lie-${character.id}`}
                        label="The Lie"
                        value={character.lie || ''}
                        onChange={(val) => onChange({ lie: val })}
                        onRequestSyd={(el) => onRequestSyd('lie', el)}
                        isActiveSyd={activeSydField === 'lie'}
                        placeholder="What misconception holds them back?"
                        multiline
                    />
                    <FieldWithSyd
                        id={`char-ghost-${character.id}`}
                        label="The Ghost"
                        value={character.ghost || ''}
                        onChange={(val) => onChange({ ghost: val })}
                        onRequestSyd={(el) => onRequestSyd('ghost', el)}
                        isActiveSyd={activeSydField === 'ghost'}
                        placeholder="What past trauma created the Lie?"
                        multiline
                    />

                    {/* Row 3: Traits */}
                    <FieldWithSyd
                        id={`char-strengths-${character.id}`}
                        label="Strengths"
                        value={character.strengths || ''}
                        onChange={(val) => onChange({ strengths: val })}
                        onRequestSyd={(el) => onRequestSyd('strengths', el)}
                        isActiveSyd={activeSydField === 'strengths'}
                        placeholder="Skills, talents, positive traits..."
                        multiline
                    />
                    <FieldWithSyd
                        id={`char-weaknesses-${character.id}`}
                        label="Weaknesses / Flaws"
                        value={character.weaknesses || ''}
                        onChange={(val) => onChange({ weaknesses: val })}
                        onRequestSyd={(el) => onRequestSyd('weaknesses', el)}
                        isActiveSyd={activeSydField === 'weaknesses'}
                        placeholder="Vulnerabilities, bad habits..."
                        multiline
                    />

                    {/* Row 4: Summary */}
                    <div className="md:col-span-2">
                        <FieldWithSyd
                            id={`char-arc-summary-${character.id}`}
                            label="Arc Summary"
                            value={character.arcSummary || ''}
                            onChange={(val) => onChange({ arcSummary: val })}
                            onRequestSyd={(el) => onRequestSyd('arc', el)}
                            isActiveSyd={activeSydField === 'arc'}
                            placeholder="How does this character change from beginning to end?"
                            multiline
                            minHeight="80px"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};