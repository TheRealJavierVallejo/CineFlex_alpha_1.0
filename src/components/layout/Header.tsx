import React from 'react';
import { SaveIndicator } from '../ui/SaveIndicator';

interface HeaderProps {
    projectName: string;
}

export const Header: React.FC<HeaderProps> = ({ projectName }) => {
    return (
        <header className="h-10 border-b border-border flex items-center justify-between px-4 bg-background shrink-0 z-30">
            <div className="text-xs font-bold text-text-secondary truncate uppercase tracking-widest font-mono">
                {projectName}
            </div>

            <div className="flex items-center gap-4">
                <SaveIndicator />
                {/* Future home for user profiles, search, etc. */}
            </div>
        </header>
    );
};

export default Header;
