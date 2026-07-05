import React from 'react';

interface AvatarProps {
  emoji?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Avatar({ emoji = '💀', src, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-28 h-28 text-4xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md select-none`}
    >
      {src ? (
        <img src={src} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span>{emoji}</span>
      )}
    </div>
  );
}
