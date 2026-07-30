import type { HTMLAttributes, ReactNode } from 'react';

import { Text } from './Text';

export type NoticeBoxVariant =
  | 'info'
  | 'progress'
  | 'secure'
  | 'warning'
  | 'danger';
export type NoticeBoxAnnounce = 'polite' | 'assertive' | 'off';

export interface NoticeBoxProps extends HTMLAttributes<HTMLDivElement> {
  variant?: NoticeBoxVariant;
  children: ReactNode;
  title?: string;
  announce?: NoticeBoxAnnounce;
}

const variantClasses: Record<NoticeBoxVariant, string> = {
  info: 'border-primary bg-brand-50 text-brand-900',
  progress: 'border-primary bg-brand-50 text-brand-900',
  secure: 'border-secure bg-slate-100 text-secure',
  warning: 'border-amber-700 bg-amber-50 text-amber-950',
  danger: 'border-danger bg-red-50 text-red-900'
};

const defaultRoles: Record<NoticeBoxVariant, 'status' | 'alert'> = {
  info: 'status',
  progress: 'status',
  secure: 'status',
  warning: 'alert',
  danger: 'alert'
};

export function NoticeBox({
  variant = 'info',
  children,
  title,
  announce,
  className,
  role,
  ...noticeProps
}: NoticeBoxProps) {
  const classes = [
    'rounded-xl border-2 p-4 text-base leading-relaxed',
    variantClasses[variant],
    className
  ]
    .filter(Boolean)
    .join(' ');
  const ariaLive =
    announce === 'off'
      ? undefined
      : announce ?? noticeProps['aria-live'];

  return (
    <div
      {...noticeProps}
      className={classes}
      role={role ?? defaultRoles[variant]}
      aria-live={ariaLive}
    >
      {title && (
        <Text as="div" variant="guide" className="mb-1 text-current">
          {title}
        </Text>
      )}
      <div>{children}</div>
    </div>
  );
}
