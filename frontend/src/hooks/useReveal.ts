import { useCallback, useRef, useState } from 'react';

// Scroll-triggered reveal. Returns a callback ref (not a MutableRefObject) so
// it correctly attaches the observer even when the target element is inside a
// conditional branch that mounts later — e.g. the homepage countdown block,
// which only renders after the fair fetch resolves.
export function useReveal<T extends Element = HTMLElement>() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visible, setVisible] = useState(false);

  const ref = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
          observerRef.current = null;
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return { ref, visible };
}
