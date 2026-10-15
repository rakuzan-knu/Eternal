import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle =
    'w-full py-3.5 font-semibold text-sm rounded-[var(--eternal-radius-control)] transition-all duration-[var(--eternal-motion-duration-control)] flex items-center justify-center disabled:opacity-50';
  const variants = {
    primary:
      'bg-(--eternal-semantic-action-primary) text-(--eternal-semantic-action-primary-text) hover:bg-(--eternal-semantic-action-primary-hover) active:scale-[0.99]',
    secondary:
      'bg-(--eternal-semantic-surface-control) text-(--eternal-semantic-text-secondary) border border-(--eternal-semantic-border-control) hover:bg-(--eternal-semantic-action-secondary-hover) active:scale-[0.99]',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
      disabled={loading || disabled}
      aria-busy={loading || props['aria-busy']}
    >
      {loading ? (
        <>
          <div
            aria-hidden="true"
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
