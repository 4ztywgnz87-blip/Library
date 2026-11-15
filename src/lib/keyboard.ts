import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Keeps a bottom sheet sitting right on top of the iPhone keyboard. Safari doesn't shrink the page
 * when the keyboard opens: it slides the visible part up, which left the sheet floating with the
 * page showing underneath. This pins the sheet to the bottom of what's actually visible.
 */
export function useKeyboardLift(): CSSProperties | undefined {
  const [lift, setLift] = useState<{ bottom: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setLift(bottom > 40 ? { bottom, height: vv.height } : null);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  if (!lift) return undefined;
  // the keyboard covers the safe area, so the extra bottom padding isn't needed either
  return { bottom: lift.bottom, top: 'auto', maxHeight: lift.height - 12, paddingBottom: 16, overflowY: 'auto' };
}
