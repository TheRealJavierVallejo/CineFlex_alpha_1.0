import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
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
            ${beat.isComplete ? 'border-green-500/30 bg-green-500/5' : 'border-border'}
        `}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-secondary opacity-50">
                        {beat.sequence.toString().padStart(2, '0')}
                    </span>
                    <h4 className="text-sm font-semibold text-text-primary">
                        {beat.beatName}
                    </h4>
                </div>
                <button
                    onClick={() => onChange({ isComplete: !beat.isComplete })}
                    className={`transition-colors ${beat.isComplete ? 'text-green-500' : 'text-text-secondary hover:text-text-primary'}`}
                    title={beat.isComplete ? "Mark as Incomplete" : "Mark as Complete"}
                >
                    {beat.isComplete ? (
                        <CheckCircle2 className="w-4 h-4" />
                    ) : (
                        <Circle className="w-4 h-4" />
                    )}
                </button>
            </div>

            <FieldWithSyd
                id={`beat-${beat.id}`}
                label="Content"
                value={beat.content}
                onChange={(val) => onChange({ content: val })}
                onRequestSyd={onRequestSyd}
                isActiveSyd={isActiveSyd}
                multiline={true}
                placeholder={`Describe the ${beat.beatName}...`}
            />
        </div>
    );
};
