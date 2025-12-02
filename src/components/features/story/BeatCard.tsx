import React from 'react';
import { Check, Circle } from 'lucide-react';
import { StoryBeat } from '../../../types';
import { FieldWithSyd } from './FieldWithSyd';

interface BeatCardProps {
    beat: StoryBeat;
    onChange: (updates: Partial<StoryBeat>) => void;
    onRequestSyd: (element: HTMLElement) => void;
    isActiveSyd: boolean;
}

export const BeatCard: React.FC<BeatCardProps> = ({
    beat,
    onChange,
    onRequestSyd,
    isActiveSyd
}) => {
    return (
        <div className={`
            bg-surface border rounded-lg p-4 space-y-3 transition-colors
            ${beat.isComplete ? 'border-primary/50 bg-primary/5' : 'border-border'}
        `}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono opacity-50 ${beat.isComplete ? 'text-primary' : 'text-text-secondary'}`}>
                        {beat.sequence.toString().padStart(2, '0')}
                    </span>
                    <h4 className={`text-sm font-semibold ${beat.isComplete ? 'text-primary' : 'text-text-primary'}`}>
                        {beat.beatName}
                    </h4>
                </div>
                <button
                    onClick={() => onChange({ isComplete: !beat.isComplete })}
                    className={`
                        transition-all p-1 rounded-full border
                        ${beat.isComplete 
                            ? 'text-white bg-primary border-primary shadow-glow' 
                            : 'text-text-muted border-text-muted hover:text-primary hover:border-primary'}
                    `}
                    title={beat.isComplete ? "Mark as Incomplete" : "Mark as Complete"}
                >
                    {beat.isComplete ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                        <Circle className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>

            <FieldWithSyd
                id={`beat-${beat.id}`}
                label="Content"
                value={beat.content || ''}
                onChange={(val) => onChange({ content: val })}
                onRequestSyd={onRequestSyd}
                isActiveSyd={isActiveSyd}
                multiline={true}
                readOnly={beat.isComplete}
                placeholder={`Describe the ${beat.beatName}...`}
            />
        </div>
    );
};