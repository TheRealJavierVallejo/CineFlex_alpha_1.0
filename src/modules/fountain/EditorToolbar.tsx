import React from 'react';
import { Type, AlignCenter, MessageSquare, StickyNote, ArrowRight, LayoutList } from 'lucide-react';

interface EditorToolbarProps {
    onInsert: (type: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsert }) => {
    return (
        <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-2 gap-1 select-none">
            <ToolbarButton 
                icon={<LayoutList className="w-4 h-4" />} 
                label="Scene Heading" 
                shortcut="S"
                onClick={() => onInsert('INT. ')} 
            />
            <div className="w-[1px] h-4 bg-[#333] mx-1" />
            
            <ToolbarButton 
                icon={<Type className="w-4 h-4" />} 
                label="Action" 
                shortcut="A"
                onClick={() => onInsert('Action')} 
            />
            <ToolbarButton 
                icon={<AlignCenter className="w-4 h-4" />} 
                label="Character" 
                shortcut="C"
                onClick={() => onInsert('CHARACTER')} 
            />
            <ToolbarButton 
                icon={<MessageSquare className="w-4 h-4" />} 
                label="Dialogue" 
                shortcut="D"
                onClick={() => onInsert('Dialogue')} 
            />
            <ToolbarButton 
                icon={<ArrowRight className="w-4 h-4" />} 
                label="Transition" 
                shortcut="T"
                onClick={() => onInsert('TO: ')} 
            />
            
            <div className="flex-1" />
            
            <ToolbarButton 
                icon={<StickyNote className="w-4 h-4" />} 
                label="Note" 
                onClick={() => onInsert('[[Note]]')} 
            />
        </div>
    );
};

const ToolbarButton: React.FC<{ icon: React.ReactNode, label: string, shortcut?: string, onClick: () => void }> = ({ icon, label, shortcut, onClick }) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[#CCCCCC] hover:bg-[#3E3E42] hover:text-white transition-colors text-xs font-medium group relative"
        title={label}
    >
        {icon}
        <span className="hidden xl:inline">{label}</span>
        {shortcut && (
            <span className="ml-1 text-[9px] bg-[#1E1E1E] px-1 rounded border border-[#333] text-[#969696] group-hover:text-[#CCCCCC]">
                {shortcut}
            </span>
        )}
    </button>
);