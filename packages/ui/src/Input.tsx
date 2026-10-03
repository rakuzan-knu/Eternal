import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  className,
  id,
  disabled,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const hasError = Boolean(error);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-wider text-neutral-400 uppercase select-none"
        >
          {label}
        </label>
      )}

      <div className="relative w-full flex items-center">
        {leftElement && (
          <div className="absolute left-3.5 z-10 flex items-center justify-center text-neutral-500 pointer-events-none">
            {leftElement}
          </div>
        )}

        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={clsx(
            'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-normal text-white placeholder-neutral-500',
            'bg-[#121214]/80 border transition-all duration-150 ease-out',
            'focus:outline-none focus:ring-1',
            hasError
              ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
              : 'border-neutral-800 focus:border-purple-500 focus:ring-purple-500/30',
            leftElement && 'pl-10',
            rightElement && 'pr-11',
            disabled && 'opacity-50 cursor-not-allowed bg-neutral-900/40',
            className,
          )}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-1 top-0 bottom-0 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {hasError && (
        <div
          id={`${inputId}-error`}
          role="alert"
          className="flex items-start gap-1.5 px-0.5 text-xs text-red-400 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {!hasError && hint && (
        <p id={`${inputId}-hint`} className="text-[11px] text-neutral-500 px-0.5 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}
