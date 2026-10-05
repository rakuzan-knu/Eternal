import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, rightElement, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    const errorId = `${inputId}-error`;
    const describedBy =
      [props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') ||
      undefined;
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold tracking-wider text-(--eternal-semantic-text-muted) uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={`w-full bg-(--eternal-semantic-surface-control) border border-(--eternal-semantic-border-control) rounded-(--eternal-radius-control) px-4 py-3.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-(--eternal-semantic-border-focus) transition-all duration-(--eternal-motion-duration-fast) ${rightElement ? 'pr-11' : ''} ${className}`}
            {...props}
            id={inputId}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={describedBy}
          />
          {rightElement && (
            <div className="absolute right-3.5 text-(--eternal-semantic-text-muted) cursor-pointer">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <span id={errorId} className="text-xs text-(--eternal-semantic-text-error) mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
