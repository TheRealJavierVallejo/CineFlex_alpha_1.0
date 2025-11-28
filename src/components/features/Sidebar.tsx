/*
 * 🧭 COMPONENT: SIDEBAR (Command Rail)
 * ONYX Edition: Rectangular, Sharp, Technical
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
          w-full h-10 flex items-center gap-4 px-0 mb-1 transition-all duration-100 group relative
          ${isActive 
            ? 'bg-white/5 text-primary border-l-2 border-primary' 
            : 'text-text-muted hover:text-text-primary hover:bg-white/5 border-l-2 border-transparent'}
        `}
        title={label}
      >
        {({ isActive }) => (
            <>
                <div className="flex items-center justify-center w-12 shrink-0">
                    <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
                </div>
                
                {!isCollapsed && (
                <span className={`text-xs font-medium uppercase tracking-wider truncate animate-in fade-in slide-in-from-left-1 duration-200 ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {label}
                </span>
                )}
            </>
        )}
      </NavLink>
    );
  };

  return (
    <aside 
      className={`
        relative bg-[#050505] border-r border-border flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-20
        ${isCollapsed ? 'w-[50px]' : 'w-[200px]'}
      `}
    >
      {/* Activity Bar Top */}
      <div className="flex flex-col gap-0 pt-4">
        {/* The index route is technically "", so we link to "." */}
        <NavItem to="." exact icon={LayoutGrid} label="Dashboard" />
        <NavItem to="timeline" icon={Clapperboard} label="Timeline" />
        <NavItem to="script" icon={FileText} label="Script" />
        <NavItem to="assets" icon={Users} label="Assets" />
      </div>

      <div className="flex-1" />

      {/* Settings & Toggle Bottom */}
      <div className="flex flex-col gap-0 border-t border-border bg-[#050505]">
        <NavItem to="settings" icon={Settings} label="Config" />
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

    </aside>
  );
};