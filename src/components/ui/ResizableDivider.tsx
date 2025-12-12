import React, { useState, useEffect } from 'react';

interface ResizableDividerProps {
    onResize: (widthPercent: number) => void;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({ onResize }) => {
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const containerWidth = window.innerWidth - 64; // Subtract sidebar width
            const mouseX = e.clientX - 64; // Account for sidebar
            const newWidthPercent = ((containerWidth - mouseX) / containerWidth) * 100;
            onResize(newWidthPercent);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, onResize]);

    return (
        <div
            className={`w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0 ${isDragging ? 'bg-primary' : ''}`}
            onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            style={{ touchAction: 'none' }}
        />
    );
};
