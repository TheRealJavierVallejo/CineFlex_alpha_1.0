import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface WelcomeBannerProps {
    projectId: string;
    projectName: string;
    onImportScript: () => void;
    onDismiss: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
    projectId,
    projectName,
    onImportScript,
    onDismiss
}) => {
    const navigate = useNavigate();

    return (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 relative shrink-0">
            <div className="max-w-5xl mx-auto px-8 py-10">
                {/* Close button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors p-1"
                    aria-label="Dismiss welcome"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary mb-2">
                            Welcome to {projectName}
                        </h2>
                        <p className="text-text-secondary text-sm">
                            Your project is ready. Choose how you want to start:
                        </p>
                    </div>

                    {/* Action buttons - horizontal layout */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={onImportScript}
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium inline-flex items-center gap-2 text-sm shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Import Script
                        </button>

                        <button
                            onClick={() => navigate(`/project/${projectId}/script`)}
                            className="px-6 py-3 bg-surface border border-border text-text-primary rounded-lg hover:border-primary transition-colors font-medium inline-flex items-center gap-2 text-sm shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Write Script
                        </button>

                        <button
                            onClick={() => navigate(`/project/${projectId}/timeline`)}
                            className="px-6 py-3 bg-surface border border-border text-text-primary rounded-lg hover:border-primary transition-colors font-medium inline-flex items-center gap-2 text-sm shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                            Build Scenes
                        </button>
                    </div>

                    {/* Tip */}
                    <p className="text-[11px] text-text-secondary flex items-center gap-2 opacity-80">
                        <span className="text-primary font-bold uppercase tracking-wider text-[10px]">💡 Pro tip</span>
                        <span>Press <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] font-mono">⌘K</kbd> to open the command palette anytime</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
