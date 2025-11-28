import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  
  const baseClass = "nle-btn justify-center shrink-0";
  
  const variants = {
    primary: "nle-btn-primary",
    secondary: "nle-btn-secondary",
    ghost: "nle-btn-ghost",
    danger: "bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-transparent"
  };

  const sizes = {
    sm: "h-6 px-2 text-[11px]",
    md: "h-8 px-3 text-xs",
    lg: "h-10 px-4 text-sm font-bold"
  };

  return (
    <button
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;