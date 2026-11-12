import { db, getMeta, setMeta } from '../db';

export type AuthState = 'checking' | 'in' | 'out';

/** Checks the session. Offline, it trusts the last known state so the library stays usable. */
export async function checkAuth(): Promise<AuthState> {
  const remembered = await getMeta<boolean>('loggedIn', false);
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      await setMeta('loggedIn', true);
      return 'in';
    }
    if (res.status === 401) {
      await setMeta('loggedIn', false);
      return 'out';
    }
  } catch {
    // network error → offline
  }
  return remembered ? 'in' : 'out';
}

export async function requestLoginLink(email: string) {
  const res = await fetch('/api/auth/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Could not send the link');
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  // Each reader has their own library: clear this device's copy so the next person starts clean
  await db.transaction('rw', db.books, db.meta, async () => {
    await db.books.clear();
    await db.meta.clear();
  });
}
