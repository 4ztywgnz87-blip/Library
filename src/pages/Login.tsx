import { useState } from 'react';
import { motion } from 'motion/react';
import { requestLoginLink } from '../lib/auth';
import { Button } from '../components/ui';
import { SleepyCat } from '../components/SleepyCat';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = new URLSearchParams(location.search).get('error');

  return (
    <div className="paper flex min-h-dvh items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <SleepyCat className="mx-auto w-44" />
        <h1 className="mt-4 text-5xl font-semibold text-wine">Snug</h1>
        <p className="mt-2 text-cocoa">Your cosy little library</p>

        {sent ? (
          <div className="mt-10 rounded-[var(--radius-card)] bg-white/70 p-6 shadow-[var(--shadow-soft)]">
            <p className="font-soft text-xl">Check your inbox ✉️</p>
            <p className="mt-2 text-sm text-cocoa">
              If that address belongs to this library, a login link is on its way. Open it on this device.
            </p>
            <button className="mt-4 text-sm text-wine underline" onClick={() => setSent(false)}>
              Use another address
            </button>
          </div>
        ) : (
          <form
            className="mt-10 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await requestLoginLink(email);
                setSent(true);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {expired && <p className="text-sm text-wine">That link has expired. Ask for a new one below.</p>}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="w-full rounded-full border border-sand bg-white px-5 py-3.5 text-center text-[16px] outline-none placeholder:text-mocha focus:border-oat"
            />
            <Button type="submit" disabled={busy} className="w-full py-3.5">
              {busy ? 'Sending…' : 'Send me a login link'}
            </Button>
            {error && <p className="text-sm text-wine">{error}</p>}
          </form>
        )}
      </motion.div>
    </div>
  );
}
