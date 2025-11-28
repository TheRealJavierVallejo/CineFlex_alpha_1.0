import React, { useState, ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

export interface Tool {
  id: string;
  icon: ReactNode;
  label: string;
  content: ReactNode;
}

interface PageWithToolRailProps {
  children: ReactNode;
  tools: Tool[];
  defaultTool?: string | null;
}

export const PageWithToolRail: React.FC<PageWithToolRailProps> = ({
  children,
  tools,
  defaultTool = null
}) => {
  const [activeToolId, setActiveToolId] = useState<string | null>(defaultTool);

  const activeTool = tools.find(t => t.id === activeToolId);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      
      {/* 1. PERSISTENT RAIL (Far Left) */}
      <div className="w-[50px] bg-background border-r border-border flex flex-col items-center py-4 gap-4 shrink-0 z-30">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveToolId(activeToolId === tool.id ? null : tool.id)}
            className={`
              w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200 group relative
              ${activeToolId === tool.id 
                ? 'bg-primary text-white shadow-glow' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}
            `}
            title={tool.label}
          >
            {tool.icon}
            
            {/* Tooltip on Hover */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-surface text-text-primary border border-border text-[10px] font-bold uppercase tracking-wide rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {tool.label}
            </div>
          </button>
        ))}
      </div>

      {/* 2. SLIDING TOOL PANEL */}
      <div 
        className={`
          relative border-r border-border bg-surface flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-20
          ${activeToolId ? 'w-[320px] translate-x-0 opacity-100' : 'w-0 -translate-x-4 opacity-0 overflow-hidden'}
        `}
      >
        {activeTool && (
            <>
                <div className="h-10 border-b border-border flex items-center justify-between px-4 shrink-0 bg-surface">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary truncate">
                        {activeTool.label}
                    </span>
                    <button 
                        onClick={() => setActiveToolId(null)}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-[320px]">
                    {activeTool.content}
                </div>
            </>
        )}
      </div>

      {/* 3. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-background z-10">
         {children}
      </div>
    </div>
  );
};