import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = "",
    variant = "rounded",
    width,
    height,
    animate = true
}) => {
    const baseClasses = `bg-surface-secondary/50 ${animate ? 'animate-pulse' : ''}`;

    let radiusClass = "rounded-sm";
    if (variant === "circular") radiusClass = "rounded-full";
    if (variant === "rectangular") radiusClass = "rounded-none";
    if (variant === "rounded") radiusClass = "rounded-md";

    return (
        <div
            className={`${baseClasses} ${radiusClass} ${className}`}
            style={{ width, height }}
        />
    );
};

export const ShotCardSkeleton = () => (
    <div className="bg-surface border border-border rounded-sm overflow-hidden h-full flex flex-col">
        <div className="aspect-video bg-surface-secondary animate-pulse" />
        <div className="p-2 space-y-2">
            <Skeleton height={10} width="80%" />
            <div className="flex justify-between">
                <Skeleton height={8} width="30%" />
                <Skeleton height={8} width="20%" />
            </div>
        </div>
    </div>
);

export type { SkeletonProps };
export default Skeleton;