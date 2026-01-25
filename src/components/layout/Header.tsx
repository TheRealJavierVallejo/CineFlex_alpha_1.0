import React from 'react';
import { SaveIndicator } from '../ui/SaveIndicator';

interface HeaderProps {
    projectName: string;
}

// Memoized to prevent re-renders when project data changes but name stays same
export const Header = React.memo<HeaderProps>(({ projectName }) => {
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
});

export default Header;
