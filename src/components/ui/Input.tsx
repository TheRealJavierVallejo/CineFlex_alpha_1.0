import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-[#050505] border border-zinc-800 text-zinc-200 text-xs px-3 py-2 rounded-sm
          outline-none transition-colors
          focus:border-primary focus:bg-black
          placeholder:text-zinc-700
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-[10px] text-red-500 mt-1 block font-mono">{error}</span>}
    </div>
  );
};

export default Input;