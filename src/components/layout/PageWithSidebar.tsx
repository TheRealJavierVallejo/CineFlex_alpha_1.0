import React, { useState } from 'react';
import { PanelLeft, ChevronLeft } from 'lucide-react';

interface PageWithSidebarProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}

export const PageWithSidebar: React.FC<PageWithSidebarProps> = ({ 
    children, 
    sidebarContent, 
    title = "TOOLS", 
    icon,
    defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex h-full w-full overflow-hidden relative bg-background">
      {/* SIDEBAR */}
      <div 
        className={`
            border-r border-border bg-surface flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] relative shrink-0 z-10
            ${isOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full opacity-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-surface">
            <div className="flex items-center gap-2 text-text-secondary">
                {icon && <span className="opacity-70">{icon}</span>}
                <span className="text-[10px] font-bold uppercase tracking-widest truncate">{title}</span>
            </div>
            <button 
                onClick={() => setIsOpen(false)} 
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="Collapse Sidebar"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-w-[280px]">
            {sidebarContent}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-background">
         
         {/* Toggle Button */}
         <div className={`absolute top-3 left-3 z-20 transition-all duration-300 ${isOpen ? 'opacity-0 pointer-events-none -translate-x-4' : 'opacity-100 translate-x-0'}`}>
            <button 
                onClick={() => setIsOpen(true)}
                className="w-8 h-8 bg-surface border border-border rounded-sm flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-text-secondary shadow-xl transition-all"
                title="Open Tools"
            >
                <PanelLeft className="w-4 h-4" />
            </button>
         </div>

         {children}
      </div>
    </div>
  );
};