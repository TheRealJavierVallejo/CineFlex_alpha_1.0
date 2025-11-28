/*
 * 🎬 COMPONENT: SHOT LIST (Dashboard Grid)
 * Premium Desktop UI - Uses Shared ShotCard
 */

import React, { useState } from 'react';
import { Project, Shot, ShowToastFn } from '../../types';
import { Film, Trash2, Copy, Edit2 } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { ShotCard } from './ShotCard';

interface ShotListProps {
  project: Project;
  onAddShot: () => void;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shotId: string) => void;
  onDuplicateShot?: (shotId: string) => void; 
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
        <div className="h-full flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-border rounded-md bg-surface/20">
          <Film className="w-12 h-12 mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-text-primary mb-2">No shots found</h3>
          <p className="text-sm mb-6">Try adjusting your filters or create a new shot.</p>
          <button onClick={onAddShot} className="app-btn app-btn-primary">Create Shot</button>
        </div>
      ) : (
        /* Dense Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-20">
          {project.shots.map((shot) => (
            <div key={shot.id} onContextMenu={(e) => handleContextMenu(e, shot.id)}>
                <ShotCard 
                    shot={shot}
                    onClick={() => onEditShot(shot)}
                    onDelete={(e) => {
                        e.stopPropagation();
                        onDeleteShot(shot.id);
                    }}
                />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};