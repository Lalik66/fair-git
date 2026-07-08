import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const SEARCH_PARAM = 'q';
const URL_WRITE_DEBOUNCE_MS = 200;

export function useAdminSearchQuery(): string {
  const [params] = useSearchParams();
  return (params.get(SEARCH_PARAM) ?? '').trim();
}

export function useAdminSearchSetter(): (raw: string) => void {
  const [, setParams] = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return useCallback((raw: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setParams(
        prev => {
          const next = new URLSearchParams(prev);
          const trimmed = raw.trim();
          if (trimmed) next.set(SEARCH_PARAM, trimmed);
          else next.delete(SEARCH_PARAM);
          return next;
        },
        { replace: true }
      );
    }, URL_WRITE_DEBOUNCE_MS);
  }, [setParams]);
}

export function matchesQuery(haystack: string | null | undefined, q: string): boolean {
  if (!q) return true;
  return (haystack ?? '').toLowerCase().includes(q.toLowerCase());
}
