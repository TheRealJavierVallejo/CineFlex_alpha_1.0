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
        <div className="bg-surface border border-border rounded-lg p-4 space-y-4 relative group">
            {/* Header / Basic Info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center border border-border">
                        <User className="w-4 h-4 text-text-secondary" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                        <FieldWithSyd
                            id={`char-name-${character.id}`}
                            label="Name"
                            value={character.name}
                            onChange={(val) => onChange({ name: val })}
                            onRequestSyd={(el) => onRequestSyd('identity', el)}
                            isActiveSyd={activeSydField === 'identity'}
                            placeholder="Character Name"
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4 self-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-surface-secondary px-2 py-1 rounded">
                        {character.role}
                    </span>
                    <button
                        onClick={onDelete}
                        className="text-text-secondary hover:text-red-500 transition-colors p-1"
                        title="Delete Character"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Toggle for Deep Fields */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center py-1 text-xs text-text-muted hover:text-text-primary transition-colors border-t border-border mt-2"
            >
                {isExpanded ? (
                    <span className="flex items-center gap-1">Hide Arc <ChevronUp className="w-3 h-3" /></span>
                ) : (
                    <span className="flex items-center gap-1">Develop Arc <ChevronDown className="w-3 h-3" /></span>
                )}
            </button>

            {/* Deep Arc Fields */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <FieldWithSyd
                        id={`char-want-${character.id}`}
                        label="Want (External Goal)"
                        value={character.want || ''}
                        onChange={(val) => onChange({ want: val })}
                        onRequestSyd={(el) => onRequestSyd('want', el)}
                        isActiveSyd={activeSydField === 'want'}
                        placeholder="What do they think they want?"
                        multiline
                    />
                    <FieldWithSyd
                        id={`char-need-${character.id}`}
                        label="Need (Internal Growth)"
                        value={character.need || ''}
                        onChange={(val) => onChange({ need: val })}
                        onRequestSyd={(el) => onRequestSyd('need', el)}
                        isActiveSyd={activeSydField === 'need'}
                        placeholder="What do they actually need to learn?"
                        multiline
                    />
                    <FieldWithSyd
                        id={`char-lie-${character.id}`}
                        label="The Lie"
                        value={character.lie || ''}
                        onChange={(val) => onChange({ lie: val })}
                        onRequestSyd={(el) => onRequestSyd('lie', el)}
                        isActiveSyd={activeSydField === 'lie'}
                        placeholder="What wrong belief holds them back?"
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
                </div>
            )}
        </div>
    );
};