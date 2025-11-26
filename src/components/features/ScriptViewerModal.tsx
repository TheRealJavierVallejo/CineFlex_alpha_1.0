import React from 'react';
import { ScriptElement } from '../../types';
import Modal from '../ui/Modal';
import { ScrollText } from 'lucide-react';

interface ScriptViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    scriptElements: ScriptElement[];
    filename?: string;
}

export const ScriptViewerModal: React.FC<ScriptViewerModalProps> = ({ 
    isOpen, 
    onClose, 
    scriptElements,
    filename 
}) => {
    // Helper to get script style based on type
    const getElementStyle = (type: ScriptElement['type']) => {
        const base = "font-[family-name:var(--font-family-screenplay)] text-base mb-3 leading-relaxed text-[#E8E8E8]";
        switch (type) {
            case 'scene_heading': 
                return `${base} font-bold uppercase mt-6 mb-4 pt-4 border-t border-[#333] tracking-wider text-[#FFFFFF]`;
            case 'character': 
                return `${base} font-bold uppercase text-center mt-4 mb-0 text-[#FFFFFF] tracking-wide`;
            case 'dialogue': 
                return `${base} text-center max-w-[450px] mx-auto whitespace-pre-wrap mb-4`;
            case 'parenthetical': 
                return `${base} italic text-sm text-center -mt-1 mb-1 text-[#A0A0A0]`;
            case 'transition': 
                return `${base} font-bold uppercase text-right mt-4 mb-4 pr-8 text-[#FFFFFF]`;
            default: 
                return `${base} whitespace-pre-wrap text-[#CCCCCC]`; // Action
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={filename || "Script Viewer"}
            size="xl"
        >
            <div className="flex flex-col h-[70vh]">
                <div className="bg-[#121212] flex-1 overflow-y-auto p-8 rounded border border-[#333] shadow-inner custom-scrollbar">
                    {scriptElements.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#505050]">
                            <ScrollText className="w-12 h-12 mb-4 opacity-20" />
                            <p>No script content available.</p>
                        </div>
                    ) : (
                        <div className="max-w-[800px] mx-auto pb-20">
                            {/* Title Page Simulation */}
                            <div className="text-center py-20 mb-10 border-b border-[#333] border-dashed">
                                <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-family-screenplay)] uppercase tracking-widest mb-4">
                                    {filename?.replace(/\.(fountain|txt)$/i, '') || 'SCREENPLAY'}
                                </h1>
                                <p className="text-[#707070] text-sm font-mono">IMPORTED SCRIPT</p>
                            </div>

                            {/* Script Content */}
                            {scriptElements
                                .sort((a, b) => a.sequence - b.sequence)
                                .map(el => (
                                    <div key={el.id} className={getElementStyle(el.type)}>
                                        {el.content}
                                    </div>
                                ))
                            }
                            
                            <div className="text-center mt-20 text-[#333] font-mono text-xs">
                                [ END OF SCRIPT ]
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-4 flex justify-between items-center text-xs text-[#707070]">
                    <span>{scriptElements.length} elements</span>
                    <span>Format: Standard Screenplay</span>
                </div>
            </div>
        </Modal>
    );
};