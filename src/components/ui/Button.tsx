import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'secondary',
        size = 'md',
        loading = false,
        icon,
        children,
        className = '',
        disabled,
        ...props
    }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-100 select-none cursor-pointer rounded-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px';

        const variants = {
            primary: 'bg-accent text-white hover:bg-accent-hover focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-app',
            secondary: 'bg-[#2D2D30] border border-border text-text-primary hover:bg-[#3E3E42] focus:border-border-focus',
            ghost: 'bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary',
            danger: 'bg-status-error text-white hover:bg-status-error/90 focus:ring-2 focus:ring-status-error focus:ring-offset-2 focus:ring-offset-app',
        };

        const sizes = {
            sm: 'h-6 px-2 text-xs',
            md: 'h-7 px-3 text-sm',
            lg: 'h-9 px-4 text-base',
        };

        const iconSizes = {
            sm: 'w-3 h-3',
            md: 'w-3.5 h-3.5',
            lg: 'w-4 h-4',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <Loader2 className={`${iconSizes[size]} animate-spin`} />
                ) : icon ? (
                    <span className={iconSizes[size]}>{icon}</span>
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
