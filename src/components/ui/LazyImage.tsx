import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyImageProps {
    src?: string;
    alt?: string;
    className?: string;
    loadingClassName?: string;
    aspectRatio?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt = '',
    className = '',
    loadingClassName = '',
    aspectRatio = '16/9'
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '100px'
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, []);

    if (!src) {
        return (
            <div className={`flex items-center justify-center bg-surface-secondary ${className}`} style={{ aspectRatio }}>
                <Loader2 className="w-6 h-6 text-text-tertiary" />
            </div>
        );
    }

    return (
        <div ref={imgRef} className={`relative ${className}`} style={{ aspectRatio }}>
            {!isLoaded && isInView && (
                <div className={`absolute inset-0 flex items-center justify-center bg-surface-secondary ${loadingClassName}`}>
                    <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
                </div>
            )}
            {isInView && src && (
                <img
                    src={src}
                    alt={alt}
                    className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
};