import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface LazyImageProps {
    src?: string;
    alt?: string;
    className?: string;
    placeholder?: React.ReactNode;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
    src, 
    alt, 
    className = "",
    placeholder
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Reset state if src changes
    useEffect(() => {
        if (isVisible) {
            setIsLoaded(false);
            setError(false);
        }
    }, [src, isVisible]);

    if (!src) {
        return (
            <div className={`flex items-center justify-center bg-surface-secondary ${className}`}>
                 {placeholder || <ImageIcon className="w-6 h-6 text-text-muted opacity-20" />}
            </div>
        );
    }

    return (
        <div ref={imgRef} className={`relative overflow-hidden bg-surface-secondary ${className}`}>
            {isVisible && !error && (
                <img
                    src={src}
                    alt={alt || "Shot content"}
                    className={`
                        w-full h-full object-cover transition-opacity duration-500
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setError(true)}
                />
            )}

            {/* Loading State */}
            {isVisible && !isLoaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
                    <Loader2 className="w-5 h-5 text-primary animate-spin opacity-50" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-secondary text-text-muted p-2 text-center">
                    <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                    <span className="text-[9px] uppercase">Failed to load</span>
                </div>
            )}
        </div>
    );
};