/*
 * 🎬 COMPONENT: SHOT LIST (Dashboard)
 * Premium Desktop UI - Dense Grid with Right-Click Menu
 */

import React, { useState } from 'react';
import { Project, Shot, ShowToastFn } from '../../types';
import { Film, Camera, Layers, Trash2, Copy, Edit2 } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';

interface ShotListProps {
  project: Project;
  onAddShot: () => void;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shotId: string) => void;
  onDuplicateShot?: (shotId: string) => void; // New prop
  showToast: ShowToastFn;
}

export const ShotList: React.FC<ShotListProps> = ({ project, onAddShot, onEditShot, onDeleteShot, onDuplicateShot, showToast }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shotId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, shotId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, shotId });
  };

  const getMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu) return [];
    return [
      {
        label: "Edit Shot",
        icon: <Edit2 className="w-4 h-4" />,
        action: () => {
           const shot = project.shots.find(s => s.id === contextMenu.shotId);
           if (shot) onEditShot(shot);
        }
      },
      {
        label: "Duplicate",
        icon: <Copy className="w-4 h-4" />,
        action: () => {
           if (onDuplicateShot) onDuplicateShot(contextMenu.shotId);
        }
      },
      {
        label: "Delete",
        icon: <Trash2 className="w-4 h-4" />,
        action: () => onDeleteShot(contextMenu.shotId),
        variant: 'danger',
        separator: true
      }
    ];
  };

  return (
    <div className="h-full">
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {project.shots.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-border rounded-sm">
          <Film className="w-8 h-8 mb-2 opacity-30" />
          <span className="text-sm">No shots in timeline</span>
          <button onClick={onAddShot} className="text-primary text-xs hover:underline mt-1 font-bold">Create Shot</button>
        </div>
      ) : (
        /* Dense Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-20">
          {project.shots.map((shot, idx) => (
            <div
              key={shot.id}
              onClick={() => onEditShot(shot)}
              onContextMenu={(e) => handleContextMenu(e, shot.id)}
              className="bg-surface border border-border rounded-sm overflow-hidden hover:border-primary cursor-pointer transition-all group relative"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-black relative">
                {shot.generatedImage ? (
                  <img src={shot.generatedImage} className="w-full h-full object-contain" />
                ) : shot.sketchImage ? (
                  <img src={shot.sketchImage} className="w-full h-full object-contain opacity-50 p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-5 h-5 text-zinc-700" />
                  </div>
                )}

                <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded-[1px] text-[9px] font-mono text-white border border-white/10">
                  #{shot.sequence}
                </div>

                {/* Actions overlay - Hover Buttons still useful for quick access */}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <button 
                      onClick={(e) => {
                         e.stopPropagation();
                         onDeleteShot(shot.id);
                      }}
                      className="bg-black/80 hover:bg-red-900/80 text-white p-1 rounded-[1px] transition-colors border border-white/10"
                      title="Delete Shot"
                   >
                      <Trash2 className="w-3 h-3 text-red-400" />
                   </button>
                </div>

                {/* Stack Indicator */}
                {shot.generationCandidates && shot.generationCandidates.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded-[1px] text-[9px] text-zinc-400 flex items-center gap-1 border border-white/10">
                    <Layers className="w-2.5 h-2.5" />
                    <span>{shot.generationCandidates.length}</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="p-2 text-[11px]">
                <div className="text-zinc-300 truncate font-medium mb-1" title={shot.description}>
                  {shot.description || "Untitled Shot"}
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span className="truncate max-w-[60%]">{shot.shotType}</span>
                  <span className="font-mono">{shot.aspectRatio}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};