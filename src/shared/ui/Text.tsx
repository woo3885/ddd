import type { ReactNode } from 'react';

export type TextVariant = 'title' | 'heading' | 'body' | 'guide' | 'caption';
export type TextElement = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

export interface TextProps {
  variant?: TextVariant;
  as?: TextElement;
  children: ReactNode;
  className?: string;
  id?: string;
}

const defaultElements: Record<TextVariant, TextElement> = {
  title: 'h1',
  heading: 'h2',
  body: 'p',
  guide: 'p',
  caption: 'span'
};

const variantClasses: Record<TextVariant, string> = {
  title: 'text-3xl font-bold leading-tight text-text-primary',
  heading: 'text-2xl font-bold leading-snug text-text-primary',
  body: 'text-base leading-relaxed text-text-primary',
  guide: 'text-lg font-semibold leading-relaxed text-text-primary',
  caption: 'text-sm leading-relaxed text-text-secondary'
};

export function Text({
  variant = 'body',
  as,
  children,
  className,
  id
}: TextProps) {
  const Component = as ?? defaultElements[variant];
  const classes = [variantClasses[variant], className].filter(Boolean).join(' ');

  return (
    <Component id={id} className={classes}>
      {children}
    </Component>
  );
}
