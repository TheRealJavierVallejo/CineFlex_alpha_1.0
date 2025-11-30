import React, { useState, useEffect } from 'react';
import { ImageLibraryItem } from '../../types';
import { getImageLibrary } from '../../services/storage';
import { X, Plus, Search, Image as ImageIcon, Loader2, LayoutGrid, Film } from 'lucide-react';
import Button from '../ui/Button';

interface ImageSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: ImageLibraryItem | null) => void; // null means "Create Blank"
    projectId: string;
}

export const ImageSelectorModal: React.FC<ImageSelectorModalProps> = ({ isOpen, onClose, onSelect, projectId }) => {
    const [images, setImages] = useState<ImageLibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'favorites'>('all');

    useEffect(() => {
        if (isOpen) {
            loadLibrary();
        }
    }, [isOpen, projectId]);

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const lib = await getImageLibrary(projectId);
            setImages(lib);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredImages = images.filter(img => {
        const matchesSearch = (img.prompt || '').toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overlay-dark backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-5xl h-[85vh] border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface-secondary shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <LayoutGrid className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-text-primary">Add Shot</h2>
                            <p className="text-xs text-text-secondary">Select an existing image or create a blank shot</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full text-text-tertiary hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-border flex gap-4 bg-surface shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search library..."
                            className="w-full h-10 bg-background border border-border rounded-md pl-9 pr-4 text-sm text-text-primary outline-none focus:border-primary transition-colors"
                        />
                    </div>
                    <Button variant="secondary" onClick={loadLibrary} icon={<Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}>
                        Refresh
                    </Button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-background">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

                        {/* Option 1: Create Blank Shot */}
                        <button
                            onClick={() => onSelect(null)}
                            className="aspect-video bg-surface border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-lg flex flex-col items-center justify-center gap-3 group transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-surface-secondary group-hover:bg-primary group-hover:text-white flex items-center justify-center text-text-tertiary transition-colors">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-text-primary group-hover:text-primary text-sm">Create Blank Shot</span>
                        </button>

                        {/* Library Images */}
                        {filteredImages.map((img) => (
                            <div
                                key={img.id}
                                onClick={() => onSelect(img)}
                                className="group relative aspect-video media-bg rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-primary transition-all"
                            >
                                <img src={img.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />

                                {/* Info Overlay */}
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                                    <p className="text-[10px] text-white/90 line-clamp-2">{img.prompt || "No description"}</p>
                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-white/50">
                                        <ImageIcon className="w-3 h-3" />
                                        <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Selection Indicator */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="bg-primary text-white text-[10px] px-2 py-1 rounded shadow-lg font-medium">Select</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-12 border-t border-border bg-surface-secondary flex items-center justify-between px-6 shrink-0 text-xs text-text-tertiary">
                    <span>{filteredImages.length} images available</span>
                    <span>Pro Tip: Reusing an image creates a "Cut Back"</span>
                </div>
            </div>
        </div>
    );
};