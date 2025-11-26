import React from 'react';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
    size?: 'sm' | 'md';
    dot?: boolean;
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    className = '',
}) => {
    const variants = {
        default: 'bg-[#2D2D30] text-text-primary border-border',
        success: 'bg-status-success/20 text-status-success border-status-success/30',
        error: 'bg-status-error/20 text-status-error border-status-error/30',
        warning: 'bg-status-warning/20 text-status-warning border-status-warning/30',
        info: 'bg-status-info/20 text-status-info border-status-info/30',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    };

    const dotColors = {
        default: 'bg-text-secondary',
        success: 'bg-status-success',
        error: 'bg-status-error',
        warning: 'bg-status-warning',
        info: 'bg-status-info',
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1.5 rounded-sm border font-medium
        ${variants[variant]} ${sizes[size]} ${className}
      `}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
            {children}
        </span>
    );
};

export default Badge;
