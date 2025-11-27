/*
 * 🧭 COMPONENT: SIDEBAR (Command Rail)
 * Premium Desktop UI - Updated for React Router
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Clapperboard, Users, Settings, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const NavItem = ({ to, icon: Icon, label, exact = false }: { to: string, icon: any, label: string, exact?: boolean }) => {
    return (
      <NavLink 
        to={to}
        end={exact}
        className={({ isActive }) => `
          w-full h-9 flex items-center gap-3 px-2.5 mb-1 rounded-[3px] transition-colors group relative
          ${isActive 
            ? 'bg-[#37373D] text-white' 
            : 'text-[#969696] hover:text-white hover:bg-[#2A2D2E]'}
        `}
        title={label}
      >
        {({ isActive }) => (
            <>
                {/* Active Bar Left */}
                {isActive && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#007ACC] rounded-r-sm" />}
                
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#969696] group-hover:text-white'}`} />
                
                {!isCollapsed && (
                <span className="text-[13px] font-medium truncate">{label}</span>
                )}
            </>
        )}
      </NavLink>
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
        {/* The index route is technically "", so we link to "." */}
        <NavItem to="." exact icon={LayoutGrid} label="Dashboard" />
        <NavItem to="script" icon={FileText} label="Script" />
        <NavItem to="timeline" icon={Clapperboard} label="Timeline" />
        <NavItem to="assets" icon={Users} label="Assets" />
      </div>

      <div className="flex-1" />

      {/* Settings & Toggle Bottom */}
      <div className="p-2 flex flex-col gap-1 border-t border-[#333]">
        <NavItem to="settings" icon={Settings} label="Settings" />
        
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