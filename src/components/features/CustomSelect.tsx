/*
 * 🔽 COMPONENT: CUSTOM SELECT (Hybrid Dropdown)
 * 
 * This looks like a normal dropdown menu, but with a superpower:
 * You can select from the list OR type your own "Custom" value.
 * 
 * Used for: Era, Style, Lighting settings.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Plus } from 'lucide-react';

export interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  customOptions?: string[];
  onChange: (val: string) => void;
  onAddCustom: (val: string) => void;
  onDeleteCustom: (val: string) => void;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  customOptions = [],
  onChange,
  onAddCustom,
  onDeleteCustom
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if you click outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVal.trim()) {
      onAddCustom(newVal.trim());
      setNewVal('');
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="text-[11px] font-bold text-zinc-500 uppercase">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-8 input-bg border border-border px-2 text-[12px] text-text-secondary focus:border-primary outline-none flex items-center justify-between hover:border-text-muted rounded-sm transition-colors"
        >
          <span className="truncate">{value}</span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-1 bg-[#09090b] border border-border shadow-xl rounded-sm z-50 max-h-60 overflow-y-auto">

            {/* Custom Options Section (Your added items) */}
            {customOptions.length > 0 && (
              <div className="border-b border-border pb-1 mb-1">
                <div className="px-2 py-1 text-[10px] text-zinc-500 font-bold uppercase">Custom</div>
                {customOptions.map(opt => (
                  <div key={opt} className="flex items-center justify-between px-2 py-1.5 hover:bg-primary hover:text-white group cursor-pointer text-[12px] text-zinc-300" onClick={() => { onChange(opt); setIsOpen(false); }}>
                    <span>{opt}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteCustom(opt); }}
                      className="p-0.5 hover:bg-red-500 rounded text-zinc-500 group-hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Standard Options (The presets) */}
            <div className="border-b border-border pb-1 mb-1">
              {options.map(opt => (
                <div
                  key={opt}
                  className={`px-2 py-1.5 hover:bg-primary hover:text-white cursor-pointer text-[12px] transition-colors ${value === opt ? 'bg-zinc-800 text-white' : 'text-zinc-300'}`}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                >
                  {opt}
                </div>
              ))}
            </div>

            {/* Add Custom Button */}
            {isAdding ? (
              <form onSubmit={handleAddSubmit} className="p-2 flex items-center gap-1">
                <input
                  autoFocus
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  className="w-full input-bg border border-border px-2 py-1 text-[12px] text-text-primary focus:border-primary outline-none rounded-sm"
                  placeholder="Enter custom value..."
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-2 py-1 rounded-sm text-[11px] font-bold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-zinc-500 hover:text-white px-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full text-left px-2 py-2 text-[11px] text-primary hover:bg-zinc-800 font-bold flex items-center gap-1 uppercase tracking-wide"
              >
                <Plus className="w-3 h-3" /> Add Custom...
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};