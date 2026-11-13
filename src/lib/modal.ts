import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * A pop-up window with its own history entry (?m=name), so swiping back on the iPhone
 * closes the window instead of leaving the page.
 */
export function useHistoryModal<T>(name: string) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<T | null>(null);
  const isOpen = params.get('m') === name;

  useEffect(() => {
    if (!isOpen) setItem(null);
  }, [isOpen]);

  const open = useCallback(
    (value: T) => {
      setItem(value);
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.set('m', name);
        return next;
      });
    },
    [name, setParams],
  );
  const close = useCallback(() => navigate(-1), [navigate]);

  return { item: isOpen ? item : null, open, close };
}
