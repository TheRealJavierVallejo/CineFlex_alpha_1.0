import React, { useRef, useEffect, useState } from 'react';

interface LazyImageProps {
    src: string | undefined;
    alt: string;
    className?: string;
    aspectRatio?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className = '', aspectRatio = '16/9' }) => {
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
            { rootMargin: '200px' }
        );

        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, []);

    if (!src) {
        return (
            <div
                ref={imgRef}
                className={`bg-surface-secondary flex items-center justify-center ${className}`}
                style={{ aspectRatio }}
            >
                <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div ref={imgRef} className={`relative ${className}`} style={{ aspectRatio }}>
            {!isInView ? (
                <div className="w-full h-full bg-surface-secondary animate-pulse" />
            ) : (
                <>
                    {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
                            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
                        </div>
                    )}
                    <img
                        src={src}
                        alt={alt}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        onLoad={() => setIsLoaded(true)}
                        loading="lazy"
                    />
                </>
            )}
        </div>
    );
};