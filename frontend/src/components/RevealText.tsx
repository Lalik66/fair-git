import React from 'react';
import { useReveal } from '../hooks/useReveal';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

interface Props {
  as?: Tag;
  className?: string;
  children: React.ReactNode;
}

// Walk the children tree, wrap each word in a masked span with a stagger index.
// Whitespace, <br/>, and inline tags like <em> are preserved so mixed markup
// like "A marketplace<br/>that <em>travels</em>" animates correctly.
function splitNodes(nodes: React.ReactNode, counter: { i: number }): React.ReactNode {
  return React.Children.map(nodes, (node) => {
    if (typeof node === 'string') {
      const parts = node.split(/(\s+)/);
      return parts.map((part, k) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return part;
        const idx = counter.i++;
        return (
          <span
            key={`w-${idx}-${k}`}
            className="reveal-word"
            style={{ ['--i' as string]: idx } as React.CSSProperties}
          >
            <span className="reveal-word-inner">{part}</span>
          </span>
        );
      });
    }
    if (typeof node === 'number') return node;
    if (React.isValidElement(node)) {
      // <br/> — keep as a line break.
      if (node.type === 'br') return node;
      // Recurse into wrapping tags (em, b, span, etc.) so the words inside
      // are also split and staggered.
      const el = node as React.ReactElement<{ children?: React.ReactNode }>;
      return React.cloneElement(el, {}, splitNodes(el.props.children, counter));
    }
    return node;
  });
}

const RevealText: React.FC<Props> = ({ as: Tag = 'h2', className, children }) => {
  const { ref, visible } = useReveal<HTMLElement>();
  const counter = { i: 0 };
  const content = splitNodes(children, counter);
  const cls = `reveal-headline${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`;
  return (
    <Tag ref={ref as React.Ref<never>} className={cls}>
      {content}
    </Tag>
  );
};

export default RevealText;
