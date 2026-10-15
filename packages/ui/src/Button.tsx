import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-[0_0_20px_rgba(147,51,234,0.35)] border border-purple-500/30',
  secondary:
    'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-200 font-medium border border-neutral-700/50',
  outline: 'bg-transparent hover:bg-neutral-800/40 text-neutral-200 border border-neutral-700/60',
  ghost:
    'bg-transparent hover:bg-neutral-800/30 text-neutral-400 hover:text-white border-transparent',
  danger:
    'bg-red-600/90 hover:bg-red-500 text-white font-semibold border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs rounded-xl',
  md: 'min-h-[44px] min-w-[44px] px-4 py-2.5 text-sm rounded-xl',
  lg: 'min-h-[48px] min-w-[48px] px-5 py-3 text-base rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={clsx(
        // Mobile-first touch & layout constraints
        'relative inline-flex items-center justify-center gap-2 select-none font-medium',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        // Mobile tap feedback (min 44px touch area)
        'active:scale-[0.98] active:opacity-80',
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-45 cursor-not-allowed pointer-events-none active:scale-100',
        className,
      )}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0 items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
