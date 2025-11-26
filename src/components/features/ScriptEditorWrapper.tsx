import React, { useCallback, useState } from 'react';
import { Project } from '../../types';
import { FountainEditor } from '../../modules/fountain';
import { debounce } from '../../utils/debounce';

interface ScriptEditorWrapperProps {
    project: Project;
    onUpdateProject: (project: Project) => void;
}

export const ScriptEditorWrapper: React.FC<ScriptEditorWrapperProps> = ({ project, onUpdateProject }) => {
    // Local state to prevent editor stuttering while typing
    const [localContent, setLocalContent] = useState(project.scriptContent || '');

    // Debounced save function
    const saveToProject = useCallback(
        debounce((content: string) => {
            onUpdateProject({
                ...project,
                scriptContent: content
            });
        }, 1000), // Wait 1 second after typing stops before saving to DB
        [project, onUpdateProject]
    );

    const handleChange = (newContent: string) => {
        setLocalContent(newContent);
        saveToProject(newContent);
    };

    return (
        <div className="h-full w-full">
            <FountainEditor 
                initialContent={project.scriptContent || ''} 
                onChange={handleChange}
            />
        </div>
    );
};