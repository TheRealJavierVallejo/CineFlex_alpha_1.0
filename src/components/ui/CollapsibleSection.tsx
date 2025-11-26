import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    defaultOpen = true,
    children
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-secondary transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    {icon && <span className="text-primary">{icon}</span>}
                    <span className="font-semibold text-text-primary">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-text-tertiary" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-text-tertiary" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleSection;
