import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
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
  
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none border";
  
  const sizeStyles = {
    sm: "h-6 px-2 text-[10px] gap-1.5 rounded-sm",
    md: "h-7 px-3 text-xs gap-2 rounded-sm",
    lg: "h-9 px-4 text-sm gap-2 rounded-sm"
  };

  const variantStyles = {
    primary: "bg-primary hover:bg-primary-hover text-white border-primary/50 shadow-sm",
    secondary: "bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] border-white/10 hover:border-white/20",
    ghost: "bg-transparent hover:bg-white/5 text-[#a1a1aa] hover:text-[#e4e4e7] border-transparent",
    danger: "bg-red-900/30 hover:bg-red-900/50 text-red-200 border-red-900/50"
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${sizeStyles[size]} 
        ${variantStyles[variant]} 
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {!loading && icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;