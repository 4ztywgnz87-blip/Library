import { useEffect } from 'react';

/** The four main screens, in the order of the tab bar */
export const TABS = ['/', '/library', '/shelf', '/profile'];

const EDGE = 24; // px: swipes from the very edge belong to the iPhone itself
const MIN_DISTANCE = 60;

/** Is the touch inside something that scrolls sideways, or a control that uses horizontal drags? */
function blockedTarget(el: EventTarget | null): boolean {
  let node = el as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.matches('input, textarea, select, [role="slider"], [data-no-swipe]')) return true;
    const style = getComputedStyle(node);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 2) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Swipe left → next main screen, swipe right → previous one. At the first/last screen
 * nothing happens. `onSwipe` gets the new path and the direction (+1 = forward).
 */
export function useTabSwipe(pathname: string, onSwipe: (to: string, dir: 1 | -1) => void) {
  useEffect(() => {
    const index = TABS.indexOf(pathname);
    if (index === -1) return;
    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX < EDGE || t.clientX > window.innerWidth - EDGE || blockedTarget(e.target)) {
        start = null;
        return;
      }
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < 700;
      start = null;
      // clearly sideways, far enough, and not a slow scroll
      if (!quick || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const dir = dx < 0 ? 1 : -1;
      const next = index + dir;
      if (next < 0 || next >= TABS.length) return;
      onSwipe(TABS[next], dir);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [pathname, onSwipe]);
}
