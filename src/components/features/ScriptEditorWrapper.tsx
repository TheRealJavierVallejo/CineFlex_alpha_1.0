import React, { useCallback, useState } from 'react';
import { Project } from '../../types';
import { FountainEditor } from '../../modules/fountain';
import { debounce } from '../../utils/debounce';
import { parseFountainString } from '../../services/scriptParser';

interface ScriptEditorWrapperProps {
    project: Project;
    onUpdateProject: (project: Project) => void;
}

export const ScriptEditorWrapper: React.FC<ScriptEditorWrapperProps> = ({ project, onUpdateProject }) => {
    // Local state to prevent editor stuttering while typing
    const [localContent, setLocalContent] = useState(project.scriptContent || '');
    const [isParsing, setIsParsing] = useState(false);

    // Debounced save function
    const saveToProject = useCallback(
        debounce((content: string) => {
            setIsParsing(true);
            
            // 1. Parse the text to get structured elements
            const parsed = parseFountainString(content);
            
            // 2. Save text AND elements to project
            // NOTE: We do NOT overwrite scenes here to avoid destroying manual work in Timeline.
            // We only update scriptElements so they are available in the Picker.
            onUpdateProject({
                ...project,
                scriptContent: content,
                scriptElements: parsed.elements
            });
            
            setIsParsing(false);
        }, 1000), // Wait 1 second after typing stops before saving/parsing
        [project, onUpdateProject]
    );

    const handleChange = (newContent: string) => {
        setLocalContent(newContent);
        saveToProject(newContent);
    };

    return (
        <div className="h-full w-full relative">
            <FountainEditor 
                initialContent={project.scriptContent || ''} 
                onChange={handleChange}
            />
            
            {/* Sync Indicator */}
            <div className="absolute bottom-2 right-4 text-[10px] font-mono text-[#505050] pointer-events-none transition-opacity duration-300">
                {isParsing ? 'SYNCING STRUCTURE...' : 'STRUCTURE SYNCED'}
            </div>
        </div>
    );
};