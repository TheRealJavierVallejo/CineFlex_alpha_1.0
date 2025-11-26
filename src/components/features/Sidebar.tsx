
/*
 * 🧭 COMPONENT: SIDEBAR (Command Rail)
 * Premium Desktop UI
 */

import React, { useState } from 'react';
import { ViewState, Project } from '../../types';
import { LayoutGrid, Clapperboard, Users, Settings, ChevronLeft, ChevronRight, Command, Folder } from 'lucide-react';

interface SidebarProps {
  view: ViewState;
  setView: (view: ViewState) => void;
  project: Project;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, setView, project }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => {
    const isActive = view === target;
    return (
      <button 
        onClick={() => setView(target)}
        className={`
          w-full h-9 flex items-center gap-3 px-2.5 mb-1 rounded-[3px] transition-colors group relative
          ${isActive 
            ? 'bg-[#37373D] text-white' 
            : 'text-[#969696] hover:text-white hover:bg-[#2A2D2E]'}
        `}
        title={label}
      >
        {/* Active Bar Left */}
        {isActive && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#007ACC] rounded-r-sm" />}
        
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#969696] group-hover:text-white'}`} />
        
        {!isCollapsed && (
          <span className="text-[13px] font-medium truncate">{label}</span>
        )}
      </button>
    );
  };

  return (
    <aside 
      className={`
        relative bg-[#1E1E1E] border-r border-[#333] flex flex-col transition-all duration-150 ease-out z-20
        ${isCollapsed ? 'w-[48px]' : 'w-[200px]'}
      `}
    >
      {/* Activity Bar Top */}
      <div className="flex flex-col gap-1 p-2">
        <NavItem target={ViewState.DASHBOARD} icon={LayoutGrid} label="Dashboard" />
        <NavItem target={ViewState.TIMELINE} icon={Clapperboard} label="Timeline" />
        <NavItem target={ViewState.ASSETS} icon={Users} label="Assets" />
      </div>

      <div className="flex-1" />

      {/* Settings & Toggle Bottom */}
      <div className="p-2 flex flex-col gap-1 border-t border-[#333]">
        <NavItem target={ViewState.SETTINGS} icon={Settings} label="Settings" />
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-9 flex items-center justify-center rounded-[3px] text-[#969696] hover:bg-[#2A2D2E] hover:text-white transition-colors"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

    </aside>
  );
};
