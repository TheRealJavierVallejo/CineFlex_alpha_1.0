import React from 'react';
import { Shot } from '../../types';
import { Film, Trash2, Edit2, Layers, AlertTriangle } from 'lucide-react';

interface ShotCardProps {
    shot: Shot;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
    isActive?: boolean;
}

export const ShotCard: React.FC<ShotCardProps> = ({ shot, onClick, onDelete, isActive }) => {
    return (
        <div 
            onClick={onClick}
            className={`
                group relative w-48 shrink-0 flex flex-col bg-surface border rounded-md overflow-hidden transition-all duration-200 cursor-pointer
                ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'}
                hover:-translate-y-1 hover:shadow-lg
            `}
        >
            {/* Header / Sequence Badge */}
            <div className="px-2 py-1 bg-surface-secondary border-b border-border flex justify-between items-center text-[10px]">
                <span className="font-mono font-bold text-text-secondary">#{shot.sequence}</span>
                <span className="text-text-muted truncate max-w-[80px]">{shot.shotType}</span>
            </div>

            {/* Thumbnail Area */}
            <div className="aspect-video w-full bg-black relative">
                {shot.generatedImage ? (
                    <img src={shot.generatedImage} className="w-full h-full object-cover" alt="Shot" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                        <Film className="w-6 h-6 mb-1" />
                        <span className="text-[9px] uppercase tracking-wider">No Image</span>
                    </div>
                )}

                {/* Hover Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        className="p-1.5 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-full transition-colors"
                        title="Edit Shot"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={onDelete}
                        className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                        title="Delete Shot"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Multiple Candidates Indicator */}
                {shot.generationCandidates && shot.generationCandidates.length > 1 && (
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/80 px-1.5 rounded-sm text-[8px] text-white">
                        <Layers className="w-2.5 h-2.5" />
                        <span>{shot.generationCandidates.length}</span>
                    </div>
                )}
            </div>

            {/* Footer / Description */}
            <div className="p-2 h-14 bg-surface flex flex-col justify-center">
                <p className="text-[11px] text-text-primary line-clamp-2 leading-tight">
                    {shot.description || <span className="text-text-muted italic">No description...</span>}
                </p>
            </div>
            
            {/* Warning if no script link */}
            {(!shot.linkedElementIds || shot.linkedElementIds.length === 0) && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-500/50" title="Not linked to script" />
            )}
        </div>
    );
};