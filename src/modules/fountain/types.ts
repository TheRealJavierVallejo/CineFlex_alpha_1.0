export interface EditorProps {
    initialContent?: string;
    onChange?: (content: string) => void;
    readOnly?: boolean;
    className?: string;
}

export type FountainBlockType = 
    | 'scene_heading'
    | 'action'
    | 'character'
    | 'dialogue'
    | 'parenthetical'
    | 'transition'
    | 'note';

export interface EditorStats {
    sceneCount: number;
    wordCount: number;
    pageCountEstimate: number;
}