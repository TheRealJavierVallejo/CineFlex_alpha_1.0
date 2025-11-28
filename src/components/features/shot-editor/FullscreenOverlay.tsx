import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface FullscreenOverlayProps {
    image: string;
    onClose: () => void;
}

export const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({ image, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] media-bg flex flex-col animate-in fade-in duration-200">
            <div className="h-16 flex items-center px-6 border-b border-white/10 media-control backdrop-blur-md absolute top-0 left-0 right-0 z-10">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Editor</span>
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
                <img
                    src={image}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    alt="Fullscreen Shot"
                />
            </div>
        </div>
    );
};
