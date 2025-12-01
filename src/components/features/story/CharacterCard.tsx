import React, { useState } from 'react';
import { User, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CharacterDevelopment } from '../../../types';
import { FieldWithSyd } from './FieldWithSyd';

interface CharacterCardProps {
    character: CharacterDevelopment;
    onChange: (updates: Partial<CharacterDevelopment>) => void;
    onDelete: () => void;
    onRequestSyd: (field: string, element: HTMLElement) => void;
    activeSydField: string | null;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
    character,
    onChange,
    onDelete,
    onRequestSyd,
    activeSydField
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-4 relative group transition-colors hover:border-border/80">
            {/* Header / Basic Info */}
            <div className="space-y-4">
                {/* Top Bar: Icon + Role + Delete */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center border border-border">
                            <User className="w-4 h-4 text-text-secondary" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-surface-secondary px-2 py-1 rounded border border-border/50">
                            {character.role}
                        </span>
                    </div>
                    
                    <button
                        onClick={onDelete}
                        className="text-text-secondary hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-surface-secondary"
                        title="Delete Character"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Name (Full Width) */}
                <FieldWithSyd
                    id={`char-name-${character.id}`}
                    label="Character Name"
                    value={character.name}
                    onChange={(val) => onChange({ name: val })}
                    onRequestSyd={(el) => onRequestSyd('identity', el)}
                    isActiveSyd={activeSydField === 'identity'}
                    placeholder="Enter name..."
                />

                {/* Basic Details Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <FieldWithSyd
                            id={`char-age-${character.id}`}
                            label="Age"
                            value={character.age || ''}
                            onChange={(val) => onChange({ age: val })}
                            onRequestSyd={(el) => onRequestSyd('identity', el)}
                            isActiveSyd={activeSydField === 'identity'}
                            placeholder="e.g. 30s"
                        />
                    </div>
                    <div className="col-span-2">
                        <FieldWithSyd
                            id={`char-desc-${character.id}`}
                            label="Description"
                            value={character.description || ''}
                            onChange={(val) => onChange({ description: val })}
                            onRequestSyd={(el) => onRequestSyd('identity', el)}
                            isActiveSyd={activeSydField === 'identity'}
                            placeholder="Appearance, personality, role in story..."
                            multiline
                            minHeight="42px"
                        />
                    </div>
                </div>
            </div>

            {/* Toggle for Deep Fields */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors border-t border-border mt-2 gap-2"
            >
                {isExpanded ? (
                    <>Hide Character Arc <ChevronUp className="w-3 h-3" /></>
                ) : (
                    <>Develop Character Arc <ChevronDown className="w-3 h-3" /></>
                )}
            </button>

            {/* Deep Arc Fields */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
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
                        onRequestSyd={(el) => onRequestSyd('identity', el)}
                        isActiveSyd={activeSydField === 'identity'}
                        placeholder="Skills, talents, positive traits..."
                        multiline
                    />
                    <FieldWithSyd
                        id={`char-weaknesses-${character.id}`}
                        label="Weaknesses / Flaws"
                        value={character.weaknesses || ''}
                        onChange={(val) => onChange({ weaknesses: val })}
                        onRequestSyd={(el) => onRequestSyd('identity', el)}
                        isActiveSyd={activeSydField === 'identity'}
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