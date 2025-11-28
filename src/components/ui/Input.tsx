import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[11px] font-medium text-text-secondary mb-1.5 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-[#18181b] border border-[#27272a] 
            text-[13px] text-text-primary 
            rounded px-3 py-1.5 h-8
            outline-none transition-colors
            focus:border-primary focus:bg-[#09090b] focus:ring-1 focus:ring-primary/20
            placeholder:text-text-muted/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-[11px] text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;