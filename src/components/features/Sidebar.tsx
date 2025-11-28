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
          w-full h-10 flex items-center gap-3 px-3 mb-1 rounded-md transition-all duration-200 group relative overflow-hidden
          ${isActive 
            ? 'bg-primary/10 text-primary font-medium shadow-[inset_3px_0_0_0_rgba(59,130,246,1)]' 
            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}
        `}
        title={label}
      >
        {({ isActive }) => (
            <>
                <Icon className={`w-5 h-5 shrink-0 transition-all duration-300 ${isActive ? 'text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'text-text-muted group-hover:text-text-primary'}`} />
                
                {!isCollapsed && (
                <span className="text-sm truncate animate-in fade-in slide-in-from-left-2 duration-300 delay-75">{label}</span>
                )}
            </>
        )}
      </NavLink>
    );
  };

  return (
    <aside 
      className={`
        relative bg-surface border-r border-border flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-20 shadow-xl
        ${isCollapsed ? 'w-[56px]' : 'w-[240px]'}
      `}
    >
      {/* Activity Bar Top */}
      <div className="flex flex-col gap-1 p-3 pt-4">
        {/* The index route is technically "", so we link to "." */}
        <NavItem to="." exact icon={LayoutGrid} label="Dashboard" />
        <NavItem to="timeline" icon={Clapperboard} label="Timeline" />
        <NavItem to="script" icon={FileText} label="Script" />
        <NavItem to="assets" icon={Users} label="Assets" />
      </div>

      <div className="flex-1" />

      {/* Settings & Toggle Bottom */}
      <div className="p-3 flex flex-col gap-1 border-t border-border bg-surface-secondary/30 backdrop-blur-sm">
        <NavItem to="settings" icon={Settings} label="Settings" />
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-10 flex items-center justify-center rounded-md text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors mt-2"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5 transition-transform duration-300" /> : <ChevronLeft className="w-5 h-5 transition-transform duration-300" />}
        </button>
      </div>

    </aside>
  );
};