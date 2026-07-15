import React from 'react';
import { useReveal } from '../hooks/useReveal';

// Polymorphic scroll-reveal wrapper. Renders `as` directly (no wrapper div),
// merging `reveal-block` into the element's own className so existing layout
// styles (.tl, .roster-row, .fair-card, etc.) are preserved. Pass `delay` in
// ms to cascade siblings in a row.
type OwnProps<E extends React.ElementType> = {
  as?: E;
  className?: string;
  delay?: number;
  children?: React.ReactNode;
};

type RevealProps<E extends React.ElementType> = OwnProps<E> &
  Omit<React.ComponentPropsWithoutRef<E>, keyof OwnProps<E>>;

function Reveal<E extends React.ElementType = 'div'>(props: RevealProps<E>) {
  const { as, className, delay, children, ...rest } = props;
  const Tag = (as || 'div') as React.ElementType;
  const { ref, visible } = useReveal<HTMLElement>();

  const restRecord = rest as Record<string, unknown>;
  const userStyle = restRecord.style as React.CSSProperties | undefined;
  const style: React.CSSProperties | undefined = delay
    ? { transitionDelay: `${delay}ms`, ...(userStyle || {}) }
    : userStyle;

  const cls = `reveal-block${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`;

  const { style: _drop, ...forwarded } = restRecord;
  void _drop;

  return (
    <Tag ref={ref} {...forwarded} className={cls} style={style}>
      {children}
    </Tag>
  );
}

export default Reveal;
