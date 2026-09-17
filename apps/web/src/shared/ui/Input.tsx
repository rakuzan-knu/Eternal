import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, rightElement, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={`w-full bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 transition-all ${rightElement ? 'pr-11' : ''} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 text-neutral-400 cursor-pointer">{rightElement}</div>
          )}
        </div>
        {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
