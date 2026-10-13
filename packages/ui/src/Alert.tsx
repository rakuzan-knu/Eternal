import * as React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  {
    container: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    textColor: string;
  }
> = {
  error: {
    container: 'bg-red-500/10 border-red-500/25',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    textColor: 'text-red-200',
  },
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/25',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    textColor: 'text-emerald-200',
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/25',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    textColor: 'text-amber-200',
  },
  info: {
    container: 'bg-purple-500/10 border-purple-500/25',
    icon: Info,
    iconColor: 'text-purple-400',
    textColor: 'text-purple-200',
  },
};

export function Alert({ variant = 'error', title, children, onDismiss, className }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={clsx(
        'w-full p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed text-left transition-all',
        config.container,
        className,
      )}
    >
      <Icon className={clsx('w-4 h-4 shrink-0 mt-0.5', config.iconColor)} />

      <div className="flex-1 flex flex-col gap-0.5">
        {title && <h4 className="font-semibold text-white tracking-tight">{title}</h4>}
        <div className={clsx('text-neutral-300 font-normal', config.textColor)}>{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
