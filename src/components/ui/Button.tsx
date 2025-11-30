import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 focus:ring-offset-black select-none";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white border border-primary shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    secondary: "bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-zinc-700",
    ghost: "bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-800",
    danger: "bg-red-900/20 hover:bg-red-900/50 text-red-500 hover:text-red-200 border border-red-900/50"
  };

  const sizes = {
    sm: "h-6 px-3 text-[10px]",
    md: "h-8 px-4 text-[11px]",
    lg: "h-10 px-6 text-xs",
    icon: "h-8 w-8 p-0"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} rounded-sm ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
      ) : icon ? (
        <span className={`mr-2 ${size === 'icon' ? 'mr-0' : ''}`}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export type { ButtonProps };
export default Button;