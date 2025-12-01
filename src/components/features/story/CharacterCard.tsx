import React from 'react';
import { User, Trash2 } from 'lucide-react';
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
    return (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-4 relative group">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center border border-border">
                        <User className="w-4 h-4 text-text-secondary" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-text-secondary bg-surface-secondary px-2 py-1 rounded">
                        {character.role}
                    </span>
                </div>
                <button
                    onClick={onDelete}
                    className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                    title="Delete Character"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <FieldWithSyd
                id={`char-name-${character.id}`}
                label="Name"
                value={character.name}
                onChange={(val) => onChange({ name: val })}
                onRequestSyd={(el) => onRequestSyd('name', el)}
                isActiveSyd={activeSydField === 'name'}
                placeholder="Character Name"
            />

            {/* Future expansion: Want, Need, Lie, Ghost, Arc */}
        </div>
    );
};
