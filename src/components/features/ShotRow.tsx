import React, { useState } from 'react';
import { Shot } from '../../types';
import { Trash2, Plus, X, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface ShotRowProps {
    shot: Shot;
    onUpdateShot: (id: string, updates: Partial<Shot>) => void;
    onDeleteShot: (id: string) => void;
    onEditShot: (shot: Shot) => void;
    onAddVisual: (shotId: string) => void;
}

export const ShotRow: React.FC<ShotRowProps> = ({
    shot,
    onUpdateShot,
    onDeleteShot,
    onEditShot,
    onAddVisual
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteStill = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateShot(shot.id, { 
            generatedImage: undefined,
            generationCandidates: []
        });
    };

    return (
        <>
            <div
                className="grid grid-cols-2 border-b border-border/10 hover:bg-surface/20 transition-colors group/row relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* DELETE SHOT BUTTON (Corner of Row) */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                    }}
                    className="absolute top-2 right-2 p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-sm opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
                    title="Delete entire shot row"
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                {/* LEFT SIDE: VISUAL + DETAILS */}
                <div className="p-4 border-r border-border/10 flex flex-col gap-3 items-center justify-center relative">

                    {/* SHOT # Tag */}
                    <span className="text-[10px] font-mono text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded w-fit self-start">
                        SHOT #{shot.sequence}
                    </span>

                    {/* Main Visual Box */}
                    <div
                        className="flex-1 w-full aspect-video bg-background border-2 border-border/20 rounded-sm overflow-hidden relative group/visual cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                            if (shot.generatedImage) {
                                onEditShot(shot);
                            } else {
                                onAddVisual(shot.id);
                            }
                        }}
                    >
                        {shot.generatedImage ? (
                            <>
                                <img src={shot.generatedImage} className="w-full h-full object-contain" alt={`Shot ${shot.sequence}`} />
                                
                                {/* Overlay Actions (Only if image exists) */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/visual:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<ImageIcon className="w-3 h-3" />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditShot(shot);
                                        }}
                                    >
                                        Open
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<Trash2 className="w-3 h-3" />}
                                        onClick={handleDeleteStill}
                                        className="hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                                        title="Delete Still Image"
                                    >
                                        Delete Still
                                    </Button>
                                </div>
                            </>
                        ) : (
                            // Empty State / Add Visual
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Plus className="w-3 h-3" />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddVisual(shot.id);
                                    }}
                                >
                                    Add Shot
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Shot Details (Bottom) */}
                    <div className="flex gap-2 text-[10px] text-text-tertiary">
                        <span className="uppercase">{shot.shotType}</span>
                        <span>•</span>
                        <span>{shot.aspectRatio || '16:9'}</span>
                    </div>
                </div>

                {/* RIGHT SIDE: DESCRIPTION */}
                <div className="p-4 flex flex-col justify-center">
                   <div className="text-text-primary text-sm whitespace-pre-wrap">
                      {shot.description || <span className="text-text-tertiary italic">No description. Open editor to add details.</span>}
                   </div>
                   {shot.dialogue && (
                      <div className="mt-2 text-xs text-text-secondary italic">
                         "{shot.dialogue}"
                      </div>
                   )}
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {showDeleteConfirm && (
                <Modal
                    isOpen={true}
                    onClose={() => setShowDeleteConfirm(false)}
                    title="Delete Shot?"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-status-error/10 rounded-lg border border-status-error/20">
                            <p className="text-sm text-text-primary">
                                Are you sure you want to delete <strong>Shot #{shot.sequence}</strong>?
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    onDeleteShot(shot.id);
                                    setShowDeleteConfirm(false);
                                }}
                                className="bg-status-error hover:bg-status-error/90"
                            >
                                Delete Shot
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};