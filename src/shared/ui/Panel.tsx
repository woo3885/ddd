import { useId, type HTMLAttributes, type ReactNode } from 'react';

import { Text } from './Text';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Panel({
  title,
  description,
  children,
  className,
  ...sectionProps
}: PanelProps) {
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const descriptionId = `${panelId}-description`;
  const labelledBy = title ? titleId : sectionProps['aria-labelledby'];
  const describedBy = description
    ? descriptionId
    : sectionProps['aria-describedby'];
  const classes = [
    'rounded-2xl border-2 border-border bg-surface p-6 text-text-primary sm:p-8',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      {...sectionProps}
      className={classes}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      {title && (
        <Text id={titleId} variant="heading">
          {title}
        </Text>
      )}
      {description && (
        <Text
          id={descriptionId}
          variant="body"
          className={title ? 'mt-2 text-text-secondary' : 'text-text-secondary'}
        >
          {description}
        </Text>
      )}
      <div className={title || description ? 'mt-6' : undefined}>{children}</div>
    </section>
  );
}
