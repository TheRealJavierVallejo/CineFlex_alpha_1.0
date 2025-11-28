import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  loading?: boolean; // Alias for isLoading
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading,
  loading,
  icon,
  className = '',
  disabled,
  ...props 
}) => {
  const isBusy = isLoading || loading;

  const baseStyles = "inline-flex items-center justify-center font-medium transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border select-none";
  
  // Note the change from rounded-md/lg to rounded (which is now 3px in config)
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white border-transparent shadow-sm",
    secondary: "bg-[#27272a] hover:bg-[#323235] text-[#e4e4e7] border-[#3f3f46]",
    ghost: "bg-transparent hover:bg-white/5 text-[#a1a1aa] hover:text-[#e4e4e7] border-transparent",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
  };

  const sizes = {
    sm: "text-[11px] h-7 px-2.5 rounded-sm gap-1.5",
    md: "text-[12px] h-8 px-3 rounded gap-2",
    lg: "text-[13px] h-10 px-4 rounded-md gap-2",
    icon: "h-8 w-8 p-0 rounded"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isBusy}
      {...props}
    >
      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {!isBusy && icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;