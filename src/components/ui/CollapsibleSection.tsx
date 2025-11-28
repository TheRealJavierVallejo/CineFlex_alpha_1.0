import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  actions?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = false,
  className = '',
  actions
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border-b border-border bg-surface ${className}`}>
      <div
        className="flex items-center justify-between h-8 px-2 cursor-pointer hover:bg-white/5 select-none transition-colors group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
             <ChevronRight className="w-3 h-3" />
          </span>
          
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wide group-hover:text-text-primary">
            {icon && <span className="opacity-70">{icon}</span>}
            <span className="truncate">{title}</span>
          </div>
        </div>

        {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>

      {isOpen && (
        <div className="p-3 bg-[#0a0a0a] animate-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};