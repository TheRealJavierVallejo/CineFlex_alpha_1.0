import React from 'react';
import { Type, AlignCenter, MessageSquare, StickyNote, ArrowRight, LayoutList } from 'lucide-react';

interface EditorToolbarProps {
    onInsert: (type: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsert }) => {
    // We use onMouseDown + preventDefault to keep the focus on the textarea
    const handleAction = (e: React.MouseEvent, text: string) => {
        e.preventDefault(); 
        onInsert(text);
    };

    return (
        <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-2 gap-1 select-none">
            <ToolbarButton 
                icon={<LayoutList className="w-4 h-4" />} 
                label="Scene Heading" 
                shortcut="S"
                onMouseDown={(e) => handleAction(e, '\n\nINT. ')} 
            />
            <div className="w-[1px] h-4 bg-[#333] mx-1" />
            
            <ToolbarButton 
                icon={<Type className="w-4 h-4" />} 
                label="Action" 
                shortcut="A"
                onMouseDown={(e) => handleAction(e, '\n')} 
            />
            <ToolbarButton 
                icon={<AlignCenter className="w-4 h-4" />} 
                label="Character" 
                shortcut="C"
                onMouseDown={(e) => handleAction(e, '\n\nCHARACTER\n')} 
            />
            <ToolbarButton 
                icon={<MessageSquare className="w-4 h-4" />} 
                label="Dialogue" 
                shortcut="D"
                onMouseDown={(e) => handleAction(e, '\n')} 
            />
            <ToolbarButton 
                icon={<ArrowRight className="w-4 h-4" />} 
                label="Transition" 
                shortcut="T"
                onMouseDown={(e) => handleAction(e, '\n\nTO: ')} 
            />
            
            <div className="flex-1" />
            
            <ToolbarButton 
                icon={<StickyNote className="w-4 h-4" />} 
                label="Note" 
                onMouseDown={(e) => handleAction(e, ' [[Note]] ')} 
            />
        </div>
    );
};

interface ToolbarButtonProps {
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    onMouseDown: (e: React.MouseEvent) => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, shortcut, onMouseDown }) => (
    <button 
        onMouseDown={onMouseDown}
        className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[#CCCCCC] hover:bg-[#3E3E42] hover:text-white transition-colors text-xs font-medium group relative"
        title={label}
        type="button"
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