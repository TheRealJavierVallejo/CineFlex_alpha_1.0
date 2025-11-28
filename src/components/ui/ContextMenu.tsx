import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'danger';
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    // Also close on window blur or resize
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Adjust position to ensure menu stays on screen
  // (Simplified for now, in a real app we'd measure window bounds)
  const style = {
    top: Math.min(y, window.innerHeight - (items.length * 36)),
    left: Math.min(x, window.innerWidth - 180),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] bg-[#252526] border border-[#333] shadow-xl rounded-[3px] py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.separator && <div className="h-[1px] bg-[#333] my-1 mx-2" />}
          <button
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-xs text-left w-full hover:bg-[#007ACC] hover:text-white transition-colors
              ${item.variant === 'danger' ? 'text-[#F48771] hover:bg-[#F48771] hover:text-white' : 'text-[#CCCCCC]'}
            `}
          >
            {item.icon && <span className="w-4 h-4 opacity-70">{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};