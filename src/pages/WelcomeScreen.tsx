import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../layouts/WorkspaceLayout';

export const WelcomeScreen: React.FC = () => {
    const { project, importScript, showToast } = useWorkspace();
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <div className="max-w-2xl mx-auto px-8 text-center space-y-8">
                {/* Welcome Message */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-text-primary">
                        Welcome to {project.name}
                    </h1>
                    <p className="text-lg text-text-secondary">
                        Your project is ready. Let's start building your story.
                    </p>
                </div>

                {/* Quick Start Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                    {/* Card 1: Import Script */}
                    <button
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.fountain,.txt,.pdf';
                            input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                    try {
                                        await importScript(file);
                                        showToast('Script imported successfully', 'success');
                                        navigate(`/project/${project.id}/script`);
                                    } catch (error) {
                                        showToast('Failed to import script', 'error');
                                    }
                                }
                            };
                            input.click();
                        }}
                        className="p-6 bg-surface border border-border rounded-lg hover:border-primary transition-colors text-left group"
                    >
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-text-primary mb-2">Import Script</h3>
                        <p className="text-sm text-text-secondary">
                            Upload a Fountain, PDF, or text file to get started
                        </p>
                    </button>

                    {/* Card 2: Write in Editor */}
                    <button
                        onClick={() => navigate(`/project/${project.id}/script`)}
                        className="p-6 bg-surface border border-border rounded-lg hover:border-primary transition-colors text-left group"
                    >
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-text-primary mb-2">Write in Editor</h3>
                        <p className="text-sm text-text-secondary">
                            Start writing your screenplay from scratch
                        </p>
                    </button>

                    {/* Card 3: Create Scenes */}
                    <button
                        onClick={() => navigate(`/project/${project.id}/timeline`)}
                        className="p-6 bg-surface border border-border rounded-lg hover:border-primary transition-colors text-left group"
                    >
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-text-primary mb-2">Build Timeline</h3>
                        <p className="text-sm text-text-secondary">
                            Add scenes and shots manually
                        </p>
                    </button>
                </div>

                {/* Helpful Tip */}
                <div className="mt-12 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-text-secondary">
                        <span className="font-semibold text-primary">💡 Pro tip:</span> Press{' '}
                        <kbd className="px-2 py-1 bg-surface border border-border rounded text-xs font-mono">⌘K</kbd>{' '}
                        to open the command palette anytime
                    </p>
                </div>
            </div>
        </div>
    );
};
