import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`eternal-glass bg-(--eternal-semantic-surface-overlay) backdrop-blur-xl border border-(--eternal-semantic-border-overlay) rounded-[var(--eternal-radius-card)] p-8 shadow-2xl transition-all duration-[var(--eternal-motion-duration-panel)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
