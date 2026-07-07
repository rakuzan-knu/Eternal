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
  ...props
}) => {
  const baseStyle =
    'w-full py-3.5 font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50';
  const variants = {
    primary: 'bg-white text-black hover:bg-neutral-200 active:scale-[0.99]',
    secondary:
      'bg-neutral-900/80 text-neutral-300 border border-neutral-800 hover:bg-neutral-800/60 active:scale-[0.99]',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
};
