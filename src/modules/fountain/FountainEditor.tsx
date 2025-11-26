import React, { useState, useEffect, useRef } from 'react';
import { EditorProps, EditorStats } from './types';
import { EditorToolbar } from './EditorToolbar';

export const FountainEditor: React.FC<EditorProps> = ({ 
    initialContent = '', 
    onChange,
    readOnly = false,
    className = ''
}) => {
    const [content, setContent] = useState(initialContent);
    const [stats, setStats] = useState<EditorStats>({ sceneCount: 0, wordCount: 0, pageCountEstimate: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Basic Stats Calculation
    useEffect(() => {
        const scenes = (content.match(/^(INT\.|EXT\.)/gm) || []).length;
        const words = content.trim().split(/\s+/).length;
        // Hollywood Standard: ~250 words per page or ~55 lines per page
        const lines = content.split('\n').length;
        const pages = Math.max(1, Math.ceil(lines / 55));

        setStats({
            sceneCount: scenes,
            wordCount: content ? words : 0,
            pageCountEstimate: pages
        });
    }, [content]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setContent(newVal);
        if (onChange) onChange(newVal);
    };

    const handleInsert = (textToInsert: string) => {
        if (!textareaRef.current) return;
        
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = content;
        
        // Insert text at cursor
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        
        setContent(newText);
        if (onChange) onChange(newText);
        
        // Restore focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
            }
        }, 0);
    };

    return (
        <div className={`flex flex-col h-full bg-[#1E1E1E] border-r border-[#333] ${className}`}>
            {!readOnly && <EditorToolbar onInsert={handleInsert} />}
            
            <div className="flex-1 relative overflow-hidden flex bg-[#121212]">
                {/* Gutter / Line Numbers (Optional placeholder) */}
                <div className="w-12 bg-[#1E1E1E] border-r border-[#333] hidden md:block"></div>

                {/* The Editor Canvas */}
                <div className="flex-1 relative overflow-y-auto custom-scrollbar flex justify-center p-8">
                    <div className="w-full max-w-[800px] bg-white min-h-[1000px] shadow-2xl p-[1in] text-black">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleChange}
                            readOnly={readOnly}
                            className="w-full h-full resize-none outline-none font-[family-name:var(--font-family-screenplay)] text-[12pt] leading-relaxed bg-transparent"
                            placeholder="START WRITING..."
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] select-none">
                <div className="flex gap-4">
                    <span>{stats.pageCountEstimate} PAGES (Est)</span>
                    <span>{stats.wordCount} WORDS</span>
                </div>
                <div>
                    SCENES: {stats.sceneCount}
                </div>
            </div>
        </div>
    );
};
</dyad-file>

<dyad-write path="src/modules/fountain/index.ts" description="Exporting the module components">
export * from './FountainEditor';
export * from './types';