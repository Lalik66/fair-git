import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Decides *when* to show the marketing signup popup.
 *
 * Fires on ANY of these visitor signals (OR logic), subject to frequency caps:
 *   1. Inactivity      — no mouse/keyboard/scroll/touch for INACTIVITY_MS
 *   2. Tab return      — visibilitychange after being hidden for >= AWAY_MS
 *   3. Rapid scroll up — fast upward fling near the top of the page
 *   4. Desktop exit    — mouseleave at the top edge of the viewport
 *
 * Suppression (localStorage):
 *   - `marketing_popup_submitted`      → never show again
 *   - `marketing_popup_dismissed_at`   → suppress for DISMISS_SUPPRESS_MS (7d)
 *   - `marketing_popup_shown_session`  → max once per browser session
 *   - No trigger can fire in the first INITIAL_DELAY_MS after load
 *
 * "Tap the browser address bar" is intentionally NOT handled — websites can't
 * observe it. Inactivity + scroll-up are the closest web-safe proxies.
 */

const LS_SUBMITTED = 'marketing_popup_submitted';
const LS_DISMISSED_AT = 'marketing_popup_dismissed_at';
const SS_SHOWN_SESSION = 'marketing_popup_shown_session';

const INITIAL_DELAY_MS = 15_000; // no trigger for the first 15s after load
const INACTIVITY_MS = 45_000; // idle time before showing
const AWAY_MS = 5_000; // min hidden time for the tab-return trigger
const DISMISS_SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCROLL_UP_VELOCITY = 1.2; // px/ms upward fling threshold
const SCROLL_UP_TOP_ZONE = 400; // must be near the top (px) to count

interface Options {
  /** When true (another modal open / gated route), triggers are paused. */
  paused?: boolean;
}

export function useMarketingPopupTriggers({ paused = false }: Options = {}): {
  shouldShow: boolean;
  markSubmitted: () => void;
  markDismissed: () => void;
  reset: () => void;
} {
  const [shouldShow, setShouldShow] = useState(false);

  // Refs so the long-lived event listeners always read fresh values without
  // being re-bound on every render.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const shownRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  const inactivityTimer = useRef<number | null>(null);
  const hiddenSinceRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);
  const lastScrollTimeRef = useRef(0);

  // Never stack on top of another full-screen overlay (SOS confirm, panorama
  // viewer, map selection, or any aria-modal dialog). Checked live at fire
  // time so it always reflects the current DOM.
  const anotherModalOpen = useCallback((): boolean => {
    return !!document.querySelector(
      '.sos-overlay, .panorama-overlay, .map-selection-overlay, [aria-modal="true"]'
    );
  }, []);

  const isSuppressed = useCallback((): boolean => {
    try {
      if (localStorage.getItem(LS_SUBMITTED) === '1') return true;
      if (sessionStorage.getItem(SS_SHOWN_SESSION) === '1') return true;
      const dismissedAt = Number(localStorage.getItem(LS_DISMISSED_AT) ?? '0');
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_SUPPRESS_MS) return true;
    } catch {
      // Private mode / storage disabled — fail open (allow showing once).
    }
    return false;
  }, []);

  const trigger = useCallback(() => {
    if (shownRef.current) return;
    if (pausedRef.current) return;
    if (Date.now() - mountedAtRef.current < INITIAL_DELAY_MS) return;
    if (isSuppressed()) return;
    if (anotherModalOpen()) return;

    shownRef.current = true;
    try {
      sessionStorage.setItem(SS_SHOWN_SESSION, '1');
    } catch {
      /* ignore storage failures */
    }
    setShouldShow(true);
  }, [isSuppressed, anotherModalOpen]);

  useEffect(() => {
    // If already permanently/temporarily suppressed, don't wire anything up.
    if (isSuppressed()) return;

    const resetInactivity = () => {
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
      inactivityTimer.current = window.setTimeout(trigger, INACTIVITY_MS);
    };

    const onActivity = () => {
      if (shownRef.current) return;
      resetInactivity();
    };

    const onScroll = () => {
      if (shownRef.current) return;
      const now = Date.now();
      const y = window.scrollY;
      const dt = now - lastScrollTimeRef.current;
      const dy = y - lastScrollYRef.current;
      // Upward fling (dy negative) that is fast enough, while near the top.
      if (dt > 0 && dt < 400) {
        const velocity = -dy / dt; // positive when scrolling up
        if (velocity >= SCROLL_UP_VELOCITY && y <= SCROLL_UP_TOP_ZONE) {
          trigger();
        }
      }
      lastScrollYRef.current = y;
      lastScrollTimeRef.current = now;
      resetInactivity();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSinceRef.current = Date.now();
      } else {
        const since = hiddenSinceRef.current;
        hiddenSinceRef.current = null;
        if (since && Date.now() - since >= AWAY_MS) trigger();
        resetInactivity();
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      // Exit intent: cursor leaves the viewport at the top edge.
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };

    lastScrollYRef.current = window.scrollY;
    lastScrollTimeRef.current = Date.now();

    const activityEvents: Array<keyof DocumentEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
    ];
    activityEvents.forEach((ev) => document.addEventListener(ev, onActivity, { passive: true }));
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('mouseout', onMouseOut);

    resetInactivity();

    return () => {
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
      activityEvents.forEach((ev) => document.removeEventListener(ev, onActivity));
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, [trigger, isSuppressed]);

  const markSubmitted = useCallback(() => {
    try {
      localStorage.setItem(LS_SUBMITTED, '1');
    } catch {
      /* ignore */
    }
    setShouldShow(false);
  }, []);

  const markDismissed = useCallback(() => {
    try {
      localStorage.setItem(LS_DISMISSED_AT, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShouldShow(false);
  }, []);

  const reset = useCallback(() => setShouldShow(false), []);

  return { shouldShow, markSubmitted, markDismissed, reset };
}

export default useMarketingPopupTriggers;
