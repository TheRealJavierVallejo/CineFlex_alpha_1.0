
/*
 * 🎬 COMPONENT: SHOT LIST (Dashboard)
 * Premium Desktop UI - Dense Grid
 */

import React from 'react';
import { Project, Shot, ShowToastFn } from '../../types';
import { Film, Camera, Layers, Users } from 'lucide-react';

interface ShotListProps {
  project: Project;
  onAddShot: () => void;
  onEditShot: (shot: Shot) => void;
  showToast: ShowToastFn;
}

export const ShotList: React.FC<ShotListProps> = ({ project, onAddShot, onEditShot, showToast }) => {
  return (
    <div className="h-full">
      {project.shots.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-[#505050] border-2 border-dashed border-[#333] rounded-[4px]">
          <Film className="w-8 h-8 mb-2 opacity-30" />
          <span className="text-sm">No shots in timeline</span>
          <button onClick={onAddShot} className="text-[#007ACC] text-xs hover:underline mt-1">Create Shot</button>
        </div>
      ) : (
        /* Dense Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-20">
          {project.shots.map((shot, idx) => (
            <div
              key={shot.id}
              onClick={() => onEditShot(shot)}
              className="bg-[#252526] border border-[#333] rounded-[3px] overflow-hidden hover:border-[#007ACC] cursor-pointer transition-all group"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-[#121212] relative">
                {shot.generatedImage ? (
                  <img src={shot.generatedImage} className="w-full h-full object-contain" />
                ) : shot.sketchImage ? (
                  <img src={shot.sketchImage} className="w-full h-full object-contain opacity-50 p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-5 h-5 text-[#333]" />
                  </div>
                )}

                <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono text-[#E8E8E8]">
                  #{shot.sequence}
                </div>

                {/* Stack Indicator */}
                {shot.generationCandidates && shot.generationCandidates.length > 1 && (
                  <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded-[2px] text-[9px] text-[#A0A0A0] flex items-center gap-1">
                    <Layers className="w-2.5 h-2.5" />
                    <span>{shot.generationCandidates.length}</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="p-2 text-[11px]">
                <div className="text-[#CCCCCC] truncate font-medium mb-1" title={shot.description}>
                  {shot.description || "Untitled Shot"}
                </div>
                <div className="flex justify-between text-[#707070]">
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
