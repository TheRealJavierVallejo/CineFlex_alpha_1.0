
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
       <label className="text-[11px] font-bold text-[#A0A0A0] uppercase">{label}</label>
       <div className="relative">
         <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full h-8 bg-[#1E1E1E] border border-[#3A3A3A] px-2 text-[12px] text-[#E8E8E8] focus:border-[#0071EB] outline-none flex items-center justify-between hover:border-[#505050] rounded-[2px]"
         >
            <span className="truncate">{value}</span>
            <ChevronDown className="w-3 h-3 text-[#707070]" />
         </button>

         {isOpen && (
            <div className="absolute top-full left-0 w-full mt-1 bg-[#252525] border border-[#3A3A3A] shadow-xl rounded-[2px] z-50 max-h-60 overflow-y-auto">
               
               {/* Custom Options Section (Your added items) */}
               {customOptions.length > 0 && (
                 <div className="border-b border-[#3A3A3A] pb-1 mb-1">
                    <div className="px-2 py-1 text-[10px] text-[#505050] font-bold uppercase">Custom</div>
                    {customOptions.map(opt => (
                       <div key={opt} className="flex items-center justify-between px-2 py-1.5 hover:bg-[#0071EB] hover:text-white group cursor-pointer text-[12px] text-[#E8E8E8]" onClick={() => { onChange(opt); setIsOpen(false); }}>
                          <span>{opt}</span>
                          <button 
                             onClick={(e) => { e.stopPropagation(); onDeleteCustom(opt); }}
                             className="p-0.5 hover:bg-red-500 rounded text-[#A0A0A0] group-hover:text-white"
                          >
                             <X className="w-3 h-3" />
                          </button>
                       </div>
                    ))}
                 </div>
               )}

               {/* Standard Options (The presets) */}
               <div className="border-b border-[#3A3A3A] pb-1 mb-1">
                   {options.map(opt => (
                      <div 
                        key={opt} 
                        className={`px-2 py-1.5 hover:bg-[#0071EB] hover:text-white cursor-pointer text-[12px] ${value === opt ? 'bg-[#3A3A3A] text-white' : 'text-[#E8E8E8]'}`}
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
                       className="w-full bg-[#1E1E1E] border border-[#3A3A3A] px-2 py-1 text-[12px] text-[#E8E8E8] focus:border-[#0071EB] outline-none rounded-[2px]"
                       placeholder="Enter custom value..."
                     />
                     <button 
                       type="submit" 
                       className="bg-[#0071EB] text-white px-2 py-1 rounded-[2px] text-[11px]"
                     >
                       Add
                     </button>
                     <button 
                       type="button"
                       onClick={() => setIsAdding(false)}
                       className="text-[#A0A0A0] hover:text-white px-2"
                     >
                       <X className="w-3 h-3" />
                     </button>
                  </form>
               ) : (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full text-left px-2 py-2 text-[11px] text-[#0071EB] hover:bg-[#3A3A3A] font-medium flex items-center gap-1"
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
