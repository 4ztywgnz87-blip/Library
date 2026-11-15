import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Stops the page behind a pop-up from scrolling while the pop-up is open (iPhone Safari ignores a
 * plain "overflow: hidden", so the page is pinned in place and put back where it was afterwards).
 */
let locks = 0;
let savedY = 0;
function lockScroll() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const b = document.body.style;
  b.position = 'fixed';
  b.top = `-${savedY}px`;
  b.left = '0';
  b.right = '0';
  b.width = '100%';
}
function unlockScroll() {
  if (--locks > 0) return;
  const b = document.body.style;
  b.position = b.top = b.left = b.right = b.width = '';
  window.scrollTo(0, savedY);
}

/**
 * For bottom sheets. Locks the page behind the sheet, and keeps the sheet usable above the iPhone
 * keyboard. The sheet stays attached to the very bottom of the screen and gets bottom padding the
 * size of the keyboard: the keyboard is translucent on newer iPhones, so what's behind it is now
 * the sheet itself and no longer the page.
 */
export function useKeyboardLift(): CSSProperties | undefined {
  const [kb, setKb] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const height = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb(height > 40 ? { height, top: vv.offsetTop } : null);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  const base: CSSProperties = { overscrollBehavior: 'contain' };
  if (!kb) return base;
  return {
    ...base,
    bottom: 0,
    top: 'auto',
    maxHeight: window.innerHeight - kb.top - 12,
    paddingBottom: kb.height + 16,
    overflowY: 'auto',
  };
}
