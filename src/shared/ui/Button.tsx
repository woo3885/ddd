import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-primary text-white hover:bg-brand-900 disabled:hover:bg-primary',
  secondary:
    'border-border bg-surface text-text-primary hover:bg-slate-100 disabled:hover:bg-surface',
  danger:
    'border-danger bg-danger text-white hover:bg-red-800 disabled:hover:bg-danger'
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-12 px-6 text-base',
  lg: 'min-h-14 px-8 text-lg'
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const classes = [
    'inline-flex items-center justify-center gap-3 rounded-xl border-2 font-bold leading-snug',
    'transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[variant],
    sizeClasses[size],
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      aria-live="polite"
    >
      {isLoading && (
        <>
          <span className="sr-only">처리 중: </span>
          <span
            aria-hidden="true"
            className="size-5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
          />
        </>
      )}
      {children}
    </button>
  );
}
