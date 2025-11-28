import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  separator?: boolean;
  shortcut?: string;
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
    document.addEventListener('scroll', onClose, true); // Close on scroll
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  // Prevent menu from going off-screen
  const style = {
    top: Math.min(y, window.innerHeight - (items.length * 30)),
    left: Math.min(x, window.innerWidth - 200),
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-[9999] w-48 bg-[#18181b] border border-[#3f3f46] shadow-xl py-1 flex flex-col min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.separator && index > 0 && (
            <div className="h-[1px] bg-[#3f3f46] my-1 mx-2" />
          )}
          <button
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`
              flex items-center justify-between w-full px-3 py-1.5 text-xs text-left select-none
              ${item.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-primary hover:text-white cursor-pointer'}
              ${item.variant === 'danger' && !item.disabled ? 'text-red-400 hover:bg-red-600' : 'text-gray-200'}
            `}
          >
            <div className="flex items-center gap-2">
              {item.icon && <span className="w-3.5 h-3.5 opacity-70">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
            {item.shortcut && <span className="text-[9px] opacity-50 font-mono tracking-tighter">{item.shortcut}</span>}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};