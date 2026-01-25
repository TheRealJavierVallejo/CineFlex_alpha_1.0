import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyImageProps {
    src: string;
    alt?: string;
    className?: string;
    loadingClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt = '',
    className = '',
    loadingClassName = ''
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

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
                rootMargin: '50px'
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative w-full h-full">
            {!isLoaded && (
                <div className={`absolute inset-0 flex items-center justify-center bg-surface-secondary ${loadingClassName}`}>
                    <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
                </div>
            )}
            <img
                ref={imgRef}
                src={isInView ? src : ''}
                alt={alt}
                className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                onLoad={() => setIsLoaded(true)}
            />
        </div>
    );
};