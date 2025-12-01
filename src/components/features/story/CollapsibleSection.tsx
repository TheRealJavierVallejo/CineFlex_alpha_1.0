import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    rightElement?: React.ReactNode;
    isLocked?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultExpanded = false,
    className = '',
    rightElement,
    isLocked = false
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded && !isLocked);

    // If locked, force collapsed
    if (isLocked && isExpanded) setIsExpanded(false);

    return (
        <div className={`border-b border-border/50 last:border-0 ${className} ${isLocked ? 'opacity-50' : ''}`}>
            <div
                className={`flex items-center justify-between py-4 select-none ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer group'}`}
                onClick={() => !isLocked && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {isLocked ? (
                        <Lock className="w-4 h-4 text-text-secondary" />
                    ) : (
                        isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-text-secondary group-hover:text-primary" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-primary" />
                        )
                    )}
                    {title}
                </div>
                {rightElement && (
                    <div onClick={(e) => e.stopPropagation()}>
                        {rightElement}
                    </div>
                )}
            </div>

            {isExpanded && !isLocked && (
                <div className="pb-6 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};
