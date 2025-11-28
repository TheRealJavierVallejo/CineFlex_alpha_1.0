import React from 'react';
import { Shot } from '../../types';
import { Film, Trash2, Edit2, Layers } from 'lucide-react';

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
                group relative w-44 flex flex-col bg-black border rounded-sm overflow-hidden cursor-pointer transition-all
                ${isActive 
                    ? 'border-primary ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50'}
            `}
        >
            {/* Header: Sequence & Type */}
            <div className="h-5 flex items-center justify-between px-2 bg-[#18181b] border-b border-white/5 shrink-0">
                <span className="font-mono text-[9px] font-bold text-primary">#{shot.sequence}</span>
                <span className="text-[9px] text-text-muted uppercase tracking-tight">{shot.shotType}</span>
            </div>

            {/* Thumbnail */}
            <div className="aspect-video w-full bg-[#0a0a0a] relative overflow-hidden group/image">
                {shot.generatedImage ? (
                    <img src={shot.generatedImage} className="w-full h-full object-cover" alt="Shot" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted opacity-20">
                        <Film className="w-6 h-6" />
                    </div>
                )}

                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-sm shadow-sm"
                        title="Edit"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={onDelete}
                        className="p-1.5 bg-red-900/80 hover:bg-red-600 text-white rounded-sm shadow-sm"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Icons: Layers */}
                <div className="absolute bottom-1 right-1 flex gap-1 pointer-events-none">
                    {shot.generationCandidates && shot.generationCandidates.length > 1 && (
                        <div className="bg-black/80 p-0.5 rounded-sm text-[8px] text-white flex items-center gap-0.5 px-1 border border-white/10">
                            <Layers className="w-2 h-2" /> {shot.generationCandidates.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Snippet */}
            <div className="h-9 p-1.5 bg-[#121212] flex items-start border-t border-white/5">
                 <p className="text-[10px] text-text-secondary line-clamp-2 leading-snug w-full font-medium">
                    {shot.description || <span className="text-text-muted italic opacity-50">No description...</span>}
                 </p>
            </div>
            
            {/* Script Link Status Dot */}
            {(!shot.linkedElementIds || shot.linkedElementIds.length === 0) && (
                <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-yellow-600/50" title="Unlinked" />
            )}
        </div>
    );
};