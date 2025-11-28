/*
 * 🖼️ COMPONENT: VARIATION PICKER
 * 
 * This is the pop-up window that appears when you generate batch images (2 or 4 at once).
 * It shows you a grid of options so you can pick the best one.
 * 
 * Features:
 * - 2x2 Grid View
 * - "Regenerate" specific slots if they look bad
 * - "Select" the winner
 */

import React from 'react';
import { Check, RefreshCw, Wand2, X } from 'lucide-react';

interface VariationPickerProps {
  candidates: string[];
  onSelect: (image: string) => void;
  onCancel: () => void;
  onGenerateMore: () => void;
  onRegenerateSlot: (index: number) => void;
  isGeneratingMore: boolean;
  generatingSlotIndex: number | null;
}

export const VariationPicker: React.FC<VariationPickerProps> = ({
  candidates,
  onSelect,
  onCancel,
  onGenerateMore,
  onRegenerateSlot,
  isGeneratingMore,
  generatingSlotIndex
}) => {
  return (
    <div className="fixed inset-0 z-[60] overlay-dark flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-[900px] border border-border rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="h-12 bg-[#09090b] border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="font-bold text-text-primary text-sm tracking-wide">SELECT VARIATION</span>
            <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-sm font-mono">{candidates.length} OPTIONS</span>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 media-bg">
          <div className={`grid gap-4 h-full ${candidates.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {candidates.map((img, idx) => (
              <div key={idx} className="relative group rounded-sm overflow-hidden bg-zinc-900 transition-all flex flex-col border border-border hover:border-primary">

                {/* Image Area */}
                <div
                  className="flex-1 relative cursor-pointer overflow-hidden media-bg"
                  onClick={() => onSelect(img)}
                >
                  <img src={img} className="block w-full h-full object-contain border-none outline-none m-0 p-0 bg-transparent transform scale-[1.01] transition-transform group-hover:scale-105" />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-sm font-bold text-xs shadow-lg transform scale-95 group-hover:scale-100 transition-transform flex items-center gap-2">
                      <Check className="w-4 h-4" /> SELECT OPTION {idx + 1}
                    </button>
                  </div>

                  {/* Loading State for Slot */}
                  {generatingSlotIndex === idx && (
                    <div className="absolute inset-0 media-control flex items-center justify-center z-10 backdrop-blur-sm">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  )}
                </div>

                {/* Footer Controls for Slot */}
                <div className="h-8 bg-[#09090b] border-t border-border flex items-center justify-between px-3">
                  <span className="text-[10px] font-mono text-zinc-500">OPTION {idx + 1}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRegenerateSlot(idx); }}
                    disabled={generatingSlotIndex !== null}
                    className="text-[10px] flex items-center gap-1 text-zinc-400 hover:text-primary disabled:opacity-50 transition-colors"
                    title="Regenerate this specific variation"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-14 bg-[#09090b] border-t border-border flex items-center justify-between px-4 shrink-0">
          <div className="text-[11px] text-zinc-500">
            Select an image to save it as the final shot. Unselected variations will be discarded.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-border bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-sm text-xs font-bold uppercase tracking-wide transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onGenerateMore}
              disabled={isGeneratingMore}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-sm text-xs font-bold uppercase tracking-wide flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingMore ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Generate New Batch
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};