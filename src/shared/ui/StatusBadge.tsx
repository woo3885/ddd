import type { HTMLAttributes, ReactNode } from 'react';

export type StatusBadgeVariant =
  | 'neutral'
  | 'success'
  | 'progress'
  | 'secure'
  | 'warning'
  | 'danger';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  neutral: 'border-slate-400 bg-slate-100 text-slate-800',
  success: 'border-emerald-700 bg-emerald-50 text-emerald-900',
  progress: 'border-primary bg-brand-50 text-brand-900',
  secure: 'border-secure bg-slate-100 text-secure',
  warning: 'border-amber-700 bg-amber-50 text-amber-950',
  danger: 'border-danger bg-red-50 text-red-900'
};

const dotClasses: Record<StatusBadgeVariant, string> = {
  neutral: 'bg-slate-600',
  success: 'bg-emerald-700',
  progress: 'bg-primary',
  secure: 'bg-secure',
  warning: 'bg-amber-700',
  danger: 'bg-danger'
};

export function StatusBadge({
  variant = 'neutral',
  children,
  className,
  ...spanProps
}: StatusBadgeProps) {
  const classes = [
    'inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1',
    'text-sm font-bold leading-relaxed',
    variantClasses[variant],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span {...spanProps} className={classes}>
      <span
        aria-hidden="true"
        className={`inline-block size-2 shrink-0 rounded-full ${dotClasses[variant]}`}
      />
      {children}
    </span>
  );
}
